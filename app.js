// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');



const app = express();
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(express.json());
// CORS Ayarları
app.use(cors({
  origin: ['http://localhost:3000', 'https://sahibinden-frontend.vercel.app',"https://www.sahibinden.com"], // Frontend domaininizi buraya ekleyin
  methods: 'GET,POST,PUT,DELETE',
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
