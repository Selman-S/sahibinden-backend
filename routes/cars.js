// routes/cars.js
const express = require('express');
const router = express.Router();
const carsController = require('../controllers/carsController');
// const { isAuthenticated } = require('../middleware/auth'); // Eğer auth middleware kullanıyorsanız

// Araç değerlendirme rotası
router.post('/cars/evaluate', carsController.evaluateCar);

router.post('/cars/chat', carsController.chatWithExpert);

// Araç verilerini kaydetme veya güncelleme
router.post('/cars', carsController.saveOrUpdateCars);

// Belirli bir aracın fiyat geçmişini getirme
router.get('/cars/:adId/price-history', carsController.getPriceHistory);

// Tüm araçları listeleme (sayfalama ve filtreleme ile)
// router.get('/cars', isAuthenticated, carsController.getAllCars);
router.get('/cars', carsController.getAllCars);

// Tüm illeri getirme
// router.get('/cars/all-cities', isAuthenticated, carsController.getAllCities);
router.get('/cars/all-cities', carsController.getAllCities);

// Marka listesini getirme
// router.get('/cars/brands', isAuthenticated, carsController.getAllBrands);
router.get('/cars/brands', carsController.getAllBrands);

// Belirli bir markaya ait serileri getirme
// router.get('/cars/series/:brand', isAuthenticated, carsController.getSeriesByBrand);
router.get('/cars/series/:brand', carsController.getSeriesByBrand);

// Belirli bir marka ve seriye ait modelleri getirme
// router.get('/cars/models/:brand/:series', isAuthenticated, carsController.getModelsByBrandAndSeries);
router.get('/cars/models/:brand/:series', carsController.getModelsByBrandAndSeries);

// Belirli bir araç için benzer araçların medyan fiyatını ve sayısını getirme
// router.get('/cars/:id/similar-price', isAuthenticated, carsController.getSimilarCarPrice);
router.get('/cars/:id/similar-price', carsController.getSimilarCarPrice);

// Toplam araç sayısını getirme
// router.get('/cars/total', isAuthenticated, carsController.getTotalCars);
router.get('/cars/total', carsController.getTotalCars);

// Belirli bir marka, seri ve modele ait şehirleri getirme
// router.get('/cars/cities', isAuthenticated, carsController.getCitiesByCar);
router.get('/cars/cities', carsController.getCitiesByCar);

// Belirli bir ile ait ilçeleri getirme
// router.get('/cars/districts', isAuthenticated, carsController.getDistrictsByCity);
router.get('/cars/districts', carsController.getDistrictsByCity);

// Avantajlı araçları getirme
// router.get('/cars/advantageous', isAuthenticated, carsController.getAdvantageousCars);
router.get('/cars/advantageous', carsController.getAdvantageousCars);

// Tavsiye edilen araçları getirme
// router.post('/cars/recommend', isAuthenticated, carsController.getRecommendedCars);
router.post('/cars/recommend', carsController.getRecommendedCars);

module.exports = router;
