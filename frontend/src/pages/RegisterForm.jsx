import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  FormHelperText,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { registerQueue, resetRegistration, getQueueStatus } from '../redux/slices/queueSlice';
import { showAlert } from '../redux/slices/uiSlice';
import { 
  gregorianToLunar, 
  lunarToGregorian, 
  autoFillDates, 
  autoConvertToMinguo, 
  convertMinguoForStorage,
  formatMinguoYear,
  formatMinguoDate,
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

// 諮詢主題選項
const consultationOptions = [
  { value: 'body', label: '身體' },
  { value: 'fate', label: '運途' },
  { value: 'karma', label: '因果' },
  { value: 'family', label: '家運/祖先' },
  { value: 'career', label: '事業' },
  { value: 'relationship', label: '婚姻感情' },
  { value: 'study', label: '學業' },
  { value: 'blessing', label: '收驚/加持' },
  { value: 'other', label: '其他' }
];

// 地址類型選項
const addressTypeOptions = [
  { value: 'home', label: '住家' },
  { value: 'work', label: '工作場所' },
  { value: 'hospital', label: '醫院' },
  { value: 'other', label: '其他' }
];

const RegisterForm = ({ onSuccess, isDialog = false }) => {
  const dispatch = useDispatch();
  const { isLoading, registeredQueueNumber, waitingCount, estimatedWaitTime, estimatedEndTime, error, queueStatus } = useSelector(
    (state) => state.queue
  );
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // 組件掛載時先重置狀態並獲取系統設定
  useEffect(() => {
    dispatch(resetRegistration());
    dispatch(getQueueStatus()); // 獲取系統設定，包含簡化模式
    // 重置表單數據
    setFormData(initialFormData);
    setShowSuccessMessage(false);
  }, [dispatch]);

  // 如果已經登記成功
  useEffect(() => {
    if (registeredQueueNumber) {
      setShowSuccessMessage(true);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000); // 2秒後自動關閉
      }
    }
  }, [registeredQueueNumber, onSuccess]);

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
  const autoConvertDate = (newFormData) => {
    const { birthYear, birthMonth, birthDay, calendarType } = newFormData;
    
    // 檢查是否三個日期欄位都已填入且有效
    if (birthYear && birthMonth && birthDay && 
        !isNaN(birthYear) && !isNaN(birthMonth) && !isNaN(birthDay)) {
      
      try {
        const inputYear = parseInt(birthYear);
        const month = parseInt(birthMonth);
        const day = parseInt(birthDay);
        
        if (calendarType === 'gregorian') {
          // 自動判斷輸入的年份是民國還是西元，轉換為西元年進行處理
          const { minguoYear } = autoConvertToMinguo(inputYear);
          const gregorianYear = convertMinguoForStorage(minguoYear);
          
          // 國曆轉農曆
          const lunarDate = gregorianToLunar(gregorianYear, month, day);
          return {
            ...newFormData,
            convertedLunarYear: lunarDate.year,
            convertedLunarMonth: lunarDate.month,
            convertedLunarDay: lunarDate.day,
            convertedLunarIsLeapMonth: lunarDate.isLeapMonth,
            displayMinguoYear: minguoYear // 保存民國年用於顯示
          };
        } else if (calendarType === 'lunar') {
          // 農曆年份也使用民國年輸入
          const { minguoYear } = autoConvertToMinguo(inputYear);
          const gregorianYear = convertMinguoForStorage(minguoYear);
          
          // 農曆轉國曆
          const gregorianDate = lunarToGregorian(gregorianYear, month, day, newFormData.lunarIsLeapMonth);
          return {
            ...newFormData,
            convertedGregorianYear: gregorianDate.year,
            convertedGregorianMonth: gregorianDate.month,
            convertedGregorianDay: gregorianDate.day,
            displayMinguoYear: minguoYear // 保存民國年用於顯示
          };
        }
      } catch (error) {
        console.error('日期轉換錯誤:', error);
      }
    }
    
    return newFormData;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      const updatedTopics = checked
        ? [...formData.consultationTopics, value]
        : formData.consultationTopics.filter((topic) => topic !== value);
      
      let newFormData = { ...formData, consultationTopics: updatedTopics };
      
      // 如果取消勾選"其他"，清空其他詳細內容
      if (!checked && value === 'other') {
        newFormData.otherDetails = '';
      }
      
      setFormData(newFormData);
    } else {
      let newFormData = { ...formData, [name]: value };
      
      // 如果修改的是日期相關欄位，觸發自動轉換
      if (['birthYear', 'birthMonth', 'birthDay', 'calendarType'].includes(name)) {
        newFormData = autoConvertDate(newFormData);
      }
      
      setFormData(newFormData);
    }
    
    // 清除該欄位的錯誤
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  // 處理地址變更
  const handleAddressChange = (index, field, value) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setFormData({ ...formData, addresses: newAddresses });
    
    // 清除該欄位的錯誤
    const errorKey = `addresses.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors({ ...formErrors, [errorKey]: null });
    }
  };

  // 新增地址
  const addAddress = () => {
    if (formData.addresses.length < 3) {
      setFormData({
        ...formData,
        addresses: [...formData.addresses, { address: '', addressType: 'home' }]
      });
    }
  };

  // 刪除地址
  const removeAddress = (index) => {
    if (formData.addresses.length > 1) {
      const newAddresses = formData.addresses.filter((_, i) => i !== index);
      setFormData({ ...formData, addresses: newAddresses });
    }
  };

  // 家人日期自動轉換功能函數
  const autoConvertFamilyMemberDate = (memberIndex, newMemberData) => {
    const { birthYear, birthMonth, birthDay, calendarType } = newMemberData;
    
    if (birthYear && birthMonth && birthDay && 
        !isNaN(birthYear) && !isNaN(birthMonth) && !isNaN(birthDay)) {
      
      try {
        const inputYear = parseInt(birthYear);
        const month = parseInt(birthMonth);
        const day = parseInt(birthDay);
        
        if (calendarType === 'gregorian') {
          const { minguoYear } = autoConvertToMinguo(inputYear);
          const gregorianYear = convertMinguoForStorage(minguoYear);
          
          const lunarDate = gregorianToLunar(gregorianYear, month, day);
          return {
            ...newMemberData,
            convertedLunarYear: lunarDate.year,
            convertedLunarMonth: lunarDate.month,
            convertedLunarDay: lunarDate.day,
            convertedLunarIsLeapMonth: lunarDate.isLeapMonth,
            displayMinguoYear: minguoYear
          };
        } else if (calendarType === 'lunar') {
          const { minguoYear } = autoConvertToMinguo(inputYear);
          const gregorianYear = convertMinguoForStorage(minguoYear);
          
          const gregorianDate = lunarToGregorian(gregorianYear, month, day, newMemberData.lunarIsLeapMonth);
          return {
            ...newMemberData,
            convertedGregorianYear: gregorianDate.year,
            convertedGregorianMonth: gregorianDate.month,
            convertedGregorianDay: gregorianDate.day,
            displayMinguoYear: minguoYear
          };
        }
      } catch (error) {
        console.error('家人日期轉換錯誤:', error);
      }
    }
    
    return newMemberData;
  };

  // 處理家人資料變更
  const handleFamilyMemberChange = (index, field, value) => {
    const newFamilyMembers = [...formData.familyMembers];
    let newMemberData = { ...newFamilyMembers[index], [field]: value };
    
    // 如果修改的是日期相關欄位，觸發自動轉換
    if (['birthYear', 'birthMonth', 'birthDay', 'calendarType'].includes(field)) {
      newMemberData = autoConvertFamilyMemberDate(index, newMemberData);
    }
    
    newFamilyMembers[index] = newMemberData;
    setFormData({ ...formData, familyMembers: newFamilyMembers });
    
    // 清除該欄位的錯誤
    const errorKey = `familyMembers.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors({ ...formErrors, [errorKey]: null });
    }
  };

  // 新增家人
  const addFamilyMember = () => {
    if (formData.familyMembers.length < 5) {
      setFormData({
        ...formData,
        familyMembers: [...formData.familyMembers, {
          name: '',
          birthYear: '',
          birthMonth: '',
          birthDay: '',
          calendarType: 'gregorian',
          lunarIsLeapMonth: false,
          address: '',
          addressType: 'home'
        }]
      });
    }
  };

  // 刪除家人
  const removeFamilyMember = (index) => {
    const newFamilyMembers = formData.familyMembers.filter((_, i) => i !== index);
    setFormData({ ...formData, familyMembers: newFamilyMembers });
  };

  const validateForm = () => {
    const errors = {};
    
    // 檢查是否為簡化模式
    const isSimplifiedMode = queueStatus?.simplifiedMode || false;
    
    if (isSimplifiedMode) {
      // 簡化模式：只需要姓名
      if (!formData.name) {
        errors.name = '請輸入姓名';
      }
      console.log('簡化模式驗證：只檢查姓名');
    } else {
      // 完整驗證模式
      // 基本資料驗證
      // 電子郵件現在為非必填，但如果有填寫則需驗證格式
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) errors.email = '請輸入有效的電子郵件';
      
      if (!formData.name) errors.name = '請輸入姓名';
      if (!formData.phone) errors.phone = '請輸入聯絡手機';
      else if (!/^[\d-+()]{8,}$/.test(formData.phone)) errors.phone = '請輸入有效的聯絡手機';

      // 出生日期驗證
      if (!formData.birthYear) errors.birthYear = '請輸入出生年';
      else if (isNaN(formData.birthYear)) {
        errors.birthYear = '請輸入有效的出生年';
      } else {
        const year = parseInt(formData.birthYear);
        const currentYear = new Date().getFullYear();
        if (year < 1 || (year > 150 && year < 1900) || year > currentYear) {
          errors.birthYear = '請輸入有效的出生年（民國1-150年或西元1900年後）';
        }
      }
      
      if (!formData.birthMonth) errors.birthMonth = '請輸入出生月';
      else if (isNaN(formData.birthMonth) || formData.birthMonth < 1 || formData.birthMonth > 12) {
        errors.birthMonth = '請輸入1-12之間的數字';
      }
      
      if (!formData.birthDay) errors.birthDay = '請輸入出生日';
      else if (isNaN(formData.birthDay) || formData.birthDay < 1 || formData.birthDay > 31) {
        errors.birthDay = '請輸入1-31之間的數字';
      }

      // 地址驗證
      formData.addresses.forEach((addr, index) => {
        if (!addr.address) {
          errors[`addresses.${index}.address`] = '請輸入地址';
        }
      });

      // 家人驗證
      formData.familyMembers.forEach((member, index) => {
        if (!member.name) {
          errors[`familyMembers.${index}.name`] = '請輸入家人姓名';
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
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      try {
        // 處理主客戶的年份轉換
        let gregorianBirthYear = null;
        let lunarBirthYear = null;
        
        if (formData.birthYear) {
          const { minguoYear } = autoConvertToMinguo(parseInt(formData.birthYear, 10));
          const gregorianYear = convertMinguoForStorage(minguoYear);
          
          if (formData.calendarType === 'gregorian') {
            gregorianBirthYear = gregorianYear;
          } else if (formData.calendarType === 'lunar') {
            lunarBirthYear = gregorianYear;
          }
        }
        
        // 將當前表單數據進行自動轉換
        const convertedData = autoFillDates({
          ...formData,
          gregorianBirthYear: formData.calendarType === 'gregorian' ? gregorianBirthYear : null,
          gregorianBirthMonth: formData.calendarType === 'gregorian' ? parseInt(formData.birthMonth, 10) : null,
          gregorianBirthDay: formData.calendarType === 'gregorian' ? parseInt(formData.birthDay, 10) : null,
          lunarBirthYear: formData.calendarType === 'lunar' ? lunarBirthYear : null,
          lunarBirthMonth: formData.calendarType === 'lunar' ? parseInt(formData.birthMonth, 10) : null,
          lunarBirthDay: formData.calendarType === 'lunar' ? parseInt(formData.birthDay, 10) : null,
          lunarIsLeapMonth: formData.calendarType === 'lunar' ? formData.lunarIsLeapMonth : false
        });

        // 處理家人資料的日期轉換
        const convertedFamilyMembers = formData.familyMembers.map(member => {
          const processedMember = { ...member };
          
          if (member.birthYear) {
            const { minguoYear } = autoConvertToMinguo(parseInt(member.birthYear, 10));
            const gregorianYear = convertMinguoForStorage(minguoYear);
            
            if (member.calendarType === 'gregorian') {
              processedMember.gregorianBirthYear = gregorianYear;
              processedMember.gregorianBirthMonth = parseInt(member.birthMonth, 10);
              processedMember.gregorianBirthDay = parseInt(member.birthDay, 10);
            } else if (member.calendarType === 'lunar') {
              processedMember.lunarBirthYear = gregorianYear;
              processedMember.lunarBirthMonth = parseInt(member.birthMonth, 10);
              processedMember.lunarBirthDay = parseInt(member.birthDay, 10);
              processedMember.lunarIsLeapMonth = member.lunarIsLeapMonth || false;
            }
          }
          
          // 移除臨時欄位
          delete processedMember.birthYear;
          delete processedMember.birthMonth;
          delete processedMember.birthDay;
          delete processedMember.calendarType;
          
          return processedMember;
        });

        const dataWithAge = addVirtualAge({
          email: convertedData.email,
          name: convertedData.name,
          phone: convertedData.phone,
          gender: convertedData.gender,
          gregorianBirthYear: convertedData.gregorianBirthYear,
          gregorianBirthMonth: convertedData.gregorianBirthMonth,
          gregorianBirthDay: convertedData.gregorianBirthDay,
          lunarBirthYear: convertedData.lunarBirthYear,
          lunarBirthMonth: convertedData.lunarBirthMonth,
          lunarBirthDay: convertedData.lunarBirthDay,
          lunarIsLeapMonth: convertedData.lunarIsLeapMonth,
          addresses: convertedData.addresses,
          familyMembers: convertedFamilyMembers,
          consultationTopics: convertedData.consultationTopics,
          otherDetails: convertedData.otherDetails,
          remarks: convertedData.remarks
        });

        const submissionData = dataWithAge;

        console.log('提交的數據:', submissionData);
        dispatch(registerQueue(submissionData));
      } catch (error) {
        console.error('提交時轉換失敗:', error);
        dispatch(showAlert({
          message: '日期轉換失敗，請檢查輸入的日期是否正確',
          severity: 'error'
        }));
      }
    }
  };

  // 顯示成功訊息
  if (showSuccessMessage) {
    return (
      <Box sx={{ mt: 2, mb: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" align="center" gutterBottom color="success.main">
              候位登記成功！
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" color="text.secondary">
                候位號碼：
              </Typography>
              <Typography variant="h3" color="primary" sx={{ ml: 2 }}>
                {registeredQueueNumber}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  目前等待組數
                </Typography>
                <Typography variant="h6">
                  {waitingCount} 組
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  預估結束時間
                </Typography>
                <Typography variant="h6">
                  {estimatedEndTime ? 
                    new Date(estimatedEndTime).toLocaleTimeString('zh-TW', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true
                    }) : 
                    '無法計算'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: isDialog ? 0 : 2 }}>
      {/* 簡化模式提示 */}
      {queueStatus?.simplifiedMode && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>簡化模式已開啟</strong><br />
                目前只需要填寫「姓名」即可完成登記，其他欄位為選填。
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      )}
      
      <Grid container spacing={3}>
        {/* 基本資料 */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            基本資料
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            required={!queueStatus?.simplifiedMode}
            fullWidth
            id="name"
            name="name"
            label="姓名"
            value={formData.name}
            onChange={handleChange}
            error={Boolean(formErrors.name)}
            helperText={formErrors.name}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            required={!queueStatus?.simplifiedMode}
            fullWidth
            id="phone"
            name="phone"
            label="聯絡手機"
            value={formData.phone}
            onChange={handleChange}
            error={Boolean(formErrors.phone)}
            helperText={formErrors.phone}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            id="email"
            name="email"
            label="電子郵件 (選填)"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={Boolean(formErrors.email)}
            helperText={formErrors.email}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">性別</FormLabel>
            <RadioGroup
              row
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <FormControlLabel value="male" control={<Radio />} label="男" />
              <FormControlLabel value="female" control={<Radio />} label="女" />
            </RadioGroup>
          </FormControl>
        </Grid>

        {/* 出生日期 */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
            出生日期
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">出生日期類型</FormLabel>
            <RadioGroup
              row
              name="calendarType"
              value={formData.calendarType}
              onChange={handleChange}
            >
              <FormControlLabel value="gregorian" control={<Radio />} label="國曆" />
              <FormControlLabel value="lunar" control={<Radio />} label="農曆" />
            </RadioGroup>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            required={!queueStatus?.simplifiedMode}
            fullWidth
            id="birthYear"
            name="birthYear"
            label="出生年（民國年或西元年皆可）"
            type="number"
            InputProps={{ inputProps: { min: 1, max: new Date().getFullYear() } }}
            value={formData.birthYear}
            onChange={handleChange}
            error={Boolean(formErrors.birthYear)}
            helperText={formErrors.birthYear || "系統會自動判斷民國年或西元年"}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            required={!queueStatus?.simplifiedMode}
            fullWidth
            id="birthMonth"
            name="birthMonth"
            label="出生月"
            type="number"
            InputProps={{ inputProps: { min: 1, max: 12 } }}
            value={formData.birthMonth}
            onChange={handleChange}
            error={Boolean(formErrors.birthMonth)}
            helperText={formErrors.birthMonth}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            required={!queueStatus?.simplifiedMode}
            fullWidth
            id="birthDay"
            name="birthDay"
            label="出生日"
            type="number"
            InputProps={{ inputProps: { min: 1, max: 31 } }}
            value={formData.birthDay}
            onChange={handleChange}
            error={Boolean(formErrors.birthDay)}
            helperText={formErrors.birthDay}
          />
        </Grid>

        {/* 農曆閏月選項 */}
        {formData.calendarType === 'lunar' && (
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">農曆特殊設定</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.lunarIsLeapMonth}
                      onChange={(e) => setFormData({ ...formData, lunarIsLeapMonth: e.target.checked })}
                      name="lunarIsLeapMonth"
                    />
                  }
                  label="閏月"
                />
              </FormGroup>
            </FormControl>
          </Grid>
        )}

        {/* 顯示轉換後的日期 */}
        {(formData.convertedLunarYear || formData.convertedGregorianYear) && (
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                自動轉換結果：
              </Typography>
              {formData.convertedLunarYear && (
                <Typography variant="body2">
                  農曆：{formData.convertedLunarYear}年{formData.convertedLunarMonth}月{formData.convertedLunarDay}日
                  {formData.convertedLunarIsLeapMonth && ' (閏月)'}
                </Typography>
              )}
              {formData.convertedGregorianYear && (
                <Typography variant="body2">
                  國曆：{formData.convertedGregorianYear}年{formData.convertedGregorianMonth}月{formData.convertedGregorianDay}日
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        {/* 地址資訊 */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
            地址資訊
          </Typography>
        </Grid>

        {formData.addresses.map((address, index) => (
          <React.Fragment key={index}>
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  required
                  fullWidth
                  label={`地址${index > 0 ? ` ${index + 1}` : ''}`}
                  value={address.address}
                  onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                  error={Boolean(formErrors[`addresses.${index}.address`])}
                  helperText={formErrors[`addresses.${index}.address`]}
                />
                {index === 0 && formData.addresses.length < 3 && (
                  <IconButton
                    color="primary"
                    onClick={addAddress}
                    title="新增地址"
                    sx={{ ml: 1 }}
                  >
                    <AddIcon />
                  </IconButton>
                )}
                {index > 0 && (
                  <IconButton
                    color="error"
                    onClick={() => removeAddress(index)}
                    title="刪除地址"
                    sx={{ ml: 1 }}
                  >
                    <RemoveIcon />
                  </IconButton>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <FormLabel component="legend">地址類別</FormLabel>
                <RadioGroup
                  row
                  value={address.addressType}
                  onChange={(e) => handleAddressChange(index, 'addressType', e.target.value)}
                >
                  {addressTypeOptions.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio size="small" />}
                      label={option.label}
                      sx={{ minWidth: 'auto', mr: 1 }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Grid>
          </React.Fragment>
        ))}

        {/* 家人資訊 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              家人資訊
            </Typography>
            {formData.familyMembers.length < 5 && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addFamilyMember}
                sx={{ height: 40 }}
              >
                按我新增其他家人(至多新增5位)
              </Button>
            )}
          </Box>
        </Grid>

        {/* 家人詳細資訊 */}
        {formData.familyMembers.map((member, index) => (
          <Grid item xs={12} key={index}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`family-member-${index}-content`}
                id={`family-member-${index}-header`}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography sx={{ width: '33%', flexShrink: 0 }}>
                    家人 {index + 1} {member.name && `- ${member.name}`}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFamilyMember(index);
                    }}
                    sx={{ ml: 'auto', mr: 2 }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="姓名"
                      value={member.name}
                      onChange={(e) => handleFamilyMemberChange(index, 'name', e.target.value)}
                      error={Boolean(formErrors[`familyMembers.${index}.name`])}
                      helperText={formErrors[`familyMembers.${index}.name`]}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">出生日期類型</FormLabel>
                      <RadioGroup
                        row
                        name={`familyMembers.${index}.calendarType`}
                        value={member.calendarType}
                        onChange={(e) => handleFamilyMemberChange(index, 'calendarType', e.target.value)}
                      >
                        <FormControlLabel value="gregorian" control={<Radio />} label="國曆" />
                        <FormControlLabel value="lunar" control={<Radio />} label="農曆" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      required
                      fullWidth
                      label="出生年"
                      type="number"
                      value={member.birthYear}
                      onChange={(e) => handleFamilyMemberChange(index, 'birthYear', e.target.value)}
                      error={Boolean(formErrors[`familyMembers.${index}.birthYear`])}
                      helperText={formErrors[`familyMembers.${index}.birthYear`]}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      required
                      fullWidth
                      label="出生月"
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 12 } }}
                      value={member.birthMonth}
                      onChange={(e) => handleFamilyMemberChange(index, 'birthMonth', e.target.value)}
                      error={Boolean(formErrors[`familyMembers.${index}.birthMonth`])}
                      helperText={formErrors[`familyMembers.${index}.birthMonth`]}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      required
                      fullWidth
                      label="出生日"
                      type="number"
                      InputProps={{ inputProps: { min: 1, max: 31 } }}
                      value={member.birthDay}
                      onChange={(e) => handleFamilyMemberChange(index, 'birthDay', e.target.value)}
                      error={Boolean(formErrors[`familyMembers.${index}.birthDay`])}
                      helperText={formErrors[`familyMembers.${index}.birthDay`]}
                    />
                  </Grid>

                  {/* 農曆閏月選項 - 家人 */}
                  {member.calendarType === 'lunar' && (
                    <Grid item xs={12}>
                      <FormControl component="fieldset">
                        <FormLabel component="legend">農曆特殊設定</FormLabel>
                        <FormGroup>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={member.lunarIsLeapMonth || false}
                                onChange={(e) => handleFamilyMemberChange(index, 'lunarIsLeapMonth', e.target.checked)}
                              />
                            }
                            label="閏月"
                          />
                        </FormGroup>
                      </FormControl>
                    </Grid>
                  )}

                  {/* 顯示家人轉換後的日期 */}
                  {(member.convertedLunarYear || member.convertedGregorianYear) && (
                    <Grid item xs={12}>
                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          自動轉換結果：
                        </Typography>
                        {member.convertedLunarYear && (
                          <Typography variant="body2">
                            農曆：{member.convertedLunarYear}年{member.convertedLunarMonth}月{member.convertedLunarDay}日
                            {member.convertedLunarIsLeapMonth && ' (閏月)'}
                          </Typography>
                        )}
                        {member.convertedGregorianYear && (
                          <Typography variant="body2">
                            國曆：{member.convertedGregorianYear}年{member.convertedGregorianMonth}月{member.convertedGregorianDay}日
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  )}

                  <Grid item xs={12} sm={8}>
                    <TextField
                      required
                      fullWidth
                      label="地址"
                      value={member.address}
                      onChange={(e) => handleFamilyMemberChange(index, 'address', e.target.value)}
                      error={Boolean(formErrors[`familyMembers.${index}.address`])}
                      helperText={formErrors[`familyMembers.${index}.address`]}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <FormLabel component="legend">地址類別</FormLabel>
                      <RadioGroup
                        row
                        value={member.addressType}
                        onChange={(e) => handleFamilyMemberChange(index, 'addressType', e.target.value)}
                      >
                        {addressTypeOptions.map((option) => (
                          <FormControlLabel
                            key={option.value}
                            value={option.value}
                            control={<Radio size="small" />}
                            label={option.label}
                            sx={{ minWidth: 'auto', mr: 1 }}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        ))}

        {/* 請示內容 */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
            請示內容
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset" error={Boolean(formErrors.consultationTopics)}>
            <FormLabel component="legend">請選擇請示內容（可複選）</FormLabel>
            <FormGroup row>
              {consultationOptions.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={formData.consultationTopics.includes(option.value)}
                      onChange={handleChange}
                      value={option.value}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
            {formErrors.consultationTopics && (
              <FormHelperText>{formErrors.consultationTopics}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* 其他詳細內容欄位 - 只在勾選"其他"時顯示 */}
        {formData.consultationTopics.includes('other') && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="請詳細說明其他問題"
              multiline
              rows={3}
              value={formData.otherDetails}
              onChange={(e) => setFormData({ ...formData, otherDetails: e.target.value })}
              error={Boolean(formErrors.otherDetails)}
              helperText={formErrors.otherDetails || '請詳細說明您要諮詢的其他問題（最多500字）'}
              placeholder="請詳細描述您的問題..."
              inputProps={{ maxLength: 500 }}
            />
          </Grid>
        )}

        {/* 備註欄位 */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="其他備註(選填)"
            multiline
            rows={3}
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="如有其他需要說明的事項，請在此填寫..."
            inputProps={{ maxLength: 1000 }}
            helperText="可填寫任何其他備註事項（最多1000字）"
          />
        </Grid>

        {/* 提交按鈕 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isLoading}
              size="large"
              sx={{ minWidth: 200 }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  登記中...
                </>
              ) : (
                '提交候位申請'
              )}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RegisterForm; 