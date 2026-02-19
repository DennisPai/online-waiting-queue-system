// 管理後台 controller 聚合導出
const queueAdmin = require('./queue.admin.controller');
const settingsAdmin = require('./settings.admin.controller');
const scheduleAdmin = require('./schedule.admin.controller');
const eventAdmin = require('./event.admin.controller');

module.exports = {
  ...queueAdmin,
  ...settingsAdmin,
  ...scheduleAdmin,
  ...eventAdmin
};
