// models/Car.js
const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const carSchema = new mongoose.Schema({
  adId: { type: Number, required: true, unique: true },
  imageUrl: String,
  brand: String,
  series: String,
  model: String,
  title: String,
  year: Number,
  km: Number,
  price: Number,
  adDate: Date,
  city: String,
  ilce: String,
  semt: String,
  mahalle: String,
  lastSeenDate: { type: Date, default: Date.now },
  adUrl: String,
  priceHistory: [priceHistorySchema] // Fiyat geçmişi
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
