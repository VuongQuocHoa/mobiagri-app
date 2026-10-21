const express = require('express');
const { getForecast, getAlerts } = require('../controllers/weatherController');

const router = express.Router();

router.get('/forecast', getForecast);
router.get('/alerts', getAlerts);

module.exports = router;
