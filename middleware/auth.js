// middleware/auth.js
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
      next();
    } else {
      res.status(401).json({ message: 'Lütfen giriş yapın.' });
    }
  }
  
  function isAdmin(req, res, next) {
    if (req.session.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
    }
  }
  
  module.exports = { isAuthenticated, isAdmin };
  