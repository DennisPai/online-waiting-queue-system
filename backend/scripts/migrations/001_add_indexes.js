/*
  目的：補齊常用查詢索引，改善效能
  索引：WaitingRecord.status, WaitingRecord.orderIndex, WaitingRecord.phone, WaitingRecord.queueNumber
  使用：node backend/scripts/migrations/001_add_indexes.js
*/
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost:27017/queue_system';
  console.log('Connecting to', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  await mongoose.connect(mongoUri);

  const WaitingRecord = require('../../src/models/waiting-record.model');

  console.log('Creating indexes...');
  await WaitingRecord.collection.createIndex({ status: 1 });
  await WaitingRecord.collection.createIndex({ orderIndex: 1 });
  await WaitingRecord.collection.createIndex({ phone: 1 });
  await WaitingRecord.collection.createIndex({ queueNumber: 1 }); // 普通索引（非唯一）

  console.log('Done.');
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});


