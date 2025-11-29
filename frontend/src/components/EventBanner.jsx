import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';

const EventBanner = React.memo(({ eventBanner }) => {
  // 如果未啟用或缺少必要資料，不顯示
  if (!eventBanner?.enabled || !eventBanner.title || !eventBanner.buttonUrl) {
    return null;
  }

  const {
    title,
    titleSize = '1.5rem',
    titleColor = '#1976d2',
    titleAlign = 'center',
    fontWeight = 'normal',
    backgroundColor = '#ffffff',
    buttonText = '點我填寫報名表單',
    buttonUrl,
    buttonColor = '#1976d2',
    buttonTextColor = '#ffffff'
  } = eventBanner;

  return (
    <Card sx={{ 
      mt: 2,
      bgcolor: backgroundColor,
      border: '2px solid white'
    }}>
      <CardContent>
        <Typography
          variant="h5"
          align={titleAlign}
          sx={{
            fontSize: titleSize,
            color: titleColor,
            fontWeight: fontWeight,
            mb: 2
          }}
        >
          {title}
        </Typography>
        <Button
          variant="contained"
          fullWidth
          size="large"
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            bgcolor: buttonColor,
            color: buttonTextColor,
            '&:hover': { 
              bgcolor: buttonColor,
              color: buttonTextColor,
              opacity: 0.9
            }
          }}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
});

EventBanner.displayName = 'EventBanner';

export default EventBanner;

