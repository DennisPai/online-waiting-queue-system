# 線上候位系統

這是一個基於網頁的線上候位系統，無需下載應用程式即可使用。系統提供多種排隊登記方式，讓客戶可以輕鬆進行候位，同時管理者可以有效管理現場狀況。

## ⚠️ 重要功能變更

### 公開候位登記開關功能
**生效日期**: 2024年12月  
**變更說明**: 候位登記功能現在可透過後台系統設定中的「公開候位登記設置」開關來控制，管理員可動態決定是否開放給一般民眾使用。  
**功能特色**: 
- 管理員可在系統設定中即時開啟或關閉公開候位登記
- 關閉時：僅管理員可透過後台「登記候位」浮動視窗進行登記
- 開啟時：一般民眾可在首頁直接進行候位登記
- 管理員始終可使用後台登記功能，不受開關影響

**技術實施**:
- 系統設定新增「公開候位登記設置」開關
- 首頁和導航欄根據設定動態顯示/隱藏"我要候位"按鈕
- 路由保護改為條件式，基於系統設定和認證狀態
- 所有原有功能架構完整保留，可靈活控制開放狀態

**管理員操作方式**:
1. 登入管理後台 → 系統設定
2. 在「公開候位登記設置」區塊開啟或關閉功能
3. 隨時可使用候位管理頁面的「登記候位」浮動視窗功能
4. 設定變更即時生效，無需重啟系統

## 功能特點

### 客戶端功能
- 多種排隊登記方式（基本資料、出生日期、地址與請示內容、家人資訊）
- 即時查看候位狀態與預估開始時間
- 首頁即時顯示順序1的客戶號碼為「目前叫號」
- 首頁即時顯示順序2的客戶號碼為「下一位等待號碼」
- **靈活查詢功能**：支持姓名或電話擇一查詢候位狀態，姓名查詢包含家人姓名
- 不需下載App，直接透過網頁使用
- 註冊後和查詢後都可重新返回首頁進行新的操作
- **智慧預估時間計算**：基於總人數（本人+家人）×每位客戶預估處理時間，提供更精確的等待時間預估
- 預估開始時間以下次辦事時間+(總人數*每位客戶預估處理時間)計算，顯示上下午格式
- **個人化字體設定**: 提供4種字體大小選擇，設定會自動保存
- **響應式設計**: 完美支援手機、平板、桌面裝置，包含觸控優化和漢堡選單
- **視覺優化**: 數字顯示加粗和大小優化，提升閱讀體驗
- **術語統一優化**: 系統統一使用"等待組數"替代"等待人數"，更準確反映候位性質
- **其他詳細內容功能**：客戶選擇「其他」諮詢主題時，可自行填寫詳細問題內容（最多500字符），提供更精確的服務需求描述
- **客戶自助管理功能**：
  - **查看詳細資料**：客戶可查看完整的登記資料，包含基本資料、諮詢主題、地址資訊、家人資訊等
  - **取消預約功能**：客戶可自行取消預約，包含確認警告機制和安全驗證
  - **修改資料功能**：客戶可編輯和更新自己的登記資料，支援所有欄位修改
  - **地址管理**：支援新增、編輯、刪除地址（最多3個），每個地址可設定類型
  - **家人管理**：支援新增、編輯、刪除家人資訊（最多5人），包含完整個人資料
- **精準狀態顯示**：
  - 修復候位狀態計算邏輯，確保不同客戶顯示正確的前面等待組數
  - 當候位號碼等於目前叫號時，正確顯示"處理中"狀態
  - 基於orderIndex的動態計算，確保狀態準確性

### 管理端功能
- 管理員後台控制系統
- 即時掌握現場狀況
- **候位登記功能（管理員專用）**：
  - 「登記候位」浮動視窗，整合完整的RegisterForm組件
  - 支援所有原有登記功能：基本資料、地址、家人、諮詢主題等
  - 登記完成後自動刷新候位列表
  - 綠色按鈕配PersonAddIcon圖示，操作直觀
- **簡化模式功能**：
  - **簡化模式開關**：管理員可在系統設定中啟用/停用簡化模式
  - **彈性註冊驗證**：簡化模式啟用時，候位登記僅需填寫客戶姓名，其他欄位皆為可選
  - **自動補齊機制**：後端自動為缺失的必要欄位提供預設值，確保資料完整性
  - **緊急應用場景**：適用於緊急情況或需要快速登記候位的場合
  - **管理端控制**：詳細的模式狀態顯示和警告提示，確保管理員清楚了解當前模式
- 簡化的候台管理UI，使用單一空白方格（checkbox）代替多個操作按鈕
- 智能狀態顯示：叫號順序1顯示處理中，其他順序顯示等待中，打勾顯示已完成
- 自動排序機制：已完成記錄自動移至列表最後
- 一鍵叫號功能，自動將叫號順序1的記錄標記為已完成
- 靈活管理候位清單
- 客戶資料管理與篩選功能
- 設定下次辦事時間
- 候位順序拖曳調整功能
- **重新排序功能**: 按叫號順序從小到大重新排列所有客戶，確保連續性(1,2,3...)
- 客戶資料編輯與修正功能
- **客戶刪除功能**: 可永久刪除客戶資料，包含確認對話框防止誤操作
- **多地址與家人管理功能**：
  - 支援客戶登記最多3個地址，每個地址可選擇類型（住家/工作場所/醫院/其他）
  - 支援新增最多5位家人資訊，包含姓名、生日、地址等完整資料
  - 後台完整顯示客戶與家人的所有資訊，包含地址詳情
  - 新增「人數」欄位顯示該筆客戶總人數（本人+家人）
- 客戶取消與復原功能：
  - 可取消客戶預約，客戶會移至"已取消客戶"分頁
  - 可復原已取消的客戶，重新設為等待中狀態
  - 所有操作都有確認對話框，防止誤操作
- 分頁管理：
  - "候位列表"分頁：管理等待中、處理中、已完成的客戶
  - "已取消客戶"分頁：專門查看和管理已取消的客戶
- 界面優化：
  - 統一顯示"號碼"而非"候位號碼"
  - **叫號順序欄位**: 將"順序"改為"叫號順序"，更清楚表達功能
  - 操作按鈕水平排列，節省空間
  - 簡化詳細資料對話框操作流程
  - **移除分頁功能**: 直接顯示所有客戶，提升管理效率
- **資料匯出功能**: 
  - 支援Excel(.xlsx)和CSV格式匯出
  - **最詳細客戶資料匯出**：包含完整的客戶和家庭成員資訊
    - 基本資料：候位號碼、姓名、電話、電子郵件、性別、叫號順序、狀態
    - 國曆出生日期：年、月、日和完整日期（民國年格式）
    - 農曆出生日期：年、月、日、閏月標記和完整日期（民國年格式）
    - 虛歲計算：自動計算虛歲資訊
    - 完整地址資訊：最多3個地址及其類型（住家、工作場所、醫院、其他）
    - 家庭成員詳細資料：每位家人的完整個人資訊
    - 諮詢主題、登記時間、更新時間、完成時間
    - **其他詳細內容**：當客戶選擇「其他」諮詢主題時的詳細說明內容
  - **主客戶和家人分行顯示**：每位客戶和其家庭成員都是獨立的行
  - **成員類型標識**：清楚標示"主客戶"或"家庭成員1/2/3..."
  - **自動欄位寬度調整**：根據欄位內容自動設定Excel欄位寬度
  - **所有狀態客戶**：匯出時會重新獲取所有客戶資料，不受當前顯示篩選限制
  - 中文字符完整支援，Excel自動調整欄寬
- **響應式後台設計**: 支援手機和平板管理操作
- **字體大小同步**: 後台同步支援字體大小調整功能
- **精確的等待組數計算**: 候位登記完成時顯示的等待組數等於該客戶的叫號順序，確保準確性
- **目前叫號顯示優化**: 系統設定中的「目前叫號」自動顯示orderIndex為1的客戶號碼，確保叫號準確性
- **系統設定增強功能**:
  - **最大候位上限設定**: 可自由調整候位數量上限，預設100人
  - **每位客戶預估處理時間設定**: 可調整每位客戶的預估處理時間，預設13分鐘，範圍1-120分鐘
  - **簡化模式控制**: 可啟用/停用簡化模式，控制候位登記的驗證要求
  - **公開候位登記開關**: 可動態控制是否開放一般民眾使用候位登記功能
  - **辦事狀態控制**: 控制是否正在進行辦事服務，影響叫號顯示但不影響候位登記功能
  - 下次辦事時間設定
- **候位管理表格優化**:
  - **欄位顯示選擇功能**: 可自由選擇要顯示的欄位（叫號順序、號碼、狀態、姓名、電話、性別、出生日期、地址等）
  - **欄位設定持久化**: 顯示設定自動保存，下次登入保持相同配置
  - **操作欄位固定**: 操作按鈕固定寬度和位置，不受其他欄位調整影響
  - **粘性定位**: 操作欄位使用sticky positioning，在表格滾動時保持可見
- **資料結構優化**:
  - **清理向後兼容欄位**: 移除舊的 `birthYear`, `birthMonth`, `birthDay`, `calendarType` 欄位
  - **國曆農曆獨立欄位**: 採用 `gregorianBirthYear/Month/Day` 和 `lunarBirthYear/Month/Day`, `lunarIsLeapMonth` 獨立欄位
  - **簡化編輯界面**: 後台客戶資料編輯移除曆法選擇，國曆農曆欄位可獨立編輯
  - **資料驗證優化**: 後端API驗證更新為新的欄位結構，確保資料完整性

## 技術架構

### 前端
- React.js
- Redux Toolkit (狀態管理)
- React Router v6 (路由管理)
- Material-UI (UI元件庫)
- Socket.io-client (即時通訊)
- date-fns (日期處理)
- react-beautiful-dnd (拖曳功能)
- xlsx (Excel文件處理)
- file-saver (文件下載)
- CSS custom properties (響應式字體大小)

### 後端
- Node.js + Express.js
- MongoDB (資料庫)
- JWT (身份驗證)
- Socket.io (即時通訊)
- bcrypt (密碼加密)

### 部署
- Docker 容器化
- Docker Compose 多容器協調
- Zeabur 雲平台

## 快速開始

### 🌐 線上部署版本
本系統已部署至 Zeabur 雲平台，可直接訪問使用：
- **前端網址**: https://online-waiting-queue-system.zeabur.app
- **後端API**: https://online-waiting-queue-system-backend.zeabur.app
- **管理後台**: https://online-waiting-queue-system.zeabur.app/admin/login
- **預設管理員帳號**: admin / admin123

### 🛠 本地開發

#### 前置需求
- Node.js (v16+)
- npm 或 yarn
- MongoDB
- Docker 與 Docker Compose

#### ⚠️ 重要：本專案必須使用Docker進行開發

1. 克隆此儲存庫
```bash
git clone https://github.com/DennisPai/online-waiting-queue-system.git
cd online-waiting-queue-system
```

2. 使用Docker啟動服務
```bash
# 建構並啟動所有服務
docker-compose build
docker-compose up -d

# 初始化管理員帳號
cd backend
npm install
node init-admin.js
```

3. 訪問應用
   - 前端: http://localhost:3100
   - 後端API: http://localhost:8080/api
   - 管理後台: http://localhost:3100/admin/login

### Docker部署

#### ⚠️ 重要說明：本專案必須使用Docker進行開發和部署

#### 基本部署步驟

1. 建立 Docker 映像:
```bash
docker-compose build
```

2. 啟動全部服務:
```bash
docker-compose up -d
```

3. 初始化管理員帳號:
```bash
cd backend
npm install  # 確保依賴已安裝
node init-admin.js
```

4. 重啟服務（修改後）:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

#### 🔄 開發流程（重要）

**每次修改代碼或添加新依賴後，都必須重新建構Docker：**

```bash
# 停止現有容器
docker-compose down

# 重新建構（特別是添加新npm依賴後）
docker-compose build

# 啟動服務
docker-compose up -d

# 檢查狀態
docker ps
```

#### 📱 新功能說明

本次更新包含以下新功能：
- **智能推薦到場時間**: 查詢候位時會顯示建議到場時間，計算邏輯為預估辦事時間提前20分鐘，附詳細說明和免責聲明
- **字體大小調整**: 導航欄提供字體大小調整功能，支援4種大小（小16px、中20px、大24px、特大28px），每級相差4px，設定會持久化保存
- **響應式設計**: 完整支援手機、平板使用，包含漢堡選單、44px最小觸控區域、響應式布局和間距優化
- **資料匯出功能**: 後台可匯出Excel/CSV格式的客戶資料，包含完整客戶資訊與中文字符支援
- **視覺優化**: 首頁數字顯示加粗並優化大小，提升閱讀體驗和視覺層次
- **時間設定功能優化**: 修復後台管理「設定下次辦事時間」功能，移除DateTimePicker依賴，使用原生HTML datetime-local輸入框，解決Redux Error #7序列化問題，提升系統穩定性和兼容性

#### 端口配置

系統目前使用以下端口配置：
- **前端服務**：http://localhost:3100
- **後端API**：http://localhost:8080
- **MongoDB**：localhost:27017

> **注意**：原本使用的端口 3000 在某些 Windows 系統上可能被系統保留，因此改用端口 3100。

#### Windows 端口衝突解決方案

在 Windows 系統上，端口 2931-3030 可能被系統保留，導致 Docker 容器無法正常啟動。

**檢查保留端口範圍：**
```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

**解決步驟：**

1. **停止所有容器**：
   ```bash
   docker-compose down
   ```

2. **檢查並清理 Docker 資源**：
   ```bash
   docker ps -a
   docker system prune -f
   ```

3. **使用非保留端口**：
   - 系統已配置使用端口 3100（避開 Windows 保留範圍）
   - 如仍有衝突，可修改 `docker-compose.yml` 中的端口映射

4. **重新建構和啟動**：
   ```bash
   docker-compose build
   docker-compose up -d
   ```

**故障排除提示：**

- 確保 Docker Desktop 正常運行
- 檢查是否有其他程式佔用端口：`netstat -ano | findstr :3100`
- 如果初始化腳本失敗，確保在 backend 目錄下運行並且 MongoDB 已完全啟動
- 可以等待 10-15 秒讓 MongoDB 完全初始化後再運行 `node init-admin.js`
- 如遇到權限問題，嘗試以管理員身份運行 PowerShell

#### 常見錯誤處理

**錯誤：Port 3100 bind: An attempt was made to access a socket in a way forbidden by its access permissions**

這是 Windows 端口保留問題，按照上述 Windows 端口衝突解決方案處理。

**錯誤：Cannot find module 'mongoose'**

在 backend 目錄下運行：
```bash
npm install
```

**錯誤：MongoServerError: command find requires authentication**

確保使用正確的數據庫連接字符串，初始化腳本已配置為：
```
mongodb://admin:password@localhost:27017/queue_system?authSource=admin
```

### 預設管理員帳號

- URL: http://localhost:3100/admin/login
- 帳號: admin
- 密碼: admin123

> **重要**：首次登入後請立即修改預設密碼！

## 系統功能說明

### 首頁功能
- 顯示目前叫號狀態
- 顯示下一個等待號碼
- 顯示等待組數與預估結束時間
- 提供候位登記和查詢入口

### 候位登記流程
1. 點擊首頁上的「立即候位」按鈕
2. 填寫單頁式表單：
   - 基本資料（姓名、電話、電子郵件、性別、生日）
   - 地址資訊（最多3個地址，含地址類型選擇）
   - 家人資訊（最多5位家人，含完整個人資料）
   - 諮詢主題選擇
3. 提交後系統自動分配候位號碼
4. 顯示候位成功頁面，包含候位號碼和預估叫號時間
5. 可選擇查看候位狀態或返回首頁

### 查詢候位功能
1. 點擊首頁上的「查詢候位」按鈕
2. **靈活查詢方式**：可選擇輸入姓名或電話其中一個進行查詢
   - **姓名查詢**：支援查詢本人或家人姓名，更貼近實際使用需求
   - **電話查詢**：直接使用登記電話號碼查詢
   - **組合查詢**：同時輸入姓名和電話進行精確查詢
3. 顯示候位號碼、狀態、前面等待組數和預估結束時間
4. 查詢界面友善提示「請輸入姓名或電話其中一個進行查詢」
5. 可返回首頁重新查詢

### 管理員功能
1. 登入後台系統
2. 候位管理頁面可查看所有候位者資訊
3. 可使用方格checkbox標記完成狀態（打勾後自動將記錄移至列表最後）
4. 呼叫下一位功能會自動將目前處理中（順序1）的記錄標記為已完成
5. 系統設定頁面可設定下次辦事時間
6. 可開啟或關閉候位系統
7. 客戶取消與復原功能：
   - 可取消客戶預約，客戶會移至"已取消客戶"分頁
   - 可復原已取消的客戶，重新設為等待中狀態
   - 所有操作都有確認對話框，防止誤操作
8. 分頁管理：
   - "候位列表"分頁：管理等待中、處理中、已完成的客戶
   - "已取消客戶"分頁：專門查看和管理已取消的客戶
9. 界面優化：
   - 統一顯示"號碼"而非"候位號碼"
   - 操作按鈕水平排列，節省空間
   - 簡化詳細資料對話框操作流程

## 專案結構

```
online-waiting-queue-system/
├── backend/                          # 後端API伺服器
│   ├── src/                          # 源代碼
│   │   ├── config/                   # 配置文件
│   │   ├── controllers/              # 控制器
│   │   ├── models/                   # 資料模型
│   │   ├── routes/                   # API路由
│   │   ├── services/                 # 業務邏輯
│   │   ├── utils/                    # 工具函數
│   │   └── app.js                    # 應用入口
│   ├── .env.example                  # 環境變數範例 (Zeabur部署用)
│   ├── Dockerfile                    # Docker配置
│   ├── init-admin.js                 # 管理員初始化腳本
│   ├── update-existing-customers.js  # 虛歲批量更新腳本
│   └── package.json                  # 後端依賴
│
├── frontend/                         # 前端React應用
│   ├── public/                       # 靜態文件
│   ├── src/                          # 源代碼
│   │   ├── components/               # 共用元件
│   │   ├── contexts/                 # React Context
│   │   ├── pages/                    # 頁面元件
│   │   │   └── admin/                # 管理員頁面
│   │   ├── redux/                    # Redux狀態管理
│   │   │   └── slices/               # Redux切片
│   │   ├── services/                 # API服務
│   │   ├── utils/                    # 工具函數
│   │   └── App.js                    # 應用入口
│   ├── Dockerfile                    # Docker配置
│   ├── nginx.conf                    # Nginx配置
│   └── package.json                  # 前端依賴
│
├── .gitignore                        # Git忽略檔案
├── docker-compose.yml                # Docker Compose配置
├── DEPLOYMENT.md                     # 部署指南
├── AI_DEVELOPMENT_GUIDE.md           # AI開發指南
├── 線上候位系統開發文檔.md               # 完整開發文檔
└── README.md                         # 專案說明
```

## 重要實現功能

### 簡化模式功能

系統新增了簡化模式功能，提供更彈性的候位登記體驗：

#### 功能特色
- **雙重驗證模式**：
  - **標準模式**：完整資料驗證，確保客戶資料完整性
  - **簡化模式**：僅需客戶姓名，其他欄位皆為可選，適用於緊急或快速登記場景
- **管理員控制**：透過後台系統設定可隨時切換模式
- **自動補齊機制**：簡化模式下，後端自動為缺失的必要欄位提供預設值
- **無縫切換**：模式切換立即生效，無需重啟系統

#### 技術實現
- **後端驗證**：`queue.controller.js` 根據系統設定動態調整驗證邏輯
- **前端適配**：`RegisterForm.jsx` 根據簡化模式調整表單驗證要求
- **系統設定**：`AdminSettingsPage.jsx` 提供簡化模式切換界面
- **狀態管理**：`queueSlice.js` 管理簡化模式相關狀態
- **資料模型**：`system-setting.model.js` 新增 `simplifiedMode` Boolean 欄位

#### 使用場景
- **緊急情況**：需要快速為客戶登記候位時
- **現場服務**：客戶資料不完整但需要立即候位時
- **靈活操作**：根據實際營運需求動態調整驗證要求

#### 自動填入機制
簡化模式啟用時，系統會自動為缺失的必要欄位提供預設值：
- **電子郵件**：`temp_時間戳@temp.com`
- **電話號碼**：`0000000000`
- **地址資訊**：「臨時地址」和預設地址類型
- **諮詢主題**：預設選擇「其他」
- **其他詳細內容**：當預設選擇「其他」時，自動填入「簡化模式快速登記」，避免驗證失敗

### 智慧預估時間計算系統

系統採用智慧預估時間計算，提供更精確的等待時間預估：

#### 計算邏輯優化
- **舊計算方式**：基於客戶資料筆數 × 每位客戶預估處理時間
- **新計算方式**：基於總人數（本人+家人）× 每位客戶預估處理時間
- **實例對比**：
  - 舊邏輯：3筆客戶資料 × 13分鐘 = 39分鐘
  - 新邏輯：3筆客戶資料總共5人 × 13分鐘 = 65分鐘

#### 系統特色
- 基於後台設定的"下次辦事時間"
- 每位等待者處理時間可在後台系統設定中自由調整（預設13分鐘，範圍1-120分鐘）
- 計算公式：預估結束時間 = 下次辦事時間 + (總人數 × 每位客戶預估處理時間)
- 顯示格式包含上下午標記（例：下午3點10分）
- 實時更新：系統設定變更後，所有預估時間計算立即生效

### 候台管理優化

系統實現了簡潔高效的候台管理機制：
1. **簡化UI操作**
   - 原本多個操作按鈕（處理中、已完成、已取消）改為單一空白方格
   - 空白方格打勾後自動標記為已完成，並將記錄移至列表最後
   - 根據記錄順序和狀態自動顯示狀態標籤

2. **智能狀態顯示**
   - 順序為1的記錄自動顯示「處理中」狀態
   - 順序不為1的記錄顯示「等待中」狀態
   - 已打勾的記錄顯示「已完成」狀態

3. **首頁同步顯示**
   - 首頁的「目前叫號」永遠顯示順序1的客戶號碼
   - 「下一位等待號碼」永遠顯示順序2的客戶號碼
   - 確保管理端和客戶端看到的資訊始終同步

4. **呼叫下一位優化**
   - 按下「呼叫下一位」按鈕會自動將順序1的記錄標記為完成
   - 系統自動調整順序，維持連續的作業流程

5. **雙API系統架構**
   - **公開API**：`/api/queue/ordered-numbers` - 用於首頁顯示，無需認證
   - **管理員API**：`/api/admin/queue/ordered-numbers` - 用於後台管理，需要認證
   - 前端根據認證狀態自動選擇適當的API端點
   - 解決了首頁訪問管理員API導致的認證問題

6. **客戶取消與復原功能**
   - 支持取消客戶預約，自動移至"已取消客戶"分頁
   - 提供復原功能，可將已取消客戶重新設為等待中
   - 所有操作都有確認對話框，防止誤操作
   - 已取消客戶完全從主列表分離，避免混淆

7. **分頁管理系統**
   - "候位列表"分頁：顯示等待中、處理中、已完成的客戶
   - "已取消客戶"分頁：專門管理已取消的客戶記錄
   - 不同狀態的客戶分類管理，提升操作效率

8. **界面優化改進**
   - 統一使用"號碼"代替"候位號碼"，簡化顯示
   - 操作按鈕水平排列，提升空間利用率
   - 移除詳細資料對話框中的"標記為處理中"按鈕
   - 優化"標記為已完成"按鈕，具有與方格勾選相同的自動移動功能

這些優化顯著提升了系統的易用性：
- 減少了操作步驟，提高工作效率
- 更清晰的視覺反饋，狀態一目了然
- 自動化的記錄管理，減少手動維護
- 保持前後端資訊同步，提升系統可靠性
- 雙API架構確保系統穩定性和安全性
- 分頁設計讓不同狀態的客戶管理更加清晰有序
- 取消與復原功能提供更靈活的客戶管理方式
- 界面優化提升用戶體驗和操作效率

### 狀態重置機制

系統實現了完善的狀態重置機制：
1. 透過 Redux 的 `resetRegistration` 和 `clearQueueSearch` actions 清除狀態
2. 使用 React Router 的 location key 監控頁面變化
3. 自動在進入頁面時重置相關狀態
4. 在返回首頁按鈕中也添加了顯式重置
5. 確保用戶每次可以重新登記候位和查詢候位狀態

### 候位順序拖曳調整功能

系統實現了候位順序的靈活調整功能：
1. 使用 react-beautiful-dnd 實現直觀的拖曳介面
2. 採用「本地狀態優先」策略，拖曳後立即更新UI，無需等待後端響應
3. 保持候位號碼不變，僅調整顯示和處理順序
4. 完善的錯誤處理機制，確保前後端數據一致性
5. 管理員可根據實際情況靈活調整客戶的候位順序

這種設計大幅提升了管理體驗：
- 拖曳操作流暢，無白屏問題
- 即時視覺反饋，操作直觀
- 系統穩健性高，出錯時能自動恢復

### 客戶資料編輯功能

系統提供了完整的客戶資料編輯功能：
1. 在客戶詳細資料頁面整合直觀的編輯介面
2. 支持編輯所有客戶相關資料，包括：
   - 基本資料（姓名、電話、電子郵件、性別）
   - 出生資訊（出生年月日、國曆/農曆）
   - 地址資訊（地址、地址類型）
   - 諮詢主題（複選項目）
3. 採用表單驗證確保數據有效性
4. 編輯完成後即時更新資料庫和UI顯示

這項功能解決了實際運營中的重要問題：
- 管理員可直接修正客戶誤填的資料
- 減少因資料錯誤導致的溝通問題
- 提高服務品質和客戶體驗
- 維護資料庫中客戶資訊的準確性

### 資料結構優化與向後兼容清理

系統完成了重要的資料結構優化，消除混淆的向後兼容欄位：

#### 清理內容
1. **移除舊欄位**：
   - 主客戶和家人結構中的 `birthYear`, `birthMonth`, `birthDay`, `calendarType` 欄位
   - 清理後台管理和前端註冊中的相關邏輯
   - 移除API驗證中的舊欄位檢查

2. **採用新欄位結構**：
   - **國曆欄位**：`gregorianBirthYear`, `gregorianBirthMonth`, `gregorianBirthDay`
   - **農曆欄位**：`lunarBirthYear`, `lunarBirthMonth`, `lunarBirthDay`, `lunarIsLeapMonth`
   - 清晰分離國曆與農曆資料，避免混淆

#### 系統邏輯更新
1. **前端註冊流程**：
   - 客戶選擇國曆/農曆後，根據選擇填入對應欄位
   - 提交時移除臨時的 `birthYear`, `birthMonth`, `birthDay`, `calendarType` 欄位
   - 家人資料採用相同轉換邏輯

2. **後端API驗證**：
   - 更新為檢查國曆或農曆其中一組完整的年月日
   - 主客戶和家人都必須提供國曆或農曆出生日期
   - 移除舊欄位的必要性檢查

3. **後台管理優化**：
   - 移除客戶詳細資料編輯中的"曆法選擇"下拉選單
   - 國曆和農曆欄位可獨立編輯，無需先選擇曆法
   - 農曆閏月選項永遠可見，提供更靈活的編輯體驗

#### 系統優勢
- **資料一致性**：消除向後兼容邏輯帶來的混淆
- **清晰架構**：國曆農曆資料獨立儲存，邏輯更清晰
- **簡化操作**：後台編輯更直觀，無需複雜的曆法選擇步驟
- **維護性提升**：程式碼更簡潔，減少出錯可能性

## 部署與運維

### Docker Compose 配置

系統使用以下 Docker Compose 配置：

```yaml
version: '3.8'

services:
  # MongoDB 數據庫服務
  mongodb:
    image: mongo:5.0
    container_name: mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

  # 後端 API 服務
  backend:
    build:
      context: ./backend
    container_name: queue-backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/queue_system?authSource=admin
      - MONGO_CONNECTION_STRING=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}
      - CORS_ORIGIN=http://localhost:3100
      - SOCKET_CORS_ORIGIN=http://localhost:3100

  # 前端 Web 應用
  frontend:
    build:
      context: ./frontend
    container_name: queue-frontend
    restart: always
    ports:
      - "3100:80"
```

### 生產環境建議

對於生產環境部署，建議：

1. **使用 HTTPS**：配置 SSL 證書
2. **環境變數安全**：使用 Docker secrets 或環境變數管理
3. **資料庫備份**：設定定期備份策略
4. **監控與日誌**：整合監控和日誌收集系統
5. **負載均衡**：使用 Nginx 或其他負載均衡器

### 維護指令

```bash
# 查看容器狀態
docker ps

# 查看容器日誌
docker logs queue-frontend
docker logs queue-backend
docker logs mongodb

# 重新啟動單個服務
docker-compose restart frontend

# 完全重建服務
docker-compose down
docker-compose build
docker-compose up -d
```

## 🔧 故障排除指南

### 常見問題與解決方案

#### 1. 客戶出生日期顯示問題（最新修復）
**問題**：查詢候位時客戶無法正確顯示出生年月日欄位資料，或無法完整顯示國曆和農曆出生日期  
**原因**：
- 後端API仍返回舊的出生日期欄位格式而前端期望新格式
- 前端顯示邏輯使用 `else if`，導致只顯示國曆或農曆其中一種

**已修復的問題**：
- **後端API欄位格式**：`backend/src/controllers/queue.controller.js` 中的 `getQueueByNameAndPhone` 方法，將返回欄位從舊格式 (`birthYear`, `birthMonth`, `birthDay`, `calendarType`) 更新為新格式
- **前端顯示邏輯**：`frontend/src/pages/StatusPage.jsx` 中的出生日期顯示邏輯，改為同時顯示國曆和農曆資料（如果都有的話）

**修正後的顯示邏輯**：
```javascript
// 同時顯示國曆和農曆
{hasGregorian && (
  <Typography>國曆出生日期：{formatMinguoDate(...)}</Typography>
)}
{hasLunar && (
  <Typography>農曆出生日期：{formatMinguoDate(...)} {閏月標示}</Typography>
)}
```

#### 2. 管理員面板功能失效問題（已修復）
**問題**：前後端分離部署後，管理員面板的"清除候位"、"匯出資料"、"刪除客戶"功能失效  
**已修復的API端點問題**：
- **清除候位功能**：前端調用 `/queue/clear` → 修正為 `/queue/clear-all`
- **刪除客戶功能**：前端調用 `/queue/:queueId` → 修正為 `/queue/:queueId/delete`
- **匯出資料功能**：ExportDialog組件期望 `customers` prop → 修正傳遞正確的 props

#### 2. 候位登記時出現「缺少必要欄位email」錯誤
**問題**：用戶在候位登記頁面填寫了email但仍然出現此錯誤  
**原因**：前端提交數據時未包含email欄位  
**解決方案**：
- 確保 `frontend/src/pages/RegisterPage.jsx` 中 `handleSubmit` 函數的 `submissionData` 包含所有必要欄位
- 必須包含：`email`, `name`, `phone`, `gender`, `addresses`, `consultationTopics`

#### 3. 後台管理「設定下次辦事時間」功能問題
**問題**：點擊「設定下次辦事時間」按鈕後出現白屏或Redux Error #7錯誤  
**原因**：DateTimePicker組件與Redux序列化機制衝突，Date對象無法序列化存儲  
**解決方案**：
- 系統已移除DateTimePicker依賴，使用原生HTML datetime-local輸入框
- 所有日期處理改為字符串格式，避免Redux序列化問題
- 增強錯誤處理機制，提升系統穩定性

#### 4. 後台管理編輯客戶資料時顯示「更新客戶資料失敗」
**問題**：後台編輯客戶資料保存時失敗  
**原因**：後端缺少日期轉換工具的導入  
**解決方案**：
- 確保 `backend/src/controllers/admin.controller.js` 正確導入：
```javascript
import { autoFillDates, autoFillFamilyMembersDates } from '../utils/calendarConverter';
```

#### 5. 國曆農曆轉換功能異常
**問題**：日期轉換功能不工作或出現錯誤  
**原因**：lunar-javascript 庫API使用不正確  
**解決方案**：
- 使用正確的閏月判斷：`lunar.getMonth() < 0`
- 月份值使用：`Math.abs(lunar.getMonth())`
- 更新前後端 `calendarConverter.js` 使用正確的API

#### 6. 容器啟動失敗
**問題**：Docker容器無法正常啟動  
**常見原因和解決方案**：
```bash
# 檢查端口佔用
netstat -ano | findstr :3100
netstat -ano | findstr :8080

# 清理Docker資源
docker system prune -f
docker-compose down --remove-orphans

# 重新建構
docker-compose build --no-cache
docker-compose up -d
```

#### 7. 前端ESLint錯誤
**問題**：前端建構時出現ESLint錯誤  
**解決方案**：
- 檢查所有必要的import語句是否正確
- 確保autoFillDates等工具函數已正確導入

#### 8. 家人資料新增後虛歲不顯示
**問題**：編輯客戶資料新增家人並填寫國曆出生日期後，虛歲顯示"未計算"  
**原因**：`autoFillFamilyMembersDates` 函數調用方式錯誤  
**解決方案**：
- 確保正確調用轉換函數：
```javascript
// 錯誤調用方式
processedData.familyMembers = autoFillFamilyMembersDates(processedData.familyMembers);

// 正確調用方式
const familyData = autoFillFamilyMembersDates({ familyMembers: processedData.familyMembers });
processedData.familyMembers = familyData.familyMembers;
```

#### 9. 候台管理虛歲欄位顯示錯位
**問題**：開啟虛歲欄位後表格出現空白行，欄位名稱錯位  
**原因**：表格Body中缺少虛歲欄位的TableCell渲染  
**解決方案**：
- 在 `AdminDashboardPage.jsx` 的表格Body中添加虛歲欄位：
```javascript
{visibleColumns.includes('virtualAge') && (
  <TableCell>{renderColumnContent('virtualAge', row, index)}</TableCell>
)}
```

### 🧪 測試轉換工具功能

系統提供了測試腳本來驗證日期轉換功能：

```bash
cd backend
node final-test.js
```

成功輸出示例：
```
✅ 所有測試通過！轉換工具工作正常
```

### 🔄 批量更新既有客戶虛歲

系統提供了批量更新既有客戶虛歲的腳本：

```bash
cd backend
node update-existing-customers.js
```

此腳本會：
- 自動查找所有沒有虛歲的客戶記錄
- 基於農曆出生年份計算虛歲
- 更新主客戶和家人的虛歲資料
- 提供詳細的執行報告和統計

### ⚡ 性能優化建議

1. **自動轉換優化**：系統實現了雙向自動轉換，能即時顯示轉換結果
2. **API效能**：使用雙API架構，公開API無需認證，提升首頁載入速度
3. **狀態管理**：完善的狀態重置機制，避免數據污染

## 🌐 線上部署

### Zeabur 部署
本專案已成功部署至 Zeabur 平台，採用自動化 CI/CD 流程：

#### 🔄 更新流程
1. **本地修改** → 修改代碼並測試
2. **提交GitHub** → `git add .` → `git commit -m "更新內容"` → `git push`
3. **自動部署** → Zeabur 自動檢測更新並重新部署

#### 🏗 架構組成
- **前端服務**: React.js 應用 (Nginx)
- **後端服務**: Node.js + Express API
- **資料庫服務**: MongoDB 5.0+
- **網域配置**: 自動HTTPS證書

#### 📋 部署要求
- Node.js 16+
- MongoDB 5.0+
- 環境變數正確配置
- 詳細部署指南: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## 授權協議
MIT 