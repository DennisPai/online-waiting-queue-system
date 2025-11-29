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
  Alert,
  MenuItem,
  Select,
  InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { registerQueue, resetRegistration, getQueueStatus, getMaxOrderIndex } from '../redux/slices/queueSlice';
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
  const { isLoading, registeredQueueNumber, waitingCount, estimatedWaitTime, estimatedEndTime, error, queueStatus, maxOrderIndex, maxOrderMessage } = useSelector(
    (state) => state.queue
  );
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // 組件掛載時先重置狀態並獲取系統設定
  useEffect(() => {
    dispatch(resetRegistration());
    dispatch(getQueueStatus()); // 獲取系統設定，包含簡化模式
    dispatch(getMaxOrderIndex()); // 獲取目前最大叫號順序
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

  const validateForm = () => {
    const errors = {};
    
    // 檢查是否為簡化模式
    const isSimplifiedMode = queueStatus?.simplifiedMode || false;
    console.log('簡化模式狀態:', isSimplifiedMode, '完整狀態:', queueStatus);
    
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
      setFormData({ ...formData, [name]: value });
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
    
    // 清除錯誤
    const errorKey = `addresses.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors({ ...formErrors, [errorKey]: null });
    }
  };

  // 新增地址
  const addAddress = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, { address: '', addressType: 'home' }]
    });
  };

  // 移除地址
  const removeAddress = (index) => {
    if (formData.addresses.length > 1) {
      const newAddresses = formData.addresses.filter((_, i) => i !== index);
      setFormData({ ...formData, addresses: newAddresses });
    }
  };

  // 處理家人變更
  const handleFamilyMemberChange = (index, field, value) => {
    const newFamilyMembers = [...formData.familyMembers];
    newFamilyMembers[index] = { ...newFamilyMembers[index], [field]: value };
    setFormData({ ...formData, familyMembers: newFamilyMembers });
    
    // 清除錯誤
    const errorKey = `familyMembers.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors({ ...formErrors, [errorKey]: null });
    }
  };

  // 處理家人地址"同上"功能
  const handleUsePrimaryAddress = (index, checked) => {
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
  };

  // 新增家人
  const addFamilyMember = () => {
    setFormData({
      ...formData,
      familyMembers: [...formData.familyMembers, {
        name: '',
        gender: 'male',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        calendarType: 'gregorian',
        lunarIsLeapMonth: false,
        address: '',
        addressType: 'home'
      }]
    });
  };

  // 移除家人
  const removeFamilyMember = (index) => {
    const newFamilyMembers = formData.familyMembers.filter((_, i) => i !== index);
    setFormData({ ...formData, familyMembers: newFamilyMembers });
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // 準備提交的數據
      let submitData = { ...formData };
      
      // 檢查是否為簡化模式
      const isSimplifiedMode = queueStatus?.simplifiedMode || false;
      
      if (isSimplifiedMode) {
        console.log('簡化模式：自動填入預設值');
        
        // 自動填入必要的預設值
        if (!submitData.email) {
          submitData.email = `temp_${Date.now()}@temp.com`;
        }
        if (!submitData.phone) {
          submitData.phone = '0000000000';
        }
        if (!submitData.addresses || submitData.addresses.length === 0) {
          submitData.addresses = [{ address: '臨時地址', addressType: 'home' }];
        }
        if (!submitData.consultationTopics || submitData.consultationTopics.length === 0) {
          submitData.consultationTopics = ['other'];
          // 在簡化模式下，若預設選擇"其他"，需要提供預設的詳細內容
          if (!submitData.otherDetails) {
            submitData.otherDetails = '簡化模式快速登記';
          }
        }
        
        // 確保地址陣列中的每個地址都有內容
        submitData.addresses = submitData.addresses.map(addr => ({
          address: addr.address || '臨時地址',
          addressType: addr.addressType || 'home'
        }));
        
        // 如果沒有出生日期，設置預設值
        if (!submitData.birthYear) {
          submitData.birthYear = '80'; // 民國80年
          submitData.birthMonth = '1';
          submitData.birthDay = '1';
          submitData.calendarType = 'gregorian';
        }
      }
      
      // 轉換日期欄位格式以符合後端期望
      if (submitData.calendarType === 'gregorian') {
        submitData.gregorianBirthYear = submitData.birthYear ? parseInt(submitData.birthYear) : null;
        submitData.gregorianBirthMonth = submitData.birthMonth ? parseInt(submitData.birthMonth) : null;
        submitData.gregorianBirthDay = submitData.birthDay ? parseInt(submitData.birthDay) : null;
      } else if (submitData.calendarType === 'lunar') {
        submitData.lunarBirthYear = submitData.birthYear ? parseInt(submitData.birthYear) : null;
        submitData.lunarBirthMonth = submitData.birthMonth ? parseInt(submitData.birthMonth) : null;
        submitData.lunarBirthDay = submitData.birthDay ? parseInt(submitData.birthDay) : null;
        submitData.lunarIsLeapMonth = submitData.lunarIsLeapMonth || false;
      }
      
      // 處理家人數據的日期欄位
      if (submitData.familyMembers && submitData.familyMembers.length > 0) {
        submitData.familyMembers = submitData.familyMembers.map(member => {
          const processedMember = { ...member };
          
          if (member.calendarType === 'gregorian') {
            processedMember.gregorianBirthYear = member.birthYear ? parseInt(member.birthYear) : null;
            processedMember.gregorianBirthMonth = member.birthMonth ? parseInt(member.birthMonth) : null;
            processedMember.gregorianBirthDay = member.birthDay ? parseInt(member.birthDay) : null;
          } else if (member.calendarType === 'lunar') {
            processedMember.lunarBirthYear = member.birthYear ? parseInt(member.birthYear) : null;
            processedMember.lunarBirthMonth = member.birthMonth ? parseInt(member.birthMonth) : null;
            processedMember.lunarBirthDay = member.birthDay ? parseInt(member.birthDay) : null;
            processedMember.lunarIsLeapMonth = member.lunarIsLeapMonth || false;
          }
          
          return processedMember;
        });
      }
      
      console.log('準備提交的數據:', submitData);
      dispatch(registerQueue(submitData));
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

  const isSimplifiedMode = queueStatus?.simplifiedMode || false;

  return (
    <Box sx={{ mt: isDialog ? 0 : 2 }}>
      {/* 顯示目前最大叫號順序的提醒訊息 */}
      {maxOrderMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>📢 候位提醒：</strong>{maxOrderMessage}<br />
            您將會是第 {maxOrderIndex + 1} 號
            {maxOrderIndex + 1 > 80 && (
              <>
                <br />
                <span style={{ color: '#ff9800' }}>
                  ※ 超過80號預計將排至凌晨1點以後，若非重大問題急需求助，建議預約下次問事。
                </span>
              </>
            )}
          </Typography>
        </Alert>
      )}
      
      {/* 簡化模式提示 */}
      {isSimplifiedMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>簡化模式已開啟</strong><br />
            目前只需要填寫「姓名」即可完成登記，其他欄位為選填。
          </Typography>
        </Alert>
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
            required
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
            required={!isSimplifiedMode}
            fullWidth
            id="phone"
            name="phone"
            label={`聯絡手機${isSimplifiedMode ? ' (選填)' : ''}`}
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
        {!isSimplifiedMode && (
          <>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
                出生日期
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">曆法類型</FormLabel>
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
                required
                fullWidth
                id="birthYear"
                name="birthYear"
                label={formData.calendarType === 'gregorian' ? '出生年 (民國或西元)' : '農曆出生年'}
                value={formData.birthYear}
                onChange={handleChange}
                error={Boolean(formErrors.birthYear)}
                helperText={formErrors.birthYear}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                id="birthMonth"
                name="birthMonth"
                label="出生月"
                type="number"
                inputProps={{ min: 1, max: 12 }}
                value={formData.birthMonth}
                onChange={handleChange}
                error={Boolean(formErrors.birthMonth)}
                helperText={formErrors.birthMonth}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                id="birthDay"
                name="birthDay"
                label="出生日"
                type="number"
                inputProps={{ min: 1, max: 31 }}
                value={formData.birthDay}
                onChange={handleChange}
                error={Boolean(formErrors.birthDay)}
                helperText={formErrors.birthDay}
              />
            </Grid>

            {formData.calendarType === 'lunar' && (
              <Grid item xs={12}>
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
              </Grid>
            )}
          </>
        )}

        {/* 地址資料 */}
        {!isSimplifiedMode && (
          <>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  地址資料
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addAddress}
                >
                  新增地址
                </Button>
              </Box>
            </Grid>

            {formData.addresses.map((address, index) => (
              <React.Fragment key={index}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label={`地址 ${index + 1}`}
                    value={address.address}
                    onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                    error={Boolean(formErrors[`addresses.${index}.address`])}
                    helperText={formErrors[`addresses.${index}.address`]}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <FormControl fullWidth>
                    <InputLabel>地址類型</InputLabel>
                    <Select
                      value={address.addressType}
                      label="地址類型"
                      onChange={(e) => handleAddressChange(index, 'addressType', e.target.value)}
                    >
                      {addressTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={1}>
                  <IconButton
                    onClick={() => removeAddress(index)}
                    disabled={formData.addresses.length === 1}
                    color="error"
                  >
                    <RemoveIcon />
                  </IconButton>
                </Grid>
              </React.Fragment>
            ))}
          </>
        )}

        {/* 家人資料 */}
        {!isSimplifiedMode && (
          <>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  家人資料 (選填)
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addFamilyMember}
                >
                  新增家人
                </Button>
              </Box>
            </Grid>

            {formData.familyMembers.map((member, index) => (
              <Grid item xs={12} key={index}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flexGrow: 1 }}>
                        家人 {index + 1}: {member.name || '(未填寫姓名)'}
                      </Typography>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFamilyMember(index);
                        }}
                        size="small"
                        color="error"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {/* 姓名 */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="姓名"
                          value={member.name}
                          onChange={(e) => handleFamilyMemberChange(index, 'name', e.target.value)}
                          error={Boolean(formErrors[`familyMembers.${index}.name`])}
                          helperText={formErrors[`familyMembers.${index}.name`]}
                        />
                      </Grid>

                      {/* 性別 */}
                      <Grid item xs={12} sm={6}>
                        <FormControl component="fieldset">
                          <FormLabel component="legend">性別</FormLabel>
                          <RadioGroup
                            row
                            value={member.gender || 'male'}
                            onChange={(e) => handleFamilyMemberChange(index, 'gender', e.target.value)}
                          >
                            <FormControlLabel value="male" control={<Radio size="small" />} label="男" />
                            <FormControlLabel value="female" control={<Radio size="small" />} label="女" />
                          </RadioGroup>
                        </FormControl>
                      </Grid>

                      {/* 生日曆法選擇 */}
                      <Grid item xs={12}>
                        <FormControl component="fieldset">
                          <FormLabel component="legend">生日曆法</FormLabel>
                          <RadioGroup
                            row
                            value={member.calendarType || 'gregorian'}
                            onChange={(e) => handleFamilyMemberChange(index, 'calendarType', e.target.value)}
                          >
                            <FormControlLabel value="gregorian" control={<Radio size="small" />} label="國曆（西元/民國）" />
                            <FormControlLabel value="lunar" control={<Radio size="small" />} label="農曆" />
                          </RadioGroup>
                        </FormControl>
                      </Grid>

                      {/* 出生年月日 */}
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label={`出生年 (${(member.calendarType || 'gregorian') === 'gregorian' ? '西元' : '民國'})`}
                          type="number"
                          value={member.birthYear}
                          onChange={(e) => handleFamilyMemberChange(index, 'birthYear', e.target.value)}
                          error={Boolean(formErrors[`familyMembers.${index}.birthYear`])}
                          helperText={formErrors[`familyMembers.${index}.birthYear`]}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="出生月"
                          type="number"
                          inputProps={{ min: 1, max: 12 }}
                          value={member.birthMonth}
                          onChange={(e) => handleFamilyMemberChange(index, 'birthMonth', e.target.value)}
                          error={Boolean(formErrors[`familyMembers.${index}.birthMonth`])}
                          helperText={formErrors[`familyMembers.${index}.birthMonth`]}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="出生日"
                          type="number"
                          inputProps={{ min: 1, max: 31 }}
                          value={member.birthDay}
                          onChange={(e) => handleFamilyMemberChange(index, 'birthDay', e.target.value)}
                          error={Boolean(formErrors[`familyMembers.${index}.birthDay`])}
                          helperText={formErrors[`familyMembers.${index}.birthDay`]}
                        />
                      </Grid>

                      {/* 農曆閏月選項 */}
                      {(member.calendarType || 'gregorian') === 'lunar' && (
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={member.lunarIsLeapMonth || false}
                                onChange={(e) => handleFamilyMemberChange(index, 'lunarIsLeapMonth', e.target.checked)}
                              />
                            }
                            label="閏月"
                          />
                        </Grid>
                      )}

                      {/* 地址同上核取方框 */}
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={member.usePrimaryAddress || false}
                              onChange={(e) => handleUsePrimaryAddress(index, e.target.checked)}
                              disabled={!formData.addresses?.[0]?.address}
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="body2">
                              同上（使用主客戶地址）
                            </Typography>
                          }
                        />
                        {!formData.addresses?.[0]?.address && (
                          <Typography variant="caption" color="error" sx={{ ml: 4, display: 'block' }}>
                            請先填寫主客戶地址
                          </Typography>
                        )}
                      </Grid>

                      {/* 地址 */}
                      <Grid item xs={12} sm={8}>
                        <TextField
                          fullWidth
                          label="地址"
                          value={member.address}
                          onChange={(e) => handleFamilyMemberChange(index, 'address', e.target.value)}
                          error={Boolean(formErrors[`familyMembers.${index}.address`])}
                          helperText={formErrors[`familyMembers.${index}.address`]}
                          placeholder="請輸入完整住址"
                        />
                      </Grid>

                      {/* 地址類型 */}
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <FormLabel component="legend">地址類別</FormLabel>
                          <RadioGroup
                            row
                            value={member.addressType || 'home'}
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
          </>
        )}

        {/* 請示內容 */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
            請示內容
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset" error={Boolean(formErrors.consultationTopics)}>
            <FormLabel component="legend">
              請選擇諮詢主題 {!isSimplifiedMode && '(必選)'}
              {isSimplifiedMode && ' (選填)'}
            </FormLabel>
            <FormGroup>
              <Grid container>
                {consultationOptions.map((option) => (
                  <Grid item xs={6} sm={4} md={3} key={option.value}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.consultationTopics.includes(option.value)}
                          onChange={handleChange}
                          name="consultationTopics"
                          value={option.value}
                        />
                      }
                      label={option.label}
                    />
                  </Grid>
                ))}
              </Grid>
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
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={isLoading}
              sx={{ minWidth: 200 }}
            >
              {isLoading ? <CircularProgress size={24} /> : '提交登記'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RegisterForm; 