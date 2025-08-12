import React from 'react';
import {
  Grid,
  Typography,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatMinguoYear } from '../../utils/calendarConverter';

// 地址類型選項
const addressTypeOptions = [
  { value: 'home', label: '住家' },
  { value: 'work', label: '工作場所' },
  { value: 'hospital', label: '醫院' },
  { value: 'other', label: '其他' }
];

const FamilySection = ({
  formData,
  formErrors,
  onFamilyMemberChange,
  onAddFamilyMember,
  onRemoveFamilyMember,
  simplified = false
}) => {
  return (
    <>
      {/* 標題 */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
          家人資訊
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          如需為家人一併請示，請填寫家人資訊（最多5人）
        </Typography>
      </Grid>

      {/* 家人列表 */}
      {formData.familyMembers?.map((member, index) => (
        <Grid item xs={12} key={index}>
          <Accordion sx={{ mb: 1 }}>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                backgroundColor: 'background.default',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography variant="subtitle1">
                  家人 {index + 1}: {member.name || '未命名'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFamilyMember(index);
                  }}
                  color="error"
                  sx={{ mr: 1 }}
                >
                  <RemoveIcon />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* 姓名 */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    required={!simplified}
                    fullWidth
                    label="姓名"
                    value={member.name || ''}
                    onChange={(e) => onFamilyMemberChange(index, 'name', e.target.value)}
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
                      value={member.gender || ''}
                      onChange={(e) => onFamilyMemberChange(index, 'gender', e.target.value)}
                    >
                      <FormControlLabel value="male" control={<Radio />} label="男" />
                      <FormControlLabel value="female" control={<Radio />} label="女" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* 曆法選擇 */}
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">曆法選擇</FormLabel>
                    <RadioGroup
                      row
                      value={member.calendarType || 'gregorian'}
                      onChange={(e) => onFamilyMemberChange(index, 'calendarType', e.target.value)}
                    >
                      <FormControlLabel value="gregorian" control={<Radio />} label="國曆" />
                      <FormControlLabel value="lunar" control={<Radio />} label="農曆" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* 出生年月日 */}
                <Grid item xs={4}>
                  <TextField
                    required={!simplified}
                    fullWidth
                    label={`出生年 (${(member.calendarType || 'gregorian') === 'gregorian' ? '西元' : '民國'})`}
                    type="number"
                    value={member.birthYear || ''}
                    onChange={(e) => onFamilyMemberChange(index, 'birthYear', e.target.value)}
                    error={Boolean(formErrors[`familyMembers.${index}.birthYear`])}
                    helperText={formErrors[`familyMembers.${index}.birthYear`]}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    required={!simplified}
                    fullWidth
                    label="出生月"
                    type="number"
                    value={member.birthMonth || ''}
                    onChange={(e) => onFamilyMemberChange(index, 'birthMonth', e.target.value)}
                    error={Boolean(formErrors[`familyMembers.${index}.birthMonth`])}
                    helperText={formErrors[`familyMembers.${index}.birthMonth`]}
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    required={!simplified}
                    fullWidth
                    label="出生日"
                    type="number"
                    value={member.birthDay || ''}
                    onChange={(e) => onFamilyMemberChange(index, 'birthDay', e.target.value)}
                    error={Boolean(formErrors[`familyMembers.${index}.birthDay`])}
                    helperText={formErrors[`familyMembers.${index}.birthDay`]}
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Grid>

                {/* 農曆閏月選項 */}
                {(member.calendarType || 'gregorian') === 'lunar' && (
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormControlLabel
                        control={
                          <Radio
                            checked={member.lunarIsLeapMonth || false}
                            onChange={(e) => onFamilyMemberChange(index, 'lunarIsLeapMonth', e.target.checked)}
                            name="lunarIsLeapMonth"
                          />
                        }
                        label="是閏月"
                      />
                    </FormControl>
                  </Grid>
                )}

                {/* 顯示轉換後的日期 */}
                {(member.convertedLunarYear || member.convertedGregorianYear) && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'background.paper', 
                      borderRadius: 1, 
                      border: '1px solid', 
                      borderColor: 'divider' 
                    }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        自動轉換結果：
                      </Typography>
                      {member.convertedLunarYear && (
                        <Typography variant="body2">
                          農曆：{formatMinguoYear(member.convertedLunarYear)}{member.convertedLunarMonth}月{member.convertedLunarDay}日
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
                
                {/* 地址 */}
                <Grid item xs={12} sm={8}>
                  <TextField
                    required={!simplified}
                    fullWidth
                    label="地址"
                    value={member.address || ''}
                    onChange={(e) => onFamilyMemberChange(index, 'address', e.target.value)}
                    error={Boolean(formErrors[`familyMembers.${index}.address`])}
                    helperText={formErrors[`familyMembers.${index}.address`]}
                  />
                </Grid>

                {/* 地址類型 */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <FormLabel component="legend">地址類別</FormLabel>
                    <RadioGroup
                      row
                      value={member.addressType || 'home'}
                      onChange={(e) => onFamilyMemberChange(index, 'addressType', e.target.value)}
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

      {/* 新增家人按鈕 */}
      {(!formData.familyMembers || formData.familyMembers.length < 5) && (
        <Grid item xs={12}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddFamilyMember}
            sx={{ mt: 1 }}
          >
            新增家人
          </Button>
        </Grid>
      )}
    </>
  );
};

export default FamilySection;
