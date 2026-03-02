/**
 * household.admin.controller.js
 * 家庭戶 (Household) 管理相關 controller
 */
const logger = require('../../utils/logger');
const Customer = require('../../models/customer.model');
const Household = require('../../models/household.model');

/**
 * POST /admin/customers/rebuild-households
 * 根據所有客戶的現有地址，重新執行 Household 歸組：
 * 1. 清除所有現有 Household
 * 2. 清除所有客戶的 householdId
 * 3. 按地址重新歸組（同地址 >= 2 人 → 建立 Household）
 */
exports.rebuildHouseholds = async (req, res) => {
  try {
    // 步驟 1：清除所有 Household
    const deletedCount = await Household.deleteMany({});
    logger.info(`[rebuild-households] 刪除舊 Household ${deletedCount.deletedCount} 組`);

    // 步驟 2：清除所有客戶的 householdId
    await Customer.updateMany({}, { $set: { householdId: null } });

    // 步驟 3：取出所有有地址的客戶
    const customers = await Customer.find({
      'addresses.0': { $exists: true }
    }).select('_id addresses householdId');

    // 按第一個有效地址分組
    const addressGroups = {};
    for (const cust of customers) {
      const addr = cust.addresses[0]?.address?.trim();
      if (!addr || addr === '臨時地址') continue; // 跳過臨時地址
      if (!addressGroups[addr]) addressGroups[addr] = [];
      addressGroups[addr].push(cust);
    }

    let newHouseholds = 0;
    let assignedCustomers = 0;

    for (const [address, members] of Object.entries(addressGroups)) {
      if (members.length < 2) continue; // 只有 1 人不建 household

      const household = await Household.create({
        address,
        memberIds: members.map(m => m._id)
      });

      const memberIds = members.map(m => m._id);
      await Customer.updateMany(
        { _id: { $in: memberIds } },
        { $set: { householdId: household._id } }
      );

      newHouseholds++;
      assignedCustomers += members.length;
      logger.info(`[rebuild-households] 建立 Household: ${address}（${members.length} 人）`);
    }

    logger.info(`[rebuild-households] 完成：建立 ${newHouseholds} 組，共 ${assignedCustomers} 位客戶`);

    return res.status(200).json({
      success: true,
      code: 'OK',
      message: `Household 重建完成`,
      data: {
        deletedHouseholds: deletedCount.deletedCount,
        newHouseholds,
        assignedCustomers,
        skippedTempAddress: customers.length - Object.values(addressGroups).reduce((s, g) => s + g.length, 0)
      }
    });
  } catch (error) {
    logger.error('[rebuild-households] 錯誤:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '重建 Household 失敗',
      error: error.message
    });
  }
};
