# 線上候位系統 - 行動裝置適配規劃書

## 📱 專案概述

### 目標
將現有的線上候位系統完全適配行動裝置，提供優質的行動端使用體驗，確保所有功能在手機和平板上都能流暢運行。

### 預期成果
- 完整的響應式設計，適配各種螢幕尺寸（手機、平板、桌面）
- 優化的觸控操作體驗
- 保持現有功能完整性，不影響既有用戶使用
- 提升行動端操作效率

## 🎯 設計原則

### 1. Mobile-First 設計策略
- 優先考慮手機端體驗，再向上擴展到平板和桌面
- 確保核心功能在小螢幕上依然易於使用
- 簡化不必要的視覺元素，專注於功能性

### 2. 漸進增強（Progressive Enhancement）
- 保持現有桌面端功能不變
- 在行動端提供額外的便利功能
- 確保各裝置間的功能一致性

### 3. 觸控友好設計
- 按鈕和點擊區域至少 44px × 44px
- 適當的間距避免誤觸
- 滑動、拖拽等手勢操作優化

## 📋 功能需求分析

### 客戶端（一般用戶）功能

#### 1. 首頁適配 ⭐⭐⭐
**目前狀態**：已有基本響應式設計
**需求**：
- 優化叫號顯示區塊在小螢幕上的排版
- 調整按鈕大小和間距適合觸控操作
- 優化「我要候位」和「查詢候位」按鈕佈局
- 候位狀態卡片堆疊顯示（縱向排列）

#### 2. 候位登記表單 ⭐⭐⭐⭐⭐
**目前狀態**：複雜多欄位表單，需大幅優化
**需求**：
- **分步驟表單設計**：將長表單拆分為多個步驟
  - 第1步：基本資料（姓名、電話、性別）
  - 第2步：生日資料（國曆/農曆選擇）
  - 第3步：地址資料（可選，可跳過）
  - 第4步：家人資料（可選，可跳過）
  - 第5步：諮詢主題（可選，可跳過）
  - 第6步：確認提交
- **進度指示器**：顯示當前步驟進度
- **摺疊式設計**：家人資料使用手風琴式摺疊
- **大按鈕設計**：適合觸控的按鈕尺寸
- **智慧表單**：根據簡化模式自動調整必填欄位

#### 3. 查詢候位功能 ⭐⭐⭐
**目前狀態**：基本功能完整
**需求**：
- 大輸入框設計，便於觸控輸入
- 查詢結果卡片式顯示
- 一鍵撥號功能（點擊電話號碼直接撥打）
- 大字體顯示重要資訊（候位號碼、等待時間）

#### 4. 候位成功頁面 ⭐⭐
**目前狀態**：需優化視覺呈現
**需求**：
- 重要資訊突出顯示
- QR Code 分享功能（可選）
- 一鍵加入行事曆提醒（可選）
- 社群分享按鈕（可選）

### 管理端功能

#### 1. 登入頁面 ⭐⭐
**需求**：
- 大輸入框和按鈕設計
- 記住登入狀態優化
- 忘記密碼流程（未來擴展）

#### 2. 候位管理頁面 ⭐⭐⭐⭐⭐
**目前狀態**：複雜表格，需大幅重新設計
**需求**：
- **卡片式列表設計**：每個客戶用卡片顯示，替代表格
- **滑動操作**：左滑顯示操作選項（完成、取消、編輯、刪除）
- **浮動操作按鈕（FAB）**：
  - 叫號下一位（主要 FAB）
  - 登記候位（次要 FAB）
  - 重新排序（次要 FAB）
- **篩選和搜尋優化**：頂部固定搜尋列
- **拖拽排序**：觸控友好的排序功能
- **批次操作模式**：長按進入多選模式

#### 3. 客戶詳細資料編輯 ⭐⭐⭐⭐
**需求**：
- 全螢幕編輯模式
- 分區域摺疊顯示（基本資料、家人資料、地址等）
- 底部固定儲存按鈕
- 表單驗證即時提示

#### 4. 系統設定頁面 ⭐⭐⭐
**需求**：
- 分類卡片設計
- 開關切換優化
- 時間選擇器優化
- 確認對話框適配

#### 5. 資料匯出功能 ⭐⭐
**需求**：
- 簡化匯出選項
- 進度指示器
- 檔案分享整合

## 🎨 UI/UX 設計規範

### 響應式斷點
```css
/* 手機直式 */
xs: 0px - 599px

/* 手機橫式 / 小平板 */
sm: 600px - 959px  

/* 平板 */
md: 960px - 1279px

/* 桌面 */
lg: 1280px - 1919px
xl: 1920px+
```

### 觸控設計規範
- **最小觸控區域**：44px × 44px
- **按鈕間距**：至少 8px
- **主要操作按鈕**：全寬或至少 280px 寬
- **次要操作按鈕**：至少 120px 寬

### 行動端專用組件
1. **MobileStepForm**：分步驟表單組件
2. **SwipeableCard**：可滑動操作的卡片
3. **MobileTable**：卡片式表格替代組件
4. **BottomSheet**：底部彈出面板
5. **FloatingActionButton**：浮動操作按鈕群組

## 🔧 技術實施方案

### 1. 響應式架構升級
```javascript
// 新增行動端專用 hooks
- useMobileDetect() // 偵測設備類型
- useSwipeGestures() // 滑動手勢
- useVirtualKeyboard() // 虛擬鍵盤適配
- useMobileNavigation() // 行動導航

// 主題擴展
- 新增行動端專用樣式變數
- 觸控友好的 Material-UI 主題設定
- 動態字體大小系統增強
```

### 2. 組件架構調整
```
components/
├── mobile/              # 行動端專用組件
│   ├── MobileStepForm/
│   ├── SwipeableCard/
│   ├── MobileTable/
│   ├── BottomSheet/
│   └── FloatingActionButtons/
├── responsive/          # 響應式共用組件  
│   ├── ResponsiveDialog/
│   ├── ResponsiveNavigation/
│   └── ResponsiveLayout/
└── adaptive/            # 自適應組件
    ├── AdaptiveButton/
    ├── AdaptiveInput/
    └── AdaptiveCard/
```

### 3. 頁面重構策略
- **HomePage**：優化響應式佈局，新增 PWA 功能提示
- **RegisterPage**：重構為分步驟表單
- **AdminDashboardPage**：新增行動端專用版本
- **StatusPage**：優化資訊顯示層次

### 4. 導航系統升級
- **桌面端**：保持現有頂部導航
- **行動端**：
  - 漢堡選單 + 側邊欄導航（客戶端）
  - 底部標籤導航（管理端）
  - 浮動操作按鈕



## 🧪 測試策略

### 測試設備覆蓋
- **主要參考**：iPhone 16（393 × 852 px）
- **通用支援**：iPhone SE（375 × 667 px）到 iPhone 16 Pro Max（430 × 932 px）
- **Android 通用**：常見 Samsung Galaxy、Google Pixel 系列
- **平板支援**：iPad（768 × 1024 px）及 Android 平板
- **解析度範圍**：320px 到 1920px+

### 測試項目
1. **功能測試**：所有功能在各設備正常運作
2. **效能測試**：頁面載入時間、互動響應時間
3. **可用性測試**：觸控操作是否便利、資訊是否易讀
4. **相容性測試**：各瀏覽器相容性

## 🎯 詳細開發優先順序

### 管理端優先開發順序（Phase 1-3）

#### 優先級 1：核心管理功能行動化 🔥
1. **管理員登入頁面適配**
   - 檔案：`frontend/src/pages/LoginPage.jsx`
   - 任務：大輸入框、觸控友好按鈕設計
   - 預估：2-3 小時

2. **候位管理頁面基礎適配**
   - 檔案：`frontend/src/pages/admin/AdminDashboardPage.jsx`
   - 任務：表格轉卡片式設計、基礎響應式佈局
   - 預估：8-10 小時

3. **客戶詳細資料對話框適配**
   - 檔案：`frontend/src/components/admin/CustomerDetailDialog.jsx`
   - 任務：全螢幕編輯模式、分區域摺疊、底部固定按鈕
   - 預估：6-8 小時

#### 優先級 2：進階管理功能 🚀
4. **浮動操作按鈕組件開發**
   - 新檔案：`frontend/src/components/mobile/FloatingActionButtons.jsx`
   - 任務：叫號、登記、排序的 FAB 群組
   - 預估：4-5 小時

5. **滑動操作卡片組件**
   - 新檔案：`frontend/src/components/mobile/SwipeableCard.jsx`
   - 任務：左滑顯示操作選項（完成、取消、編輯、刪除）
   - 預估：6-8 小時

6. **系統設定頁面適配**
   - 檔案：`frontend/src/pages/admin/AdminSettingsPage.jsx`
   - 任務：分類卡片設計、開關優化、時間選擇器
   - 預估：4-6 小時

#### 優先級 3：管理端體驗優化 ⚡
7. **拖拽排序觸控優化**
   - 檔案：`frontend/src/hooks/useQueueManagement.js`
   - 任務：觸控友好的拖拽體驗
   - 預估：3-4 小時

8. **批次操作模式**
   - 相關檔案：管理頁面組件群
   - 任務：長按進入多選模式
   - 預估：5-6 小時

### 客戶端開發順序（Phase 4-6）

#### 優先級 4：客戶端核心功能 🎯
9. **首頁響應式優化**
   - 檔案：`frontend/src/pages/HomePage.jsx`
   - 任務：叫號顯示優化、按鈕佈局調整
   - 預估：3-4 小時

10. **分步驟候位登記表單**
    - 檔案：`frontend/src/components/RegisterForm.jsx`
    - 新檔案：`frontend/src/components/mobile/MobileStepForm.jsx`
    - 任務：6步驟表單設計、進度指示器
    - 預估：12-15 小時

#### 優先級 5：客戶端查詢功能 📱
11. **查詢候位頁面優化**
    - 檔案：`frontend/src/pages/StatusPage.jsx`
    - 任務：大輸入框、卡片式結果顯示、一鍵撥號
    - 預估：4-5 小時

12. **候位成功頁面優化**
    - 檔案：`frontend/src/components/registration/RegistrationSuccess.jsx`
    - 任務：重要資訊突出顯示、優化視覺呈現
    - 預估：3-4 小時

#### 優先級 6：全域體驗優化 🌟
13. **響應式導航系統**
    - 檔案：`frontend/src/components/layout/Layout.jsx`, `AdminLayout.jsx`
    - 任務：行動端導航（漢堡選單、底部標籤）
    - 預估：6-8 小時

14. **主題系統增強**
    - 檔案：`frontend/src/theme.js`
    - 任務：行動端專用樣式變數、觸控友好設定
    - 預估：3-4 小時

### 支援組件開發（並行進行）

#### 新增 Hooks
15. **行動端檢測 Hook**
    - 新檔案：`frontend/src/hooks/useMobileDetect.js`
    - 任務：設備類型偵測、螢幕尺寸判斷
    - 預估：2-3 小時

16. **滑動手勢 Hook**
    - 新檔案：`frontend/src/hooks/useSwipeGestures.js`
    - 任務：滑動、拖拽手勢處理
    - 預估：4-5 小時

17. **虛擬鍵盤適配 Hook**
    - 新檔案：`frontend/src/hooks/useVirtualKeyboard.js`
    - 任務：鍵盤彈出時頁面調整
    - 預估：3-4 小時

#### 通用組件
18. **響應式對話框組件**
    - 新檔案：`frontend/src/components/responsive/ResponsiveDialog.jsx`
    - 任務：自適應對話框尺寸和行為
    - 預估：3-4 小時

19. **底部面板組件**
    - 新檔案：`frontend/src/components/mobile/BottomSheet.jsx`
    - 任務：行動端底部彈出面板
    - 預估：4-5 小時

20. **自適應按鈕組件**
    - 新檔案：`frontend/src/components/adaptive/AdaptiveButton.jsx`
    - 任務：根據螢幕尺寸自動調整按鈕樣式
    - 預估：2-3 小時

## 💰 預估工作量

### 分階段工作量統計
- **管理端核心功能（優先級 1）**：16-21 小時
- **管理端進階功能（優先級 2-3）**：18-25 小時
- **客戶端功能（優先級 4-5）**：22-28 小時
- **全域優化（優先級 6）**：9-12 小時
- **支援組件開發**：18-23 小時
- **測試與優化**：10-15 小時
- **總計**：93-124 小時

### 階段性里程碑
1. **管理端基礎完成**：16-21 小時後可投入使用
2. **管理端完整體驗**：34-46 小時後功能完整
3. **客戶端基礎完成**：56-74 小時後雙端可用
4. **全功能完成**：93-124 小時後達到最佳體驗

### 技能需求
- React/Material-UI 響應式設計精通
- CSS Grid/Flexbox 專業級應用
- 觸控手勢處理（Touch/Pointer Events）
- Material-UI 主題系統深度客製化
- 行動端 UX/UI 設計理念

## ⚠️ 風險評估

### 技術風險
- **複雜表單**：候位登記表單欄位多，需仔細設計 UX 流程
- **管理端複雜度**：管理功能多，需平衡功能完整性與易用性
- **效能影響**：新增響應式邏輯可能影響載入速度

### 解決方案
- 採用漸進式改進，不影響現有功能
- 充分測試各種裝置和場景
- 預留充足的優化時間

## 🛠️ 開發指南（Agent 參考）

### 核心開發原則
1. **保持現有功能完整性**：任何修改都不能影響桌面端現有功能
2. **漸進式增強策略**：先確保基本功能，再添加行動端特有功能
3. **組件化開發**：建立可重用的行動端專用組件庫
4. **統一設計語言**：遵循 Material-UI 設計規範和現有主題

### 開發環境設置
```bash
# 確保開發環境支援行動端調試
npm install --save-dev @types/react-touch-events
npm install react-swipeable react-spring framer-motion

# 瀏覽器開發者工具設定
# Chrome DevTools -> Device Toolbar -> iPhone 16 (393 × 852)
```

### 關鍵技術決策

#### 1. 響應式斷點策略
```javascript
// theme.js 中的斷點定義
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,     // 手機直式
      sm: 600,   // 手機橫式/小平板  
      md: 960,   // 平板
      lg: 1280,  // 桌面
      xl: 1920,  // 大桌面
    },
  },
});

// 使用範例
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

#### 2. 觸控區域最小規格
```css
/* 所有可點擊元素遵循 */
.mobile-touch-target {
  min-height: 44px;
  min-width: 44px;
  margin: 4px; /* 防誤觸間距 */
}
```

#### 3. 組件檔案命名規範
```
components/
├── mobile/                    # 行動端專用
│   ├── MobileStepForm.jsx    # Mobile 前綴
│   └── SwipeableCard.jsx     # 行動端特有功能
├── responsive/               # 響應式共用
│   └── ResponsiveDialog.jsx  # Responsive 前綴
└── adaptive/                 # 自適應
    └── AdaptiveButton.jsx    # Adaptive 前綴
```

### 測試驗證清單

#### 每個組件完成後必須驗證
- [ ] iPhone 16 (393px) 正常顯示和操作
- [ ] iPhone SE (375px) 不會內容溢出  
- [ ] iPad (768px) 版面合理過渡
- [ ] 觸控區域足夠大（最小 44px）
- [ ] 滑動和點擊手勢正常
- [ ] 桌面版功能不受影響

#### 整合測試項目
- [ ] 表單填寫流程完整
- [ ] 頁面間導航流暢  
- [ ] 資料載入和錯誤處理
- [ ] 橫豎屏切換適應
- [ ] 軟鍵盤彈出適應

### 常見問題解決方案

#### 1. iOS Safari 特殊處理
```css
/* 防止 iOS 縮放 */
input, textarea, select {
  font-size: 16px; /* 最小 16px 防止自動縮放 */
}

/* iOS 安全區域適配 */
.mobile-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### 2. Android Chrome 100vh 問題
```javascript
// 使用 window.innerHeight 替代 100vh
const useViewportHeight = () => {
  const [vh, setVh] = useState(window.innerHeight);
  
  useEffect(() => {
    const updateVh = () => setVh(window.innerHeight);
    window.addEventListener('resize', updateVh);
    return () => window.removeEventListener('resize', updateVh);
  }, []);
  
  return vh;
};
```

#### 3. 觸控手勢衝突處理
```javascript
// 防止滑動時觸發點擊
const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
};

const handleTouchEnd = (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const deltaX = Math.abs(touchEndX - touchStartX);
  const deltaY = Math.abs(touchEndY - touchStartY);
  
  // 如果是滑動手勢，取消點擊
  if (deltaX > 10 || deltaY > 10) {
    e.preventDefault();
    return;
  }
  
  // 執行點擊邏輯
  handleClick();
};
```

### 代碼品質要求
1. **TypeScript 類型定義**：所有新組件必須有完整類型定義
2. **PropTypes 驗證**：確保組件 props 驗證完整
3. **Accessibility 支援**：所有交互元素必須支援鍵盤導航和螢幕閱讀器
4. **Error Boundary**：關鍵組件必須有錯誤邊界保護
5. **效能優化**：使用 React.memo、useMemo、useCallback 適當優化

### Git 提交規範
```bash
# 提交訊息格式
feat(mobile): 新增管理端卡片式客戶列表
fix(mobile): 修復 iOS Safari 觸控響應問題  
style(mobile): 優化候位表單在小螢幕的佈局
refactor(mobile): 重構滑動手勢處理邏輯
test(mobile): 新增響應式組件測試案例
```

## 🎯 成功指標

### 量化指標
- **載入時間**：行動端首屏載入 < 3 秒
- **操作效率**：主要操作步驟減少 30%
- **錯誤率**：觸控誤操作率 < 2%
- **用戶滿意度**：行動端可用性評分 > 4.5/5

### 質化指標
- 所有功能在行動端完全可用
- 觸控操作直觀自然
- 視覺資訊層次清晰
- 符合行動端設計規範

---

## 📋 已確認需求

1. **功能優先級**：管理端優先開發，最終完成客戶端和管理端
2. **PWA 功能**：不需要離線功能和推播通知
3. **設計風格**：保持現有橙色主色調，不需調整
4. **測試範圍**：通用型支援，以 iPhone 16 為主要參考尺寸
5. **實施重點**：提供詳細開發優先順序供後續 Agent 參考

---

## 🚀 開始實施指引

### 給後續 Agent 的重要提醒

1. **嚴格按照優先順序開發**：必須先完成優先級 1 的所有項目，再進行優先級 2
2. **保持現有功能穩定**：每次修改前務必備份，確保桌面版功能不受影響
3. **參考開發指南章節**：所有技術決策和代碼規範都已詳細說明
4. **iPhone 16 為主要測試標準**：每個修改都需在 393 × 852 解析度下驗證
5. **漸進式提交**：每完成一個功能項目就立即提交，便於問題追蹤

### 立即可開始的第一步

**優先級 1 - 項目 1：管理員登入頁面適配**
- 檔案位置：`frontend/src/pages/LoginPage.jsx`
- 工作內容：調整輸入框和按鈕為觸控友好尺寸
- 預估時間：2-3 小時
- 驗收標準：在 iPhone 16 尺寸下所有元素清晰可點、無內容溢出

**開發完第一項後，請按順序繼續優先級 1 的其他項目。**

本規劃書包含了完整的技術指引、代碼範例和注意事項，足以支援整個行動裝置適配專案的開發需求。 💪
