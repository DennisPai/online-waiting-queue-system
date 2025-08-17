import React from 'react';
import { Box, Typography, styled } from '@mui/material';

const FormContainer = styled(Box)({
  width: '148mm',
  height: '210mm',
  border: '2px solid black',
  backgroundColor: 'white',
  fontFamily: 'Arial, sans-serif',
  position: 'relative',
  padding: 0,
  margin: 0
});

const FormTitle = styled(Box)({
  height: '15mm',
  borderBottom: '2px solid black',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  fontWeight: 'bold'
});

const ContentArea = styled(Box)({
  height: 'calc(210mm - 15mm)',
  display: 'flex'
});

const LeftSection = styled(Box)({
  width: '40%',
  borderRight: '2px solid black',
  padding: '5mm',
  fontSize: '10px'
});

const MiddleSection = styled(Box)({
  width: '25%',
  borderRight: '2px solid black',
  display: 'flex',
  flexDirection: 'column'
});

const RightSection = styled(Box)({
  width: '35%',
  display: 'flex',
  flexDirection: 'column'
});

const Cell = styled(Box)(({ borderBottom = true }) => ({
  borderBottom: borderBottom ? '1px solid black' : 'none',
  padding: '2mm',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

const FormTemplate = ({ customer }) => {
  const formatConsultationTopics = (topics, otherDetails) => {
    if (!topics || topics.length === 0) return '';
    
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
    
    const translatedTopics = topics.map(topic => {
      if (topic === 'other' && otherDetails) {
        return `其他(${otherDetails})`;
      }
      return topicMap[topic] || topic;
    });
    
    return translatedTopics.join('、');
  };

  const formatLunarDate = () => {
    if (!customer.lunarBirthYear || !customer.lunarBirthMonth || !customer.lunarBirthDay) {
      return '';
    }
    
    const minguo = customer.lunarBirthYear - 1911;
    return `民國${minguo}年${customer.lunarBirthMonth}月${customer.lunarBirthDay}日`;
  };

  const getAddress = () => {
    if (customer.addresses && customer.addresses.length > 0) {
      return customer.addresses[0].address;
    }
    return '臨時地址';
  };

  return (
    <FormContainer>
      <FormTitle>
        修玄宮玄請示單
      </FormTitle>
      
      <ContentArea>
        {/* 左側請示內容區域 */}
        <LeftSection>
          <Box sx={{ textAlign: 'center', mb: 1, fontWeight: 'bold' }}>
            請示內容
          </Box>
          <Box sx={{ fontSize: '9px', lineHeight: 1.4 }}>
            {formatConsultationTopics(customer.consultationTopics, customer.otherDetails)}
          </Box>
          
          {/* 底部電話和編號 */}
          <Box sx={{ position: 'absolute', bottom: '30mm', left: '5mm', right: '60%' }}>
            <Box sx={{ borderTop: '1px solid black', pt: 1, mb: 1 }}>
              電話：{customer.phone || ''}
            </Box>
            <Box sx={{ borderTop: '1px solid black', pt: 1, mb: 1 }}>
              年　　月　　日
            </Box>
            <Box sx={{ borderTop: '1px solid black', pt: 1 }}>
              編號：{customer.queueNumber}
            </Box>
          </Box>
        </LeftSection>

        {/* 中間區域 */}
        <MiddleSection>
          {/* 地址區域 */}
          <Box sx={{ height: '30%', borderBottom: '1px solid black', p: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '8px' }}>
              地址：
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mt: 0.5 }}>
              {getAddress()}
            </Typography>
          </Box>
          
          {/* 年月日時格子 */}
          <Box sx={{ height: '70%' }}>
            {['年', '月', '日', '時'].map((label, index) => (
              <Box key={label} sx={{ height: '25%', display: 'flex' }}>
                <Cell sx={{ width: '50%', borderRight: '1px solid black' }}>
                  {label}
                </Cell>
                <Cell sx={{ width: '50%' }}>
                  {label}
                </Cell>
              </Box>
            ))}
          </Box>
        </MiddleSection>

        {/* 右側個人資料區域 */}
        <RightSection>
          {/* 姓名 */}
          <Cell sx={{ height: '25%', fontSize: '12px', fontWeight: 'bold' }}>
            <Box>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>姓名</Typography>
              <Typography sx={{ fontSize: '14px', mt: 0.5 }}>{customer.name}</Typography>
            </Box>
          </Cell>
          
          {/* 性別 */}
          <Cell sx={{ height: '15%' }}>
            性別：{customer.gender === 'male' ? '男' : '女'}
          </Cell>
          
          {/* 年齡 */}
          <Cell sx={{ height: '15%' }}>
            年齡：{customer.virtualAge ? `${customer.virtualAge}歲` : ''}
          </Cell>
          
          {/* 農曆出生 */}
          <Cell sx={{ height: '25%', flexDirection: 'column', borderBottom: false }}>
            <Typography variant="caption" sx={{ fontSize: '9px' }}>
              農曆出生年月日時
            </Typography>
            <Typography sx={{ fontSize: '8px', mt: 0.5 }}>
              {formatLunarDate()}
            </Typography>
          </Cell>
          
          {/* 空白區域 */}
          <Box sx={{ height: '20%' }} />
        </RightSection>
      </ContentArea>
    </FormContainer>
  );
};

export default FormTemplate;

