# AI 開發指南 - 線上候位系統

## 🤖 這是給AI助手的重要說明文檔

### 專案架構
此專案是一個基於Docker的線上候位系統，包含：
- **前端**: React.js 應用，運行在 http://localhost:3100
- **後端**: Node.js + Express API，運行在 http://localhost:8080  
- **資料庫**: MongoDB，運行在 localhost:27017

### 🐳 Docker 建構和部署

#### ⚠️ 重要：每次修改代碼後都必須使用Docker重新建構

```bash
# 停止現有容器
docker-compose down

# 重新建構並啟動（會自動安裝新依賴）
docker-compose build
docker-compose up -d

# 檢查容器狀態
docker ps

# 初始化管理員帳號（首次或重置後）
cd backend
npm install
node init-admin.js
```

#### 預設登入資訊
- **網址**: http://localhost:3100
- **管理員登入**: http://localhost:3100/admin/login
  - 帳號: `admin`
  - 密碼: `admin123`

### 🔧 開發流程

#### 修改前端代碼後
1. 修改 frontend/ 下的文件
2. 執行 `docker-compose down`
3. 執行 `docker-compose build frontend`
4. 執行 `docker-compose up -d`

#### 修改後端代碼後  
1. 修改 backend/ 下的文件
2. 執行 `docker-compose down`
3. 執行 `docker-compose build backend`
4. 執行 `docker-compose up -d`
5. 可能需要重新執行 `node init-admin.js`

#### 添加新的npm依賴後
1. 在對應目錄修改 package.json
2. **必須** 重新建構Docker映像: `docker-compose build`
3. 啟動容器: `docker-compose up -d`

### 📱 功能測試檢查清單

#### 前端功能
- [ ] 首頁候位狀態顯示
- [ ] 候位登記流程（單頁式表單，支援多地址和家人資訊）
- [ ] 候位狀態查詢
- [ ] 客戶自助管理功能（查看詳細資料、取消預約、修改資料）
- [ ] 地址管理功能（新增、編輯、刪除地址，最多3個）
- [ ] 家人管理功能（新增、編輯、刪除家人，最多5人）
- [ ] 精準狀態顯示（修復候位狀態計算邏輯）
- [ ] 預估開始時間顯示（基於orderIndex動態計算）
- [ ] 智慧預估時間計算（基於總人數而非客戶筆數）
- [ ] 字體大小調整功能（4種大小：16px/20px/24px/28px）
- [ ] 響應式設計（手機/平板/桌面）
- [ ] 導航欄漢堡選單（手機版）
- [ ] 數字顯示優化（加粗、適當大小）
- [ ] 觸控優化（44px最小區域）

#### 後端管理功能
- [ ] 管理員登入
- [ ] 候位列表管理（叫號順序欄位顯示，新增「人數」欄位）
- [ ] 拖曳調整順序
- [ ] 重新排序功能（按叫號順序1,2,3...排列）
- [ ] 客戶資料編輯（支援多地址和家人資訊）
- [ ] 客戶資料刪除（含確認對話框）
- [ ] 詳細資料完整顯示（包含家人地址和地址類型）
- [ ] 一鍵叫號功能
- [ ] 客戶資料匯出（Excel/CSV，含完整資料和中文支援）
- [ ] 系統設定管理
- [ ] 移除分頁功能（直接顯示所有客戶）
- [ ] 等待人數計算正確性（等於叫號順序）
- [ ] 響應式後台界面
- [ ] 字體大小同步調整
- [ ] **資料結構優化檢查**：
  - [ ] 國曆/農曆欄位獨立儲存正確
  - [ ] 後台編輯無曆法選擇下拉選單
  - [ ] 國曆農曆欄位可獨立編輯
  - [ ] 農曆閏月選項永遠可見
  - [ ] API驗證使用新欄位結構
  - [ ] 無向後兼容欄位殘留

### 🚨 常見問題和解決方案

#### 容器無法啟動
```bash
# 檢查端口衝突
netstat -ano | findstr :3100
netstat -ano | findstr :8080
netstat -ano | findstr :27017

# 清理Docker資源
docker system prune -f
docker-compose down --remove-orphans
```

#### 前端修改不生效
```bash
# 確保重新建構前端容器
docker-compose build frontend --no-cache
docker-compose up -d
```

#### 管理員無法登入
```bash
# 重新初始化管理員帳號
cd backend
node init-admin.js
```

### 📦 依賴管理

#### 前端主要依賴
- React 18.2.0
- Material-UI 5.x
- Redux Toolkit
- xlsx (Excel匯出)
- file-saver (文件下載)
- react-beautiful-dnd (拖曳功能)

#### 後端主要依賴  
- Node.js + Express
- MongoDB + Mongoose
- Socket.io (即時通訊)
- JWT (身份驗證)
- bcrypt (密碼加密)

### 📋 資料結構優化重點

#### ⚠️ 重要：系統已完成向後兼容欄位清理

**舊欄位（已移除）**:
- `birthYear`, `birthMonth`, `birthDay`, `calendarType`

**新欄位結構**:
- **國曆**: `gregorianBirthYear`, `gregorianBirthMonth`, `gregorianBirthDay`
- **農曆**: `lunarBirthYear`, `lunarBirthMonth`, `lunarBirthDay`, `lunarIsLeapMonth`

#### 開發注意事項
1. **不再使用**舊的向後兼容欄位
2. **後端API**驗證使用新欄位結構
3. **前端介面**國曆農曆欄位獨立編輯
4. **後台管理**移除曆法選擇下拉選單
5. **資料驗證**必須提供國曆或農曆其中一組完整資料

### 🎯 開發優先級

1. **必須使用Docker**: 所有開發和測試都通過Docker進行
2. **響應式優先**: 確保手機、平板、桌面都能正常使用  
3. **用戶體驗**: 字體大小可調、直觀操作、清晰反饋
4. **資料完整性**: 匯出功能包含所有必要欄位，使用新欄位結構
5. **安全性**: 管理功能需要身份驗證

### 🔧 關鍵技術問題與解決方案

#### ⚠️ 國曆農曆轉換功能常見問題

**問題1: lunar-javascript API錯誤使用**
```javascript
// ❌ 錯誤用法
const isLeapMonth = lunar.isLeap(); // 此方法不存在

// ✅ 正確用法  
const isLeapMonth = lunar.getMonth() < 0;
const monthValue = Math.abs(lunar.getMonth());
```

**問題2: 後端控制器缺少導入**
```javascript
// 確保在 backend/src/controllers/admin.controller.js 中有以下導入
import { autoFillDates, autoFillFamilyMembersDates } from '../utils/calendarConverter';
```

**問題3: 前端提交數據不完整**
```javascript
// 確保 RegisterPage.jsx 的 submissionData 包含所有必要欄位
const submissionData = {
  email: convertedData.email,        // 必須
  name: convertedData.name,          // 必須
  phone: convertedData.phone,        // 必須
  gender: convertedData.gender,      // 必須
  addresses: convertedData.addresses,
  consultationTopics: convertedData.consultationTopics,
  // ... 其他欄位
};
```

**問題4: 轉換函數調用方式錯誤**
```javascript
// ❌ 錯誤用法（直接傳入數組）
processedData.familyMembers = autoFillFamilyMembersDates(processedData.familyMembers);

// ✅ 正確用法（傳入包含familyMembers屬性的對象）
const familyData = autoFillFamilyMembersDates({ familyMembers: processedData.familyMembers });
processedData.familyMembers = familyData.familyMembers;
```

**問題5: 表格虛歲欄位顯示錯位**
- 前端表格Body中缺少虛歲欄位的TableCell渲染
- 需要在 `AdminDashboardPage.jsx` 中添加對應的表格單元格：
```javascript
{visibleColumns.includes('virtualAge') && (
  <TableCell>{renderColumnContent('virtualAge', row, index)}</TableCell>
)}
```

#### 🧪 轉換功能測試驗證

修復轉換相關問題後，務必執行驗證測試：
```bash
cd backend
node final-test.js
```

預期成功輸出：
```
✅ 轉換工具測試
✅ 自動填充測試  
✅ 所有測試通過！轉換工具工作正常
```

#### 📊 批量更新既有客戶虛歲

系統提供批量更新腳本處理既有客戶虛歲計算：
```bash
cd backend
node update-existing-customers.js
```

腳本功能：
- 自動查找沒有虛歲的客戶記錄
- 基於農曆出生年份計算虛歲
- 同時處理主客戶和家人虛歲
- 提供詳細執行報告和統計

#### 🚨 ESLint 建構錯誤處理

當遇到建構錯誤時：
1. 檢查所有 import 語句是否正確
2. 確認缺失的函數已正確導入
3. 重新建構前端容器：
```bash
docker-compose down
docker-compose build frontend --no-cache
docker-compose up -d
```

#### 📋 問題排查檢查清單

遇到功能異常時，按以下順序檢查：
- [ ] 是否正確導入所有必要函數
- [ ] 前端提交數據是否包含所有必要欄位  
- [ ] 後端API是否正確處理新欄位結構
- [ ] 轉換工具是否使用正確的lunar-javascript API
- [ ] 轉換函數調用方式是否正確（對象參數vs數組參數）
- [ ] 表格欄位是否正確渲染（特別是虛歲欄位）
- [ ] Docker容器是否需要重新建構
- [ ] 執行轉換功能測試腳本驗證
- [ ] 執行批量更新腳本處理既有客戶虛歲

### 💡 AI助手使用建議

#### 🏠 本地開發
- 每次修改代碼後，自動執行Docker重新建構
- 提供測試網址和登入資訊給用戶
- 檢查功能的響應式設計
- 確認新功能在Docker環境中正常運作
- **修復轉換功能後務必運行測試腳本驗證**
- 遇到問題時查看Docker容器日誌: `docker logs queue-frontend` 或 `docker logs queue-backend`
- **遇到轉換相關問題時，優先檢查上述關鍵技術問題清單**

#### 🌐 Zeabur部署更新
- 系統已部署至Zeabur平台，網址：`https://your-app-domain.zeabur.app`
- 更新流程：本地修改 → `git push` → Zeabur自動重新部署
- 部署通常需要3-5分鐘完成
- 提醒用戶推送代碼後檢查線上版本功能正常 

### 🚨 Zeabur分開部署特殊問題

#### ⚠️ 設定下次辦事時間功能問題（2024年修復）

**問題描述**：
- 在Zeabur分開部署環境下，後台設定下次辦事時間會導致畫面全白
- 重新整理頁面後時間沒有成功設定
- 原本在Docker本地環境下運作正常

**根本原因**：
1. **環境變數配置問題**：前端 `REACT_APP_API_URL` 未正確設定指向後端服務
2. **狀態管理問題**：Redux中setNextSessionDate的狀態更新邏輯不完善
3. **錯誤處理缺失**：缺乏完善的錯誤邊界，導致未處理錯誤造成白屏

**修復措施**：

1. **增強API配置日誌**：
```javascript
// 在 queueService.js 中添加詳細的API配置日誌
console.log('API配置:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  API_BASE_URL,
  API_URL,
  ADMIN_API_URL
});
```

2. **Redux狀態管理優化**：
```javascript
// 修正 setNextSessionDate.fulfilled 處理
.addCase(setNextSessionDate.fulfilled, (state, action) => {
  state.isLoading = false;
  state.error = null;
  // 確保正確更新所有相關狀態
  state.nextSessionDate = action.payload.data?.nextSessionDate || action.payload.nextSessionDate;
  // 同時更新queueStatus物件
  state.queueStatus = {
    ...state.queueStatus,
    nextSessionDate: action.payload.data?.nextSessionDate || action.payload.nextSessionDate
  };
})
```

3. **添加錯誤邊界組件**：
- 創建 `ErrorBoundary.jsx` 防止白屏問題
- 在關鍵頁面（如AdminSettingsPage）包裹ErrorBoundary

4. **增強錯誤處理與日誌**：
- API請求添加詳細日誌記錄
- 前端添加錯誤重試機制
- 後端添加更詳細的請求/回應日誌

#### Zeabur部署環境變數重要提醒

**前端環境變數（建構時設定）**：
```
REACT_APP_API_URL=https://your-backend-service.zeabur.app
```

**後端環境變數**：
```
NODE_ENV=production
PORT=8080
JWT_SECRET=your-strong-secret
CORS_ORIGIN=https://your-frontend-domain.zeabur.app
SOCKET_CORS_ORIGIN=https://your-frontend-domain.zeabur.app
```

**關鍵注意事項**：
- 前端環境變數必須在Zeabur建構前設定，建構後無法修改
- 後端和前端網域必須正確配置CORS
- JWT_SECRET在生產環境必須使用強密碼 