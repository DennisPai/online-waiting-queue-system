## 為什麼要做

Change A / B / C 三個 OpenSpec 跑完後累積 4 個 follow-up 項目，懷特 5/23 反饋全部 4 件都要修：

1. **#1 前端 pageerror（兩個 undefined 讀取錯誤）** — Change A 階段 6.4 + Change C 階段 7.2 都觀察到，前端 store 讀 `queueStatus.currentProcessingNumber` / `queueStatus.maxOrderIndex` 時撞 undefined，console 噴 error 但功能不影響（前端用 fallback 顯示）
2. **#2 cancelQueueByCustomer API response 噴 mongoose 內部欄位** — Change A 階段 6.4 抓到，取消候位成功回的 JSON 含 `$__` / `_doc` / `activePaths` 等 mongoose 文件內部結構，API 不專業，未來第三方對接會撞
3. **#3 lunar 必填驗證缺漏（真 bug、跟簡化模式無關）** — Change C v3 階段 7.1 抓到、5/23 實機重驗證實。Change C 全民國農曆需求隱含「lunar 三欄位必填」，但 backend `validateRequiredFields` 只驗 name + phone、即使關閉簡化模式也沒擋下缺 lunar 的請求 → 使用者可送出沒填生日的報名、DB 該客戶 lunarBirth* 全 null、後續算 zodiac/virtualAge/顯示生日都會壞
4. **#5 修 lunarToGregorian 接受民國年 + autoFillDates 恢復農曆→國曆反推 + 前端 UI 標題改名「農曆生日」加備註**（5/23 懷特反饋設計反轉）— Change C v3 之前我把 `autoFillDates` 退化成淺拷貝（懷疑民國/西元年混淆轉換錯），但懷特實際要的是「**保留農曆→國曆自動補**、由系統每次新資料匯入或後台修改時自動算國曆填進國曆欄位、使用者永遠無法手動編輯國曆」。要把 v3 撤回部分、修對民國年混淆問題並重新啟用 autoFillDates

## 要改什麼

### 修法 #1：前端 redux store 補 fallback 防 undefined
- `frontend/src/redux/slices/queueSlice.js` 等 queueStatus 相關 reducer 初始 state 加 `currentProcessingNumber: 0`、`maxOrderIndex: 100`（避免 selector 讀到 undefined）
- 或在 useQueueData / useQueueUI hook 內讀取時加 `?? 0` `?? ''` 防禦
- 詳細位置 Phase 1 grep 確認

### 修法 #2：cancelQueueByCustomer controller 加 toJSON
- `backend/src/controllers/queue.controller.js:cancelQueueByCustomer` 把 `res.json(record)` 改成 `res.json(record.toObject())` 或對應 schema toJSON
- 確認其他取消類 endpoint（admin updateQueueStatus）若有同樣問題也順手修

### 修法 #3：lunar 必填驗證
- `backend/src/services/QueueService.js:validateRequiredFields` 加入 `lunarBirthYear` / `lunarBirthMonth` / `lunarBirthDay` 三個必填欄位驗證
- 簡化模式仍 skip（不破壞既有簡化模式行為）
- frontend RegisterForm + useRegistrationForm + BasicInfoSection 表單驗證對應加 lunar 必填提示（之前 v3 已是 lunar-only、要確認驗證流程有對應到）

### 修法 #5：lunarToGregorian + autoFillDates 恢復 + 前端 UI 標題改

#### 後端
1. `backend/src/utils/calendarConverter.js:lunarToGregorian` 改成接受**民國年**輸入：內部 `+1911` 轉西元年再丟 `Lunar.fromYmd` — 解決之前傳民國年被當西元年的 bug
2. `autoFillDates` **恢復**「**農曆→國曆 自動反推**」邏輯（Change C v3 我清空的、現在裝回去）
3. **移除**「國曆→農曆 反推」（前端不再有國曆輸入入口、不需要這方向）
4. 觸發時機沿用既有：register / admin updateQueueData / CustomerCreatePage / CustomerDetailPage 都已呼叫 autoFillDates 流程

#### 前端
1. 報名表單「出生日期」標題改成「**農曆生日**」
2. 加備註小字：「**請先自行查好農曆生日**」
3. 全系統 5 個 BirthdayPicker 呼叫位置（前台 BasicInfoSection + FamilySection / 前台 RegisterForm / 後台 CustomerDetailDialog 主 + 家人 / 後台 CustomerCreatePage / 後台 CustomerDetailPage）都改

### 完整端對端驗證（懷特 5/23 嚴令：含程式驗證 + 實機操作驗證）

- **程式驗證**：unit test ≥ 6（lunarToGregorian 民國年版 ×2 + autoFillDates 恢復 ×2 + validateRequiredFields lunar 必填 ×2）
- **API curl 驗證**：報名只填農曆 → DB 確認 lunarBirth* 是民國年 + gregorianBirth* 是系統正確算出來的西元年（不是 80/1/1 也不是 null）
- **Playwright UI 驗證**：前台 register 看到標題「農曆生日」+ 備註 + 缺 lunar 被擋 400；StatusPage 取消按鈕仍消失；後台 CustomerDetailDialog 看到 lunar-only 標題
- **不破壞既有驗證**：Change A 取消候位接口 / Change B 家人地址 / Change C lunar-only UI 全綠

## 不在範圍

- #4 舊客戶國曆顯示問題：**修法 #5 修完會自動解決**（每次儲存自動補正確國曆）
- #6 「臨時地址」歷史字串：5/23 懷特確認跳過
- #7 VisitRecord 舊歸檔資料缺地址：無法 retroactive 補
- 後台 admin 新增專屬國曆編輯入口：**懷特明確指示「使用者永遠無法手動編輯國曆」**
