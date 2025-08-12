import React from 'react';
import {
  Grid,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormHelperText
} from '@mui/material';

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

const ConsultationSection = ({
  formData,
  formErrors,
  onChange,
  simplified = false
}) => {
  const handleTopicChange = (e) => {
    const { value, checked } = e.target;
    const currentTopics = [...(formData.consultationTopics || [])];
    
    if (checked) {
      if (!currentTopics.includes(value)) {
        currentTopics.push(value);
      }
    } else {
      const index = currentTopics.indexOf(value);
      if (index > -1) {
        currentTopics.splice(index, 1);
      }
    }
    
    onChange('consultationTopics', currentTopics);
  };

  const handleOtherDetailsChange = (e) => {
    onChange('otherDetails', e.target.value);
  };

  const handleRemarksChange = (e) => {
    onChange('remarks', e.target.value);
  };

  return (
    <>
      {/* 問事項目 */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
          問事項目
        </Typography>
        <FormControl
          required={!simplified}
          component="fieldset"
          error={Boolean(formErrors.consultationTopics)}
        >
          <FormLabel component="legend">請示內容（可複選）</FormLabel>
          <FormGroup>
            <Grid container>
              {consultationOptions.map((option) => (
                <Grid item xs={12} sm={6} md={4} key={option.value}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.consultationTopics?.includes(option.value) || false}
                        onChange={handleTopicChange}
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
      {formData.consultationTopics?.includes('other') && (
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="請詳細說明其他問題"
            multiline
            rows={3}
            value={formData.otherDetails || ''}
            onChange={handleOtherDetailsChange}
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
          value={formData.remarks || ''}
          onChange={handleRemarksChange}
          placeholder="如有其他需要說明的事項，請在此填寫..."
          inputProps={{ maxLength: 1000 }}
          helperText="可填寫任何其他備註事項（最多1000字）"
        />
      </Grid>
    </>
  );
};

export default ConsultationSection;
