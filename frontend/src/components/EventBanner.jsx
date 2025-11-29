import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';

const EventBanner = ({ eventBanner }) => {
  // 如果未啟用或缺少必要資料，不顯示
  if (!eventBanner?.enabled || !eventBanner.title || !eventBanner.buttonUrl) {
    return null;
  }

  const {
    title,
    titleSize = '1.5rem',
    titleColor = '#1976d2',
    titleAlign = 'center',
    buttonText = '點我填寫報名表單',
    buttonUrl,
    buttonColor = 'primary'
  } = eventBanner;

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography
          variant="h5"
          align={titleAlign}
          sx={{
            fontSize: titleSize,
            color: titleColor,
            mb: 2,
            fontWeight: 'medium'
          }}
        >
          {title}
        </Typography>
        <Button
          variant="contained"
          color={buttonColor}
          fullWidth
          size="large"
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EventBanner;

