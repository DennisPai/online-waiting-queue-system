const logger = require('../../utils/logger');
const WaitingRecord = require('../../models/waiting-record.model');
const SystemSetting = require('../../models/system-setting.model');
const getCustomer = () => require("../../models/customer.model");
const { autoFillDates, autoFillFamilyMembersDates, addZodiac, addVirtualAge } = require('../../utils/calendarConverter');
const { ensureOrderIndexConsistency, allocateOrderIndex } = require('../../utils/orderIndex');
const { saveSnapshot } = require('../../utils/snapshot');

// === Phase 4 / Task 4.6（design.md D9）：admin controller 撞號錯誤分流 ===
// admin controller 的每個 try/catch 原本一律回 HTTP 500「伺服器內部錯誤」。
// partial unique index 上線後，任何 admin 路徑撞號（E11000）→ 管理員只看到
// 「系統壞了」，不知道是排序撞號、也無從處理。本 helper 統一分流：
//   - error.code === 11000（撞號）→ 回 409 + 友善訊息（可重新整理後再操作）
//   - 其他錯誤 → 維持原本 500
// 各 controller 的 catch 區塊改呼叫此 helper，不再裸吐 500。
function handleAdminError(res, error, logLabel) {
  logger.error(`${logLabel}:`, error);
  if (error && error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: '排序衝突，請重新整理後再操作'
    });
  }
  return res.status(500).json({
    success: false,
    message: '伺服器內部錯誤',
    error: process.env.NODE_ENV === 'development' ? error.message : {}
  });
}

// 獲取候位列表
exports.getQueueList = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    
    const query = {};
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        query.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        query.status = status;
      }
    } else {
      query.status = { $in: ['waiting', 'processing'] };
    }
    
    const pipeline = [
      { $match: query },
      { $sort: { orderIndex: 1 } }
    ];
    
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: parseInt(limit) });
    }
    
    const records = await WaitingRecord.aggregate(pipeline);
    const total = await WaitingRecord.countDocuments(query);

    // 標記新客戶：多層寬鬆匹配查 customer_profiles
    const recordsWithNewFlag = await Promise.all(records.map(async (record) => {
      const name = record.name;
      if (!name) return { ...record, isNewCustomer: null };

      let existing = null;

      // 第1層：name + 農曆年月日 精確匹配
      if (record.lunarBirthYear && record.lunarBirthMonth && record.lunarBirthDay) {
        existing = await getCustomer().findOne({
          name,
          lunarBirthYear: record.lunarBirthYear,
          lunarBirthMonth: record.lunarBirthMonth,
          lunarBirthDay: record.lunarBirthDay
        }).select('_id').lean();
      }

      // 第2層：name + phone（phone 不為空）
      if (!existing && record.phone) {
        existing = await getCustomer().findOne({
          name,
          phone: record.phone
        }).select('_id').lean();
      }

      // 第3層：name + 農曆年（同名同年，容許月日誤差）
      if (!existing && record.lunarBirthYear) {
        existing = await getCustomer().findOne({
          name,
          lunarBirthYear: record.lunarBirthYear
        }).select('_id').lean();
      }

      // 都找不到才是新客戶；無任何可匹配資料時標 null（不顯示 badge）
      const hasMatchableData = (record.lunarBirthYear || record.phone);
      return { ...record, isNewCustomer: hasMatchableData ? !existing : null };
    }));

    res.status(200).json({
      success: true,
      data: {
        records: recordsWithNewFlag,
        pagination: {
          total,
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : total,
          pages: limit ? Math.ceil(total / parseInt(limit)) : 1
        }
      }
    });
  } catch (error) {
    logger.error('獲取候位列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 呼叫下一位
//
// === Phase 4 / Task 4.5（design.md D11）：callNext 不用 updateMany $inc -1 全體平移 ===
// 舊流程：第一筆 → completed + updateMany({status active}, {$inc:{orderIndex:-1}})
// 全體 -1。問題是 updateMany $inc -1 與「並發新報名插入 active 集合」一起跑時，
// 新報名者也在 active 集合裡會被一起 -1 → 與既有記錄撞號；且 updateMany 遇
// unique 衝突會中止剩餘文件更新（半殘）→ 隊伍順序撕裂 + HTTP 500。
//
// 新流程：第一筆設 completed（一變 completed 就離開 partial unique index 約束
// 範圍），其餘記錄的 orderIndex 完全不動 —— 讓 orderIndex 變成 2..N（留一個
// 空洞）無妨，因為排序只看相對大小。連續的 1..N 交給 ensureOrderIndexConsistency()
// 在安全時機（兩階段 offset 批量寫入）壓回。
exports.callNext = async (req, res) => {
  try {
    await ensureOrderIndexConsistency();
    const settings = await SystemSetting.getSettings();

    const firstRecord = await WaitingRecord.findOne({
      orderIndex: 1,
      status: { $in: ['waiting', 'processing'] }
    });

    if (!firstRecord) {
      return res.status(404).json({ success: false, message: '目前沒有可叫號的客戶' });
    }

    const now = new Date();
    firstRecord.status = 'completed';
    firstRecord.completedAt = now;
    // D11：第一筆轉 completed 即離開 partial unique index 約束範圍。
    // 設 orderIndex = null 與「取消候位」一致（D13），杜絕髒舊值。
    firstRecord.orderIndex = null;
    await firstRecord.save();

    settings.currentQueueNumber = firstRecord.queueNumber;
    settings.lastCompletedTime = now;
    await settings.save();

    // D11：不再 updateMany $inc -1 全體平移。其餘記錄 orderIndex 不動
    // （此時隊伍會是 2..N，留一個空洞），由下方 ensureOrderIndexConsistency()
    // 用兩階段 offset 批量寫入安全地壓回連續 1..N。
    await ensureOrderIndexConsistency();

    const newFirstRecord = await WaitingRecord.findOne({
      orderIndex: 1,
      status: { $in: ['waiting', 'processing'] }
    });

    res.status(200).json({
      success: true,
      message: `已完成 ${firstRecord.queueNumber} 號，移至已完成分頁`,
      data: {
        completedCustomer: {
          queueNumber: firstRecord.queueNumber,
          name: firstRecord.name,
          completedAt: now
        },
        nextCustomer: newFirstRecord ? {
          queueNumber: newFirstRecord.queueNumber,
          name: newFirstRecord.name,
          orderIndex: newFirstRecord.orderIndex
        } : null,
        currentQueueNumber: firstRecord.queueNumber,
        lastCompletedTime: now
      }
    });
  } catch (error) {
    // D9 / Task 4.6：撞號回友善訊息，非撞號才走 500。
    return handleAdminError(res, error, '叫號下一位錯誤');
  }
};

// 更新候位狀態
exports.updateQueueStatus = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { status } = req.body;
    
    if (!['waiting', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: '無效的狀態值' });
    }
    
    const record = await WaitingRecord.findById(queueId);
    if (!record) {
      return res.status(404).json({ success: false, message: '查無此候位記錄' });
    }

    // 操作前快照（加入具體描述）
    const statusLabelMap = {
      waiting: '恢復候位',
      processing: '開始處理',
      completed: '完成問事',
      cancelled: '取消候位'
    };
    await saveSnapshot({
      operation: 'update-queue-status',
      collection: 'waitingrecords',
      documentId: String(record._id),
      beforeData: record.toObject ? record.toObject() : record,
      operatorId: req.user?.id,
      metadata: {
        newStatus: status,
        previousStatus: record.status,
        description: `${statusLabelMap[status] || status}（${record.name || ''}，${record.status} → ${status}）`
      }
    });
    
    const originalStatus = record.status;

    // 判斷此次狀態切換是否為「恢復報名」（cancelled/completed → waiting）
    const isRestore = status === 'waiting' && ['completed', 'cancelled'].includes(originalStatus);

    // === Phase 3 / Task 3.2c（design.md D13）：恢復報名必須「先發 orderIndex、後改 status」===
    // partialFilterExpression 只對 status ∈ {waiting, processing} 生效。
    // 若先改 status 再分配 orderIndex（或漏分配），記錄會帶著舊的髒
    // orderIndex 值瞬間進入 partial unique index 約束範圍 → 撞 E11000。
    // 因此這裡先用 allocateOrderIndex() 原子發一個保證安全的新 orderIndex，
    // 才把 status 改成 waiting。
    //
    // Task 3.2b（D14）：恢復報名沿用原名額。被恢復的記錄當初報名時已佔過
    // 一個 issuedCount 名額（cancelled 仍佔名額），恢復時「不再 $inc issuedCount」，
    // 只重新分配 orderIndex（排到隊尾）。issuedCount 與 orderIndex 解耦。
    if (isRestore) {
      const newOrderIndex = await allocateOrderIndex();
      record.orderIndex = newOrderIndex;
      // isOpen=false 時同步 queueNumber = 新 orderIndex（之後 consistency 會壓回正確值）
      const statusSettings = await SystemSetting.getSettings();
      if (!statusSettings.isQueueOpen) {
        record.queueNumber = newOrderIndex;
      }
    }

    // 發完安全的 orderIndex 後才改 status（D13 順序）
    record.status = status;

    if (status === 'completed') {
      const now = new Date();
      record.completedAt = now;
      const settings = await SystemSetting.getSettings();
      settings.lastCompletedTime = now;
      await settings.save();
    }

    if (originalStatus === 'completed' && status !== 'completed') {
      record.completedAt = null;
    }

    // === Phase 3 / Task 3.2c（design.md D13）：取消時把 orderIndex 設為 null ===
    // 杜絕髒舊值在日後恢復報名時被帶回（恢復一律強制重新原子發號）。
    // cancelled 不在 partial unique index 約束範圍，orderIndex=null 不影響 index。
    if (status === 'cancelled') {
      record.orderIndex = null;
    }

    await record.save();

    // === Phase 3 / Task 3.1（design.md D4）：恢復報名補一致性重算 ===
    // 系統其他動 orderIndex 的操作（叫號 / 刪除 / reorder）都會呼叫
    // ensureOrderIndexConsistency() 把 active 記錄 orderIndex 壓成連續 1..N，
    // 唯獨恢復報名這條漏了 —— 補上即與其他路徑一致。
    // 同時也把 allocateOrderIndex() 給的膨脹發號值壓回 1..N。
    if (isRestore) {
      await ensureOrderIndexConsistency();
    }

    // 重新讀取（恢復報名時 orderIndex/queueNumber 已被 consistency 壓回，回傳正確值）
    const responseRecord = isRestore
      ? (await WaitingRecord.findById(record._id) || record)
      : record;

    res.status(200).json({ success: true, message: '候位狀態更新成功', data: responseRecord });
  } catch (error) {
    // D9 / Task 4.6：撞號回友善訊息，非撞號才走 500。
    return handleAdminError(res, error, '更新候位狀態錯誤');
  }
};

// 更新候位順序
exports.updateQueueOrder = async (req, res) => {
  try {
    const { queueId, newOrder } = req.body;
    
    if (!queueId || newOrder === undefined || newOrder === null) {
      return res.status(400).json({ success: false, message: '請求缺少必要參數：queueId 或 newOrder' });
    }
    if (typeof newOrder !== 'number' || newOrder < 1) {
      return res.status(400).json({ success: false, message: 'newOrder必須是正整數' });
    }

    const recordToUpdate = await WaitingRecord.findById(queueId);
    if (!recordToUpdate) {
      return res.status(404).json({ success: false, message: '找不到該候位記錄' });
    }
    
    const currentOrder = recordToUpdate.orderIndex || 0;
    if (currentOrder === newOrder) {
      return res.status(200).json({ success: true, message: '順序未變更', data: { record: recordToUpdate } });
    }

    // 只計算 waiting/processing 的記錄總數（排除 completed/cancelled）
    const activeStatuses = ['waiting', 'processing'];
    const totalRecords = await WaitingRecord.countDocuments({ status: { $in: activeStatuses } });
    if (newOrder > totalRecords) {
      return res.status(400).json({ success: false, message: `新順序 ${newOrder} 超出了候位總數 ${totalRecords}` });
    }
    
    // 取得目前 isOpen 狀態（決定是否同步 queueNumber）
    const settings = await SystemSetting.getSettings();
    const isOpen = settings.isQueueOpen;

    // updateMany 也只影響 waiting/processing 的記錄（不動 completed/cancelled）
    if (currentOrder < newOrder) {
      // 往後移：中間的記錄 orderIndex -1
      const middleRecords = await WaitingRecord.find({
        status: { $in: activeStatuses },
        orderIndex: { $gt: currentOrder, $lte: newOrder },
        _id: { $ne: queueId }
      });
      for (const r of middleRecords) {
        r.orderIndex -= 1;
        if (!isOpen) r.queueNumber = r.orderIndex;
        await r.save();
      }
    } else {
      // 往前移：中間的記錄 orderIndex +1
      const middleRecords = await WaitingRecord.find({
        status: { $in: activeStatuses },
        orderIndex: { $gte: newOrder, $lt: currentOrder },
        _id: { $ne: queueId }
      });
      for (const r of middleRecords) {
        r.orderIndex += 1;
        if (!isOpen) r.queueNumber = r.orderIndex;
        await r.save();
      }
    }
    
    recordToUpdate.orderIndex = newOrder;
    // isOpen=false 時同步 queueNumber = 新 orderIndex
    if (!isOpen) recordToUpdate.queueNumber = newOrder;
    await recordToUpdate.save();
    
    // 只回傳 waiting/processing 的記錄（不包含 completed/cancelled）
    const updatedRecords = await WaitingRecord.find({ status: { $in: activeStatuses } }).sort({ orderIndex: 1 });
    
    res.status(200).json({
      success: true,
      message: '候位順序更新成功',
      data: { record: recordToUpdate, allRecords: updatedRecords }
    });
  } catch (error) {
    // D9 / Task 4.6：撞號回友善訊息，非撞號才走 500。
    return handleAdminError(res, error, '更新候位順序錯誤');
  }
};

// 更新客戶資料
exports.updateQueueData = async (req, res) => {
  try {
    const { queueId } = req.params;
    let updateData = req.body;
    
    const record = await WaitingRecord.findById(queueId);
    if (!record) {
      return res.status(404).json({ success: false, message: '查無此候位記錄' });
    }
    
    updateData = autoFillDates(updateData);
    
    if (updateData.familyMembers && updateData.familyMembers.length > 0) {
      updateData.familyMembers = updateData.familyMembers.map(member => {
        const cleanMember = { ...member };
        delete cleanMember._id;
        return cleanMember;
      });
      const familyData = autoFillFamilyMembersDates({ familyMembers: updateData.familyMembers });
      updateData.familyMembers = familyData.familyMembers;
    }

    updateData = addZodiac(updateData);
    updateData = addVirtualAge(updateData);

    const allowedFields = [
      'queueNumber', 'name', 'email', 'phone', 'gender',
      'gregorianBirthYear', 'gregorianBirthMonth', 'gregorianBirthDay',
      'lunarBirthYear', 'lunarBirthMonth', 'lunarBirthDay', 'lunarIsLeapMonth',
      'addresses', 'familyMembers', 'consultationTopics', 'otherDetails', 'remarks', 'virtualAge', 'zodiac'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        record[field] = updateData[field];
      }
    });

    await record.save();

    res.status(200).json({ success: true, message: '客戶資料更新成功', data: record });
  } catch (error) {
    logger.error('更新客戶資料錯誤:', error);

    // D9 / G7：撞號（duplicate key）改回友善錯誤分流。
    // 原本「遇 11000 就 dropIndex('queueNumber_1')」是地雷——會把未來加上的
    // unique index 在一次撞號時自動拆掉防線，因此整段自動 drop index 邏輯移除。
    // 另外原 catch 引用 try 內 block-scope 的 `record` 會丟 ReferenceError，一併修正。
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '候位號碼重複，請改用其他號碼後再試。'
      });
    }

    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 獲取按排序順序的候位號碼
exports.getOrderedQueueNumbers = async (req, res) => {
  try {
    const order1Record = await WaitingRecord.findOne({ orderIndex: 1, status: { $in: ['waiting', 'processing'] } });
    const order2Record = await WaitingRecord.findOne({ orderIndex: 2, status: 'waiting' });

    if (order1Record) {
      await SystemSetting.updateOne({}, { currentQueueNumber: order1Record.queueNumber });
    }

    res.status(200).json({
      success: true,
      data: {
        currentProcessingNumber: order1Record ? order1Record.queueNumber : null,
        nextWaitingNumber: order2Record ? order2Record.queueNumber : null
      }
    });
  } catch (error) {
    logger.error('獲取排序候位號碼錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 刪除客戶資料
//
// === Phase 4.5 併修（design.md D11，懷特 2026-05-22 核可）：deleteCustomer
//     不用 updateMany $inc -1 全體平移 ===
// 舊流程：findByIdAndDelete + updateMany({orderIndex>deleted}, {$inc:-1})
// 把後面所有記錄 orderIndex 全體 -1。這跟 callNext 已修掉的全體平移是同款地雷
// —— updateMany $inc -1 與並發新報名一起跑時，新報名者也在 active 集合裡會被
// 一起 -1 → 撞 partial unique index；且 updateMany 遇 unique 衝突會中止剩餘
// 文件更新（半殘）→ 隊伍順序撕裂 + HTTP 500。
//
// 新流程（比照 D11 callNext）：刪除該筆後其餘記錄 orderIndex 完全不動 —— 隊伍
// 留一個空洞無妨（排序只看相對大小），連續的 1..N 交給後面緊接的
// ensureOrderIndexConsistency() 用兩階段 offset 批量寫入安全壓回。
exports.deleteCustomer = async (req, res) => {
  try {
    const { queueId } = req.params;
    const record = await WaitingRecord.findById(queueId);
    
    if (!record) {
      return res.status(404).json({ success: false, message: '查無此候位記錄' });
    }
    
    const customerInfo = {
      queueNumber: record.queueNumber,
      name: record.name,
      phone: record.phone,
      orderIndex: record.orderIndex
    };
    
    logger.info(`管理員刪除客戶記錄: ${customerInfo.name} (${customerInfo.queueNumber}號)`);

    // 操作前快照（加入具體描述）
    await saveSnapshot({
      operation: 'delete-queue-record',
      collection: 'waitingrecords',
      documentId: String(record._id),
      beforeData: record.toObject ? record.toObject() : record,
      operatorId: req.user?.id,
      metadata: {
        description: `刪除候位（${record.name || ''}，第 ${record.queueNumber} 號）`
      }
    });
    
    // D11 同款修正：刪除該筆後「不」做 updateMany $inc -1 全體平移。
    // 其餘記錄 orderIndex 不動（此時隊伍會留一個空洞），由下方
    // ensureOrderIndexConsistency() 用兩階段 offset 批量寫入安全壓回 1..N。
    await WaitingRecord.findByIdAndDelete(queueId);
    await ensureOrderIndexConsistency();

    // D8/2.4：管理員「刪除」記錄是唯一允許 issuedCount 下降的情況
    // —— 釋出一個本期名額（呼應 D2「刪除才釋出名額、取消不釋出」）。
    // issuedCount 不會低於 0（schema min:0），多刪也不會變負數。
    await SystemSetting.updateOne(
      { issuedCount: { $gt: 0 } },
      { $inc: { issuedCount: -1 } }
    );

    res.status(200).json({
      success: true,
      message: `客戶 ${customerInfo.name} 的記錄已永久刪除`,
      data: { deletedCustomer: customerInfo }
    });
  } catch (error) {
    // D9 / Task 4.6：撞號回友善訊息，非撞號才走 500。
    return handleAdminError(res, error, '刪除客戶記錄錯誤');
  }
};

// 清除所有候位資料
exports.clearAllQueue = async (req, res) => {
  try {
    const totalCustomers = await WaitingRecord.countDocuments();
    logger.info(`管理員清除所有候位資料，共 ${totalCustomers} 筆記錄`);
    
    await WaitingRecord.deleteMany({});
    
    const settings = await SystemSetting.getSettings();
    settings.currentQueueNumber = 0;
    if (settings.maxOrderIndex <= 0) settings.maxOrderIndex = 100;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `已成功清除所有候位資料，共刪除 ${totalCustomers} 筆記錄`,
      data: {
        deletedCount: totalCustomers,
        resetSystemSettings: { currentQueueNumber: 0, maxOrderIndex: settings.maxOrderIndex }
      }
    });
  } catch (error) {
    logger.error('清除所有候位資料錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

/**
 * 批量重排序（方案 B）
 * PUT /admin/queue/reorder
 * Body: { orderedIds: ["id1", "id2", ...] }
 * 依陣列順序設定 orderIndex = 1, 2, 3...
 * isOpen=false 時同步 queueNumber = orderIndex
 *
 * === Phase 4 / Task 4.2（design.md D5）：後端驗證 + 不信任前端列表 ===
 * 舊版完全信任前端送來的 id 列表、照下標重算整列 orderIndex。問題是前端
 * 列表可能 stale（跨拖動競態）或殘缺。後端必須驗證：收到的 id 列表
 * == DB 當前全部 active 記錄（數量 + 內容）。不一致就拒絕這次 reorder，
 * 要前端重新整理，不照錯列表把 DB 改壞。
 *
 * === Phase 4 / Task 4.4（design.md D10）：兩階段 offset 寫入 ===
 * 舊版用 Promise.all 把 N 筆同時 findByIdAndUpdate 成最終 1..N。並行寫入
 * 沒有順序保證 —— 當目標排列是現有 orderIndex 的非平凡置換時，置換過程
 * 必然出現「兩筆暫時同 orderIndex」的中間態 → partial unique index 把該筆
 * 寫入擋下並丟 E11000 → Promise.all 整個 reject → 500。改成兩階段：
 *   第一階段：把所有要動的記錄 set 成「大偏移臨時值」（離開 1..N 區間、
 *             彼此唯一）→ 不與任何 active 記錄撞號。
 *   第二階段：把這些記錄從臨時值 set 成最終 1..N。
 */
exports.reorderQueue = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderedIds 必須是非空陣列' });
    }

    // === D5：驗證收到的 id 列表 == DB 當前全部 active 記錄 ===
    const activeRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing'] }
    }).select('_id');
    const dbIds = activeRecords.map(r => String(r._id));
    const reqIds = orderedIds.map(id => String(id));

    // (a) 數量比對
    if (reqIds.length !== dbIds.length) {
      return res.status(409).json({
        success: false,
        message: '候位列表已變動，請重新整理後再排序'
      });
    }
    // (b) 內容比對：集合相同（且 reqIds 無重複）
    const dbIdSet = new Set(dbIds);
    const reqIdSet = new Set(reqIds);
    if (reqIdSet.size !== reqIds.length) {
      // reqIds 有重複 id
      return res.status(400).json({
        success: false,
        message: '排序列表含重複項目，請重新整理後再排序'
      });
    }
    const sameSet = reqIds.every(id => dbIdSet.has(id)) && dbIds.every(id => reqIdSet.has(id));
    if (!sameSet) {
      return res.status(409).json({
        success: false,
        message: '候位列表已變動，請重新整理後再排序'
      });
    }

    const settings = await SystemSetting.getSettings();
    const isOpen = settings.isQueueOpen;

    // === D10：兩階段 offset 批量寫入（避開中間態撞 partial unique index）===
    // 大偏移量：保證臨時值離開 1..N 區間、且彼此唯一。
    const OFFSET = 1000000;

    // 第一階段：把每筆要動的記錄推到臨時值 = 最終位序 + OFFSET。
    // 臨時值彼此唯一（最終位序 1..N 互不相同），且遠離任何 active 記錄
    // 真實 orderIndex → 不與任何記錄撞號。
    const phase1Ops = reqIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { orderIndex: (index + 1) + OFFSET } }
      }
    }));
    await WaitingRecord.bulkWrite(phase1Ops, { ordered: false });

    // 第二階段：把這些記錄從臨時值壓回最終 1..N（並同步 queueNumber）。
    // 所有 active 記錄此刻都在臨時值區間，逐筆壓回 1..N 時目標值不會撞上
    // 任何「尚停在臨時值區間」的記錄 → 全程不撞 partial unique index。
    const phase2Ops = reqIds.map((id, index) => {
      const newOrderIndex = index + 1;
      const set = { orderIndex: newOrderIndex };
      if (!isOpen) set.queueNumber = newOrderIndex;
      return {
        updateOne: {
          filter: { _id: id },
          update: { $set: set }
        }
      };
    });
    await WaitingRecord.bulkWrite(phase2Ops, { ordered: false });

    // 安全網：確保無空洞/重複
    await ensureOrderIndexConsistency();

    const updatedRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: 1 });

    res.status(200).json({
      success: true,
      message: '排序已更新',
      data: { allRecords: updatedRecords }
    });
  } catch (error) {
    // D9 / Task 4.6：撞號回友善訊息，非撞號才走 500。
    return handleAdminError(res, error, '批量重排序錯誤');
  }
};
