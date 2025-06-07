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

#### 管理員面板功能失效問題（最新修復）
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

#### ⚠️ 管理員面板功能常見問題（最新修復）

**問題1: API端點不匹配（已修復）**
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

**問題2: 組件Props傳遞錯誤（已修復）**
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

**問題3: lunar-javascript API錯誤使用**
```javascript
// ❌ 錯誤用法
const isLeapMonth = lunar.isLeap(); // 此方法不存在

// ✅ 正確用法  
const isLeapMonth = lunar.getMonth() < 0;
const monthValue = Math.abs(lunar.getMonth());
```

**問題4: 後端控制器缺少導入**
```javascript
// 確保在 backend/src/controllers/admin.controller.js 中有以下導入
import { autoFillDates, autoFillFamilyMembersDates } from '../utils/calendarConverter';
```

**問題5: 前端提交數據不完整**
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

**問題6: 轉換函數調用方式錯誤**
```javascript
// ❌ 錯誤用法（直接傳入數組）
processedData.familyMembers = autoFillFamilyMembersDates(processedData.familyMembers);

// ✅ 正確用法（傳入包含familyMembers屬性的對象）
const familyData = autoFillFamilyMembersDates({ familyMembers: processedData.familyMembers });
processedData.familyMembers = familyData.familyMembers;
```

**問題7: 表格虛歲欄位顯示錯位**
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
- [ ] **管理員面板功能檢查**（最優先）：
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