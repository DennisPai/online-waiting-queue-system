# 候位預估時間優化計劃

## 📋 項目概述

**目標**：優化候位系統的預估時間計算，解決當前"叫號下一位"後預估時間不準確的問題。

**核心問題**：
- 當前叫號完成後，預估時間隨著完成客戶增加而提前
- 首頁無法正確顯示"現在辦到幾號"
- 客戶查詢預估時間與實際進度脫節

## 🎯 解決方案核心邏輯

### 資料結構設計
```javascript
// WaitingRecord 新增欄位
{
  completedAt: Date, // 完成辦事時間
}

// SystemSetting 新增欄位（基於現有模型）
{
  totalCustomerCount: Number,     // 客戶總數（可手動編輯）
  lastCompletedTime: Date,        // 上一位辦完時間（可手動編輯）
  // 使用既有欄位：
  // nextSessionDate: Date,        // 下次辦事時間（已存在）
  // minutesPerCustomer: Number,   // 每位客戶預估處理時間（已存在）
  // isQueueOpen: Boolean,         // 開始辦事模式開關（已存在）
}
```

### 叫號流程邏輯
```
點擊"叫號下一位" →
1. 找到 orderIndex=1 的客戶
2. 標記該客戶為 completed，設定 completedAt = 當前時間
3. 自動更新 lastCompletedTime = completedAt
4. 所有其他活躍客戶的 orderIndex 自動 -1 遞補
5. 首頁"現在辦到第X號"更新為新的第1號客戶
```

### 預估時間計算
```javascript
// 首頁預估結束時間（固定不變）
預估今日結束時間 = nextSessionDate + (totalCustomerCount × minutesPerCustomer)

// 客戶個人預估時間（動態更新）
預估輪到您的時間 = lastCompletedTime + ((orderIndex - 1) × minutesPerCustomer)
```

### 客戶總數管理
```
當 isQueueOpen = false（停止辦事）時：
- 新客戶註冊 → totalCustomerCount++
- 客戶移至已取消 → totalCustomerCount--
- 客戶從已取消恢復 → totalCustomerCount++

當 isQueueOpen = true（開始辦事）時：
- 所有變更都不自動更新 totalCustomerCount
- 只能手動重設或編輯
```

## 🔧 技術實作細節

### API 設計（擴展現有）
```javascript
// 擴展現有 admin.controller.js
PUT /api/v1/admin/system-settings/customer-count    // 更新客戶總數
PUT /api/v1/admin/system-settings/last-completed    // 更新上一位辦完時間
POST /api/v1/admin/system-settings/reset-count      // 重設客戶總數
POST /api/v1/admin/system-settings/reset-time       // 重設上一位辦完時間

// 修改現有 API
PUT /api/v1/admin/queue/status    // 修改：增加 completedAt 處理
GET /api/v1/queue/status          // 修改：基於新邏輯計算預估時間
```

### 前端介面設計
```
候位管理頁面新增控制項：
[目前叫號: 第X號]  [客戶總數: 25 人] [重設] [上一位辦完時間: 14:30] [重設]
```

### 關鍵函數邏輯
```javascript
// orderIndex 自動遞補
const updateOrderIndexAfterCompletion = async (completedCustomerId) => {
  // 1. 標記客戶完成
  await updateCustomerStatus(completedCustomerId, 'completed', new Date());
  
  // 2. 更新系統設定
  await updateSystemSetting('lastCompletedTime', new Date());
  
  // 3. 批量更新其他客戶的 orderIndex
  await WaitingRecord.updateMany(
    { status: { $in: ['waiting', 'processing'] } },
    { $inc: { orderIndex: -1 } }
  );
  
  // 4. 確保 orderIndex 連續性
  await ensureOrderIndexConsistency();
}

// 客戶總數重設
const resetCustomerCount = async () => {
  const waitingCount = await WaitingRecord.countDocuments({ status: 'waiting' });
  const processingCount = await WaitingRecord.countDocuments({ status: 'processing' });
  const completedCount = await WaitingRecord.countDocuments({ status: 'completed' });
  const total = waitingCount + processingCount + completedCount;
  await updateSystemSetting('totalCustomerCount', total);
}

// 上一位辦完時間重設
const resetLastCompletedTime = async () => {
  const lastCompleted = await WaitingRecord.findOne(
    { status: 'completed', completedAt: { $exists: true } },
    {},
    { sort: { completedAt: -1 } }
  );
  
  const settings = await SystemSetting.getSettings();
  const nextSessionDate = settings.nextSessionDate;
  
  if (!lastCompleted || lastCompleted.completedAt < nextSessionDate) {
    await updateSystemSetting('lastCompletedTime', nextSessionDate);
  } else {
    await updateSystemSetting('lastCompletedTime', lastCompleted.completedAt);
  }
}
```

## 📱 用戶體驗流程

### 管理員操作流程
```
1. 設定基本參數：
   - nextSessionDate = 09:00
   - minutesPerCustomer = 15
   - 確認 totalCustomerCount（或重設）

2. 開始辦事：
   - 設定 isQueueOpen = true
   - 系統初始化 lastCompletedTime = nextSessionDate

3. 叫號操作：
   - 點擊"叫號下一位"（一鍵完成標記+更新）
   - 必要時手動調整客戶總數或完成時間
   - 使用重設功能恢復準確數據
```

### 客戶查詢流程
```
1. 首頁顯示：
   - "現在辦到：第 X 號"
   - "預估今日結束時間：XX:XX"（固定不變）

2. 個人查詢：
   - "您的號碼：第 X 號"
   - "您的叫號順序：第 Y 號"
   - "預估輪到您的時間：XX:XX"（基於實際進度）
   - "前方還有 X 位等待"
```

## 🔍 測試驗證項目

### 功能測試
- [ ] 叫號操作：標記完成 + orderIndex 遞補
- [ ] 預估時間：客戶查詢時間準確性
- [ ] 總數管理：自動更新機制
- [ ] 重設功能：客戶總數和完成時間重設
- [ ] 拖曳整合：手動排序後預估時間更新

### 邊界測試
- [ ] 無客戶時的處理
- [ ] 開始辦事模式切換
- [ ] 跨日連續辦事
- [ ] 大量客戶同時操作

## 📊 預期效果

### 解決的問題
- ✅ 預估時間不再隨叫號變動
- ✅ 首頁正確顯示當前進度
- ✅ 客戶獲得準確等待時間
- ✅ 管理員操作保持簡化

### 系統改進
- ✅ 基於實際進度的動態計算
- ✅ 靈活的手動調整機制
- ✅ 完整的重設和恢復功能
- ✅ 與現有功能無縫整合

---

**此文檔完成後將在任務執行完畢時刪除**
