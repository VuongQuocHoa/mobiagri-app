const express = require('express');
const { getFarmers, getSeasons, getPlots, getLogs, addFarmer, addSeason, addPlot, addLog } = require('../controllers/farmController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/plots', getPlots);
router.post('/plots', requireAuth, requireRole('admin', 'manager'), addPlot);
router.get('/farmers', getFarmers);
router.post('/farmers', requireAuth, requireRole('admin', 'manager'), addFarmer);
router.get('/seasons', getSeasons);
router.post('/seasons', requireAuth, requireRole('admin', 'manager'), addSeason);
router.get('/logs', getLogs);
router.post('/logs', requireAuth, requireRole('admin', 'manager'), addLog);

module.exports = router;
