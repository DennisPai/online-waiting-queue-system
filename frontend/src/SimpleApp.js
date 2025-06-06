import React from 'react';

function SimpleApp() {
  const apiUrl = process.env.REACT_APP_API_URL;
  
  console.log('=== 簡化應用啟動 ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REACT_APP_API_URL:', apiUrl);
  console.log('當前URL:', window.location.href);
  console.log('===================');

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 前端應用正常運行！</h1>
      <div style={{ marginTop: '20px' }}>
        <h3>環境資訊：</h3>
        <p><strong>環境：</strong> {process.env.NODE_ENV}</p>
        <p><strong>API URL：</strong> {apiUrl || '未設定'}</p>
        <p><strong>當前時間：</strong> {new Date().toLocaleString()}</p>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h3>測試API連接：</h3>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/health');
              const text = await response.text();
              alert(`健康檢查成功: ${text}`);
            } catch (error) {
              alert(`健康檢查失敗: ${error.message}`);
            }
          }}
        >
          測試健康檢查
        </button>
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <small>
          如果您看到這個頁面，表示React應用已成功建構和部署。
          請檢查瀏覽器控制台獲取更多技術資訊。
        </small>
      </div>
    </div>
  );
}

export default SimpleApp;