// routes/cars.js
const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const { isAuthenticated } = require('../middleware/auth');

// Araç verilerini kaydetme veya güncelleme
router.post('/cars',  isAuthenticated, async (req, res) => {
  try {
    const cars = req.body; // Uzantıdan gelen araç listesi
    let savedCount = 0;

    for (const carData of cars) {
      const { adId } = carData;
      await Car.findOneAndUpdate(
        { adId },
        { ...carData, lastSeenDate: Date.now() },
        { upsert: true, new: true }
      );
      savedCount++;
    }

    res.status(200).json({ message: `${savedCount} araç bilgisi kaydedildi` });
  } catch (error) {
    console.error('Veri kaydedilirken hata:', error);
    res.status(500).json({ message: 'Veri kaydedilirken bir hata oluştu', error });
  }
});

// Tüm araçları listeleme (sayfalama ve filtreleme ile)
router.get('/cars', isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; // Varsayılan olarak 1. sayfa
      const limit = parseInt(req.query.limit) || 10; // Varsayılan olarak sayfa başına 10 kayıt
      const skip = (page - 1) * limit;
  
      // Filtre parametrelerini alalım
      const { brand, series, model, location, yearMin, yearMax, kmMin, kmMax, priceMin, priceMax, adDateStart, adDateEnd } = req.query;
  
      // Sorgu objesi oluşturalım
      let query = {};
  
      if (brand) query.brand = brand;
      if (series) query.series = series;
      if (model) query.model = model;
      if (location) query.location = location;
      if (yearMin || yearMax) {
        query.year = {};
        if (yearMin) query.year.$gte = parseInt(yearMin);
        if (yearMax) query.year.$lte = parseInt(yearMax);
      }
      if (kmMin || kmMax) {
        query.km = {};
        if (kmMin) query.km.$gte = parseInt(kmMin);
        if (kmMax) query.km.$lte = parseInt(kmMax);
      }
      if (priceMin || priceMax) {
        query.price = {};
        if (priceMin) query.price.$gte = parseInt(priceMin);
        if (priceMax) query.price.$lte = parseInt(priceMax);
      }
      if (adDateStart || adDateEnd) {
        query.adDate = {};
        if (adDateStart) query.adDate.$gte = adDateStart;
        if (adDateEnd) query.adDate.$lte = adDateEnd;
      }
  
      // Toplam kayıt sayısı (filtrelenmiş)
      const total = await Car.countDocuments(query);
  
      // Araçları getir (filtreli ve sayfalı)
      const cars = await Car.find(query)
        .sort({ lastSeenDate: -1 })
        .skip(skip)
        .limit(limit);
  
      res.status(200).json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        cars
      });
    } catch (error) {
      console.error('Veriler alınırken hata:', error);
      res.status(500).json({ message: 'Veriler alınırken bir hata oluştu', error });
    }
  });

// routes/cars.js

// Marka listesini getirme
router.get('/cars/filters', isAuthenticated, async (req, res) => {
    try {
      const brands = await Car.distinct('brand');
      res.status(200).json({ brands });
    } catch (error) {
      res.status(500).json({ message: 'Filtre değerleri alınırken bir hata oluştu', error });
    }
  });
  

  // routes/cars.js

// Belirli bir markaya ait serileri getirme
router.get('/cars/series', isAuthenticated, async (req, res) => {
    try {
      const { brand } = req.query;
  
      if (!brand) {
        return res.status(400).json({ message: 'Marka bilgisi gerekli' });
      }
  
      const series = await Car.find({ brand }).distinct('series');
  
      res.status(200).json({ series });
    } catch (error) {
      res.status(500).json({ message: 'Seriler alınırken bir hata oluştu', error });
    }
  });
  
  // routes/cars.js

// Belirli bir seriye ait modelleri getirme
router.get('/cars/models', isAuthenticated, async (req, res) => {
    try {
      const { brand, series } = req.query;
  
      if (!brand || !series) {
        return res.status(400).json({ message: 'Marka ve seri bilgileri gerekli' });
      }
  
      const models = await Car.find({ brand, series }).distinct('model');
  
      res.status(200).json({ models });
    } catch (error) {
      res.status(500).json({ message: 'Modeller alınırken bir hata oluştu', error });
    }
  });

  // routes/cars.js

// Belirli bir marka, seri ve modele ait lokasyonları getirme
router.get('/cars/locations', isAuthenticated, async (req, res) => {
    try {
      const { brand, series, model } = req.query;
  
      if (!brand || !series || !model) {
        return res.status(400).json({ message: 'Marka, seri ve model bilgileri gerekli' });
      }
  
      const locations = await Car.find({ brand, series, model }).distinct('location');
  
      res.status(200).json({ locations });
    } catch (error) {
      res.status(500).json({ message: 'Lokasyonlar alınırken bir hata oluştu', error });
    }
  });
  
  
  

module.exports = router;
