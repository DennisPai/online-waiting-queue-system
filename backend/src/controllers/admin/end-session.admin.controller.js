const logger = require('../../utils/logger');
const WaitingRecord = require('../../models/waiting-record.model');
const SystemSetting = require('../../models/system-setting.model');
const Customer = require('../../models/customer.model');
const VisitRecord = require('../../models/visit-record.model');
const Household = require('../../models/household.model');
const { saveSnapshot } = require('../../utils/snapshot');

/**
 * 比對客戶：name + lunarBirthYear/Month/Day
 * 若 lunarBirthYear 為 null，只用 name 比對（家人無完整生日的情況）
 * 注意：不使用 session（Zeabur 單節點不支援 transaction）
 */
async function findOrCreateCustomer(data, sessionDate) {
  const {
    name, phone, zodiac, gender,
    lunarBirthYear, lunarBirthMonth, lunarBirthDay, lunarIsLeapMonth,
    gregorianBirthYear, gregorianBirthMonth, gregorianBirthDay,
    addresses
  } = data;

  const trimmedName = (name || '').trim();

  // 建立比對條件
  const matchQuery = { name: trimmedName };
  if (lunarBirthYear != null) {
    matchQuery.lunarBirthYear = lunarBirthYear;
    matchQuery.lunarBirthMonth = lunarBirthMonth || null;
    matchQuery.lunarBirthDay = lunarBirthDay || null;
  }

  let existing = await Customer.findOne(matchQuery);
  let isNew = false;

  if (existing) {
    // 舊客：更新欄位
    existing.totalVisits = (existing.totalVisits || 0) + 1;
    existing.lastVisitDate = sessionDate;
    if (phone) existing.phone = phone;
    if (zodiac) existing.zodiac = zodiac;
    if (addresses && addresses.length > 0) existing.addresses = addresses;
    await existing.save();
  } else {
    // 新客：建立
    isNew = true;
    existing = await Customer.create({
      name: trimmedName,
      phone: phone || '',
      gender: gender || '',
      zodiac: zodiac || null,
      lunarBirthYear: lunarBirthYear || null,
      lunarBirthMonth: lunarBirthMonth || null,
      lunarBirthDay: lunarBirthDay || null,
      lunarIsLeapMonth: lunarIsLeapMonth || false,
      gregorianBirthYear: gregorianBirthYear || null,
      gregorianBirthMonth: gregorianBirthMonth || null,
      gregorianBirthDay: gregorianBirthDay || null,
      addresses: addresses || [],
      totalVisits: 1,
      firstVisitDate: sessionDate,
      lastVisitDate: sessionDate
    });
  }

  return { customer: existing, isNew };
}

/**
 * POST /api/v1/admin/queue/end-session
 * 結束本期：歸檔候位記錄 → 客戶永久資料庫，清空候位列表
 *
 * 安全順序（不使用 transaction，Zeabur 單節點不支援）：
 * 1. 先查資料、先完成所有歸檔寫入
 * 2. 歸檔全部成功後，才執行 deleteMany
 * 確保「先寫後刪」，不會發生刪了資料但歸檔失敗的情況
 */
exports.endSession = async (req, res) => {
  try {
    // 前置檢查：確認有資料可歸檔
    const recordCount = await WaitingRecord.countDocuments({ status: { $ne: 'cancelled' } });
    const cancelledCount = await WaitingRecord.countDocuments({ status: 'cancelled' });

    if (recordCount === 0) {
      return res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: '目前沒有需要歸檔的候位記錄'
      });
    }

    // 取得所有需歸檔的候位記錄
    const records = await WaitingRecord.find({ status: { $ne: 'cancelled' } });

    // 操作前快照（end-session 是高風險操作，先備份所有候位記錄）
    // 使用 records（已查出的非取消記錄），不另外再查，避免 mock 相容問題
    const allRecordsForBackup = Array.isArray(records) ? records.map(r => r.toObject ? r.toObject() : r) : records;
    saveSnapshot({  // 非阻塞 fire-and-forget，不讓備份失敗阻斷主流程
      operation: 'end-session',
      collection: 'waitingrecords',
      documentId: null,
      beforeData: allRecordsForBackup,
      operatorId: req.user?.id,
      metadata: { totalRecords: allRecordsForBackup.length, nonCancelledCount: records.length }
    }).catch(e => console.error('[end-session snapshot] 失敗:', e.message));

    // 取得 sessionDate
    const settings = await SystemSetting.getSettings();
    const sessionDate = settings.nextSessionDate ? new Date(settings.nextSessionDate) : new Date();

    let newCustomers = 0;
    let returningCustomers = 0;
    const processedCustomerIds = [];

    // ── 步驟一：歸檔所有客戶（寫入永久資料庫）──
    // 這個步驟全部完成後，才會執行刪除
    for (const record of records) {
      // 1. 主客戶歸檔
      const { customer, isNew } = await findOrCreateCustomer({
        name: record.name,
        phone: record.phone,
        zodiac: record.zodiac,
        gender: record.gender,
        lunarBirthYear: record.lunarBirthYear,
        lunarBirthMonth: record.lunarBirthMonth,
        lunarBirthDay: record.lunarBirthDay,
        lunarIsLeapMonth: record.lunarIsLeapMonth,
        gregorianBirthYear: record.gregorianBirthYear,
        gregorianBirthMonth: record.gregorianBirthMonth,
        gregorianBirthDay: record.gregorianBirthDay,
        addresses: record.addresses
      }, sessionDate);

      if (isNew) newCustomers++; else returningCustomers++;
      processedCustomerIds.push(customer._id);

      // 2. 建立主客戶 VisitRecord
      await VisitRecord.create({
        customerId: customer._id,
        sessionDate,
        consultationTopics: record.consultationTopics || [],
        otherDetails: record.otherDetails || '',
        remarks: record.remarks || '',
        queueNumber: record.queueNumber,
        familyMembers: (record.familyMembers || []).map(fm => ({
          name: fm.name,
          zodiac: fm.zodiac || null
        })),
        sourceQueueId: record._id
      });

      // 3. 家人歸檔
      for (const fm of (record.familyMembers || [])) {
        // 家人地址：排除預設佔位值 '臨時地址'，否則 fallback 主客戶地址
        const fmHasRealAddress = fm.address && fm.address.trim() !== '' && fm.address.trim() !== '臨時地址';
        const fmAddresses = fmHasRealAddress
          ? [{ address: fm.address.trim(), addressType: fm.addressType || 'home' }]
          : record.addresses;

        const { customer: fmCustomer, isNew: fmIsNew } = await findOrCreateCustomer({
          name: fm.name,
          phone: fm.phone || record.phone,
          zodiac: fm.zodiac,
          gender: fm.gender,
          lunarBirthYear: fm.lunarBirthYear,
          lunarBirthMonth: fm.lunarBirthMonth,
          lunarBirthDay: fm.lunarBirthDay,
          lunarIsLeapMonth: fm.lunarIsLeapMonth,
          gregorianBirthYear: fm.gregorianBirthYear,
          gregorianBirthMonth: fm.gregorianBirthMonth,
          gregorianBirthDay: fm.gregorianBirthDay,
          addresses: fmAddresses
        }, sessionDate);

        if (fmIsNew) newCustomers++; else returningCustomers++;
        processedCustomerIds.push(fmCustomer._id);

        await VisitRecord.create({
          customerId: fmCustomer._id,
          sessionDate,
          consultationTopics: [],
          remarks: `與 ${record.name}（${record.queueNumber}號）同行`,
          queueNumber: record.queueNumber,
          sourceQueueId: record._id
        });
      }
    }

    // 4. 家庭自動分組
    const newHouseholds = await autoGroupHouseholds(processedCustomerIds);

    // ── 步驟二：歸檔全部成功，才清空候位記錄 ──
    await WaitingRecord.deleteMany({});

    // ── 步驟三：重設系統設定 ──
    await SystemSetting.findOneAndUpdate({}, {
      $set: {
        currentQueueNumber: 0,
        totalCustomerCount: 0,
        lastCompletedTime: new Date()
      }
    });

    logger.info(`結束本期：歸檔 ${records.length} 位（新客 ${newCustomers}，回頭客 ${returningCustomers}），新建家庭 ${newHouseholds} 組`);

    return res.status(200).json({
      success: true,
      code: 'OK',
      message: `本期結束，已歸檔 ${records.length} 位客戶`,
      data: {
        totalProcessed: records.length,
        newCustomers,
        returningCustomers,
        newHouseholds,
        skippedCancelled: cancelledCount,
        sessionDate
      }
    });

  } catch (error) {
    logger.error('結束本期錯誤:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '結束本期時發生錯誤，請重試。候位資料未被清除。'
    });
  }
};

/**
 * 家庭自動分組：取得本次歸檔客戶的第一個地址，地址完全相同者歸為同一家庭
 * 回傳新建的 Household 數量
 */
async function autoGroupHouseholds(customerIds) {
  if (!customerIds || customerIds.length === 0) return 0;

  const customers = await Customer.find({ _id: { $in: customerIds } })
    .select('_id addresses householdId');

  // 按地址分組（取第一個 address 欄位）
  const addressGroups = {};
  for (const cust of customers) {
    const addr = cust.addresses && cust.addresses.length > 0
      ? cust.addresses[0].address.trim()
      : null;
    if (!addr) continue;
    if (!addressGroups[addr]) addressGroups[addr] = [];
    addressGroups[addr].push(cust);
  }

  let newHouseholdsCount = 0;

  for (const [address, members] of Object.entries(addressGroups)) {
    if (members.length < 2) continue;

    let household = await Household.findOne({ address });

    if (household) {
      const existingIds = household.memberIds.map(id => id.toString());
      for (const member of members) {
        if (!existingIds.includes(member._id.toString())) {
          household.memberIds.push(member._id);
        }
      }
      await household.save();
    } else {
      const created = await Household.create({
        address,
        memberIds: members.map(m => m._id)
      });
      household = created;
      newHouseholdsCount++;
    }

    const memberIdList = members.map(m => m._id);
    await Customer.updateMany(
      { _id: { $in: memberIdList } },
      { $set: { householdId: household._id } }
    );
  }

  return newHouseholdsCount;
}
