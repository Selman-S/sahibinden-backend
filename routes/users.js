// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Tüm kullanıcıları listeleme
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcılar alınırken bir hata oluştu', error });
  }
});

// Yeni kullanıcı oluşturma
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.', error });
  }
});

// Kullanıcı silme
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Admin kullanıcının kendini silmesini engelle
    if (req.session.userId === userId) {
      return res.status(400).json({ message: 'Kendinizi silemezsiniz.' });
    }

    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'Kullanıcı başarıyla silindi.' });
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcı silinirken bir hata oluştu.', error });
  }
});

module.exports = router;
