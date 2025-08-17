const WaitingRecord = require('../models/waiting-record.model');
const SystemSetting = require('../models/system-setting.model');
const { autoFillDates, autoFillFamilyMembersDates, addVirtualAge, autoConvertToMinguo, convertMinguoForStorage } = require('../utils/calendarConverter');

// 確保 orderIndex 的一致性和連續性 - 保持現有順序版本
async function ensureOrderIndexConsistency() {
  try {
    console.log('開始檢查和修正 orderIndex 一致性...');
    
    // 獲取所有活躍狀態的客戶，保持現有的orderIndex順序
    const activeRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: 1 }); // 按照現有的orderIndex排序，保持相對順序
    
    console.log(`找到 ${activeRecords.length} 個活躍客戶記錄`);
    
    // 重新分配連續的 orderIndex (1, 2, 3, ...)，但保持相對順序
    let needsUpdate = false;
    for (let i = 0; i < activeRecords.length; i++) {
      const correctOrderIndex = i + 1;
      if (activeRecords[i].orderIndex !== correctOrderIndex) {
        console.log(`修正客戶 ${activeRecords[i].queueNumber} 的 orderIndex: ${activeRecords[i].orderIndex} → ${correctOrderIndex}`);
        activeRecords[i].orderIndex = correctOrderIndex;
        await activeRecords[i].save();
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log('已重新分配所有活躍客戶的 orderIndex 為連續數字（保持原有相對順序）');
    } else {
      console.log('所有活躍客戶的 orderIndex 已經是連續的');
    }
    
  } catch (error) {
    console.error('確保 orderIndex 一致性時發生錯誤:', error);
  }
}

// 取得目前候位狀態
exports.getQueueStatus = async (req, res) => {
  try {
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 若辦事服務已停止，返回相關資訊但仍包含publicRegistrationEnabled狀態
    if (!settings.isQueueOpen) {
      return res.status(200).json({
        success: true,
        data: {
          isOpen: false,
          maxQueueNumber: settings.maxQueueNumber,
          minutesPerCustomer: settings.minutesPerCustomer,
          simplifiedMode: settings.simplifiedMode,
          publicRegistrationEnabled: settings.publicRegistrationEnabled,
          nextSessionDate: settings.nextSessionDate,
          currentQueueNumber: 0,
          waitingCount: 0,
          totalCustomerCount: settings.totalCustomerCount || 0,
          lastCompletedTime: settings.lastCompletedTime,
          message: '辦事服務目前已停止'
        }
      });
    }
    
    // 獲取叫號順序1的客戶（目前叫號）
    const currentProcessingRecord = await WaitingRecord.findOne({ 
      orderIndex: 1, 
      status: { $in: ['waiting', 'processing'] }
    });
    
    // 更新系統設定中的當前叫號為順序1的客戶號碼
    const currentQueueNumber = currentProcessingRecord ? currentProcessingRecord.queueNumber : 0;
    if (currentProcessingRecord && settings.currentQueueNumber !== currentQueueNumber) {
      settings.currentQueueNumber = currentQueueNumber;
      await settings.save();
    }
    
    // 計算等待中的候位數量（後台管理中狀態為"等待中"的總數）
    const waitingCount = await WaitingRecord.countDocuments({ 
      status: 'waiting'
    });
    
    // 計算所有客戶的總人數（用於預估結束時間計算，包含處理中+等待中+已完成）
    const allActiveRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing', 'completed'] }
    });
    
    // 計算預估結束時間（基於新邏輯：totalCustomerCount * minutesPerCustomer）
    let estimatedEndTime = null;
    if (settings.nextSessionDate && settings.isQueueOpen) {
      // 開始辦事時：使用 totalCustomerCount 計算固定的預估結束時間
      const totalEstimatedTime = (settings.totalCustomerCount || 0) * settings.minutesPerCustomer;
      estimatedEndTime = new Date(settings.nextSessionDate);
      estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + totalEstimatedTime);
    }
    
    res.status(200).json({
      success: true,
      data: {
        isOpen: settings.isQueueOpen,
        currentQueueNumber: currentQueueNumber,
        maxQueueNumber: settings.maxQueueNumber,
        minutesPerCustomer: settings.minutesPerCustomer,
        simplifiedMode: settings.simplifiedMode,
        publicRegistrationEnabled: settings.publicRegistrationEnabled,
        waitingCount,
        totalCustomerCount: settings.totalCustomerCount || 0,
        lastCompletedTime: settings.lastCompletedTime,
        nextSessionDate: settings.nextSessionDate,
        estimatedEndTime: estimatedEndTime ? estimatedEndTime.toISOString() : null,
        message: `目前叫號: ${currentQueueNumber}, 等待組數: ${waitingCount}`
      }
    });
  } catch (error) {
    console.error('獲取候位狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

  // 登記候位
exports.registerQueue = async (req, res) => {
  try {
    // 輸出接收到的表單數據，用於調試
    console.log('接收到的登記數據:', req.body);
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 檢查必要欄位 - 在簡化模式下跳過驗證
    if (!settings.simplifiedMode) {
    // 電子郵件現在為非必填欄位
    const requiredFields = ['name', 'phone', 'gender', 'addresses', 'consultationTopics'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.error(`缺少必要欄位: ${field}`);
        return res.status(400).json({
          success: false,
          message: `缺少必要欄位: ${field}`
        });
      }
    }
    
    // 驗證出生日期：必須有國曆或農曆其中一組完整的年月日
    const hasGregorianBirth = req.body.gregorianBirthYear && req.body.gregorianBirthMonth && req.body.gregorianBirthDay;
    const hasLunarBirth = req.body.lunarBirthYear && req.body.lunarBirthMonth && req.body.lunarBirthDay;
    
    if (!hasGregorianBirth && !hasLunarBirth) {
      return res.status(400).json({
        success: false,
        message: '必須提供國曆或農曆出生日期'
      });
    }
    
    // 驗證地址陣列
    if (!Array.isArray(req.body.addresses) || req.body.addresses.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一個地址'
      });
    }
    
    // 驗證每個地址都有必要資訊
    for (let i = 0; i < req.body.addresses.length; i++) {
      const addr = req.body.addresses[i];
      if (!addr.address || !addr.addressType) {
        return res.status(400).json({
          success: false,
          message: `地址 ${i + 1} 資訊不完整`
        });
      }
    }
    
    // 驗證家人資料（如果有的話）
    if (req.body.familyMembers && Array.isArray(req.body.familyMembers)) {
      for (let i = 0; i < req.body.familyMembers.length; i++) {
        const member = req.body.familyMembers[i];
        if (!member.name || !member.gender || !member.address || !member.addressType) {
          return res.status(400).json({
            success: false,
            message: `家人 ${i + 1} 基本資訊不完整（需要姓名、性別、地址和地址類型）`
          });
        }
        
        // 驗證家人的出生日期：必須有國曆或農曆其中一組完整的年月日
        const hasGregorianBirthMember = member.gregorianBirthYear && member.gregorianBirthMonth && member.gregorianBirthDay;
        const hasLunarBirthMember = member.lunarBirthYear && member.lunarBirthMonth && member.lunarBirthDay;
        
        if (!hasGregorianBirthMember && !hasLunarBirthMember) {
          return res.status(400).json({
            success: false,
            message: `家人 ${i + 1} 必須提供國曆或農曆出生日期`
          });
        }
      }
    }
  } else {
      // 簡化模式下，只檢查基本必要欄位
      console.log('簡化模式已開啟，跳過詳細驗證');
      
      // 至少需要姓名
      if (!req.body.name) {
        return res.status(400).json({
          success: false,
          message: '至少需要提供姓名'
        });
      }
      
      // 自動填充必要的資料結構和預設值
      if (!req.body.addresses || req.body.addresses.length === 0) {
        req.body.addresses = [{ address: '臨時地址', addressType: 'home' }];
      } else {
        // 確保每個地址都有完整資訊
        req.body.addresses = req.body.addresses.map(addr => ({
          address: addr.address || '臨時地址',
          addressType: addr.addressType || 'home'
        }));
      }
      
      if (!req.body.consultationTopics || req.body.consultationTopics.length === 0) {
        req.body.consultationTopics = ['other'];
        // 在簡化模式下，若預設選擇"其他"，需要提供預設的詳細內容
        if (!req.body.otherDetails) {
          req.body.otherDetails = '簡化模式快速登記';
        }
      }
      
      if (!req.body.email) {
        req.body.email = `temp_${Date.now()}@temp.com`;
      }
      
      if (!req.body.phone) {
        req.body.phone = '0000000000';
      }
      
      if (!req.body.gender) {
        req.body.gender = 'male';
      }
      
      // 確保有出生日期資訊（至少設置預設值）
      if (!req.body.gregorianBirthYear && !req.body.lunarBirthYear) {
        req.body.gregorianBirthYear = 80; // 民國80年
        req.body.gregorianBirthMonth = 1;
        req.body.gregorianBirthDay = 1;
      }
      
      // 處理家人資料（確保家人也有完整的必要資訊）
      if (req.body.familyMembers && Array.isArray(req.body.familyMembers)) {
        req.body.familyMembers = req.body.familyMembers.map(member => {
          const processedMember = { ...member };
          
          // 如果家人沒有性別，設置預設值
          if (!processedMember.gender) {
            processedMember.gender = 'male';
          }
          
          // 如果家人沒有地址，設置預設值
          if (!processedMember.address) {
            processedMember.address = '臨時地址';
          }
          if (!processedMember.addressType) {
            processedMember.addressType = 'home';
          }
          
          // 如果家人沒有出生日期，設置預設值
          if (!processedMember.gregorianBirthYear && !processedMember.lunarBirthYear) {
            processedMember.gregorianBirthYear = 80;
            processedMember.gregorianBirthMonth = 1;
            processedMember.gregorianBirthDay = 1;
          }
          
          return processedMember;
        });
      }
    }
    
    // 檢查候位系統是否開放 - 這段條件暫時移除，改成允許人們隨時候位
    /*
    if (!settings.isQueueOpen) {
      return res.status(403).json({
        success: false,
        message: '候位系統目前已關閉',
        nextSessionDate: settings.nextSessionDate
      });
    }
    */
    
    // 獲取當前最大候位號碼
    const nextQueueNumber = await WaitingRecord.getNextQueueNumber();
    console.log('自動分配的候位號碼:', nextQueueNumber);
    
    // 檢查是否超過最大候位數量限制
    if (nextQueueNumber > settings.maxQueueNumber) {
      return res.status(403).json({
        success: false,
        message: '今日候位已滿，請下次再來'
      });
    }
    
    // 準備要創建的資料，並進行日期自動轉換
    let recordData = {
      ...req.body,
      queueNumber: nextQueueNumber,
      status: 'waiting',
      // 確保家人陣列存在（即使為空）
      familyMembers: req.body.familyMembers || []
    };

    // 自動填充主客戶的國曆農曆轉換
    recordData = autoFillDates(recordData);
    
    // 自動填充家人的國曆農曆轉換
    if (recordData.familyMembers && recordData.familyMembers.length > 0) {
      const familyData = autoFillFamilyMembersDates({ familyMembers: recordData.familyMembers });
      recordData.familyMembers = familyData.familyMembers;
    }
    
    // 計算並添加虛歲
    recordData = addVirtualAge(recordData);

    console.log('準備創建的候位記錄:', recordData);
    
    // 計算新客戶的orderIndex - 不影響現有客戶的手動調整順序
    // 計算目前活躍狀態（等待中+處理中）的客戶總數
    const activeCustomerCount = await WaitingRecord.countDocuments({
      status: { $in: ['waiting', 'processing'] }
    });
    
    // 新客戶的orderIndex = 活躍客戶總數 + 1，排在所有現有客戶之後
    const newOrderIndex = activeCustomerCount + 1;
    
    console.log(`目前活躍客戶數: ${activeCustomerCount}, 新客戶orderIndex: ${newOrderIndex}`);
    
    // 將orderIndex添加到記錄數據中
    recordData.orderIndex = newOrderIndex;
    
    // 創建新的候位記錄
    const newRecord = await WaitingRecord.create(recordData);
    console.log('創建的候位記錄ID:', newRecord._id, '排序:', newOrderIndex);
    
    // 計算目前等待組數（基於實際的等待中和處理中客戶數量）
    const waitingAndProcessingCount = await WaitingRecord.countDocuments({
      status: { $in: ['waiting', 'processing'] }
    });
    
    // 新客戶的等待組數應該等於目前等待中和處理中的客戶總數
    const waitingCount = waitingAndProcessingCount;
    
    // 計算預估輪到時間（基於新邏輯：lastCompletedTime + (orderIndex-1) * minutesPerCustomer）
    let estimatedEndTime = null;
    const estimatedWaitTime = (newOrderIndex - 1) * settings.minutesPerCustomer;
    
    if (settings.lastCompletedTime) {
      // 使用 lastCompletedTime + (orderIndex-1) * minutesPerCustomer
      estimatedEndTime = new Date(settings.lastCompletedTime);
      estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + estimatedWaitTime);
    } else if (settings.nextSessionDate) {
      // 如果沒有 lastCompletedTime，使用 nextSessionDate
      estimatedEndTime = new Date(settings.nextSessionDate);
      estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + estimatedWaitTime);
    } else {
      // 最後備案：使用當前時間
      estimatedEndTime = new Date();
      estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + estimatedWaitTime);
    }
    
    res.status(201).json({
      success: true,
      message: '候位登記成功',
      data: {
        queueNumber: newRecord.queueNumber,
        orderIndex: newRecord.orderIndex,
        registeredOrderIndex: newRecord.orderIndex,  // 前端需要此欄位
        waitingCount,
        estimatedWaitTime,
        estimatedEndTime: estimatedEndTime ? estimatedEndTime.toISOString() : null,
        registeredAt: newRecord.createdAt,
        recordDetails: {
          name: newRecord.name,
          phone: newRecord.phone,
          email: newRecord.email,
          addressCount: newRecord.addresses.length,
          familyMemberCount: newRecord.familyMembers.length
        }
      }
    });
  } catch (error) {
    console.error('候位登記錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 查詢特定候位號碼的狀態
exports.getQueueNumberStatus = async (req, res) => {
  try {
    const { queueNumber } = req.params;
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 查找指定的候位記錄
    const record = await WaitingRecord.findOne({ queueNumber: parseInt(queueNumber) });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位號碼'
      });
    }
    
    // 計算此號碼前面還有多少筆資料
    const recordsAheadCount = await WaitingRecord.countDocuments({
      status: 'waiting',
      queueNumber: { $gt: settings.currentQueueNumber, $lt: parseInt(queueNumber) }
    });
    
    // 獲取前面的所有記錄來計算實際人數
    const recordsAhead = await WaitingRecord.find({
      status: 'waiting',
      queueNumber: { $gt: settings.currentQueueNumber, $lt: parseInt(queueNumber) }
    });
    
    // 計算前面的總人數（包含本人和家人）
    const peopleAheadCount = recordsAhead.reduce((total, aheadRecord) => {
      const familyMemberCount = aheadRecord.familyMembers ? aheadRecord.familyMembers.length : 0;
      return total + 1 + familyMemberCount; // 1(本人) + 家人數量
    }, 0);
    
    // 計算預估等待時間
    const estimatedWaitTime = peopleAheadCount * settings.minutesPerCustomer;
    
    // 依據候位狀態返回不同的訊息
    let statusMessage = '';
          switch(record.status) {
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
    
    res.status(200).json({
      success: true,
      data: {
        queueNumber: record.queueNumber,
        orderIndex: record.orderIndex,
        status: record.status,
        statusMessage,
        peopleAhead: peopleAheadCount,
        estimatedWaitTime: record.status === 'waiting' ? estimatedWaitTime : 0,
        currentQueueNumber: settings.currentQueueNumber
      }
    });
  } catch (error) {
    console.error('查詢候位狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 通過姓名或電話查詢候位號碼（支持單一條件查詢和家人姓名搜索）
exports.getQueueByNameAndPhone = async (req, res) => {
  try {
    const { name, phone } = req.query;
    
    if (!name && !phone) {
      return res.status(400).json({
        success: false,
        message: '請提供姓名或電話其中一個'
      });
    }
    
    console.log(`查詢條件 - 姓名: ${name || '未提供'}, 電話: ${phone || '未提供'}`);
    
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
    
    // 查找所有匹配的候位記錄
    const records = await WaitingRecord.find(searchQuery).sort({ queueNumber: 1 });
    
    // 如果沒有找到記錄
    if (!records || records.length === 0) {
      let errorMessage = '查無候位記錄';
      if (name && phone) {
        errorMessage += '，請確認姓名和電話是否正確';
      } else if (name) {
        errorMessage += '，請確認姓名是否正確（包含本人或家人姓名）';
      } else if (phone) {
        errorMessage += '，請確認電話是否正確';
      }
      
      return res.status(404).json({
        success: false,
        message: errorMessage
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 為每條記錄計算相關資訊
    const recordsWithDetails = await Promise.all(records.map(async (record) => {
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
        const recordsAhead = await WaitingRecord.find({
          orderIndex: { $lt: record.orderIndex },
          status: { $in: ['waiting', 'processing'] }
        });
        
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
        estimatedStartTime: ['waiting', 'processing'].includes(actualStatus) ? estimatedStartTime.toISOString() : null,
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
        addresses: record.addresses,
        familyMembers: record.familyMembers,
        consultationTopics: record.consultationTopics,
        otherDetails: record.otherDetails,
        remarks: record.remarks,
        createdAt: record.createdAt
      };
    }));
    
    res.status(200).json({
      success: true,
      data: recordsWithDetails,
      message: `找到 ${recordsWithDetails.length} 筆候位記錄`
    });
  } catch (error) {
    console.error('查詢候位記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 獲取下一個等待號碼
exports.getNextWaitingNumber = async (req, res) => {
  try {
    const { currentNumber } = req.query;
    
    if (!currentNumber) {
      return res.status(400).json({
        success: false,
        message: '請提供當前號碼'
      });
    }
    
    const currentNum = parseInt(currentNumber);
    
    // 查找當前號碼之後的第一個等待中的號碼
    const nextWaiting = await WaitingRecord.findOne({
      status: 'waiting',
      queueNumber: { $gt: currentNum }
    }).sort({ queueNumber: 1 });
    
    if (!nextWaiting) {
      return res.status(200).json({
        success: true,
        data: {
          nextWaitingNumber: null,
          message: '沒有等待中的號碼'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        nextWaitingNumber: nextWaiting.queueNumber,
        name: nextWaiting.name,
        phone: nextWaiting.phone
      }
    });
  } catch (error) {
    console.error('獲取下一個等待號碼錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 客戶取消預約
exports.cancelQueueByCustomer = async (req, res) => {
  try {
    const { queueNumber } = req.body;
    
    if (!queueNumber) {
      return res.status(400).json({
        success: false,
        message: '請提供候位號碼'
      });
    }
    
    // 使用候位號碼查找記錄（候位號碼是唯一標識，不需要額外驗證）
    const record = await WaitingRecord.findOne({ 
      queueNumber: parseInt(queueNumber)
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位記錄'
      });
    }
    
    if (record.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '此候位已被取消'
      });
    }
    
    if (record.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '此候位已完成，無法取消'
      });
    }
    
    // 更新狀態為已取消
    record.status = 'cancelled';
    await record.save();
    
    res.status(200).json({
      success: true,
      message: '預約取消成功',
      data: record
    });
  } catch (error) {
    console.error('取消預約錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 客戶修改資料
exports.updateQueueByCustomer = async (req, res) => {
  try {
    const { queueNumber, ...updateData } = req.body;
    
    if (!queueNumber) {
      return res.status(400).json({
        success: false,
        message: '請提供候位號碼'
      });
    }
    
    // 使用候位號碼查找記錄（候位號碼是唯一標識，不需要額外驗證）
    const record = await WaitingRecord.findOne({ 
      queueNumber: parseInt(queueNumber)
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位記錄'
      });
    }
    
    if (record.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '已取消的候位無法修改'
      });
    }
    
    if (record.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '已完成的候位無法修改'
      });
    }
    
    // 仿效登記候位的處理流程：前端已處理年份轉換，後端只需進行日期轉換
    
    // 在保存前進行日期自動轉換（國曆轉農曆或農曆轉國曆）
    let processedUpdateData = autoFillDates(updateData);
    
    // 處理家人資料的日期轉換
    if (processedUpdateData.familyMembers && processedUpdateData.familyMembers.length > 0) {
      const familyData = autoFillFamilyMembersDates({ familyMembers: processedUpdateData.familyMembers });
      processedUpdateData.familyMembers = familyData.familyMembers;
    }

    // 計算虛歲
    processedUpdateData = addVirtualAge(processedUpdateData);
    
    // 允許修改的欄位
    const allowedFields = [
      'name', 'phone', 'email', 'gender',
      'gregorianBirthYear', 'gregorianBirthMonth', 'gregorianBirthDay',
      'lunarBirthYear', 'lunarBirthMonth', 'lunarBirthDay', 'lunarIsLeapMonth',
      'addresses', 'familyMembers', 'consultationTopics', 'otherDetails', 'remarks', 'virtualAge'
    ];
    
    // 更新資料
    allowedFields.forEach(field => {
      if (processedUpdateData[field] !== undefined) {
        record[field] = processedUpdateData[field];
      }
    });
    
    await record.save();
    
    res.status(200).json({
      success: true,
      message: '資料修改成功',
      data: record
    });
  } catch (error) {
    console.error('修改資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 獲取順序1和順序2的候位號碼（公共API）
exports.getOrderedNumbers = async (req, res) => {
  try {
    // 查詢順序1和順序2的記錄
    const order1Record = await WaitingRecord.findOne({ 
      orderIndex: 1, 
      status: { $nin: ['completed', 'cancelled'] }
    });

    const order2Record = await WaitingRecord.findOne({ 
      orderIndex: 2, 
      status: { $nin: ['completed', 'cancelled'] }
    });

    const result = {
      success: true,
      data: {
        currentProcessingNumber: order1Record ? order1Record.queueNumber : null,
        nextWaitingNumber: order2Record ? order2Record.queueNumber : null
      }
    };

    // 更新系統設定中的當前叫號
    if (order1Record) {
      await SystemSetting.updateOne({}, { currentQueueNumber: order1Record.queueNumber });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('獲取排序候位號碼錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 獲取目前最大叫號順序（公共API）
exports.getMaxOrderIndex = async (req, res) => {
  try {
    // ✅ 修正：計算活躍狀態客戶總數，與registerQueue中的waitingCount邏輯一致
    const activeCustomerCount = await WaitingRecord.countDocuments({
      status: { $in: ['waiting', 'processing'] }
    });
    
    // 新客戶將會是第 (活躍客戶總數 + 1) 號
    const maxOrderIndex = activeCustomerCount;
    
    res.status(200).json({
      success: true,
      data: {
        maxOrderIndex: maxOrderIndex,
        message: maxOrderIndex > 0 ? `目前已報名到第 ${maxOrderIndex} 號` : '目前還沒有人報名'
      }
    });
  } catch (error) {
    console.error('獲取最大叫號順序錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
}; 