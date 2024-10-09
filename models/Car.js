// models/Car.js
const mongoose = require('mongoose');

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
  adDate: Date, // Tarih formatı "09 Ekim 2024" gibi olduğu için string olarak tutuyoruz
  location: String,
  lastSeenDate: { type: Date, default: Date.now },
  adUrl: String
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
