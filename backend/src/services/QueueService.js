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
