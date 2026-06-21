## 背景

修玄宮候位是面向宮廟客戶（多以農曆計算命理），「國曆 / 農曆」切換不直觀易誤填。Change A 已修好取消候位接口的安全性（`_id` + 身分驗證），但客戶端 UI 仍有「取消預約」按鈕容易被誤點。Change C 兩個動作都是**前端 UI 簡化**，後端不改：
- **全系統**簡化生日輸入只填農曆（降低誤填曆法成本；含前台 + 後台）
- 移除前台取消入口（避免誤點誤取消）

## 主要決策

### D1：lunarOnly 用屬性參數控制（仍走同一個 BirthdayPicker 元件）

**選項**：
- A. BirthdayPicker 加 `lunarOnly` 屬性參數、default `true`（全系統都是 lunar-only） ✓（採用）
- B. 寫新元件 `LunarOnlyBirthdayPicker` 取代既有 BirthdayPicker
- C. 全域改 BirthdayPicker 永遠 lunar-only、移除所有 lunarOnly 邏輯

**為何選 A**：
1. **改動最小**：加屬性參數 + 1 個條件渲染分支
2. **default `true` 對應「全系統 lunar-only」**：所有呼叫者（前台 FamilySection / 後台 CustomerDetailDialog）不傳即自動 lunar-only
3. **保留未來彈性**：若有特殊需求要雙模式（例：管理員報名歷史國曆客戶），未來可傳 `lunarOnly={false}` 暫時恢復
4. **不刪 toggle 程式碼**：留著但不顯示（純前端條件渲染、無維護成本）

### D2：default `calendarType: 'gregorian'` → `'lunar'`

**範圍**：所有讀取 / 創建生日的入口（RegisterForm.jsx:53、FamilySection 內預設、CustomerDetailDialog 內預設）都改 `'lunar'`。

**理由**：lunarOnly 前提是 calendarType='lunar'，所有 default 改 lunar 後即使 toggle UI 被隱藏也維持狀態一致。

### D3：前台 RegisterForm 主客戶段拿掉自家 toggle vs 改用 BirthdayPicker

**問題**：RegisterForm 主客戶段的生日 UI 沒用 BirthdayPicker、自己有一套 input + 曆法 toggle（line 277-288 處理 calendarType 變更）。修法選擇：
- A. RegisterForm 主客戶段也改用 BirthdayPicker（共用元件統一） ✓（採用）
- B. RegisterForm 自家 UI 拿掉 toggle 不重構

**為何選 A**：
1. **一致性**：主客戶 + 家人都用同 BirthdayPicker、修法走同一屬性參數控制
2. **避免重複維護**：B 需在兩處（BirthdayPicker + RegisterForm）都套相同邏輯，未來改一邊忘一邊
3. **trade-off（取捨）**：RegisterForm 重構成本中等（~50 行 input + state 轉換邏輯），但長期維護收益高

### D4：後台 CustomerDetailDialog 也改 lunar-only（v2 反饋更新）

**懷特 5/23 反饋更新**：原 v1 寫「後台保留雙模式給管理員場景」是錯誤判斷。懷特明確指示「後台也變成只能填農曆，讓系統每次都轉換農曆資料變成國曆填入國曆生日欄位」。

**修法**：
- CustomerDetailDialog 內主客戶 + 家人生日 UI 都改用 BirthdayPicker default lunarOnly 行為（沒傳即 lunar-only）
- 移除「國曆 / 農曆」切換按鈕組
- 管理員後台也只能填農曆，後端 autoFillDates 自動轉成國曆寫進 DB

**為何全系統 lunar-only**：
- 宮廟業務本質上以農曆為主（命理計算用農曆）
- 「國曆」欄位只是衍生資料，由系統自動算出來（autoFillDates 已支援）
- 全系統一致更易維護、易訓練 admin
- 「邊角案例：管理員偶爾要輸國曆」由「先換算成農曆再填」處理（外部 SOP）

### D5：StatusPage 取消 UI 移除 + 死碼清乾淨

**選項**：
- A. 只移除按鈕的 JSX，函式 handleCancelQueue/confirmCancelQueue 留著（死碼）
- B. 按鈕 + 函式 + 相關 state/import 都清掉 ✓（採用）

**為何選 B**：
1. **乾淨**：死碼累積會讓未來稽核變難
2. **沒風險**：StatusPage 只有客戶用、函式沒外部 export，移除無 caller
3. **trade-off**：未來想 revert 也只是 git revert，沒額外成本

### D6：後端取消候位接口不動（Change A 已保護）

**保留理由**：
- 管理員仍可走取消候位（updateQueueStatus 走 admin 路徑）
- 公開取消候位接口留著供日後可能需要（如未來加 feature flag 重新啟用），但前台 UI 入口移除即客戶無法觸達
- 若有第三方呼叫取消候位接口：Change A 已加身分驗證（`_id` + 姓名電話）防誤觸發

### D7：後台 dashboard「登記候位」對話框（Phase 1 確認）

**問題**：後台 dashboard 的「登記候位」按鈕（Phase 6.4 D9 驗證用過）開的對話框用什麼元件？若跟前台 RegisterForm 共用，套 lunarOnly 後後台也自動 lunar-only（符合 v2 設計）。

**Phase 1 任務先確認**：
- 看後台 dashboard register 對話框內含元件
- 若是 RegisterForm：default lunarOnly=true 自動套用，後台也是 lunar-only
- 若另一元件：本 Change 額外加 Phase 2 補修

## 風險 / 注意事項

### 風險

1. **歷史已存的客戶生日讀取**
   - 既有紀錄已有 gregorianBirth* 或 lunarBirth* 任一齊全 → 前端讀取不受影響（lunarOnly 只影響「輸入」UI）
   - 但若前端列表/詳情顯示「生日 = 國曆 / 農曆」，要確認 lunar-only 下顯示邏輯不破

2. **autoFillDates 雙向轉換的精度**
   - 農曆→國曆的轉換在後端 `lunarToGregorian` 已有實作（line 89-104）
   - 若客戶填的農曆是邊角案例（閏月 + 月底等），轉換可能失敗或不準
   - Phase 7 要驗證：邊角案例（閏月 / 月底）轉換正確

3. **「取消預約」需求被搬到後台後的營運摩擦**
   - 客戶想取消變成只能打電話或現場找管理員處理
   - 業務需求變化，**懷特已在 Change C 需求中明確採納**，不在技術範圍內

4. **後台管理員輸入需求改變（v2 新增）**
   - 後台 lunar-only 後，管理員若拿到客戶報的「國曆生日」要先自己換算成農曆才能填
   - 短期會有訓練/操作成本，需配合 SOP 文件提示
   - 但符合懷特對「系統一致性」的決策（全系統 lunar-only）

### 注意事項

- RegisterForm 重構成用 BirthdayPicker（D3）的範圍要小心：只動「生日 input 段」，不動 phone / name / addresses / familyMembers 等其他欄位
- BirthdayPicker 的 `lunarOnly` 屬性參數 default 改為 `true`（全系統都用），後台 CustomerDetailDialog 不傳即套用 lunar-only
- StatusPage 清死碼時要 grep 確認 handleCancelQueue / confirmCancelQueue / CancelIcon 沒別處 import / 用到
