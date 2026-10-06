const express = require('express');
const rateLimit = require('express-rate-limit');

const asyncHandler = require('../utils/asyncHandler');

const {
  autenticarDispositivo
} = require('../middleware/deviceAuth');

const {
  autenticarUsuario
} = require('../middleware/userAuth');

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

router.get(
  '/',
  autenticarUsuario,
  asyncHandler(leituraController.listar)
);

router.get(
  '/:id',
  autenticarUsuario,
  asyncHandler(leituraController.obterPorId)
);

module.exports = router;