const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, register, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Quá nhiều lần thử xác thực. Vui lòng thử lại sau.' } });
router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.get('/me', requireAuth, me);

module.exports = router;
