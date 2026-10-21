const express = require('express');
require('express-async-errors');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const prisma = require('./config/db');

const aiRoutes = require('./routes/aiRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const farmRoutes = require('./routes/farmRoutes');
const forumRoutes = require('./routes/forumRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = Number(process.env.PORT || 4000);
app.disable('etag');

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin không được phép.'));
} }));
app.use(helmet());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', database: 'ok', app: process.env.APP_NAME || 'MobiAgri', timestamp: new Date().toISOString() });
});

app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/farm', farmRoutes);
app.use('/api/forum', forumRoutes);

const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
    if (error) return next();
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint không tồn tại.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  if (error.message === 'Origin không được phép.') return res.status(403).json({ message: error.message });
  return res.status(500).json({ message: 'Có lỗi máy chủ. Vui lòng thử lại sau.' });
});

app.listen(PORT, () => {
  console.log(`MobiAgri backend running at http://localhost:${PORT}`);
});
