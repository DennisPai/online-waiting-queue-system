# 候位額滿功能開發任務清單

**創建日期：** 2025年9月15日  
**任務目標：** 當候位人數達到後台設定上限時，優化用戶體驗，提前告知額滿狀態  

## 📋 需求摘要

當候位人數達到管理員設定的上限時：
1. 隱藏首頁的"我要候位"按鈕
2. 首頁"我要登記候位"卡片改為"本次報名已額滿"
3. 直接訪問 `/register` 時顯示額滿訊息並5秒後跳轉回首頁

---

## 🎯 子任務清單

### **階段一：後端 API 增強**

#### ✅ 任務 1.1：新增候位容量檢查邏輯
**檔案：** `backend/src/controllers/queue.controller.js`  
**操作：**
1. 找到 `getQueueStatus` 函數
2. 在回傳資料中新增以下欄位：
   ```javascript
   // 計算活躍候位人數（排除已取消的）
   const activeQueueCount = await WaitingRecord.countDocuments({
     status: { $ne: 'cancelled' }
   });
   
   // 新增到回傳資料
   const responseData = {
     // ... 現有欄位
     activeQueueCount,
     maxQueueNumber: settings.maxQueueNumber,
     isFull: activeQueueCount >= settings.maxQueueNumber
   };
   ```

#### ✅ 任務 1.2：確保 v1 API 格式相容
**檔案：** `backend/src/controllers/queue.controller.js`  
**操作：**
1. 確認 `getQueueStatus` 使用 v1 回應格式
2. 驗證回傳格式為：`{ success: true, data: responseData }`

---

### **階段二：前端服務層更新**

#### ✅ 任務 2.1：更新 queueService
**檔案：** `frontend/src/services/queueService.js`  
**操作：**
1. 找到 `getQueueStatus` 函數
2. 確認正確處理 v1 API 回應格式
3. 確保回傳包含新增的容量欄位：`activeQueueCount`, `maxQueueNumber`, `isFull`

#### ✅ 任務 2.2：更新 Redux 狀態管理
**檔案：** `frontend/src/redux/slices/queueSlice.js`  
**操作：**
1. 在 `initialState` 中新增：
   ```javascript
   activeQueueCount: 0,
   maxQueueNumber: 100,
   isFull: false
   ```
2. 在 `getQueueStatus.fulfilled` case 中更新這些狀態：
   ```javascript
   state.activeQueueCount = action.payload.activeQueueCount || 0;
   state.maxQueueNumber = action.payload.maxQueueNumber || 100;
   state.isFull = action.payload.isFull || false;
   ```

---

### **階段三：首頁邏輯修改**

#### ✅ 任務 3.1：創建日期計算工具函數
**檔案：** `frontend/src/utils/dateUtils.js` (新建檔案)  
**操作：**
1. 創建新檔案
2. 新增函數：
   ```javascript
   // 計算開科辦事日的隔天，格式化為 "X月X日"
   export const getNextRegistrationDate = (nextSessionDate) => {
     if (!nextSessionDate) return '未設定';
     
     const sessionDate = new Date(nextSessionDate);
     const nextDay = new Date(sessionDate);
     nextDay.setDate(sessionDate.getDate() + 1);
     
     const month = nextDay.getMonth() + 1;
     const day = nextDay.getDate();
     
     return `${month}月${day}日`;
   };
   ```

#### ✅ 任務 3.2：修改首頁候位卡片
**檔案：** `frontend/src/pages/HomePage.jsx`  
**操作：**
1. 導入 Redux 狀態：
   ```javascript
   const { queueStatus, isLoading, currentQueue, isQueueOpen, isFull } = useSelector((state) => state.queue);
   ```
2. 導入日期工具：
   ```javascript
   import { getNextRegistrationDate } from '../utils/dateUtils';
   ```
3. 找到候位登記卡片的條件判斷（約第144行）
4. 修改條件為：
   ```javascript
   {(queueStatus?.publicRegistrationEnabled || isAuthenticated) && !isFull && (
   ```
5. 在該卡片後新增額滿卡片：
   ```javascript
   {((queueStatus?.publicRegistrationEnabled || isAuthenticated) && isFull) && (
     <Grid item xs={12} md={6}>
       <Card>
         <CardContent>
           <Typography variant="h4" component="div" gutterBottom sx={{ fontSize: { xs: '1.4rem', md: '1.6rem' } }}>
             本次報名已額滿
           </Typography>
           <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
             本次預約人數已達上限，敬請報名下次開科辦事，下次開科辦事開放報名時間為{getNextRegistrationDate(queueStatus?.nextSessionDate)}中午12:00整
           </Typography>
         </CardContent>
       </Card>
     </Grid>
   )}
   ```

---

### **階段四：註冊頁面保護**

#### ✅ 任務 4.1：新增註冊頁面額滿檢查
**檔案：** `frontend/src/pages/RegisterPage.jsx`  
**操作：**
1. 新增 Redux imports：
   ```javascript
   import { useSelector, useDispatch } from 'react-redux';
   import { getQueueStatus } from '../redux/slices/queueSlice';
   ```
2. 新增路由導航：
   ```javascript
   import { useNavigate } from 'react-router-dom';
   ```
3. 新增日期工具導入：
   ```javascript
   import { getNextRegistrationDate } from '../utils/dateUtils';
   ```
4. 在元件開始處新增狀態和 hooks：
   ```javascript
   const dispatch = useDispatch();
   const navigate = useNavigate();
   const { queueStatus, isFull } = useSelector((state) => state.queue);
   const [redirectCountdown, setRedirectCountdown] = useState(5);
   const [showFullMessage, setShowFullMessage] = useState(false);
   ```
5. 新增檢查額滿的 useEffect：
   ```javascript
   useEffect(() => {
     dispatch(getQueueStatus());
   }, [dispatch]);

   useEffect(() => {
     if (isFull) {
       setShowFullMessage(true);
       const timer = setInterval(() => {
         setRedirectCountdown((prev) => {
           if (prev <= 1) {
             clearInterval(timer);
             navigate('/');
             return 0;
           }
           return prev - 1;
         });
       }, 1000);
       
       return () => clearInterval(timer);
     }
   }, [isFull, navigate]);
   ```
6. 在 return 最開始新增額滿檢查：
   ```javascript
   // 如果已額滿，顯示提示訊息
   if (showFullMessage && isFull) {
     return (
       <Container maxWidth="md">
         <Box sx={{ my: 4, textAlign: 'center' }}>
           <Typography variant="h4" component="h1" gutterBottom color="error">
             本次報名已額滿
           </Typography>
           <Typography variant="h6" component="h2" color="text.secondary" paragraph>
             本次預約人數已達上限，敬請報名下次開科辦事，下次開科辦事開放報名時間為{getNextRegistrationDate(queueStatus?.nextSessionDate)}中午12:00整
           </Typography>
           <Typography variant="body1" color="text.secondary">
             將在 {redirectCountdown} 秒後自動返回首頁...
           </Typography>
         </Box>
       </Container>
     );
   }
   ```

---

## 🔧 實現注意事項

### **開發規範遵循**
1. 後端遵循 v1 API 回應格式：`{ success, code, message, data }`
2. 前端 services 層回傳 `response.data` 格式
3. 所有新增函數都要有適當的錯誤處理

### **測試驗證點**
1. **後端測試**：
   - 訪問 `/api/v1/queue/status` 確認回傳包含新欄位
   - 模擬候位人數達到上限，確認 `isFull: true`

2. **前端測試**：
   - 首頁在額滿時隱藏"立即候位"按鈕，顯示額滿卡片
   - 直接訪問 `/register` 在額滿時顯示提示並5秒後跳轉
   - 日期計算正確（隔天中午12:00）

### **完成後提交**
1. 測試所有功能正常運作
2. 執行 `git add . && git commit -m "feat: 新增候位額滿檢查功能"` 
3. 執行 `git push` 推送到 GitHub 觸發 Zeabur 部署

---

## 📁 相關檔案參考

**現有邏輯參考：**
- 候位上限檢查：`backend/src/controllers/queue.controller.js` 第296-302行
- 首頁候位卡片：`frontend/src/pages/HomePage.jsx` 第144-168行  
- queueStatus 結構：`frontend/src/redux/slices/queueSlice.js` 第424-437行

**系統設定相關：**
- 最大候位數：`SystemSetting.maxQueueNumber`
- 開科辦事日：`SystemSetting.nextSessionDate`
