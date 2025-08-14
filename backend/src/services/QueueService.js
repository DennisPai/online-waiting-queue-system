const queueRepository = require('../repositories/QueueRepository');
const SystemSetting = require('../models/system-setting.model');
const ApiError = require('../utils/ApiError');

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
    if (!settings.simplifiedMode) {
      this.validateRequiredFields(data);
    }

    // 處理和驗證數據
    const processedData = this.processQueueData(data, settings);
    
    // 檢查候位系統是否開放
    this.checkQueueAvailability(settings, processedData.queueNumber);

    // 計算 orderIndex
    const activeCustomerCount = await queueRepository.countActiveCustomers();
    processedData.orderIndex = activeCustomerCount + 1;

    // 創建記錄
    const newRecord = await queueRepository.create(processedData);

    // 計算等待信息
    const waitingInfo = await this.calculateWaitingInfo(newRecord, settings);

    return {
      queueNumber: newRecord.queueNumber,
      orderIndex: newRecord.orderIndex,
      ...waitingInfo,
      registeredAt: newRecord.createdAt,
      recordDetails: {
        name: newRecord.name,
        phone: newRecord.phone,
        email: newRecord.email,
        addressCount: newRecord.addresses.length,
        familyMemberCount: newRecord.familyMembers.length
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
   */
  validateRequiredFields(data) {
    const required = ['name', 'phone'];
    for (const field of required) {
      if (!data[field]) {
        throw ApiError.badRequest(`${field} 為必填欄位`);
      }
    }
  }

  /**
   * 私有方法：處理候位數據
   */
  processQueueData(data, settings) {
    const processedData = { ...data };

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

    return processedData;
  }

  /**
   * 私有方法：應用預設值
   */
  applyDefaultValues(data) {
    const defaults = {
      gender: 'male',
      gregorianBirthYear: 80,
      gregorianBirthMonth: 1,
      gregorianBirthDay: 1,
      phone: data.phone || '0900000000',
      addresses: data.addresses || [{ address: '臨時地址', addressType: 'home' }]
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!data[key]) {
        data[key] = value;
      }
    });
  }

  /**
   * 私有方法：處理家人數據
   */
  processFamilyMembers(data) {
    if (data.familyMembers && Array.isArray(data.familyMembers)) {
      data.familyMembers = data.familyMembers.map(member => {
        return {
          ...member,
          gender: member.gender || 'male',
          address: member.address || '臨時地址',
          addressType: member.addressType || 'home',
          gregorianBirthYear: member.gregorianBirthYear || 80,
          gregorianBirthMonth: member.gregorianBirthMonth || 1,
          gregorianBirthDay: member.gregorianBirthDay || 1
        };
      });
    }
  }

  /**
   * 私有方法：檢查候位系統可用性
   */
  checkQueueAvailability(settings, queueNumber) {
    if (queueNumber > settings.maxQueueNumber) {
      throw ApiError.forbidden('今日候位已滿，請下次再來');
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
