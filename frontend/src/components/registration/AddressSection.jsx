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
  Card,
  CardContent,
  Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

// 地址類型選項
const addressTypeOptions = [
  { value: 'home', label: '住家' },
  { value: 'work', label: '工作場所' },
  { value: 'hospital', label: '醫院' },
  { value: 'other', label: '其他' }
];

const AddressSection = ({
  formData,
  formErrors,
  onAddressChange,
  onAddAddress,
  onRemoveAddress,
  simplified = false
}) => {
  return (
    <>
      {/* 標題 */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
          地址資訊
        </Typography>
      </Grid>

      {/* 地址列表 */}
      {formData.addresses?.map((address, index) => (
        <Grid item xs={12} key={index}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">
                  地址 {index + 1}
                </Typography>
                {formData.addresses.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => onRemoveAddress(index)}
                    color="error"
                  >
                    <RemoveIcon />
                  </IconButton>
                )}
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    required={!simplified}
                    fullWidth
                    label="地址"
                    value={address.address || ''}
                    onChange={(e) => onAddressChange(index, 'address', e.target.value)}
                    error={Boolean(formErrors[`addresses.${index}.address`])}
                    helperText={formErrors[`addresses.${index}.address`]}
                  />
                  {index === 0 && (!formData.addresses || formData.addresses.length < 3) && (
                    <IconButton
                      color="primary"
                      onClick={onAddAddress}
                      title="新增地址"
                      sx={{ mt: 1 }}
                    >
                      <AddIcon />
                    </IconButton>
                  )}
                  {index > 0 && (
                    <IconButton
                      color="error"
                      onClick={() => onRemoveAddress(index)}
                      title="刪除地址"
                      sx={{ mt: 1 }}
                    >
                      <RemoveIcon />
                    </IconButton>
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <FormLabel component="legend">地址類別</FormLabel>
                    <RadioGroup
                      row
                      value={address.addressType || 'home'}
                      onChange={(e) => onAddressChange(index, 'addressType', e.target.value)}
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
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* 新增地址按鈕 */}
      {(!formData.addresses || formData.addresses.length < 3) && (
        <Grid item xs={12}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddAddress}
            sx={{ mt: 1 }}
          >
            新增地址
          </Button>
        </Grid>
      )}
    </>
  );
};

export default AddressSection;
