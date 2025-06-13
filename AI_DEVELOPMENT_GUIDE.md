# AI 開發指南 - 線上候位系統

## 🤖 這是給AI助手的重要說明文檔

### 專案架構
此專案是一個基於Docker的線上候位系統，包含：
- **前端**: React.js 應用，運行在 http://localhost:3100
- **後端**: Node.js + Express API，運行在 http://localhost:8080  
- **資料庫**: MongoDB，運行在 localhost:27017

## ⚠️ 重要功能變更 - 辦事狀態與候位登記功能解耦 (2024年12月最新)

### 📋 最新變更概述
- **「候位系統開啟中」更名為「開始辦事」** 並與候位登記功能完全解耦
- **辦事狀態控制** 現在僅影響前台是否顯示叫號資訊，不再影響候位登記功能
- **候位登記功能** 完全由「公開候位登記設置」獨立控制
- **靈活組合使用**：可以停止辦事但仍開放候位登記，或開始辦事但關閉候位登記

### 🔧 核心技術修改

#### 1. 後端API邏輯修正
```javascript
// ⚠️ 重要檔案: backend/src/controllers/queue.controller.js
// 修正當isQueueOpen為false時的返回邏輯
export const getQueueStatus = async (req, res) => {
  try {
    const settings = await SystemSetting.findOne();
    
    // 若辦事服務已停止，返回相關資訊但仍包含publicRegistrationEnabled狀態
    if (!settings.isQueueOpen) {
      return res.status(200).json({
        success: true,
        data: {
          isOpen: false,
          maxQueueNumber: settings.maxQueueNumber,
          minutesPerCustomer: settings.minutesPerCustomer,
          simplifiedMode: settings.simplifiedMode,
          publicRegistrationEnabled: settings.publicRegistrationEnabled, // 重要：仍返回此狀態
          nextSessionDate: settings.nextSessionDate,
          currentQueueNumber: 0,
          waitingCount: 0,
          message: '辦事服務目前已停止'
        }
      });
    }
    // ... 其他邏輯
  } catch (error) {
    // ... 錯誤處理
  }
};
```

#### 2. 前端系統設定界面更新
```javascript
// ⚠️ 重要檔案: frontend/src/pages/admin/AdminSettingsPage.jsx
// 更新辦事狀態的顯示文字和說明
<Typography variant="h6" gutterBottom>
  辦事狀態
</Typography>
<FormControlLabel
  control={
    <Switch
      checked={isQueueOpen}
      onChange={handleToggleQueueStatus}
      color="primary"
    />
  }
  label={isQueueOpen ? '開始辦事' : '停止辦事'}
/>
<Alert severity={isQueueOpen ? 'success' : 'info'}>
  {isQueueOpen
    ? '目前正在進行辦事服務，候位叫號正常運作'
    : '目前停止辦事服務，候位叫號已暫停'}
</Alert>
```

#### 3. 後端控制器文字更新
```javascript
// ⚠️ 重要檔案: backend/src/controllers/admin.controller.js
// 更新API回傳訊息
res.status(200).json({
  success: true,
  message: `辦事服務已${isOpen ? '開始' : '停止'}`,
  data: {
    isQueueOpen: settings.isQueueOpen
  }
});
```

### 🎯 功能邏輯解耦

#### 辦事狀態 (isQueueOpen) 的作用範圍：
- ✅ 控制前台是否顯示目前叫號和候位狀態
- ✅ 影響管理後台的叫號功能顯示
- ❌ **不再影響**候位登記功能的開放狀態

#### 公開候位登記設置 (publicRegistrationEnabled) 的作用範圍：
- ✅ 完全控制一般民眾的候位登記權限
- ✅ 決定首頁和導航欄是否顯示候位按鈕
- ✅ 控制 `/register` 路由的條件保護
- ✅ 與辦事狀態完全獨立運作

### 💡 實際應用場景

1. **停止辦事 + 開放候位登記**：
   - 適用於：準備明天的候位，今天不辦事但開放預約
   - 設定：辦事狀態=停止，公開候位登記=開啟

2. **開始辦事 + 關閉候位登記**：
   - 適用於：處理現有候位者，不接受新的候位登記
   - 設定：辦事狀態=開始，公開候位登記=關閉

3. **開始辦事 + 開放候位登記**：
   - 適用於：正常營業時間，即時候位
   - 設定：辦事狀態=開始，公開候位登記=開啟

4. **停止辦事 + 關閉候位登記**：
   - 適用於：完全暫停服務
   - 設定：辦事狀態=停止，公開候位登記=關閉

## ⚠️ 重要功能變更 - 公開候位登記開關功能

### 📋 功能變更概述 (2024年12月生效)
- **公開候位登記開關功能** 已實施，管理員可透過系統設定動態控制候位登記開放狀態
- 新增 `publicRegistrationEnabled` 系統設定欄位，預設為 `false`
- 前端根據設定狀態和認證情況動態顯示候位登記功能
- 管理員始終可使用後台「登記候位」浮動視窗功能
- **所有功能架構完整保留**，提供最大的靈活性

### 🔧 核心技術實施

#### 1. 前端條件判斷實施
```javascript
// ⚠️ 重要檔案: frontend/src/pages/HomePage.jsx
// 首頁候位登記卡片須根據設定狀態和認證情況顯示
{(queueStatus?.publicRegistrationEnabled || isAuthenticated) && (
  <Grid item xs={12} sm={6} md={4}>
    <Card onClick={() => navigate('/register')}>
      {/* 我要登記候位卡片 */}
    </Card>
  </Grid>
)}

// ⚠️ 重要檔案: frontend/src/components/Layout.jsx  
// 導航欄候位按鈕須根據設定狀態和認證情況顯示
{(queueStatus?.publicRegistrationEnabled || isAuthenticated) && (
  <Button component={Link} to="/register">
    我要候位
  </Button>
)}
```

#### 2. 條件路由保護實施
```javascript
// ⚠️ 重要檔案: frontend/src/App.js
// register 路由使用 ConditionalRegistrationRoute 條件保護
<Route 
  path="/register" 
  element={
    <ConditionalRegistrationRoute>
      <RegisterPage />
    </ConditionalRegistrationRoute>
  } 
/>

// ⚠️ 重要檔案: frontend/src/components/ConditionalRegistrationRoute.jsx
// 新增條件路由組件
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const ConditionalRegistrationRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { queueStatus } = useSelector((state) => state.queue);
  
  // 如果公開候位登記開啟或管理員已登入，則允許訪問
  if (queueStatus?.publicRegistrationEnabled || isAuthenticated) {
    return children;
  }
  
  // 否則重定向到首頁
  return <Navigate to="/" replace />;
};
```

#### 3. 後端API實施
```javascript
// ⚠️ 重要檔案: backend/src/models/system-setting.model.js
// 新增 publicRegistrationEnabled 欄位
const systemSettingSchema = new mongoose.Schema({
  // ... 其他欄位
  publicRegistrationEnabled: {
    type: Boolean,
    default: false  // 預設為關閉狀態
  }
});

// ⚠️ 重要檔案: backend/src/controllers/admin.controller.js
// 新增設定開關的API方法
export const setPublicRegistrationEnabled = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: '無效的設定值，必須是布爾值' 
      });
    }

    await SystemSetting.updateMany({}, 
      { publicRegistrationEnabled: enabled }, 
      { upsert: true }
    );

    res.json({ 
      success: true, 
      message: enabled ? '公開候位登記已開啟' : '公開候位登記已關閉' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '設定公開候位登記狀態失敗' 
    });
  }
};

// ⚠️ 重要檔案: backend/src/controllers/queue.controller.js
// 在狀態API中返回開關狀態
export const getQueueStatus = async (req, res) => {
  try {
    // ... 其他邏輯
    const systemSettings = await SystemSetting.findOne();
    
    res.json({
      // ... 其他狀態資料
      publicRegistrationEnabled: systemSettings?.publicRegistrationEnabled || false
    });
  } catch (error) {
    // ... 錯誤處理
  }
};
```

#### 4. 前端Redux狀態管理
```javascript
// ⚠️ 重要檔案: frontend/src/redux/slices/queueSlice.js
// 新增開關設定的async thunk
export const setPublicRegistrationEnabled = createAsyncThunk(
  'queue/setPublicRegistrationEnabled',
  async (enabled, { rejectWithValue }) => {
    try {
      const response = await queueService.setPublicRegistrationEnabled(enabled);
      return { publicRegistrationEnabled: enabled };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定失敗');
    }
  }
);

// 在 extraReducers 中處理
.addCase(setPublicRegistrationEnabled.fulfilled, (state, action) => {
  if (state.queueStatus) {
    state.queueStatus.publicRegistrationEnabled = action.payload.publicRegistrationEnabled;
  }
})
```

#### 5. 管理員後台登記功能
```javascript
// ⚠️ 重要檔案: frontend/src/pages/admin/AdminDashboardPage.jsx
// 必須包含登記候位浮動視窗功能

// 狀態管理
const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

// 登記候位按鈕
<Button
  variant="contained"
  startIcon={<PersonAddIcon />}
  onClick={() => setRegisterDialogOpen(true)}
  sx={{ 
    backgroundColor: '#4caf50',
    '&:hover': { backgroundColor: '#45a049' }
  }}
>
  登記候位
</Button>

// Dialog 浮動視窗
<Dialog
  open={registerDialogOpen}
  onClose={() => setRegisterDialogOpen(false)}
  maxWidth="md"
  fullWidth
>
  <DialogTitle>登記候位</DialogTitle>
  <DialogContent>
    <RegisterForm onSuccess={handleRegisterSuccess} />
  </DialogContent>
</Dialog>

// 成功回調處理
const handleRegisterSuccess = () => {
  setRegisterDialogOpen(false);
  // 刷新候位列表
  fetchQueueList();
};
```

#### 4. RegisterForm 組件重用
```javascript
// ⚠️ 重要檔案: frontend/src/components/RegisterForm.jsx
// 必須支援 onSuccess 回調

const RegisterForm = ({ onSuccess }) => {
  const handleSubmit = async (e) => {
    // ... 原有提交邏輯
    if (response.success) {
      // 調用成功回調（如果提供）
      if (onSuccess) {
        onSuccess(response.data);
      } else {
        // 原有的頁面跳轉邏輯（公開使用時）
        navigate('/status', { state: { queueData: response.data } });
      }
    }
  };
};
```

### 🚨 重要開發注意事項

#### ⚠️ 公開候位登記開關功能檢查清單
修改相關代碼時，務必確認：
- [ ] **backend/src/models/system-setting.model.js** 包含 `publicRegistrationEnabled: Boolean` 欄位
- [ ] **backend/src/controllers/admin.controller.js** 包含 `setPublicRegistrationEnabled` 函數
- [ ] **backend/src/routes/admin.routes.js** 包含開關設定路由
- [ ] **backend/src/controllers/queue.controller.js** 在狀態API中返回開關狀態
- [ ] **frontend/src/components/ConditionalRegistrationRoute.jsx** 條件路由組件正確實施
- [ ] **HomePage.jsx** 候位登記卡片包含 `{(queueStatus?.publicRegistrationEnabled || isAuthenticated) && (...)}`
- [ ] **Layout.jsx** 導航欄候位按鈕包含 `{(queueStatus?.publicRegistrationEnabled || isAuthenticated) && (...)}`
- [ ] **App.js** register 路由使用 `<ConditionalRegistrationRoute>` 包裝
- [ ] **AdminSettingsPage.jsx** 包含「公開候位登記設置」開關UI
- [ ] **queueSlice.js** 包含 `setPublicRegistrationEnabled` async thunk
- [ ] **queueService.js** 包含開關設定API服務函數
- [ ] **AdminDashboardPage.jsx** 包含完整的登記候位浮動視窗
- [ ] **RegisterForm.jsx** 支援 `onSuccess` 回調參數
- [ ] Dialog 相關 Material-UI 組件無重複導入錯誤

#### 🔄 簡化模式功能檢查清單 (2024年最新功能)
開發和修改簡化模式相關功能時，務必確認：
- [ ] **system-setting.model.js** 包含 `simplifiedMode: Boolean` 欄位
- [ ] **admin.controller.js** 包含 `setSimplifiedMode` 函數
- [ ] **admin.routes.js** 包含 `PUT /admin/settings/simplifiedMode` 路由
- [ ] **queue.controller.js** 的 `registerQueue` 函數根據簡化模式調整驗證邏輯
- [ ] **queueService.js** 包含 `setSimplifiedMode` API服務函數  
- [ ] **queueSlice.js** 包含簡化模式相關的async thunk和reducer
- [ ] **AdminSettingsPage.jsx** 包含簡化模式切換開關界面
- [ ] **RegisterForm.jsx** 實現條件式驗證邏輯
- [ ] 自動填入機制正常運作（email、phone、address等預設值）

#### 🔄 開關功能操作指南
**管理員透過系統設定控制候位登記開放狀態**：
1. 登入管理後台 → 系統設定頁面
2. 找到「公開候位登記設置」區塊
3. 使用開關控制候位登記功能：
   - **開啟時**：一般民眾可在首頁直接候位登記
   - **關閉時**：僅管理員可透過後台候位登記
4. 設定變更即時生效，無需重新部署
5. 管理員始終保有後台登記功能權限

#### ⚠️ ESLint 常見錯誤
```bash
# 常見錯誤: Dialog 組件重複聲明
Syntax error: Identifier 'Dialog' has already been declared

# 解決方案: 檢查 AdminDashboardPage.jsx 的導入語句
import {
  Dialog,
  DialogTitle, 
  DialogContent,
  // 確保無重複導入
} from '@mui/material';
```

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
- [ ] **候位登記功能（管理員限定）**：
  - [ ] 一般訪客無法看到候位登記按鈕
  - [ ] 管理員登入後可看到首頁和導航欄的候位按鈕
  - [ ] 管理員可正常訪問 `/register` 路由
  - [ ] 管理員後台「登記候位」浮動視窗正常運作
  - [ ] 登記完成後浮動視窗自動關閉並刷新列表
- [ ] 候位狀態查詢（支持姓名或電話單一條件查詢，姓名查詢包含家人）
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
- [ ] **候位登記功能（後台專用）**：
  - [ ] 「登記候位」按鈕正常顯示（綠色，PersonAddIcon）
  - [ ] 浮動視窗正確載入 RegisterForm 組件
  - [ ] 登記流程完整運作（基本資料、地址、家人、諮詢主題）
  - [ ] 登記成功後視窗關閉並自動刷新候位列表
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
- [ ] 等待組數計算正確性（等於叫號順序）
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

#### 候位登記功能相關問題（最新）
```bash
# 症狀: 一般用戶仍可看到候位按鈕，或管理員無法使用浮動視窗
# 檢查清單:
# 1. HomePage.jsx 是否包含 {isAuthenticated && (...)} 
# 2. Layout.jsx 是否包含認證條件
# 3. App.js 是否有 ProtectedRoute 保護
# 4. AdminDashboardPage.jsx 是否有完整的Dialog功能
# 5. 是否有Dialog組件重複聲明的ESLint錯誤

# 解決方案: 確保最新代碼已部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 管理員面板功能失效問題（之前修復）
```bash
# 症狀: "清除候位"、"匯出資料"、"刪除客戶"功能失效
# 已修復: API端點不匹配和Props傳遞錯誤問題
# 確保使用最新版本代碼，包含管理員面板功能修復
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 後台管理「設定下次辦事時間」功能問題
```bash
# 症狀: 白屏、Redux Error #7、設置失敗錯誤
# 已修復: 移除DateTimePicker依賴，使用原生datetime-local輸入框
# 確保使用最新版本代碼，包含時間設定功能修復
docker-compose down
docker-compose build --no-cache
docker-compose up -d
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

#### ⚠️ 客戶出生日期顯示問題（最新修復）

**問題1: 後端API欄位格式不匹配（已修復）**
```javascript
// 查詢候位時客戶無法正確顯示出生年月日欄位資料
// ❌ 錯誤：後端返回舊格式欄位
return {
  birthYear: record.birthYear,
  birthMonth: record.birthMonth, 
  birthDay: record.birthDay,
  calendarType: record.calendarType,
  // ... 其他欄位
};

// ✅ 正確：後端返回新格式欄位
return {
  gregorianBirthYear: record.gregorianBirthYear,
  gregorianBirthMonth: record.gregorianBirthMonth,
  gregorianBirthDay: record.gregorianBirthDay,
  lunarBirthYear: record.lunarBirthYear,
  lunarBirthMonth: record.lunarBirthMonth,
  lunarBirthDay: record.lunarBirthDay,
  lunarIsLeapMonth: record.lunarIsLeapMonth,
  virtualAge: record.virtualAge,
  // ... 其他欄位
};
```

**問題2: 前端出生日期顯示邏輯（已修復）**
```javascript
// 客戶查詢時無法完整顯示國曆和農曆出生日期
// ❌ 錯誤：只顯示其中一種
if (record.gregorianBirthYear && ...) {
  return `${formatMinguoDate(...)} (國曆)`;
} else if (record.lunarBirthYear && ...) {
  return `${formatMinguoDate(...)} (農曆)`;
}

// ✅ 正確：同時顯示國曆和農曆
{hasGregorian && (
  <Typography>國曆出生日期：{formatMinguoDate(...)}</Typography>
)}
{hasLunar && (
  <Typography>農曆出生日期：{formatMinguoDate(...)} {閏月標示}</Typography>
)}
```

#### ⚠️ 管理員面板功能常見問題（之前修復）

**問題3: API端點不匹配（已修復）**
```javascript
// ❌ 錯誤的API端點調用
// 清除候位功能
export const clearAllQueue = async () => {
  const response = await axios.delete(`${API_BASE_URL}/queue/clear`); // 錯誤端點
  return response.data;
};

// ✅ 正確的API端點調用  
export const clearAllQueue = async () => {
  const response = await axios.delete(`${API_BASE_URL}/queue/clear-all`); // 正確端點
  return response.data;
};

// 刪除客戶功能
// ❌ 錯誤: axios.delete(`${API_BASE_URL}/queue/${queueId}`)
// ✅ 正確: axios.delete(`${API_BASE_URL}/queue/${queueId}/delete`)
```

**問題4: 組件Props傳遞錯誤（已修復）**
```javascript
// ❌ 錯誤的Props傳遞
<ExportDialog
  open={exportDialogOpen}
  onClose={() => setExportDialogOpen(false)}
  data={localQueueList} // 錯誤：應為 customers
/>

// ✅ 正確的Props傳遞
<ExportDialog
  open={exportDialogOpen}
  onClose={() => setExportDialogOpen(false)}
  customers={localQueueList} // 正確：使用 customers
/>
```

#### ⚠️ 國曆農曆轉換功能常見問題

**問題5: lunar-javascript API錯誤使用**
```javascript
// ❌ 錯誤用法
const isLeapMonth = lunar.isLeap(); // 此方法不存在

// ✅ 正確用法  
const isLeapMonth = lunar.getMonth() < 0;
const monthValue = Math.abs(lunar.getMonth());
```

**問題6: 後端控制器缺少導入**
```javascript
// 確保在 backend/src/controllers/admin.controller.js 中有以下導入
import { autoFillDates, autoFillFamilyMembersDates } from '../utils/calendarConverter';
```

**問題7: 前端提交數據不完整**
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

**問題8: 轉換函數調用方式錯誤**
```javascript
// ❌ 錯誤用法（直接傳入數組）
processedData.familyMembers = autoFillFamilyMembersDates(processedData.familyMembers);

// ✅ 正確用法（傳入包含familyMembers屬性的對象）
const familyData = autoFillFamilyMembersDates({ familyMembers: processedData.familyMembers });
processedData.familyMembers = familyData.familyMembers;
```

**問題9: 表格虛歲欄位顯示錯位**
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
- [ ] **客戶出生日期顯示檢查**（最優先）：
  - [ ] 後端API是否返回新的欄位格式（gregorianBirthYear等）
  - [ ] 前端顯示邏輯是否同時顯示國曆和農曆
  - [ ] `getQueueByNameAndPhone` API返回的欄位是否正確
- [ ] **簡化模式功能檢查**（2024年最新功能）：
  - [ ] 系統設定模型是否包含 `simplifiedMode` 欄位
  - [ ] 簡化模式API端點是否正確實現（`PUT /admin/settings/simplifiedMode`）
  - [ ] 候位登記邏輯是否根據簡化模式調整驗證
  - [ ] 前端切換界面是否正常運作和顯示狀態
  - [ ] 自動填入機制是否正確補齊預設值
  - [ ] 條件式表單驗證是否正確實現
- [ ] **管理員面板功能檢查**：
  - [ ] API端點是否匹配（清除候位、刪除客戶）
  - [ ] 組件Props是否正確傳遞（特別是ExportDialog的customers prop）
  - [ ] 匯出功能是否顯示正確的客戶筆數
- [ ] 是否正確導入所有必要函數
- [ ] 前端提交數據是否包含所有必要欄位  
- [ ] 後端API是否正確處理新欄位結構
- [ ] 轉換工具是否使用正確的lunar-javascript API
- [ ] 轉換函數調用方式是否正確（對象參數vs數組參數）
- [ ] 表格欄位是否正確渲染（特別是虛歲欄位）
- [ ] 時間設定功能是否使用原生datetime-local（非DateTimePicker）
- [ ] Redux狀態管理是否僅存儲可序列化數據（字符串格式）
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
- 系統已部署至Zeabur平台：
  - **前端**：`https://online-waiting-queue-system.zeabur.app`
  - **後端API**：`https://online-waiting-queue-system-backend.zeabur.app`
  - **管理後台**：`https://online-waiting-queue-system.zeabur.app/admin/login`
- 更新流程：本地修改 → `git push` → Zeabur自動重新部署
- 部署通常需要3-5分鐘完成
- **⚠️ 重要PORT配置**：
  - 前端必須設定 `PORT=80`，避免與後端PORT 8080衝突
  - 未正確設定會導致502錯誤
  - 後端需添加 `MONGO_CONNECTION_STRING` 環境變數
- 提醒用戶推送代碼後檢查線上版本功能正常 