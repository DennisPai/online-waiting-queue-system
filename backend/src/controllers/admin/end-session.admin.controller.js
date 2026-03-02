const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const WaitingRecord = require('../../models/waiting-record.model');
const SystemSetting = require('../../models/system-setting.model');
const Customer = require('../../models/customer.model');
const VisitRecord = require('../../models/visit-record.model');
const Household = require('../../models/household.model');

/**
 * 比對客戶：name + lunarBirthYear/Month/Day
 * 若 lunarBirthYear 為 null，只用 name 比對（家人無完整生日的情況）
 */
async function findOrCreateCustomer(session, data, sessionDate) {
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

  let existing = await Customer.findOne(matchQuery).session(session);
  let isNew = false;

  if (existing) {
    // 舊客：更新欄位
    existing.totalVisits = (existing.totalVisits || 0) + 1;
    existing.lastVisitDate = sessionDate;
    if (phone) existing.phone = phone;
    if (zodiac) existing.zodiac = zodiac;
    if (addresses && addresses.length > 0) existing.addresses = addresses;
    await existing.save({ session });
  } else {
    // 新客：建立
    isNew = true;
    existing = await Customer.create([{
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
    }], { session });
    existing = existing[0];
  }

  return { customer: existing, isNew };
}

/**
 * POST /api/v1/admin/queue/end-session
 * 結束本期：歸檔候位記錄 → 客戶永久資料庫，清空候位列表
 */
exports.endSession = async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // 查詢所有非取消的候位記錄
    const records = await WaitingRecord.find({ status: { $ne: 'cancelled' } }).session(dbSession);
    const cancelledCount = await WaitingRecord.countDocuments({ status: 'cancelled' });

    if (records.length === 0) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: '目前沒有需要歸檔的候位記錄'
      });
    }

    // 取得 sessionDate（用系統設定的 nextSessionDate，否則今天）
    const settings = await SystemSetting.getSettings();
    const sessionDate = settings.nextSessionDate ? new Date(settings.nextSessionDate) : new Date();

    let newCustomers = 0;
    let returningCustomers = 0;
    const processedCustomerIds = [];

    // 遍歷每一筆候位記錄
    for (const record of records) {
      // 1. 主客戶歸檔
      const { customer, isNew } = await findOrCreateCustomer(dbSession, {
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
      await VisitRecord.create([{
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
      }], { session: dbSession });

      // 3. 家人歸檔
      for (const fm of (record.familyMembers || [])) {
        const fmAddresses = fm.address
          ? [{ address: fm.address, addressType: fm.addressType || 'home' }]
          : record.addresses; // 繼承主客戶地址

        const { customer: fmCustomer, isNew: fmIsNew } = await findOrCreateCustomer(dbSession, {
          name: fm.name,
          phone: fm.phone || record.phone, // 繼承主客戶電話
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

        await VisitRecord.create([{
          customerId: fmCustomer._id,
          sessionDate,
          consultationTopics: [],
          remarks: `與 ${record.name}（${record.queueNumber}號）同行`,
          queueNumber: record.queueNumber,
          sourceQueueId: record._id
        }], { session: dbSession });
      }
    }

    // 4. 家庭自動分組
    const newHouseholds = await autoGroupHouseholds(dbSession, processedCustomerIds);

    // 5. 清空所有候位記錄（含已取消）
    await WaitingRecord.deleteMany({}).session(dbSession);

    // 6. 重設系統設定
    await SystemSetting.findOneAndUpdate({}, {
      $set: {
        currentQueueNumber: 0,
        totalCustomerCount: 0,
        lastCompletedTime: null
      }
    }).session(dbSession);

    await dbSession.commitTransaction();
    dbSession.endSession();

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
    await dbSession.abortTransaction();
    dbSession.endSession();
    logger.error('結束本期錯誤:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '結束本期時發生錯誤，資料已回滾'
    });
  }
};

/**
 * 家庭自動分組：取得本次歸檔客戶的第一個地址，地址完全相同者歸為同一家庭
 * 回傳新建的 Household 數量
 */
async function autoGroupHouseholds(session, customerIds) {
  if (!customerIds || customerIds.length === 0) return 0;

  const customers = await Customer.find({ _id: { $in: customerIds } })
    .select('_id addresses householdId')
    .session(session);

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
    if (members.length < 2) continue; // 單人不建家庭

    // 查詢是否已有此地址的 Household
    let household = await Household.findOne({ address }).session(session);

    if (household) {
      // 加入新成員（避免重複）
      const existingIds = household.memberIds.map(id => id.toString());
      for (const member of members) {
        if (!existingIds.includes(member._id.toString())) {
          household.memberIds.push(member._id);
        }
      }
      await household.save({ session });
    } else {
      // 建立新 Household
      const created = await Household.create([{
        address,
        memberIds: members.map(m => m._id)
      }], { session });
      household = created[0];
      newHouseholdsCount++;
    }

    // 更新每個 Customer 的 householdId
    const memberIdList = members.map(m => m._id);
    await Customer.updateMany(
      { _id: { $in: memberIdList } },
      { $set: { householdId: household._id } },
      { session }
    );
  }

  return newHouseholdsCount;
}
