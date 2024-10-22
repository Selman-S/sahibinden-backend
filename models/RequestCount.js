// models/RequestCount.js
const mongoose = require('mongoose');

const requestCountSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  lastRequestDate: { type: Date, default: Date.now }
});

const RequestCount = mongoose.model('RequestCount', requestCountSchema);

module.exports = RequestCount;
