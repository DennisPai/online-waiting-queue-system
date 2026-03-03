// 管理後台 controller 聚合導出
const queueAdmin = require('./queue.admin.controller');
const settingsAdmin = require('./settings.admin.controller');
const scheduleAdmin = require('./schedule.admin.controller');
const eventAdmin = require('./event.admin.controller');
const endSessionAdmin = require('./end-session.admin.controller');
const householdAdmin = require('./household.admin.controller');
const logAdmin = require('./log.admin.controller');

module.exports = {
  ...queueAdmin,
  ...settingsAdmin,
  ...scheduleAdmin,
  ...eventAdmin,
  ...endSessionAdmin,
  ...householdAdmin,
  ...logAdmin
};
