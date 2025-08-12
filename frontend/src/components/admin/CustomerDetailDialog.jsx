import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Divider,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormLabel,
  RadioGroup,
  Radio,
  IconButton,
  Tooltip,
  Box
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { 
  autoFillDates, 
  autoFillFamilyMembersDates, 
  formatMinguoYear, 
  formatMinguoDate,
  autoConvertToMinguo,
  convertMinguoForStorage 
} from '../../utils/calendarConverter';

const CustomerDetailDialog = ({
  open,
  selectedRecord,
  editMode,
  editedData,
  onClose,
  onEnterEditMode,
  onSaveData,
  onInputChange,
  onAddressChange,
  onAddAddress,
  onRemoveAddress,
  onFamilyMemberChange,
  onAddFamilyMember,
  onRemoveFamilyMember,
  onTopicChange,
  onCompleteFromDialog
}) => {
  const formatConsultationTopics = (topics, otherDetails = '') => {
    if (!topics || topics.length === 0) return '無';
    
    const topicMap = {
      'body': '身體',
      'fate': '運途',
      'karma': '因果',
      'family': '家運/祖先',
      'career': '事業',
      'relationship': '婚姻感情',
      'study': '學業',
      'blessing': '收驚/加持',
      'other': '其他'
    };
    
    const formattedTopics = topics.map(topic => topicMap[topic] || topic);
    
    // 如果包含"其他"且有詳細內容，顯示詳細內容
    if (topics.includes('other') && otherDetails) {
      const otherIndex = formattedTopics.indexOf('其他');
      if (otherIndex !== -1) {
        formattedTopics[otherIndex] = `其他(${otherDetails})`;
      }
    }
    
    return formattedTopics.join(', ');
  };

  const formatAddressType = (type) => {
    const typeMap = {
      'home': '住家',
      'work': '工作場所',
      'hospital': '醫院',
      'other': '其他'
    };
    return typeMap[type] || type;
  };

  const formatAddresses = (addresses) => {
    if (!addresses || addresses.length === 0) return '無';
    
    return addresses.map(addr => 
      `${addr.address} (${formatAddressType(addr.addressType)})`
    ).join('; ');
  };

  const formatFamilyMembers = (familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) return '無';
    
    return familyMembers.map((member, index) => {
      const birthInfos = [];
      
      // 國曆出生日期
      if (member.gregorianBirthYear && member.gregorianBirthMonth && member.gregorianBirthDay) {
        const gregorianDate = formatMinguoDate(
          member.gregorianBirthYear,
          member.gregorianBirthMonth,
          member.gregorianBirthDay
        );
        birthInfos.push(`國曆：${gregorianDate}`);
      }
      
      // 農曆出生日期
      if (member.lunarBirthYear && member.lunarBirthMonth && member.lunarBirthDay) {
        const lunarDate = formatMinguoDate(
          member.lunarBirthYear,
          member.lunarBirthMonth,
          member.lunarBirthDay
        );
        const leapText = member.lunarIsLeapMonth ? '閏' : '';
        birthInfos.push(`農曆：${lunarDate}${leapText ? ` (${leapText}月)` : ''}`);
      }
      
      const birthInfo = birthInfos.length > 0 ? birthInfos.join(' / ') : '出生日期未設定';
      
      // 添加虛歲顯示
      const ageInfo = member.virtualAge ? ` (虛歲${member.virtualAge}歲)` : '';
      
      // 添加性別顯示
      const genderText = member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '';
      const genderInfo = genderText ? ` (${genderText})` : '';
      
      return `${member.name}${genderInfo}${ageInfo} - ${birthInfo} - ${member.address || '未填寫地址'} (${formatAddressType(member.addressType)})`;
    }).join('; ');
  };

  const getTotalPeopleCount = (familyMembers) => {
    return 1 + (familyMembers ? familyMembers.length : 0);
  };

  const formatGender = (gender) => {
    switch (gender) {
      case 'male':
        return '男';
      case 'female':
        return '女';
      default:
        return gender || '';
    }
  };

  const formatBirthDate = (record) => {
    const birthInfos = [];
    
    // 國曆出生日期
    if (record.gregorianBirthYear && record.gregorianBirthMonth && record.gregorianBirthDay) {
      const gregorianDate = formatMinguoDate(
        record.gregorianBirthYear,
        record.gregorianBirthMonth,
        record.gregorianBirthDay
      );
      birthInfos.push(`國曆：${gregorianDate}`);
    }
    
    // 農曆出生日期
    if (record.lunarBirthYear && record.lunarBirthMonth && record.lunarBirthDay) {
      const lunarDate = formatMinguoDate(
        record.lunarBirthYear,
        record.lunarBirthMonth,
        record.lunarBirthDay
      );
      const leapText = record.lunarIsLeapMonth ? '閏' : '';
      birthInfos.push(`農曆：${lunarDate}${leapText ? ` (${leapText}月)` : ''}`);
    }
    
    return birthInfos.length > 0 ? birthInfos.join(' / ') : '出生日期未設定';
  };

  if (!selectedRecord) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          客戶詳細資料
          {!editMode && (
            <Tooltip title="編輯資料">
              <IconButton onClick={onEnterEditMode} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {!editMode ? (
          // 顯示模式
          <Grid container spacing={3}>
            {/* 基本資料 */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    基本資料
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">候位號碼</Typography>
                      <Typography variant="body1">{selectedRecord.queueNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">叫號順序</Typography>
                      <Typography variant="body1">{selectedRecord.orderIndex}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">姓名</Typography>
                      <Typography variant="body1">{selectedRecord.name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">性別</Typography>
                      <Typography variant="body1">{formatGender(selectedRecord.gender)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">電話</Typography>
                      <Typography variant="body1">{selectedRecord.phone}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">電子郵件</Typography>
                      <Typography variant="body1">{selectedRecord.email || '未提供'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">出生日期</Typography>
                      <Typography variant="body1">{formatBirthDate(selectedRecord)}</Typography>
                    </Grid>
                    {selectedRecord.virtualAge && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">虛歲</Typography>
                        <Typography variant="body1">{selectedRecord.virtualAge}歲</Typography>
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">總人數</Typography>
                      <Typography variant="body1">{getTotalPeopleCount(selectedRecord.familyMembers)}人</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* 地址資訊 */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    地址資訊
                  </Typography>
                  <Typography variant="body1">
                    {formatAddresses(selectedRecord.addresses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 家人資訊 */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    家人資訊
                  </Typography>
                  <Typography variant="body1">
                    {formatFamilyMembers(selectedRecord.familyMembers)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 諮詢主題 */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    諮詢主題
                  </Typography>
                  <Typography variant="body1">
                    {formatConsultationTopics(selectedRecord.consultationTopics, selectedRecord.otherDetails)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 備註 */}
            {selectedRecord.remarks && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      備註
                    </Typography>
                    <Typography variant="body1">
                      {selectedRecord.remarks}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* 時間資訊 */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    時間資訊
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">登記時間</Typography>
                      <Typography variant="body1">
                        {selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString('zh-TW') : ''}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">更新時間</Typography>
                      <Typography variant="body1">
                        {selectedRecord.updatedAt ? new Date(selectedRecord.updatedAt).toLocaleString('zh-TW') : ''}
                      </Typography>
                    </Grid>
                    {selectedRecord.completedAt && (
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">完成時間</Typography>
                        <Typography variant="body1">
                          {new Date(selectedRecord.completedAt).toLocaleString('zh-TW')}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          // 編輯模式
          <Grid container spacing={3}>
            {/* 基本資料編輯 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                基本資料
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="候位號碼"
                    name="queueNumber"
                    value={editedData.queueNumber || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="姓名"
                    name="name"
                    value={editedData.name || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="電話"
                    name="phone"
                    value={editedData.phone || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="電子郵件"
                    name="email"
                    value={editedData.email || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>性別</InputLabel>
                    <Select
                      name="gender"
                      value={editedData.gender || ''}
                      onChange={onInputChange}
                      label="性別"
                    >
                      <MenuItem value="male">男</MenuItem>
                      <MenuItem value="female">女</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="備註"
                    name="remarks"
                    value={editedData.remarks || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* 出生日期編輯 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                出生日期
              </Typography>
              
              {/* 國曆出生日期 */}
              <Typography variant="subtitle2" gutterBottom>
                國曆出生日期
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="年 (民國)"
                    name="gregorianBirthYear"
                    type="number"
                    value={editedData.gregorianBirthYear || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="月"
                    name="gregorianBirthMonth"
                    type="number"
                    value={editedData.gregorianBirthMonth || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="日"
                    name="gregorianBirthDay"
                    type="number"
                    value={editedData.gregorianBirthDay || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Grid>
              </Grid>

              {/* 農曆出生日期 */}
              <Typography variant="subtitle2" gutterBottom>
                農曆出生日期
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="年 (民國)"
                    name="lunarBirthYear"
                    type="number"
                    value={editedData.lunarBirthYear || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="月"
                    name="lunarBirthMonth"
                    type="number"
                    value={editedData.lunarBirthMonth || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    label="日"
                    name="lunarBirthDay"
                    type="number"
                    value={editedData.lunarBirthDay || ''}
                    onChange={onInputChange}
                    variant="outlined"
                    size="small"
                    inputProps={{ min: 1, max: 30 }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="lunarIsLeapMonth"
                        checked={editedData.lunarIsLeapMonth || false}
                        onChange={(e) => onInputChange({
                          target: { name: 'lunarIsLeapMonth', value: e.target.checked }
                        })}
                      />
                    }
                    label="閏月"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* 地址編輯 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                地址資訊
              </Typography>
              {editedData.addresses?.map((address, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2">地址 {index + 1}</Typography>
                      {editedData.addresses.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRemoveAddress(index)}
                        >
                          <RemoveIcon />
                        </IconButton>
                      )}
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={8}>
                        <TextField
                          fullWidth
                          label="地址"
                          value={address.address || ''}
                          onChange={(e) => onAddressChange(index, 'address', e.target.value)}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>地址類型</InputLabel>
                          <Select
                            value={address.addressType || 'home'}
                            onChange={(e) => onAddressChange(index, 'addressType', e.target.value)}
                            label="地址類型"
                          >
                            <MenuItem value="home">住家</MenuItem>
                            <MenuItem value="work">工作場所</MenuItem>
                            <MenuItem value="hospital">醫院</MenuItem>
                            <MenuItem value="other">其他</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              
              {(!editedData.addresses || editedData.addresses.length < 3) && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={onAddAddress}
                  variant="outlined"
                  size="small"
                >
                  新增地址
                </Button>
              )}
            </Grid>

            {/* 家人編輯 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                家人資訊
              </Typography>
              {editedData.familyMembers?.map((member, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography>家人 {index + 1}: {member.name || '未命名'}</Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFamilyMember(index);
                        }}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="姓名"
                          value={member.name || ''}
                          onChange={(e) => onFamilyMemberChange(index, 'name', e.target.value)}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>性別</InputLabel>
                          <Select
                            value={member.gender || ''}
                            onChange={(e) => onFamilyMemberChange(index, 'gender', e.target.value)}
                            label="性別"
                          >
                            <MenuItem value="male">男</MenuItem>
                            <MenuItem value="female">女</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      {/* 家人國曆出生日期 */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          國曆出生日期
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              label="年 (民國)"
                              type="number"
                              value={member.gregorianBirthYear || ''}
                              onChange={(e) => onFamilyMemberChange(index, 'gregorianBirthYear', e.target.value)}
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              label="月"
                              type="number"
                              value={member.gregorianBirthMonth || ''}
                              onChange={(e) => onFamilyMemberChange(index, 'gregorianBirthMonth', e.target.value)}
                              variant="outlined"
                              size="small"
                              inputProps={{ min: 1, max: 12 }}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              fullWidth
                              label="日"
                              type="number"
                              value={member.gregorianBirthDay || ''}
                              onChange={(e) => onFamilyMemberChange(index, 'gregorianBirthDay', e.target.value)}
                              variant="outlined"
                              size="small"
                              inputProps={{ min: 1, max: 31 }}
                            />
                          </Grid>
                        </Grid>
                      </Grid>

                      {/* 家人農曆出生日期 */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          農曆出生日期
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              label="年 (民國)"
                              type="number"
                              value={member.lunarBirthYear || ''}
                              onChange={(e) => onFamilyMemberChange(index, 'lunarBirthYear', e.target.value)}
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              label="月"
                              type="number"
                              value={member.lunarBirthMonth || ''}
                              onChange={(e) => onFamilyMemberChange(index, 'lunarBirthMonth', e.target.value)}
                              variant="outlined"
                              size="small"
                              inputProps={{ min: 1, max: 12 }}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              fullWidth
                              label="日"
                              type="number"
                              value={member.lunarBirthDay || ''}
                              onChange={(e) => onFamilyMemberChange(index, 'lunarBirthDay', e.target.value)}
                              variant="outlined"
                              size="small"
                              inputProps={{ min: 1, max: 30 }}
                            />
                          </Grid>
                          <Grid item xs={3}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={member.lunarIsLeapMonth || false}
                                  onChange={(e) => onFamilyMemberChange(index, 'lunarIsLeapMonth', e.target.checked)}
                                />
                              }
                              label="閏月"
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
              
              {(!editedData.familyMembers || editedData.familyMembers.length < 5) && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={onAddFamilyMember}
                  variant="outlined"
                  size="small"
                >
                  新增家人
                </Button>
              )}
            </Grid>

            {/* 諮詢主題編輯 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                諮詢主題
              </Typography>
              <FormGroup>
                {[
                  { value: 'business_registration', label: '商業登記' },
                  { value: 'tax_consultation', label: '稅務諮詢' },
                  { value: 'legal_consultation', label: '法律諮詢' },
                  { value: 'license_application', label: '證照申請' },
                  { value: 'other', label: '其他' }
                ].map((topic) => (
                  <FormControlLabel
                    key={topic.value}
                    control={
                      <Checkbox
                        checked={editedData.consultationTopics?.includes(topic.value) || false}
                        onChange={() => onTopicChange(topic.value)}
                      />
                    }
                    label={topic.label}
                  />
                ))}
              </FormGroup>
              
              {editedData.consultationTopics?.includes('other') && (
                <TextField
                  fullWidth
                  label="其他詳細內容"
                  name="otherDetails"
                  value={editedData.otherDetails || ''}
                  onChange={onInputChange}
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  sx={{ mt: 2 }}
                />
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions>
        {editMode ? (
          <>
            <Button onClick={onClose} startIcon={<CloseIcon />}>
              取消
            </Button>
            <Button
              onClick={onSaveData}
              variant="contained"
              startIcon={<SaveIcon />}
            >
              儲存
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>
              關閉
            </Button>
            {selectedRecord.status !== 'completed' && selectedRecord.status !== 'cancelled' && (
              <Button
                onClick={() => onCompleteFromDialog(selectedRecord._id)}
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
              >
                標記為已完成
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CustomerDetailDialog;
