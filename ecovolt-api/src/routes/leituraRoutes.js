const express = require('express');
const rateLimit = require('express-rate-limit');

const asyncHandler = require('../utils/asyncHandler');

const {
  autenticarDispositivo
} = require('../middleware/deviceAuth');

const leituraController =
  require('../controllers/leituraController');

const router = express.Router();

const limiteLeituras = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro:
      'Muitas requisições em pouco tempo'
  }
});

router.post(
  '/',
  limiteLeituras,
  autenticarDispositivo,
  asyncHandler(leituraController.criar)
);

module.exports = router;