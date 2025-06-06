import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleApp from './SimpleApp';

console.log('=== React應用開始載入 ===');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SimpleApp />);

console.log('=== React應用載入完成 ===');