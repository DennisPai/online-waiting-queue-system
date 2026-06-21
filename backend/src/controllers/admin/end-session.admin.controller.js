const logger = require('../../utils/logger');
const WaitingRecord = require('../../models/waiting-record.model');
const SystemSetting = require('../../models/system-setting.model');
const getCustomer = () => require("../../models/customer.model");
const getVisitRecord = () => require("../../models/visit-record.model");
const getHousehold = () => require("../../models/household.model");
const { saveSnapshot } = require('../../utils/snapshot');

// P0-9：加權模糊比對門檻常數（方便日後調校）
const MATCH_HIGH = 50; // >= 此分 → 自動併入
const MATCH_MID = 20;  // >= 此分且 < MATCH_HIGH → 建新檔 + 標記 needsReview

/**
 * Levenshtein 編輯距離（用於 phone typo 容錯）
 * 標準 DP 實作，O(m*n)，phone 長度 ≤ 20 效能無疑慮
 */
function editDistance(a, b) {
  if (!a || !b) return Infinity;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * 對 candidate 客戶算加權分數
 * 正分項：生日/phone/地址/性別吻合；負分項：關鍵欄位明確相異
 */
function scoreCandidate(candidate, data) {
  const {
    phone, gender,
    lunarBirthYear, lunarBirthMonth, lunarBirthDay,
    gregorianBirthYear, gregorianBirthMonth, gregorianBirthDay,
    addresses
  } = data;

  let score = 0;

  // ── 農曆生日 ──
  const lunarFull = lunarBirthYear != null && lunarBirthMonth != null && lunarBirthDay != null;
  const candLunarFull = candidate.lunarBirthYear != null && candidate.lunarBirthMonth != null && candidate.lunarBirthDay != null;
  if (lunarFull && candLunarFull) {
    if (
      lunarBirthYear === candidate.lunarBirthYear &&
      lunarBirthMonth === candidate.lunarBirthMonth &&
      lunarBirthDay === candidate.lunarBirthDay
    ) {
      score += 50; // 農曆年月日全同
    } else if (lunarBirthYear === candidate.lunarBirthYear) {
      score += 20; // 年同月/日不同
    } else {
      score -= 30; // 兩邊皆完整但完全不同（反證）
    }
  } else if (lunarBirthYear != null && candidate.lunarBirthYear != null) {
    // 有年但月日缺失或部分不同
    if (lunarBirthYear === candidate.lunarBirthYear) {
      score += 20;
    }
  }

  // ── 國曆生日 ──
  const gregFull = gregorianBirthYear != null && gregorianBirthMonth != null && gregorianBirthDay != null;
  const candGregFull = candidate.gregorianBirthYear != null && candidate.gregorianBirthMonth != null && candidate.gregorianBirthDay != null;
  if (gregFull && candGregFull) {
    if (
      gregorianBirthYear === candidate.gregorianBirthYear &&
      gregorianBirthMonth === candidate.gregorianBirthMonth &&
      gregorianBirthDay === candidate.gregorianBirthDay
    ) {
      score += 40;
    }
    // 國曆生日完整且不同不扣分（農曆/國曆可能混填，不可靠作反證）
  }

  // ── 電話 ──
  const hasPhone = phone && phone.trim() !== '';
  const candHasPhone = candidate.phone && candidate.phone.trim() !== '';
  if (hasPhone && candHasPhone) {
    const dist = editDistance(phone.trim(), candidate.phone.trim());
    if (dist === 0) {
      score += 40; // 完全相同
    } else if (dist === 1) {
      score += 25; // 單字 typo
    } else if (dist === 2) {
      score += 10;
    } else if (dist > 3) {
      score -= 15; // 兩邊皆有 phone 但差異過大（反證）
    }
  }

  // ── 地址 ──
  const incomingAddr = addresses && addresses.length > 0 ? addresses[0]?.address?.trim() : null;
  const candAddr = candidate.addresses && candidate.addresses.length > 0 ? candidate.addresses[0]?.address?.trim() : null;
  if (incomingAddr && incomingAddr !== '臨時地址' && candAddr && candAddr !== '臨時地址') {
    if (incomingAddr === candAddr) {
      score += 20;
    }
  }

  // ── 性別 ──
  if (gender && gender !== '' && candidate.gender && candidate.gender !== '') {
    if (gender === candidate.gender) {
      score += 5;
    }
  }

  return score;
}

/**
 * 比對客戶：加權模糊比對 + 信心分級
 * - 高信心（≥ MATCH_HIGH）→ 自動併入既有客戶（totalVisits++、更新欄位）
 * - 中信心（≥ MATCH_MID < MATCH_HIGH）→ 建新檔 + needsReview + possibleDuplicateOf
 * - 低信心（< MATCH_MID 或無同名）→ 建新客
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

  // Step 1：name 為 gate，撈所有同名候選
  const candidates = await getCustomer().find({ name: trimmedName });

  if (candidates.length === 0) {
    // 無同名 → 確定新客
    const created = await getCustomer().create({
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
    return { customer: created, isNew: true };
  }

  // Step 2：對每個候選算加權分數，取最高分
  let bestCandidate = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, data);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  // Step 3：信心分級決策
  if (bestScore >= MATCH_HIGH) {
    // 高信心 → 自動併入
    const existing = bestCandidate;
    existing.totalVisits = (existing.totalVisits || 0) + 1;
    existing.lastVisitDate = sessionDate;
    if (phone) existing.phone = phone;
    if (zodiac) existing.zodiac = zodiac;
    if (addresses && addresses.length > 0) existing.addresses = addresses;
    if (gender) existing.gender = gender;
    if (gregorianBirthYear) existing.gregorianBirthYear = gregorianBirthYear;
    if (gregorianBirthMonth) existing.gregorianBirthMonth = gregorianBirthMonth;
    if (gregorianBirthDay) existing.gregorianBirthDay = gregorianBirthDay;
    if (lunarBirthYear) existing.lunarBirthYear = lunarBirthYear;
    if (lunarBirthMonth) existing.lunarBirthMonth = lunarBirthMonth;
    if (lunarBirthDay) existing.lunarBirthDay = lunarBirthDay;
    if (lunarIsLeapMonth !== undefined) existing.lunarIsLeapMonth = lunarIsLeapMonth;
    await existing.save();
    return { customer: existing, isNew: false };
  }

  if (bestScore >= MATCH_MID) {
    // 中信心 → 建新檔 + 標記待複核
    const created = await getCustomer().create({
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
      lastVisitDate: sessionDate,
      needsReview: true,
      possibleDuplicateOf: [{
        customerId: bestCandidate._id,
        score: bestScore,
        reason: '同名待複核'
      }]
    });
    return { customer: created, isNew: true };
  }

  // 低信心 → 建新客（needsReview: false）
  const created = await getCustomer().create({
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
  return { customer: created, isNew: true };
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
    // P0-7：原子搶鎖 — 防止雙擊/重送造成重複歸檔（totalVisits 翻倍 + 重複 VisitRecord）
    const lock = await SystemSetting.findOneAndUpdate(
      { sessionEnding: { $ne: true } },
      { $set: { sessionEnding: true } },
      { new: true }
    );
    if (!lock) {
      return res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: '結束本期進行中，請勿重複操作'
      });
    }

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
      // Change B / Phase 2.3：原本歸檔時手動只挑 { name, zodiac } 兩欄位，導致家人
      // 9 個欄位（含 address）在歸檔到 VisitRecord 時被丟掉。改成完整欄位 mapping，
      // 對齊 visit-record familyMemberSubSchema（跟 waiting-record familyMemberSchema 100% 同步）。
      await getVisitRecord().create({
        customerId: customer._id,
        sessionDate,
        consultationTopics: record.consultationTopics || [],
        otherDetails: record.otherDetails || '',
        remarks: record.remarks || '',
        queueNumber: record.queueNumber,
        familyMembers: (record.familyMembers || []).map(fm => ({
          name: fm.name,
          gender: fm.gender,
          gregorianBirthYear: fm.gregorianBirthYear,
          gregorianBirthMonth: fm.gregorianBirthMonth,
          gregorianBirthDay: fm.gregorianBirthDay,
          lunarBirthYear: fm.lunarBirthYear,
          lunarBirthMonth: fm.lunarBirthMonth,
          lunarBirthDay: fm.lunarBirthDay,
          lunarIsLeapMonth: fm.lunarIsLeapMonth,
          virtualAge: fm.virtualAge,
          zodiac: fm.zodiac,
          address: fm.address,
          addressType: fm.addressType
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

        await getVisitRecord().create({
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
        lastCompletedTime: new Date(),
        issuedCount: 0,
        orderIndexCounter: 0
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

    } finally {
      // P0-7：無論成功或拋錯都釋放鎖，讓下一次操作可進入
      await SystemSetting.findOneAndUpdate({}, { $set: { sessionEnding: false } });
    }

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

  const customers = await getCustomer().find({ _id: { $in: customerIds } })
    .select('_id addresses householdId');

  // 按地址分組（取第一個 address 欄位）
  // P0-8：用 optional chaining 避免 address 缺失拋錯，並排除佔位值 '臨時地址'
  const addressGroups = {};
  for (const cust of customers) {
    const addr = cust.addresses?.[0]?.address?.trim();
    if (!addr || addr === '臨時地址') continue;
    if (!addressGroups[addr]) addressGroups[addr] = [];
    addressGroups[addr].push(cust);
  }

  let newHouseholdsCount = 0;

  for (const [address, members] of Object.entries(addressGroups)) {
    if (members.length < 2) continue;

    let household = await getHousehold().findOne({ address });

    if (household) {
      const existingIds = household.memberIds.map(id => id.toString());
      for (const member of members) {
        if (!existingIds.includes(member._id.toString())) {
          household.memberIds.push(member._id);
        }
      }
      await household.save();
    } else {
      const created = await getHousehold().create({
        address,
        memberIds: members.map(m => m._id)
      });
      household = created;
      newHouseholdsCount++;
    }

    const memberIdList = members.map(m => m._id);
    await getCustomer().updateMany(
      { _id: { $in: memberIdList } },
      { $set: { householdId: household._id } }
    );
  }

  return newHouseholdsCount;
}
