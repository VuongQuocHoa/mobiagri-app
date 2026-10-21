const express = require('express');
const rateLimit = require('express-rate-limit');
const { getHealth, detectDisease } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Bạn đã dùng quá nhiều lượt chẩn đoán. Vui lòng thử lại sau.' } });

router.get('/health', getHealth);
router.post('/detect', requireAuth, aiLimiter, detectDisease);

module.exports = router;
