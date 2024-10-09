// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
// Daha önce eklediğimiz middleware
const { isAuthenticated } = require('../middleware/auth');
// Kullanıcı kaydı
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // İlk kullanıcı admin olsun
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';

    const user = new User({ username, password, role });
    await user.save();

    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
  } catch (error) {
    res.status(500).json({ message: 'Kayıt olurken bir hata oluştu.', error });
  }
});

// Kullanıcı girişi
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Kullanıcı kontrolü
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });

    // Şifre kontrolü
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });

    // Session'a kullanıcı bilgilerini kaydet
    req.session.userId = user._id;
    req.session.role = user.role;

    res.status(200).json({ message: 'Giriş başarılı.' });
  } catch (error) {
    res.status(500).json({ message: 'Giriş yaparken bir hata oluştu.', error });
  }
});

// Çıkış yap
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.status(200).json({ message: 'Çıkış yapıldı.' });
});

// Kullanıcı oturum bilgisini alma
router.get('/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
  
      // Kullanıcı verilerini alın
      const user = await User.findById(userId).select('-password'); // Şifre bilgisini döndürmeyelim
  
      if (!user) {
        return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
      }
  
      res.status(200).json({ username: user.username, role: user.role });
    } catch (error) {
      res.status(500).json({ message: 'Kullanıcı bilgileri alınırken bir hata oluştu.', error });
    }
  });

module.exports = router;
