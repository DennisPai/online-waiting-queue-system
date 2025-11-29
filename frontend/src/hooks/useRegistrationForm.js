import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { registerQueue, resetRegistration, getMaxOrderIndex } from '../redux/slices/queueSlice';
import { showAlert } from '../redux/slices/uiSlice';
import { 
  gregorianToLunar, 
  lunarToGregorian, 
  autoFillDates, 
  autoConvertToMinguo, 
  convertMinguoForStorage,
  addVirtualAge
} from '../utils/calendarConverter';

// 表單初始值
const initialFormData = {
  email: '',
  name: '',
  phone: '',
  gender: 'male',
  birthYear: '',
  birthMonth: '',
  birthDay: '',
  calendarType: 'gregorian',
  lunarIsLeapMonth: false,
  addresses: [{ address: '', addressType: 'home' }],
  familyMembers: [],
  consultationTopics: [],
  otherDetails: '',
  remarks: ''
};

export const useRegistrationForm = (embedded = false) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { 
    isLoading, 
    registeredQueueNumber, 
    waitingCount, 
    estimatedWaitTime, 
    estimatedEndTime, 
    error, 
    maxOrderIndex, 
    maxOrderMessage,
    registeredOrderIndex
  } = useSelector((state) => state.queue);

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [showSuccessPage, setShowSuccessPage] = useState(false);

  // 組件掛載時先重置狀態並獲取最大叫號順序
  useEffect(() => {
    dispatch(resetRegistration());
    dispatch(getMaxOrderIndex());
    setFormData(initialFormData);
    setShowSuccessPage(false);
  }, [dispatch]);

  // 如果已經登記成功，則顯示成功頁面
  useEffect(() => {
    if (registeredQueueNumber) {
      setShowSuccessPage(true);
    }
  }, [registeredQueueNumber]);

  // 處理表單錯誤
  useEffect(() => {
    if (error) {
      dispatch(showAlert({
        message: error,
        severity: 'error'
      }));
    }
  }, [error, dispatch]);

  // 自動轉換日期的功能函數
  const autoConvertDate = useCallback((newFormData) => {
    if (newFormData.birthYear && newFormData.birthMonth && newFormData.birthDay) {
      const inputYear = parseInt(newFormData.birthYear);
      const month = parseInt(newFormData.birthMonth);
      const day = parseInt(newFormData.birthDay);

      if (inputYear && month && day) {
        try {
          if (newFormData.calendarType === 'gregorian') {
            // 國曆：先轉換為西元年，再進行轉換
            const { minguoYear } = autoConvertToMinguo(inputYear);
            const gregorianYear = convertMinguoForStorage(minguoYear);
            const lunarDate = gregorianToLunar(gregorianYear, month, day);
            if (lunarDate) {
              newFormData.convertedLunarYear = lunarDate.year;
              newFormData.convertedLunarMonth = lunarDate.month;
              newFormData.convertedLunarDay = lunarDate.day;
              newFormData.convertedLunarIsLeapMonth = lunarDate.isLeapMonth;
            }
          } else {
            // 農曆：先轉換為西元年，再進行轉換
            const { minguoYear } = autoConvertToMinguo(inputYear);
            const lunarYear = convertMinguoForStorage(minguoYear);
            const gregorianDate = lunarToGregorian(lunarYear, month, day, newFormData.lunarIsLeapMonth);
            if (gregorianDate) {
              newFormData.convertedGregorianYear = gregorianDate.year;
              newFormData.convertedGregorianMonth = gregorianDate.month;
              newFormData.convertedGregorianDay = gregorianDate.day;
            }
          }
        } catch (error) {
          console.error('日期轉換錯誤:', error);
        }
      }
    }
    return newFormData;
  }, []);

  // 家人自動轉換日期
  const autoConvertFamilyMemberDate = useCallback((member) => {
    if (member.birthYear && member.birthMonth && member.birthDay) {
      const inputYear = parseInt(member.birthYear);
      const month = parseInt(member.birthMonth);
      const day = parseInt(member.birthDay);

      if (inputYear && month && day) {
        try {
          if (member.calendarType === 'gregorian') {
            // 國曆：先轉換為西元年，再進行轉換
            const { minguoYear } = autoConvertToMinguo(inputYear);
            const gregorianYear = convertMinguoForStorage(minguoYear);
            const lunarDate = gregorianToLunar(gregorianYear, month, day);
            if (lunarDate) {
              member.convertedLunarYear = lunarDate.year;
              member.convertedLunarMonth = lunarDate.month;
              member.convertedLunarDay = lunarDate.day;
              member.convertedLunarIsLeapMonth = lunarDate.isLeapMonth;
            }
          } else {
            // 農曆：先轉換為西元年，再進行轉換
            const { minguoYear } = autoConvertToMinguo(inputYear);
            const lunarYear = convertMinguoForStorage(minguoYear);
            const gregorianDate = lunarToGregorian(lunarYear, month, day, member.lunarIsLeapMonth);
            if (gregorianDate) {
              member.convertedGregorianYear = gregorianDate.year;
              member.convertedGregorianMonth = gregorianDate.month;
              member.convertedGregorianDay = gregorianDate.day;
            }
          }
        } catch (error) {
          console.error('家人日期轉換錯誤:', error);
        }
      }
    }
    return member;
  }, []);

  // 處理表單變更
  const handleChange = useCallback((name, value) => {
    const newFormData = { ...formData, [name]: value };
    
    // 如果是曆法類型改變，清除轉換結果
    if (name === 'calendarType') {
      delete newFormData.convertedLunarYear;
      delete newFormData.convertedLunarMonth;
      delete newFormData.convertedLunarDay;
      delete newFormData.convertedLunarIsLeapMonth;
      delete newFormData.convertedGregorianYear;
      delete newFormData.convertedGregorianMonth;
      delete newFormData.convertedGregorianDay;
    }

    // 如果是日期相關欄位，進行自動轉換
    if (['birthYear', 'birthMonth', 'birthDay', 'calendarType', 'lunarIsLeapMonth'].includes(name)) {
      autoConvertDate(newFormData);
    }

    setFormData(newFormData);
    
    // 清除對應的錯誤
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [formData, formErrors, autoConvertDate]);

  // 處理地址變更
  const handleAddressChange = useCallback((index, field, value) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      addresses: newAddresses
    }));

    // 清除對應的錯誤
    const errorKey = `addresses.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }, [formData.addresses, formErrors]);

  // 新增地址
  const addAddress = useCallback(() => {
    if (formData.addresses.length < 3) {
      setFormData(prev => ({
        ...prev,
        addresses: [...prev.addresses, { address: '', addressType: 'home' }]
      }));
    }
  }, [formData.addresses.length]);

  // 移除地址
  const removeAddress = useCallback((index) => {
    if (formData.addresses.length > 1) {
      const newAddresses = formData.addresses.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        addresses: newAddresses
      }));
    }
  }, [formData.addresses]);

  // 處理家人資料變更
  const handleFamilyMemberChange = useCallback((index, field, value) => {
    const newFamilyMembers = [...formData.familyMembers];
    newFamilyMembers[index] = {
      ...newFamilyMembers[index],
      [field]: value
    };

    // 如果是曆法類型改變，清除轉換結果
    if (field === 'calendarType') {
      delete newFamilyMembers[index].convertedLunarYear;
      delete newFamilyMembers[index].convertedLunarMonth;
      delete newFamilyMembers[index].convertedLunarDay;
      delete newFamilyMembers[index].convertedLunarIsLeapMonth;
      delete newFamilyMembers[index].convertedGregorianYear;
      delete newFamilyMembers[index].convertedGregorianMonth;
      delete newFamilyMembers[index].convertedGregorianDay;
    }

    // 如果是日期相關欄位，進行自動轉換
    if (['birthYear', 'birthMonth', 'birthDay', 'calendarType', 'lunarIsLeapMonth'].includes(field)) {
      autoConvertFamilyMemberDate(newFamilyMembers[index]);
    }

    setFormData(prev => ({
      ...prev,
      familyMembers: newFamilyMembers
    }));

    // 清除對應的錯誤
    const errorKey = `familyMembers.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }, [formData.familyMembers, formErrors, autoConvertFamilyMemberDate]);

  // 新增家人
  const addFamilyMember = useCallback(() => {
    if (formData.familyMembers.length < 5) {
      setFormData(prev => ({
        ...prev,
        familyMembers: [
          ...prev.familyMembers,
          {
            name: '',
            gender: 'male',
            birthYear: '',
            birthMonth: '',
            birthDay: '',
            calendarType: 'gregorian',
            lunarIsLeapMonth: false,
            address: '',
            addressType: 'home'
          }
        ]
      }));
    }
  }, [formData.familyMembers.length]);

  // 移除家人
  const removeFamilyMember = useCallback((index) => {
    const newFamilyMembers = formData.familyMembers.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      familyMembers: newFamilyMembers
    }));
  }, [formData.familyMembers]);

  // 表單驗證
  const validateForm = useCallback(() => {
    const errors = {};

    // 基本資料驗證
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '請輸入有效的電子郵件';
    }
    
    if (!formData.name) {
      errors.name = '請輸入姓名';
    }
    
    if (!formData.phone) {
      errors.phone = '請輸入聯絡手機';
    } else if (!/^[\d-+()]{8,}$/.test(formData.phone)) {
      errors.phone = '請輸入有效的聯絡手機';
    }

    // 出生日期驗證
    if (!formData.birthYear) {
      errors.birthYear = '請輸入出生年';
    } else if (isNaN(formData.birthYear)) {
      errors.birthYear = '請輸入有效的出生年';
    } else {
      const year = parseInt(formData.birthYear);
      const currentYear = new Date().getFullYear();
      if (year < 1 || (year > 150 && year < 1900) || year > currentYear) {
        errors.birthYear = '請輸入有效的出生年（民國1-150年或西元1900年後）';
      }
    }
    
    if (!formData.birthMonth) {
      errors.birthMonth = '請輸入出生月';
    } else if (isNaN(formData.birthMonth) || formData.birthMonth < 1 || formData.birthMonth > 12) {
      errors.birthMonth = '請輸入1-12之間的數字';
    }
    
    if (!formData.birthDay) {
      errors.birthDay = '請輸入出生日';
    } else if (isNaN(formData.birthDay) || formData.birthDay < 1 || formData.birthDay > 31) {
      errors.birthDay = '請輸入1-31之間的數字';
    }

    // 地址驗證
    formData.addresses.forEach((addr, index) => {
      if (!addr.address) {
        errors[`addresses.${index}.address`] = '請輸入地址';
      }
    });

    // 家人資料驗證
    formData.familyMembers.forEach((member, index) => {
      if (!member.name) {
        errors[`familyMembers.${index}.name`] = '請輸入家人姓名';
      }
      if (!member.gender) {
        errors[`familyMembers.${index}.gender`] = '請選擇性別';
      }
      if (!member.birthYear) {
        errors[`familyMembers.${index}.birthYear`] = '請輸入出生年';
      } else if (isNaN(member.birthYear)) {
        errors[`familyMembers.${index}.birthYear`] = '請輸入有效的出生年';
      } else {
        const year = parseInt(member.birthYear);
        const currentYear = new Date().getFullYear();
        if (year < 1 || (year > 150 && year < 1900) || year > currentYear) {
          errors[`familyMembers.${index}.birthYear`] = '請輸入有效的出生年（民國1-150年或西元1900年後）';
        }
      }
      if (!member.birthMonth) {
        errors[`familyMembers.${index}.birthMonth`] = '請輸入出生月';
      }
      if (!member.birthDay) {
        errors[`familyMembers.${index}.birthDay`] = '請輸入出生日';
      }
      if (!member.address) {
        errors[`familyMembers.${index}.address`] = '請輸入地址';
      }
    });

    // 請示內容驗證
    if (formData.consultationTopics.length === 0) {
      errors.consultationTopics = '請至少選擇一個請示內容';
    }

    // 其他詳細內容驗證
    if (formData.consultationTopics.includes('other') && !formData.otherDetails.trim()) {
      errors.otherDetails = '選擇「其他」時，請詳細說明您的問題';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // 提交表單
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      dispatch(showAlert({
        message: '請檢查並修正表單中的錯誤',
        severity: 'error'
      }));
      return;
    }

    try {
      // 準備提交數據
      const submissionData = {
        email: formData.email || '',
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender,
        addresses: formData.addresses,
        familyMembers: formData.familyMembers,
        consultationTopics: formData.consultationTopics,
        otherDetails: formData.otherDetails || '',
        remarks: formData.remarks || ''
      };

      // 處理出生日期 - 根據選擇的曆法類型設定相應欄位
      if (formData.calendarType === 'gregorian') {
        const { minguoYear } = autoConvertToMinguo(parseInt(formData.birthYear));
        submissionData.gregorianBirthYear = convertMinguoForStorage(minguoYear);
        submissionData.gregorianBirthMonth = parseInt(formData.birthMonth);
        submissionData.gregorianBirthDay = parseInt(formData.birthDay);
        
        // 如果有轉換的農曆日期，也一併加入
        if (formData.convertedLunarYear) {
          const { minguoYear: lunarMinguoYear } = autoConvertToMinguo(formData.convertedLunarYear);
          submissionData.lunarBirthYear = convertMinguoForStorage(lunarMinguoYear);
          submissionData.lunarBirthMonth = formData.convertedLunarMonth;
          submissionData.lunarBirthDay = formData.convertedLunarDay;
          submissionData.lunarIsLeapMonth = formData.convertedLunarIsLeapMonth;
        }
      } else {
        const { minguoYear } = autoConvertToMinguo(parseInt(formData.birthYear));
        submissionData.lunarBirthYear = convertMinguoForStorage(minguoYear);
        submissionData.lunarBirthMonth = parseInt(formData.birthMonth);
        submissionData.lunarBirthDay = parseInt(formData.birthDay);
        submissionData.lunarIsLeapMonth = formData.lunarIsLeapMonth;
        
        // 如果有轉換的國曆日期，也一併加入
        if (formData.convertedGregorianYear) {
          const { minguoYear: gregorianMinguoYear } = autoConvertToMinguo(formData.convertedGregorianYear);
          submissionData.gregorianBirthYear = convertMinguoForStorage(gregorianMinguoYear);
          submissionData.gregorianBirthMonth = formData.convertedGregorianMonth;
          submissionData.gregorianBirthDay = formData.convertedGregorianDay;
        }
      }

      // 處理家人的出生日期
      submissionData.familyMembers = submissionData.familyMembers.map(member => {
        const processedMember = { ...member };
        
        if (member.calendarType === 'gregorian') {
          const { minguoYear } = autoConvertToMinguo(parseInt(member.birthYear));
          processedMember.gregorianBirthYear = convertMinguoForStorage(minguoYear);
          processedMember.gregorianBirthMonth = parseInt(member.birthMonth);
          processedMember.gregorianBirthDay = parseInt(member.birthDay);
          
          if (member.convertedLunarYear) {
            const { minguoYear: lunarMinguoYear } = autoConvertToMinguo(member.convertedLunarYear);
            processedMember.lunarBirthYear = convertMinguoForStorage(lunarMinguoYear);
            processedMember.lunarBirthMonth = member.convertedLunarMonth;
            processedMember.lunarBirthDay = member.convertedLunarDay;
            processedMember.lunarIsLeapMonth = member.convertedLunarIsLeapMonth;
          }
        } else {
          const { minguoYear } = autoConvertToMinguo(parseInt(member.birthYear));
          processedMember.lunarBirthYear = convertMinguoForStorage(minguoYear);
          processedMember.lunarBirthMonth = parseInt(member.birthMonth);
          processedMember.lunarBirthDay = parseInt(member.birthDay);
          processedMember.lunarIsLeapMonth = member.lunarIsLeapMonth;
          
          if (member.convertedGregorianYear) {
            const { minguoYear: gregorianMinguoYear } = autoConvertToMinguo(member.convertedGregorianYear);
            processedMember.gregorianBirthYear = convertMinguoForStorage(gregorianMinguoYear);
            processedMember.gregorianBirthMonth = member.convertedGregorianMonth;
            processedMember.gregorianBirthDay = member.convertedGregorianDay;
          }
        }

        // 移除臨時欄位
        delete processedMember.birthYear;
        delete processedMember.birthMonth;
        delete processedMember.birthDay;
        delete processedMember.calendarType;

        return processedMember;
      });

      // 自動填充虛歲等資訊
      const finalData = autoFillDates(submissionData);
      
      await dispatch(registerQueue(finalData)).unwrap();
      
      if (!embedded) {
        dispatch(showAlert({
          message: '候位登記成功！',
          severity: 'success'
        }));
      }
    } catch (error) {
      console.error('註冊失敗:', error);
      dispatch(showAlert({
        message: `註冊失敗: ${error}`,
        severity: 'error'
      }));
    }
  }, [formData, validateForm, dispatch, embedded]);

  // 返回首頁
  const handleBackToHome = useCallback(() => {
    if (embedded) {
      // 如果是嵌入模式，只重置狀態
      dispatch(resetRegistration());
      setFormData(initialFormData);
      setShowSuccessPage(false);
      setFormErrors({});
    } else {
      // 如果不是嵌入模式，導航到首頁
      dispatch(resetRegistration());
      navigate('/');
    }
  }, [embedded, dispatch, navigate]);

  // 處理家人地址"同上"功能
  const handleUsePrimaryAddress = useCallback((index, checked) => {
    if (checked && formData.addresses[0]?.address) {
      // 複製主客戶的第一個地址
      const newFamilyMembers = [...formData.familyMembers];
      newFamilyMembers[index] = {
        ...newFamilyMembers[index],
        address: formData.addresses[0].address,
        addressType: formData.addresses[0].addressType,
        usePrimaryAddress: true
      };
      setFormData({ ...formData, familyMembers: newFamilyMembers });
    } else {
      // 取消勾選時，只更新勾選狀態，保留地址內容
      const newFamilyMembers = [...formData.familyMembers];
      newFamilyMembers[index] = {
        ...newFamilyMembers[index],
        usePrimaryAddress: false
      };
      setFormData({ ...formData, familyMembers: newFamilyMembers });
    }
  }, [formData]);

  return {
    // 狀態
    formData,
    formErrors,
    showSuccessPage,
    isLoading,
    registeredQueueNumber,
    waitingCount,
    estimatedWaitTime,
    estimatedEndTime,
    maxOrderIndex,
    maxOrderMessage,
    registeredOrderIndex,
    error,

    // 方法
    handleChange,
    handleAddressChange,
    addAddress,
    removeAddress,
    handleFamilyMemberChange,
    handleUsePrimaryAddress,
    addFamilyMember,
    removeFamilyMember,
    handleSubmit,
    handleBackToHome,
    validateForm
  };
};
