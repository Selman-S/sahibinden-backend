// controllers/carsController.js
const Car = require('../models/Car');
const moment = require('moment');
require('moment/locale/tr');
moment.locale('tr');
const fetch = require('node-fetch');
require('dotenv').config();
const RequestCount = require('../models/RequestCount');


MAX_EVALUATIONS_PER_WEEK = 10
// Araç değerlendirme
exports.evaluateCar = async (req, res) => {
  try {
    const userApiKey = req.body.openaiApiKey;
    const userIp = req.body.ip || req.connection.remoteAddress;

    console.log("userIp", userIp);
    console.log("userApiKey", userApiKey);

    // Eğer kullanıcı kendi API anahtarını kullanmıyorsa, istek limitini kontrol et
    if (!userApiKey) {
      // IP adresi için kayıt bul veya oluştur
      let requestCount = await RequestCount.findOne({ ip: userIp });

      if (!requestCount) {
        // Yeni kayıt oluştur
        requestCount = new RequestCount({ ip: userIp, count: 1, lastRequestDate: new Date() });
      } else {
        const now = new Date();
        const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

        // Eğer son istek tarihi bir haftadan eskiyse, sayacı sıfırla
        if (requestCount.lastRequestDate < oneWeekAgo) {
          requestCount.count = 1;
          requestCount.lastRequestDate = now;
        } else {
          // Haftalık limit kontrolü
          if (requestCount.count >= MAX_EVALUATIONS_PER_WEEK) {
            return res.status(429).json({ message: 'Haftalık istek limitine ulaştınız. Lütfen bir hafta sonra tekrar deneyin.' });
          }
          requestCount.count += 1;
          requestCount.lastRequestDate = now;
        }
      }

      // Kayıtları güncelle
      await requestCount.save();
    }

    const carData = req.body;

    // 'carData' nesnesini JSON formatında ve okunabilir bir şekilde stringe çeviriyoruz
    const carDataString = JSON.stringify(carData, null, 2);

    // Benzer araçların ortalama fiyatını ve sayısını hesaplama
    const { Marka: brand, Seri: series, Model: model, Yıl: year, KM: kmString, fiyat: priceString } = carData;

    // 'KM' ve 'Fiyat' alanlarını sayıya dönüştürme
    const km = parseInt(kmString.replace(/\D/g, '')) || 0;
    const price = parseInt(priceString.replace(/\D/g, '')) || 0;

    // KM aralığını belirleyelim (örneğin, ±25,000 km)
    const kmRange = 25000;
    const kmMin = km - kmRange;
    const kmMax = km + kmRange;

    // Sorgu kriterlerini oluştur
    const query = {
      brand,
      series,
      model,
      year: parseInt(year),
      km: { $gte: kmMin, $lte: kmMax },
    };

    // Benzer araçları bul
    const similarCars = await Car.find(query).select('price');

    const prices = similarCars.map(c => c.price);
    const count = prices.length;

    let averagePrice = 0;

    if (count > 0) {
      averagePrice = prices.reduce((sum, p) => sum + p, 0) / count;
    }

    // Yüzde farkını hesaplayalım
    let priceDifferencePercentage = 0;
    let priceComparisonText = '';

    if (averagePrice > 0) {
      priceDifferencePercentage = ((price - averagePrice) / averagePrice) * 100;

      if (priceDifferencePercentage < 0) {
        priceComparisonText = `%${Math.abs(priceDifferencePercentage.toFixed(2))} daha ucuz`;
      } else if (priceDifferencePercentage > 0) {
        priceComparisonText = `%${priceDifferencePercentage.toFixed(2)} daha pahalı`;
      } else {
        priceComparisonText = `ortalama fiyat ile aynı`;
      }
    } else {
      priceComparisonText = 'Benzer araç bulunamadı, fiyat karşılaştırması yapılamıyor.';
    }

    // Bilgileri prompt'a ekleyelim
    const additionalInfo = `Bu araç ile benzer ${count} araç bulunmaktadır. Benzer araçların ortalama fiyatı ${averagePrice.toFixed(2)} TL'dir. Bu araç ${priceComparisonText}.`;

    // Yeni prompt
    const prompt = `${additionalInfo}

Sen deneyimli bir araba eksperisin. Aşağıdaki araç bilgilerini inceleyip kısaca analiz et. Aracın artı ve eksilerini, Türkiye piyasasındaki tutulurluğunu, yakıt türünü ve varsa kronik arızalarını değerlendir. Bu modelin ikinci el piyasasında satışı kolay mı, alıcıyı zorlar mı? Tramer kaydı, boyalı veya değişen parça olup olmadığını göz önünde bulundurarak, bu aracın satın alınabilir olup olmadığı konusunda net bir değerlendirme yap. Cevap, 10 cümleyi geçmesin.

Araç Bilgileri:
${carDataString}
`;

    // Kullanılacak API anahtarını belirleyin
    const openaiApiKey = userApiKey || process.env.OPENAI_API_KEY;
    console.log("openaiApiKey", openaiApiKey);

    // OpenAI API çağrısı
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Sen deneyimli bir araba eksperisin.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API hatası: ${errorData.error.message}`);
    }

    const responseData = await openaiResponse.json();

    const evaluation = responseData.choices[0].message.content;

    // Değerlendirme sonucunu ve ek bilgileri döndürün
    res.status(200).json({
      evaluation,
      similarCount: count,
      averagePrice: averagePrice.toFixed(2),
      // Kullanıcı kendi API anahtarını kullandıysa, remainingEvaluations'ı göndermeyelim
      ...(userApiKey ? {} : { remainingEvaluations: MAX_EVALUATIONS_PER_WEEK - requestCount.count }),
    });
  } catch (error) {
    console.error('Araç değerlendirmesi sırasında hata:', error.message);

    // Hata mesajını kontrol ederek spesifik bir yanıt verebilirsiniz
    if (error.message.includes('OpenAI API hatası')) {
      return res.status(500).json({ message: 'OpenAI API hatası: ' + error.message });
    }

    res.status(500).json({ message: 'Araç değerlendirmesi yapılamadı.' });
  }
};



// Araç verilerini kaydetme veya güncelleme
exports.saveOrUpdateCars = async (req, res) => {
  try {
    const cars = req.body; // Gönderilen araç listesi
    let savedCount = 0;
    let newRecordsCount = 0;
    let updatedRecordsCount = 0;
    let data = [];

    for (const carData of cars) {
      const { adId, price, adDate, brand, series, model } = carData;

      // adDate'i Date formatına dönüştür
      if (adDate) {
        const parsedAdDate = moment(adDate, "DD MMMM YYYY").toDate();
        carData.adDate = parsedAdDate;
      }

      // Mevcut aracı adId ile bul
      let existingCar = await Car.findOne({ adId });

      if (existingCar) {
        // Marka, seri ve modelin aynı olup olmadığını kontrol et
        if (
          existingCar.brand === brand &&
          existingCar.series === series &&
          existingCar.model === model
        ) {
          // Aynı araç, güncelleme yap
          existingCar.lastSeenDate = Date.now();

          // Fiyat değişmişse, priceHistory'ye ekle ve price'ı güncelle
          if (existingCar.price !== price) {
            existingCar.priceHistory.push({
              price: price,
              updatedAt: Date.now(),
            });
            existingCar.price = price;
          }

          // Aracı kaydet
          await existingCar.save();

          // Güncellenmiş aracın güncel verilerini ve fiyat geçmişini al
          data.push({ carData: existingCar, status: 'updated' });
          updatedRecordsCount++;
        } else {
          // Marka, seri veya model farklı ise, mevcut aracı sil ve yeni aracı ekle

          // Mevcut aracı sil
          await Car.deleteOne({ adId });

          // Yeni araç ekle
          carData.lastSeenDate = Date.now();
          carData.priceHistory = [
            {
              price: price,
              updatedAt: Date.now(),
            },
          ];
          const newCar = await Car.create(carData);

          // Statüyü 'replaced' olarak ayarla ve priceHistory'yi ekle
          data.push({ carData: newCar, status: 'replaced' });
          newRecordsCount++;
        }
      } else {
        // Yeni araç ekle
        carData.lastSeenDate = Date.now();
        carData.priceHistory = [
          {
            price: price,
            updatedAt: Date.now(),
          },
        ];
        const newCar = await Car.create(carData);

        // Statüyü 'new' olarak ayarla ve priceHistory'yi ekle
        data.push({ carData: newCar, status: 'new' });
        newRecordsCount++;
      }

      savedCount++;
    }

    res.status(200).json({
      data,
      message: `${savedCount} araç bilgisi kaydedildi. Yeni kayıtlar: ${newRecordsCount}, Güncellenen kayıtlar: ${updatedRecordsCount}`,
    });
  } catch (error) {
    console.error('Veri kaydedilirken hata:', error);
    res.status(500).json({ message: 'Veri kaydedilirken bir hata oluştu', error });
  }
};

  
  

// Belirli bir aracın fiyat geçmişini getirme
exports.getPriceHistory = async (req, res) => {
  try {
    const { adId } = req.params;

    // Aracı bul
    const car = await Car.findOne({ adId }).select('priceHistory');

    if (!car) {
      return res.status(404).json({ message: 'Araç bulunamadı' });
    }

    res.status(200).json({ priceHistory: car.priceHistory });
  } catch (error) {
    console.error('Fiyat geçmişi alınırken hata:', error);
    res.status(500).json({ message: 'Fiyat geçmişi alınırken bir hata oluştu', error });
  }
};

// Tüm araçları listeleme (sayfalama ve filtreleme ile)
exports.getAllCars = async (req, res) => {
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
};

// Tüm illeri getirme
exports.getAllCities = async (req, res) => {
  try {
    const cities = await Car.distinct('city');
    res.status(200).json({ cities });
  } catch (error) {
    res.status(500).json({ message: 'İller alınırken bir hata oluştu', error });
  }
};

// Marka listesini getirme
exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Car.distinct('brand');
    res.status(200).json({ brands });
  } catch (error) {
    res.status(500).json({ message: 'Markalar alınırken bir hata oluştu', error });
  }
};

// Belirli bir markaya ait serileri getirme
exports.getSeriesByBrand = async (req, res) => {
  try {
    const { brand } = req.params;

    if (!brand) {
      return res.status(400).json({ message: 'Marka bilgisi gerekli' });
    }

    const series = await Car.distinct('series', { brand });

    res.status(200).json({ series });
  } catch (error) {
    res.status(500).json({ message: 'Seriler alınırken bir hata oluştu', error });
  }
};

// Belirli bir marka ve seriye ait modelleri getirme
exports.getModelsByBrandAndSeries = async (req, res) => {
  try {
    const { brand, series } = req.params;

    if (!brand || !series) {
      return res.status(400).json({ message: 'Marka ve seri bilgileri gerekli' });
    }

    const models = await Car.distinct('model', { brand, series });

    res.status(200).json({ models });
  } catch (error) {
    res.status(500).json({ message: 'Modeller alınırken bir hata oluştu', error });
  }
};

// Belirli bir araç için benzer araçların medyan fiyatını ve sayısını getirme
exports.getSimilarCarPrice = async (req, res) => {
  try {
    const carId = req.params.id;

    // İstenen aracı bul
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Araç bulunamadı' });
    }

    // KM aralığını belirleyelim (örneğin, ±25,000 km)
    const kmRange = 35000;
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
};

// Toplam araç sayısını getirme
exports.getTotalCars = async (req, res) => {
  try {
    const totalCars = await Car.countDocuments();
    res.status(200).json({ totalCars });
  } catch (error) {
    res.status(500).json({ message: 'Toplam araç sayısı alınırken bir hata oluştu', error });
  }
};

// Belirli bir marka, seri ve modele ait şehirleri getirme
exports.getCitiesByCar = async (req, res) => {
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
};

// Belirli bir ile ait ilçeleri getirme
exports.getDistrictsByCity = async (req, res) => {
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
};

// Avantajlı araçları getirme
exports.getAdvantageousCars = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    // Tüm araçları fiyatlarına göre sıralayalım
    const cars = await Car.find().sort({ price: 1 }).skip(parseInt(offset)).limit(parseInt(limit));

    // Her araç için ortalama fiyatı hesaplayalım
    const carsWithAveragePrice = await Promise.all(cars.map(async (car) => {
      const averagePrice = await Car.aggregate([
        { $match: { brand: car.brand, series: car.series, model: car.model } },
        { $group: { _id: null, avgPrice: { $avg: '$price' } } }
      ]);

      return {
        ...car.toObject(),
        averagePrice: averagePrice[0]?.avgPrice || car.price,
        priceDifference: ((car.price - averagePrice[0]?.avgPrice) / averagePrice[0]?.avgPrice) * 100
      };
    }));

    // Fiyat farkına göre sıralayalım
    const advantageousCars = carsWithAveragePrice.sort((a, b) => a.priceDifference - b.priceDifference);

    res.status(200).json(advantageousCars);
  } catch (error) {
    res.status(500).json({ message: 'Avantajlı araçlar alınırken bir hata oluştu', error });
  }
};

// Tavsiye edilen araçları getirme
exports.getRecommendedCars = async (req, res) => {
  try {
    const { budget, brand, model, yearMin, yearMax, kmMax, page = 1, limit = 10 } = req.body;

    let query = {};
    if (brand) query.brand = brand;
    if (model) query.model = model;
    if (yearMin || yearMax) {
      query.year = {};
      if (yearMin) query.year.$gte = parseInt(yearMin);
      if (yearMax) query.year.$lte = parseInt(yearMax);
    }
    if (kmMax) query.km = { $lte: parseInt(kmMax) };
    if (budget) query.price = { $lte: parseInt(budget) };

    const skip = (page - 1) * limit;

    // Tavsiye edilen araçları al
    const recommendedCars = await Car.find(query)
      .sort({ price: 1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // Her araç için benzer araç sayısını ve ortalama fiyatını hesapla
    const recommendedCarsWithStats = await Promise.all(recommendedCars.map(async (car) => {
      // Benzer araç kriterleri
      const similarCarsQuery = {
        _id: { $ne: car._id },
        brand: car.brand,
        series: car.series,
        model: car.model,
        year: car.year,
        km: { $gte: car.km - 25000, $lte: car.km + 25000 }, // ±25,000 KM aralığı
      };

      // Benzer araçları bul
      const similarCars = await Car.find(similarCarsQuery).select('price');

      const count = similarCars.length;
      const averagePrice = similarCars.reduce((acc, curr) => acc + curr.price, 0) / (count || 1);

      return {
        ...car.toObject(),
        similarCount: count,
        averagePrice: averagePrice.toFixed(2), // 2 ondalık basamak
      };
    }));

    // Toplam tavsiye edilen araç sayısını al
    const totalRecommended = await Car.countDocuments(query);

    res.status(200).json({
      cars: recommendedCarsWithStats,
      total: totalRecommended,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalRecommended / limit),
    });
  } catch (error) {
    console.error('Tavsiye edilen araçlar alınırken hata:', error);
    res.status(500).json({ message: 'Tavsiye edilen araçlar alınırken bir hata oluştu', error });
  }
};
