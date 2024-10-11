// routes/cars.js
const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const { isAuthenticated } = require('../middleware/auth');
const mongoose = require('mongoose');
const moment = require('moment'); // Moment.js ekleniyor
require('moment/locale/tr'); // Türkçe dil desteği
moment.locale('tr'); // Locale ayarlanıyor



// Araç verilerini kaydetme veya güncelleme
router.post('/cars', async (req, res) => {
  console.log("araba geldi");
  
  try {
    const cars = req.body; // Uzantıdan gelen araç listesi
    let savedCount = 0;
    let data=[]
  
    const allCar = await Car.find()
    const carCount = allCar.length;

    
    for (const carData of cars) {
      const { adId, adDate } = carData;
      
      // adDate'ı Date formatına dönüştür
      if (adDate) {
        const parsedAdDate = moment(adDate, "DD MMMM YYYY").toDate();
        carData.adDate = parsedAdDate;
      }
      await Car.findOneAndUpdate(
        { adId },
        { ...carData, lastSeenDate: Date.now() },
        { upsert: true, new: true }
      );
      data.push(carData)
      savedCount++;
    }

    const newallCar = await Car.find()
    const newcarCount = newallCar.length;
    console.log(newcarCount-carCount,"araç kaydedildi");
    

    res.status(200).json({data, message: `${savedCount} araç bilgisi kaydedildi` });
  } catch (error) {
    console.error('Veri kaydedilirken hata:', error);
    res.status(500).json({ message: 'Veri kaydedilirken bir hata oluştu', error });
  }
});

// Tüm araçları listeleme (sayfalama ve filtreleme ile)
router.get('/cars', isAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtre parametrelerini alalım
    const {
      brand,
      series,
      model,
      city,
      ilce,
      yearMin,
      yearMax,
      kmMin,
      kmMax,
      priceMin,
      priceMax,
      adDateStart,
      adDateEnd,
    } = req.query;
    console.log(adDateStart);
    console.log(adDateEnd);
    

    // Sorgu objesi oluşturalım
    let query = {};

    if (brand) query.brand = brand;
    if (series) query.series = series;
    if (model) query.model = model;
    if (city) query.city = city;
    if (ilce) query.ilce = ilce;

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
      cars,
    });
  } catch (error) {
    console.error('Veriler alınırken hata:', error);
    res.status(500).json({ message: 'Veriler alınırken bir hata oluştu', error });
  }
});

// Tüm illeri getirme
router.get('/cars/all-cities', isAuthenticated, async (req, res) => {
  try {
    const cities = await Car.distinct('city');
    res.status(200).json({ cities });
  } catch (error) {
    res.status(500).json({ message: 'İller alınırken bir hata oluştu', error });
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



// Belirli bir araç için benzer araçların medyan fiyatını ve sayısını getirme
router.get('/cars/:id/similar-price', isAuthenticated, async (req, res) => {
  try {
    const carId = req.params.id;

    // İstenen aracı bul
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Araç bulunamadı' });
    }

    // KM aralığını belirleyelim (örneğin, ±25,000 km)
    const kmRange = 25000;
    const kmMin = car.km - kmRange;
    const kmMax = car.km + kmRange;

    // Sorgu kriterlerini oluştur
    const query = {
      _id: { $ne: car._id }, // Aynı aracı dahil etme
      brand: car.brand,
      series: car.series,
      model: car.model,
      year: car.year,
      km: { $gte: kmMin, $lte: kmMax },
    };

    // Benzer araçları fiyatlarına göre sırala
    const similarCars = await Car.find(query).select('price').sort({ price: 1 });

    const prices = similarCars.map(c => c.price);
    const count = prices.length;

    let medianPrice = 0;

    if (count > 0) {
      if (count % 2 === 0) {
        // Çift sayıda ise ortadaki iki değerin ortalaması
        medianPrice = (prices[count / 2 - 1] + prices[count / 2]) / 2;
      } else {
        // Tek sayıda ise ortadaki değer
        medianPrice = prices[Math.floor(count / 2)];
      }
    }

    res.status(200).json({
      medianPrice,
      count,
    });
  } catch (error) {
    console.error('Medyan fiyat hesaplanırken hata:', error);
    res.status(500).json({ message: 'Medyan fiyat hesaplanırken bir hata oluştu', error });
  }
});



  // Toplam araç sayısını getirme
router.get('/cars/total', isAuthenticated, async (req, res) => {
  try {
    const totalCars = await Car.countDocuments();
    res.status(200).json({ totalCars });
  } catch (error) {
    res.status(500).json({ message: 'Toplam araç sayısı alınırken bir hata oluştu', error });
  }
});

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

// Belirli bir marka, seri ve modele ait şehirleri getirme
router.get('/cars/cities', isAuthenticated, async (req, res) => {
  try {
    const { brand, series, model } = req.query;

    if (!brand || !series || !model) {
      return res.status(400).json({ message: 'Marka, seri ve model bilgileri gerekli' });
    }

    const cities = await Car.find({ brand, series, model }).distinct('city');

    res.status(200).json({ cities });
  } catch (error) {
    res.status(500).json({ message: 'Lokasyonlar alınırken bir hata oluştu', error });
  }
});
  

// Belirli bir ile ait ilçeleri getirme
router.get('/cars/districts', isAuthenticated, async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ message: 'İl bilgisi gerekli' });
    }

    const districts = await Car.find({ city }).distinct('ilce');

    res.status(200).json({ districts });
  } catch (error) {
    res.status(500).json({ message: 'İlçeler alınırken bir hata oluştu', error });
  }
});
  

module.exports = router;
