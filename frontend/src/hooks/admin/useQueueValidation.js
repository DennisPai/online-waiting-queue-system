import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateQueueData } from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';
import { 
  autoFillDates, 
  autoFillFamilyMembersDates,
  autoConvertToMinguo,
  convertMinguoForStorage 
} from '../../utils/calendarConverter';

/**
 * 候位驗證邏輯 Hook
 * 負責數據驗證、格式化、保存等邏輯
 */
export const useQueueValidation = ({ loadQueueList, handleCloseDialog }) => {
  const dispatch = useDispatch();

  // 驗證客戶資料
  const validateCustomerData = useCallback((data) => {
    const errors = {};

    // 必填欄位驗證
    if (!data.name?.trim()) {
      errors.name = '姓名為必填欄位';
    }

    if (!data.phone?.trim()) {
      errors.phone = '電話為必填欄位';
    }

    // 電話格式驗證
    if (data.phone && !/^[0-9+\-\s()]+$/.test(data.phone)) {
      errors.phone = '電話號碼格式不正確';
    }

    // 電子郵件格式驗證
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '電子郵件格式不正確';
    }

    // 候位號碼驗證
    if (data.queueNumber && (isNaN(data.queueNumber) || data.queueNumber <= 0)) {
      errors.queueNumber = '候位號碼必須是正整數';
    }

    // 出生日期驗證 - 使用嚴格的存在性檢查
    const hasGregorianBirth = 
      data.gregorianBirthYear != null && 
      data.gregorianBirthMonth != null && 
      data.gregorianBirthDay != null;
    
    const hasLunarBirth = 
      data.lunarBirthYear != null && 
      data.lunarBirthMonth != null && 
      data.lunarBirthDay != null;
    
    if (!hasGregorianBirth && !hasLunarBirth) {
      errors.birthDate = '必須提供國曆或農曆出生日期';
    }

    // 地址驗證 - 只在有地址時才驗證
    if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
      data.addresses.forEach((addr, index) => {
        // 只驗證非空地址
        if (addr && addr.address !== undefined && !addr.address?.trim()) {
          errors[`addresses.${index}.address`] = '地址不能為空';
        }
      });
    }

    return errors;
  }, []);

  // 格式化保存數據
  const formatSaveData = useCallback((data) => {
    let processedData = { ...data };

    try {
      // 自動填充日期（編輯時國曆農曆互補）
      processedData = autoFillDates(processedData);
      processedData = autoFillFamilyMembersDates(processedData);

      // 注意：編輯客戶資料時，資料庫中已是西元年格式，不需要轉換
      // convertMinguoForStorage 只用於新註冊時將民國年轉為西元年

      // 確保數值型欄位的正確類型
      if (processedData.queueNumber) {
        processedData.queueNumber = parseInt(processedData.queueNumber);
      }
      if (processedData.orderIndex) {
        processedData.orderIndex = parseInt(processedData.orderIndex);
      }

      // 處理諮詢主題
      if (processedData.consultationTopics && !Array.isArray(processedData.consultationTopics)) {
        processedData.consultationTopics = [processedData.consultationTopics];
      }

      // 清理空值 - 但保留必填欄位和數字0
      const requiredFields = ['_id', 'name', 'phone', 'queueNumber', 'status'];
      Object.keys(processedData).forEach(key => {
        // 不刪除必填欄位
        if (requiredFields.includes(key)) {
          return;
        }
        
        // 不刪除數字 0（因為出生日期可能是 0）
        if (processedData[key] === 0) {
          return;
        }
        
        // 只刪除空字串、null 和 undefined
        if (processedData[key] === '' || processedData[key] === null || processedData[key] === undefined) {
          delete processedData[key];
        }
      });

    } catch (error) {
      console.error('數據格式化失敗:', error);
      throw new Error('數據格式化失敗');
    }

    return processedData;
  }, []);

  // 保存客戶資料
  const handleSaveData = useCallback(async (editedData) => {
    try {
      console.log('=== 開始保存客戶資料 ===');
      console.log('原始編輯資料:', editedData);
      
      // 驗證數據
      const validationErrors = validateCustomerData(editedData);
      console.log('驗證結果:', validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        const errorMessage = Object.values(validationErrors).join(', ');
        console.error('驗證失敗:', errorMessage);
        dispatch(showAlert({
          message: `數據驗證失敗: ${errorMessage}`,
          severity: 'error'
        }));
        return false;
      }

      // 格式化數據
      console.log('開始格式化數據...');
      const processedData = formatSaveData(editedData);
      console.log('格式化後的數據:', processedData);

      // 發送更新請求
      await dispatch(updateQueueData({
        queueId: processedData._id,
        customerData: processedData
      })).unwrap();

      dispatch(showAlert({
        message: '客戶資料更新成功',
        severity: 'success'
      }));

      // 重新載入數據並關閉對話框
      loadQueueList();
      handleCloseDialog();

      return true;
    } catch (error) {
      console.error('保存客戶資料失敗:', error);
      dispatch(showAlert({
        message: error.message || '保存失敗，請稍後再試',
        severity: 'error'
      }));
      return false;
    }
  }, [dispatch, validateCustomerData, formatSaveData, loadQueueList, handleCloseDialog]);

  return {
    validateCustomerData,
    formatSaveData,
    handleSaveData
  };
};
