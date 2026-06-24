const logger = require('../utils/logger');
const queueRepository = require('../repositories/QueueRepository');
const SystemSetting = require('../models/system-setting.model');
const WaitingRecord = require('../models/waiting-record.model');
const ApiError = require('../utils/ApiError');
const { autoFillDates, autoFillFamilyMembersDates, addZodiac, addVirtualAge } = require('../utils/calendarConverter');
const { allocateOrderIndex, ensureOrderIndexConsistency } = require('../utils/orderIndex');

// === Phase 4 / Task 4.7（design.md D12）：E11000 撞號 retry 策略常數 ===
// 撞號處理「原子發號為主、retry 為輔」：正常情況靠 issuedCount 閘門 +
// orderIndex 原子發號根本不撞，零 retry。retry 只當「理論上不該發生的
// 偶發碰撞」的補救：上限 3 次、指數退避 + jitter。
const REGISTER_MAX_RETRY = 3;        // 撞號 retry 上限（不含首次嘗試）
const REGISTER_RETRY_BASE_MS = 50;   // 指數退避基數（毫秒）

/** 指數退避 + jitter 的等待（design.md D12 (b)）。attempt 從 1 起算。 */
function backoffDelay(attempt) {
  const base = REGISTER_RETRY_BASE_MS * Math.pow(2, attempt - 1); // 50, 100, 200...
  const jitter = Math.floor(Math.random() * REGISTER_RETRY_BASE_MS);
  return new Promise(resolve => setTimeout(resolve, base + jitter));
}

/**
 * 候位系統業務邏輯層
 * 處理所有候位相關的業務邏輯
 */
class QueueService {
  /**
   * 登記新候位
   */
  async registerQueue(data) {
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();

    // 驗證必填欄位（簡化模式下跳過）
    // 注意：驗證放在 issuedCount 閘門「之前」，避免不合法的請求白白佔掉一個名額。
    if (!settings.simplifiedMode) {
      this.validateRequiredFields(data);
    }

    // === D8：額滿用 issuedCount 原子閘門（取代舊的非原子「先查再寫」額滿判斷）===
    // 報名第一步就原子地佔名額：findOneAndUpdate 在 issuedCount < maxOrderIndex 時
    // 才 $inc 1。並發報名時 MongoDB 保證每次 $inc 互斥，不會多人同時讀到「還沒滿」而超收。
    // 回傳 null = 已額滿（直接回友善訊息）；回傳文件 = 已原子佔到一個名額。
    const gate = await SystemSetting.findOneAndUpdate(
      { issuedCount: { $lt: settings.maxOrderIndex } },
      { $inc: { issuedCount: 1 } },
      { new: true }
    );
    if (gate === null) {
      throw ApiError.forbidden('今日候位已滿，請下次再來');
    }

    // 閘門已佔名額，後續任何步驟失敗都必須把名額補回（無 transaction 環境下，
    // 名額不能被吃掉卻沒人報成）。以 try/catch 包住閘門後的所有流程做補償。
    //
    // === Phase 4 / Task 4.7（design.md D12）：E11000 撞號 retry ===
    // 「原子發號為主、retry 為輔」。正常情況靠 issuedCount 閘門 + orderIndex
    // 原子發號根本不撞，零 retry。但若發生「理論上不該發生的偶發碰撞」
    // （撞 partial unique index → E11000），在閘門「之內」retry：
    //   (a) 上限 REGISTER_MAX_RETRY 次；
    //   (b) 每次 retry 前指數退避 + jitter；
    //   (c) 每次 retry 前重新判額滿（不能盲目重取 orderIndex 而超收）；
    //   (d) 用盡仍失敗 → 回友善訊息；
    //   (e) 報名最終失敗 → 補償把閘門已 $inc 的 issuedCount 補回 $inc -1。
    // 補償只在「最終失敗」做一次（與 Phase 2 的閘門後補償協調，不雙重補償）：
    // retry 之間不補償（名額仍要保留給這次報名繼續嘗試），只有跳出迴圈
    // 確定失敗時才補一次。
    try {
      // 處理和驗證數據（與 orderIndex 無關，迴圈外做一次即可）
      const processedData = this.processQueueData(data, settings);

      let lastErr = null;
      for (let attempt = 0; attempt <= REGISTER_MAX_RETRY; attempt++) {
        // (b)(c)：第 2 次起的嘗試 = retry，先退避、再重新判額滿。
        if (attempt > 0) {
          await backoffDelay(attempt);
          // (c) 重新判額滿：撞號 retry 期間若名額剛好被別人填滿，
          // 不能盲目重取 orderIndex 而超收。注意這裡「只重判、不重佔」——
          // 本次報名的名額早在最上方閘門就原子佔到了，issuedCount 不再 $inc。
          const fresh = await SystemSetting.getSettings();
          if ((fresh.issuedCount || 0) > fresh.maxOrderIndex) {
            // issuedCount 已超過上限代表系統真的滿了，停止 retry。
            // （正常不會發生，因為閘門保證 issuedCount ≤ maxOrderIndex。）
            throw ApiError.forbidden('今日候位已滿，請下次再來');
          }
          logger.warn(`報名撞號 retry 第 ${attempt}/${REGISTER_MAX_RETRY} 次`);
        }

        try {
          const result = await this._createQueueRecord(processedData, settings);
          return result;
        } catch (err) {
          // 只對 E11000 撞號做 retry；其他錯誤直接往外拋（走最終補償）。
          if (err && err.code === 11000 && attempt < REGISTER_MAX_RETRY) {
            lastErr = err;
            continue;
          }
          // 用盡 retry 的 E11000 → 轉成友善訊息（d）。
          if (err && err.code === 11000) {
            logger.error('報名撞號 retry 用盡仍失敗:', err);
            throw ApiError.conflict('報名人數眾多，請稍後再送出一次');
          }
          throw err;
        }
      }
      // 理論上迴圈內必 return 或 throw；防禦性處理。
      throw ApiError.conflict('報名人數眾多，請稍後再送出一次', lastErr);
    } catch (err) {
      // (e) 報名最終失敗補償：把閘門已 $inc 的名額補回 $inc -1，名額不被吃掉。
      // 只在這裡補一次（與 Phase 2 補償同一處，不雙重補償）。
      try {
        await SystemSetting.updateOne({}, { $inc: { issuedCount: -1 } });
      } catch (compErr) {
        logger.error('報名失敗後補償 issuedCount 失敗:', compErr);
      }
      throw err;
    }
  }

  /**
   * 私有方法：建立一筆候位記錄（orderIndex 原子發號 + create + 一致性壓回）。
   * 從 registerQueue 抽出，供 Task 4.7 的撞號 retry 迴圈重複呼叫。
   * 注意：本方法「不」碰 issuedCount —— 名額已由上游閘門原子佔過（D14：
   * orderIndex 與 issuedCount 解耦）。
   */
  async _createQueueRecord(processedDataInput, settings) {
    // 每次嘗試用獨立副本，避免上一次失敗的 orderIndex/queueNumber 殘留。
    const processedData = { ...processedDataInput };

    // 計算 orderIndex（新報名排到隊尾）—— Phase 3 / Task 3.2 / Task 3.2a(a)
    // 改用 allocateOrderIndex() 原子發號，取代舊的非原子「countActiveCustomers()+1」。
    // 發號值保證唯一、單調遞增、大於目前所有 active 記錄 → 新報名排到隊尾、
    // 不與任何 active 記錄撞 partial unique index。連續的 1..N 由本流程
    // 最後的 ensureOrderIndexConsistency() 壓回。
    processedData.orderIndex = await allocateOrderIndex();

    // 生成候位號碼
    // isOpen=false：queueNumber = orderIndex（拖曳前兩者同步）
    // isOpen=true：queueNumber 用全局遞增（凍結後不再依 orderIndex）
    if (!processedData.queueNumber) {
      if (!settings.isQueueOpen) {
        processedData.queueNumber = processedData.orderIndex;
      } else {
        processedData.queueNumber = await WaitingRecord.getNextQueueNumber();
      }
    }

    // 創建記錄（撞 partial unique index 會在這裡丟 E11000，由 registerQueue retry）
    const newRecord = await queueRepository.create(processedData);

    // Phase 3 / Task 3.2：把 active 記錄的 orderIndex 壓回連續 1..N。
    await ensureOrderIndexConsistency();

    // 重新讀取壓回後的記錄，回傳正確的 orderIndex / queueNumber
    const finalRecord = await WaitingRecord.findById(newRecord._id) || newRecord;

    // 計算等待信息
    const waitingInfo = await this.calculateWaitingInfo(finalRecord, settings);

    return {
      queueNumber: finalRecord.queueNumber,
      orderIndex: finalRecord.orderIndex,
      ...waitingInfo,
      registeredAt: finalRecord.createdAt,
      recordDetails: {
        name: finalRecord.name,
        phone: finalRecord.phone,
        email: finalRecord.email,
        addressCount: finalRecord.addresses.length,
        familyMemberCount: finalRecord.familyMembers.length
      }
    };
  }

  /**
   * 獲取候位列表
   */
  async getQueueList(filters, options) {
    return await queueRepository.findAll(filters, options);
  }

  /**
   * 獲取候位狀態
   */
  async getQueueStatus(queueNumber) {
    const record = await queueRepository.findByQueueNumber(queueNumber);
    if (!record) {
      throw ApiError.notFound('候位號碼不存在');
    }

    const settings = await SystemSetting.getSettings();
    const waitingInfo = await this.calculateWaitingInfo(record, settings);

    return {
      ...record.toObject(),
      ...waitingInfo
    };
  }

  /**
   * 更新候位狀態
   */
  async updateQueueStatus(id, status, completedAt = null) {
    const updateData = { status };
    if (completedAt) {
      updateData.completedAt = completedAt;
    }
    
    return await queueRepository.updateById(id, updateData);
  }

  /**
   * 更新候位順序
   */
  async updateQueueOrder(queueId, newOrder) {
    return await queueRepository.updateById(queueId, { orderIndex: newOrder });
  }

  /**
   * 刪除候位記錄
   */
  async deleteQueue(id) {
    return await queueRepository.deleteById(id);
  }

  /**
   * 獲取最大 orderIndex
   */
  async getMaxOrderIndex() {
    const activeCustomerCount = await queueRepository.countActiveCustomers();
    return {
      maxOrderIndex: activeCustomerCount,
      message: activeCustomerCount > 0 
        ? `目前已報名到第 ${activeCustomerCount} 號` 
        : '目前還沒有人報名'
    };
  }

  /**
   * 叫號處理
   */
  async callNextQueue() {
    // 查找第一個等待中的客戶
    const { records } = await queueRepository.findAll(
      { status: 'waiting' },
      { page: 1, limit: 1, sortBy: 'orderIndex', sortOrder: 1 }
    );

    if (records.length === 0) {
      throw ApiError.notFound('沒有等待中的客戶');
    }

    const nextCustomer = records[0];
    return await this.updateQueueStatus(nextCustomer._id, 'processing');
  }

  /**
   * 通過姓名或電話查詢候位記錄（支持家人姓名搜尋）
   */
  async searchQueueByNameAndPhone(name, phone) {
    if (!name && !phone) {
      throw ApiError.badRequest('請提供姓名或電話其中一個');
    }

    logger.info(`查詢條件 - 姓名: ${name || '未提供'}, 電話: ${phone || '未提供'}`);
    
    let searchQuery = {};
    
    // 構建查詢條件
    if (name && phone) {
      // 同時提供姓名和電話：精確匹配主客戶或家人姓名匹配
      searchQuery = {
        $and: [
          { phone: phone },
          {
            $or: [
              { name: name }, // 主客戶姓名匹配
              { 'familyMembers.name': name } // 家人姓名匹配
            ]
          }
        ]
      };
    } else if (name) {
      // 只提供姓名：匹配主客戶或家人姓名
      searchQuery = {
        $or: [
          { name: name }, // 主客戶姓名匹配
          { 'familyMembers.name': name } // 家人姓名匹配
        ]
      };
    } else if (phone) {
      // 只提供電話：匹配主客戶電話
      searchQuery = { phone: phone };
    }

    // 使用repository查找記錄
    const records = await queueRepository.findByQuery(searchQuery);
    
    if (!records || records.length === 0) {
      let errorMessage = '查無候位記錄';
      if (name && phone) {
        errorMessage += '，請確認姓名和電話是否正確';
      } else if (name) {
        errorMessage += '，請確認姓名是否正確（包含本人或家人姓名）';
      } else if (phone) {
        errorMessage += '，請確認電話是否正確';
      }
      
      throw ApiError.notFound(errorMessage);
    }

    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 為每條記錄計算詳細資訊
    const recordsWithDetails = await Promise.all(records.map(async (record) => {
      return await this.calculateDetailedQueueInfo(record, settings);
    }));

    return {
      records: recordsWithDetails,
      message: `找到 ${recordsWithDetails.length} 筆候位記錄`
    };
  }

  /**
   * 計算詳細的候位資訊（用於搜尋結果）
   */
  async calculateDetailedQueueInfo(record, settings) {
    // 確定實際狀態：如果候位號碼等於目前叫號且原狀態不是已完成或已取消，則為處理中
    let actualStatus = record.status;
    if (record.queueNumber === settings.currentQueueNumber && 
        !['completed', 'cancelled'].includes(record.status)) {
      actualStatus = 'processing';
    }
    
    // 基於orderIndex計算前面的人數（使用排序而非狀態判斷）
    let peopleAheadCount = 0;
    let recordsAheadCount = 0;
    
    if (actualStatus === 'waiting' || actualStatus === 'processing') {
      // 獲取排在該客戶前面的所有等待中或處理中記錄（基於orderIndex）
      const recordsAhead = await queueRepository.findRecordsAhead(record.orderIndex);
      
      recordsAheadCount = recordsAhead.length;
      
      // 計算前面的總人數（包含本人和家人）
      peopleAheadCount = recordsAhead.reduce((total, aheadRecord) => {
        const familyMemberCount = aheadRecord.familyMembers ? aheadRecord.familyMembers.length : 0;
        return total + 1 + familyMemberCount; // 1(本人) + 家人數量
      }, 0);
      
      // 如果當前客戶是處理中，前面就沒有人了
      if (actualStatus === 'processing') {
        peopleAheadCount = 0;
        recordsAheadCount = 0;
      }
    }
    
    // 計算預估輪到時間（基於新邏輯：lastCompletedTime + (orderIndex-1) * minutesPerCustomer）
    let estimatedStartTime = null;
    
    if (actualStatus === 'waiting' || actualStatus === 'processing') {
      if (settings.lastCompletedTime && record.orderIndex) {
        // 使用新公式：lastCompletedTime + ((orderIndex - 1) * minutesPerCustomer)
        estimatedStartTime = new Date(settings.lastCompletedTime);
        const waitingMinutes = (record.orderIndex - 1) * settings.minutesPerCustomer;
        estimatedStartTime.setMinutes(estimatedStartTime.getMinutes() + waitingMinutes);
      } else if (settings.nextSessionDate && record.orderIndex) {
        // 如果沒有 lastCompletedTime，使用 nextSessionDate
        estimatedStartTime = new Date(settings.nextSessionDate);
        const waitingMinutes = (record.orderIndex - 1) * settings.minutesPerCustomer;
        estimatedStartTime.setMinutes(estimatedStartTime.getMinutes() + waitingMinutes);
      }
    }
    
    // 計算預估等待時間（分鐘數）
    const estimatedWaitTime = actualStatus === 'processing' ? 0 : (record.orderIndex - 1) * settings.minutesPerCustomer;
    
    // 依據實際狀態返回不同的訊息
    let statusMessage = '';
    switch(actualStatus) {
      case 'waiting':
        statusMessage = `您的號碼還在等待中，前面還有 ${recordsAheadCount} 筆資料（共 ${peopleAheadCount} 人）`;
        break;
      case 'processing':
        statusMessage = '您的號碼正在處理中';
        break;
      case 'completed':
        statusMessage = '您的號碼已完成服務';
        break;
      case 'cancelled':
        statusMessage = '您的號碼已被取消';
        break;
      default:
        statusMessage = '未知狀態';
    }
    
    return {
      queueNumber: record.queueNumber,
      orderIndex: record.orderIndex,
      status: actualStatus,
      statusMessage,
      peopleAhead: peopleAheadCount,
      estimatedWaitTime: ['waiting', 'processing'].includes(actualStatus) ? estimatedWaitTime : 0,
      estimatedStartTime: ['waiting', 'processing'].includes(actualStatus) ? estimatedStartTime?.toISOString() : null,
      currentQueueNumber: settings.currentQueueNumber,
      name: record.name,
      phone: record.phone,
      email: record.email,
      gender: record.gender,
      // 新的國曆農曆欄位結構
      gregorianBirthYear: record.gregorianBirthYear,
      gregorianBirthMonth: record.gregorianBirthMonth,
      gregorianBirthDay: record.gregorianBirthDay,
      lunarBirthYear: record.lunarBirthYear,
      lunarBirthMonth: record.lunarBirthMonth,
      lunarBirthDay: record.lunarBirthDay,
      lunarIsLeapMonth: record.lunarIsLeapMonth,
      virtualAge: record.virtualAge,
      zodiac: record.zodiac,
      addresses: record.addresses,
      familyMembers: record.familyMembers,
      consultationTopics: record.consultationTopics,
      otherDetails: record.otherDetails,
      remarks: record.remarks,
      createdAt: record.createdAt
    };
  }

  /**
   * 私有方法：驗證必填欄位
   *
   * Follow-up patch #3（OpenSpec 2026-05-23-followup-patches D3）：
   * 加入 lunar 三欄位必填。Change C 全民國農曆需求隱含「lunar 必填」，
   * 但原本只驗 name + phone、即使非簡化模式也讓缺 lunar 的請求過關
   * → 該客戶 lunarBirth* 全 null、下游算 zodiac/virtualAge/顯示生日都會壞。
   *
   * 注意：簡化模式仍 skip（呼叫端 registerQueue line 37 `if (!settings.simplifiedMode)`
   * 已包覆，此 method 本身不需要重複判斷簡化模式）。
   */
  validateRequiredFields(data) {
    // 基本欄位
    const basicRequired = [
      { field: 'name', label: '姓名' },
      { field: 'phone', label: '聯絡手機' }
    ];
    for (const { field, label } of basicRequired) {
      if (!data[field]) {
        throw ApiError.badRequest(`請輸入${label}`);
      }
    }

    // Follow-up patch #3：lunar 三欄位必填（非簡化模式）
    const lunarRequired = [
      { field: 'lunarBirthYear', label: '農曆生日年份' },
      { field: 'lunarBirthMonth', label: '農曆生日月份' },
      { field: 'lunarBirthDay', label: '農曆生日日期' }
    ];
    for (const { field, label } of lunarRequired) {
      if (!data[field]) {
        throw ApiError.badRequest(`請輸入${label}`);
      }
    }

    // 2026-06-24（WS5）：補齊非簡化模式的 model 必填欄位檢查。原本只查 name/phone/農曆，
    // 漏了 addresses / consultationTopics——非簡化模式不走 applyDefaultValues，缺這些會
    // 繞過檢查直接撞 model required → 500。改為友善 400。空陣列也要擋（length===0 是 truthy 陷阱）。
    // gender 另議（簡化模式補「待填」標記，見 WS5.4），故此處暫不納入 gender。
    if (!Array.isArray(data.addresses) || data.addresses.length === 0) {
      throw ApiError.badRequest('請至少填寫一個地址');
    }
    if (!Array.isArray(data.consultationTopics) || data.consultationTopics.length === 0) {
      throw ApiError.badRequest('請選擇至少一個諮詢主題');
    }
  }

  /**
   * 私有方法：處理候位數據
   */
  processQueueData(data, settings) {
    let processedData = { ...data };

    // 2026-06-24（WS5 / 懷特裁示）：gender 缺漏一律補 'other'（用途改為「待填」標記），
    // 不分簡化/非簡化模式——標記系統未取得真實性別、待管理員確認。前台 radio 一定送
    // male/female，只有繞過前端的請求會缺 gender。'other' 在 model enum 內 → 零 schema 變更。
    // 前端把 gender==='other' 一律顯示「待填」（含客戶庫歸檔後），管理員一眼看出是補值。
    if (!processedData.gender) {
      processedData.gender = 'other';
    }

    // 獲取候位號碼
    if (!processedData.queueNumber) {
      // 這裡應該調用 getNextQueueNumber，但為了保持現有邏輯暫時保留
      // processedData.queueNumber = await queueRepository.getNextQueueNumber();
    }

    // 處理預設值（簡化模式）
    if (settings.simplifiedMode) {
      this.applyDefaultValues(processedData);
    }

    // 處理家人數據
    this.processFamilyMembers(processedData);

    // 自動填充日期（國曆轉農曆或農曆轉國曆）
    processedData = autoFillDates(processedData);
    
    // 處理家人資料的日期轉換
    if (processedData.familyMembers && processedData.familyMembers.length > 0) {
      const familyData = autoFillFamilyMembersDates({ familyMembers: processedData.familyMembers });
      processedData.familyMembers = familyData.familyMembers;
    }
    
    // 計算生肖
    processedData = addZodiac(processedData);
    
    // 計算虛歲
    processedData = addVirtualAge(processedData);

    return processedData;
  }

  /**
   * 私有方法：應用預設值
   */
  applyDefaultValues(data) {
    // Change C v3：全民國農曆、不再 default 國曆生日。
    // 主流程只認 lunarBirth*（民國年），gregorianBirth* 欄位保留在 schema
    // 但不在此處 default 寫入 80/1/1（會誤導下游與 admin 介面）。
    const defaults = {
      // gender 已移到 processQueueData 統一補 'other'（待填）、不分模式，這裡不再補 'male'
      phone: data.phone || '0900000000',
      // Change B / Phase 3：簡化模式 default 跟 schema default 對齊改 ''
      // 避免在 DB 寫入「臨時地址」字串誤導 admin（schema default 已改 ''）
      addresses: data.addresses || [{ address: '', addressType: 'home' }]
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!data[key]) {
        data[key] = value;
      }
    });

    // 2026-06-24（WS5）：補上原本漏掉的 consultationTopics（model required + 長度>0）。
    // applyDefaultValues 原本只補 gender/phone/addresses，漏了 consultationTopics——
    // 簡化模式繞過前端（直接打 API）只送姓名時，會撞 model required → 500（反向脆弱）。
    // 缺漏/空陣列補 ['other']，並對齊前端寫入可見的 otherDetails 標示（管理員看得出是補的）。
    if (!Array.isArray(data.consultationTopics) || data.consultationTopics.length === 0) {
      data.consultationTopics = ['other'];
      if (!data.otherDetails) {
        data.otherDetails = '簡化模式快速登記';
      }
    }
  }

  /**
   * 私有方法：處理家人數據
   */
  processFamilyMembers(data) {
    if (data.familyMembers && Array.isArray(data.familyMembers)) {
      data.familyMembers = data.familyMembers.map(member => {
        // Change C v3：全民國農曆、不再 default 國曆生日（80/1/1 會讓所有家人
        // 出生日期都是民國 80 年 1 月 1 日，誤導 admin 與下游邏輯）。
        return {
          ...member,
          // 2026-06-24（WS5）：家人 gender 缺漏補 'other'（待填），與主客戶一致（前端顯示「待填」）
          gender: member.gender || 'other',
          // Change B / Phase 3：跟 schema default '' 對齊，不寫入「臨時地址」字串
          address: member.address || '',
          addressType: member.addressType || 'home'
        };
      });
    }
  }

  /**
   * 私有方法：計算等待信息
   */
  async calculateWaitingInfo(record, settings) {
    // 計算等待組數
    const activeCustomerCount = await queueRepository.countActiveCustomers();
    const waitingCount = activeCustomerCount;

    // 計算前面的記錄
    const recordsAhead = await queueRepository.findRecordsAhead(record.orderIndex);
    
    // 計算前面的總人數
    const peopleAheadCount = recordsAhead.reduce((total, r) => {
      return total + 1 + (r.familyMembers ? r.familyMembers.length : 0);
    }, 0);

    // 計算當前客戶總人數
    const currentCustomerPeopleCount = 1 + (record.familyMembers ? record.familyMembers.length : 0);

    // 計算預估等待時間
    const estimatedWaitTime = (peopleAheadCount + currentCustomerPeopleCount) * settings.minutesPerCustomer;

    // 計算預估結束時間
    let estimatedEndTime;
    const now = new Date();
    
    if (settings.nextSessionDate) {
      estimatedEndTime = new Date(settings.nextSessionDate);
      estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + estimatedWaitTime);
    } else {
      estimatedEndTime = new Date(now.getTime() + estimatedWaitTime * 60000);
    }

    return {
      waitingCount,
      estimatedWaitTime,
      estimatedEndTime: estimatedEndTime.toISOString()
    };
  }
}

module.exports = new QueueService();
