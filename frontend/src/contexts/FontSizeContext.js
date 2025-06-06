import React, { createContext, useContext, useState, useEffect } from 'react';

const FontSizeContext = createContext();

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    // 從localStorage獲取保存的字體大小設定
    const savedFontSize = localStorage.getItem('fontSize');
    return savedFontSize || 'medium';
  });

  // 字體大小選項
  const fontSizeOptions = {
    small: {
      label: '小',
      multiplier: 1, // 16px 基準
    },
    medium: {
      label: '中',
      multiplier: 1.25, // 20px (+4px)
    },
    large: {
      label: '大',
      multiplier: 1.5, // 24px (+4px)
    },
    xlarge: {
      label: '特大',
      multiplier: 1.75, // 28px (+4px)
    }
  };

  // 當字體大小改變時，保存到localStorage並應用到全局CSS
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    
    // 動態設定CSS變數
    const multiplier = fontSizeOptions[fontSize].multiplier;
    document.documentElement.style.setProperty('--font-size-multiplier', multiplier);
  }, [fontSize, fontSizeOptions]);

  const changeFontSize = (newSize) => {
    if (fontSizeOptions[newSize]) {
      setFontSize(newSize);
    }
  };

  const value = {
    fontSize,
    changeFontSize,
    fontSizeOptions,
    currentMultiplier: fontSizeOptions[fontSize].multiplier
  };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
}; 