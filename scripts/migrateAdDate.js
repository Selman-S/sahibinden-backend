// scripts/migrateAdDate.js
const mongoose = require('mongoose');
const Car = require('../models/Car');
const moment = require('moment');
require('moment/locale/tr');
moment.locale('tr');
require('dotenv')

mongoose.connect("mongodb://localhost:27017/sahibinden");

async function migrateAdDate() {
  try {
    const cars = await Car.find({ adDate: { $type: "string" } });

    for (const car of cars) {
        console.log(car);
        if (car.adDate ) {
            
            
          const parsedAdDate = moment(car.adDate, "DD MMMM YYYY").toDate();
          car.adDate = parsedAdDate;
          await car.save();
          console.log(`Updated adDate for car with adId: ${car.adId}`);
        }
    }

    console.log('Migration tamamlandı.');
    mongoose.disconnect();
  } catch (error) {
    console.error('Migration sırasında hata oluştu:', error);
    mongoose.disconnect();
  }
}

migrateAdDate();
