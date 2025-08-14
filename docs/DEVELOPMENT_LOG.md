# 開發日誌 (Development Log)

> **目的**：記錄開發過程中的重要決策、遇到的問題、解決方案和經驗教訓，幫助未來的開發者/Agent快速理解專案並避免重複踩坑。

## 📋 日誌使用指南

### 對於Agent/開發者
1. **開始工作前**：先閱讀本日誌，了解已知問題和解決方案
2. **遇到問題時**：查看"常見問題"部分，可能已有解決方案
3. **完成重要修改後**：更新相關日誌條目

### 日誌更新規則
- **重大功能**：必須記錄設計決策和實現細節
- **Bug修復**：記錄問題原因、解決方案、預防措施
- **架構變更**：記錄變更原因、影響範圍、遷移指南
- **性能優化**：記錄優化前後對比、措施說明

---

## 🗓️ 開發時間線

### 2025-01-14 - 客戶搜尋功能修復 (Array格式問題)

**背景**：客戶查詢功能出現"records不是陣列格式，實際類型：object"錯誤

**問題根源**：
- 後端返回 `{0: {...}, 1: {...}}` (類似陣列的物件)
- 前端期望 `[{...}, {...}]` (標準陣列)
- 數據格式不匹配導致Redux處理錯誤

**解決方案**：
```javascript
// frontend/src/services/queueService.js
// 添加智能檢測和轉換類似陣列物件的邏輯
const keys = Object.keys(response.data.data);
const isArrayLikeObject = keys.every(key => /^\d+$/.test(key));
if (isArrayLikeObject && keys.length > 0) {
  const recordsArray = keys
    .map(key => parseInt(key))
    .sort((a, b) => a - b)
    .map(index => response.data.data[index]);
}
```

**經驗教訓**：
- ⚠️ **前後端數據格式要保持一致**：API設計時明確定義返回格式
- 💡 **前端要有容錯機制**：對後端返回格式進行智能適配
- 🔧 **調試策略**：分層添加日誌，從Service→Redux→UI逐層排查

**預防措施**：
- 前端Service層已添加格式適配邏輯，支援多種格式
- 建議後端統一使用標準陣列格式
- API文檔需明確定義數據格式規範

---

## 🚨 常見問題與解決方案

### 1. 前端白屏問題
**症狀**：所有頁面顯示空白，無控制台錯誤  
**可能原因**：
- Redux slice錯誤（未定義的action/reducer）
- 組件import錯誤
- JavaScript運行時錯誤

**解決步驟**：
1. 檢查瀏覽器控制台錯誤
2. 檢查Redux DevTools
3. 檢查最近修改的組件
4. 必要時回滾到最後已知正常版本

### 2. API v1格式處理
**症狀**：前端無法正確顯示後端數據  
**原因**：v1 API格式 `{success, code, message, data}` 與前端期望不匹配

**解決方案**：
```javascript
// 確保Service層正確提取data
return response.data.data || response.data;
// Redux thunk直接返回service結果
return response;
```

### 3. 搜尋功能異常
**症狀**：搜尋無結果或格式錯誤  
**檢查點**：
- 後端是否返回正確格式
- 前端Service是否正確處理
- Redux reducer是否正確更新狀態

---

## 🏗️ 架構決策記錄

### 前端架構
**React + Redux Toolkit**：選擇Redux管理複雜狀態  
**Material-UI**：統一UI組件庫  
**API版本管理**：支援v1/舊版API切換

### 後端架構
**重構策略**：
- 保留舊Controller：確保向下相容
- 新增Refactored版本：逐步遷移
- Service-Repository模式：分離業務邏輯和數據存取

**API設計**：
- v1格式：`{success, code, message, data}`
- 錯誤處理：統一錯誤碼和訊息格式
- 響應封裝：使用v1-response.js統一處理

---

## 🔧 技術債務追蹤

### 已知問題
1. **新舊架構並存**：部分功能仍使用舊Controller
2. **數據格式不統一**：某些API返回格式不一致
3. **調試代碼殘留**：需定期清理console.log

### 優化建議
1. **完成架構遷移**：將所有功能遷移到refactored版本
2. **API格式標準化**：統一所有API返回格式
3. **錯誤處理增強**：添加更詳細的錯誤信息和恢復機制

---

## 📚 重要參考資料

### 核心檔案位置
- **API規格**：`docs/API_SPEC.md`
- **產品需求**：`docs/PRD.md`
- **工程規範**：`.cursor/rules/engineering-rules.mdc`
- **前端規範**：`.cursor/rules/frontend-rules.mdc`
- **後端規範**：`.cursor/rules/backend-rules.mdc`

### 關鍵技術點
- **搜尋邏輯**：支援本人和家人姓名搜尋
- **叫號系統**：基於orderIndex的排序邏輯
- **時間計算**：候位時間和預估開始時間
- **Socket通信**：即時狀態更新

---

## 📈 效能監控要點

### 前端效能
- 大型列表虛擬化
- 組件懶加載
- API請求合併和快取

### 後端效能
- 資料庫索引優化
- 查詢邏輯優化
- 併發處理能力

---

*最後更新：2025-01-14*  
*維護者：AI Assistant (Claude)*
