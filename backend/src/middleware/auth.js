const jwt = require('jsonwebtoken');

const secret = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in production.');
  return process.env.JWT_SECRET || 'development-only-change-this-secret';
};

const getToken = (req) => {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

const requireAuth = (req, res, next) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: 'Cần đăng nhập để thực hiện thao tác này.' });
  try {
    req.user = jwt.verify(token, secret());
    return next();
  } catch {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Tài khoản chưa được cấp quyền cho thao tác này.' });
  return next();
};

module.exports = { requireAuth, requireRole };
