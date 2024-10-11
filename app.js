// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true
}));

// MongoDB bağlantısı
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch(err => console.log('MongoDB bağlantı hatası:', err));

// Session ayarları
app.use(session({
    secret: 'gizliAnahtar', // Güçlü bir secret anahtarı kullanın
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 gün
      httpOnly: true, // XSS saldırılarına karşı koruma
      secure: false, // HTTPS kullanmıyorsanız false olmalı
      sameSite: 'lax', // CSRF saldırılarına karşı koruma
    },
  }));
  

// Routes
const carRoutes = require('./routes/cars');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

app.use('/api', carRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
