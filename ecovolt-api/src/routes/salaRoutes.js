const express = require('express');

const asyncHandler =
  require('../utils/asyncHandler');

const {
  autenticarUsuario
} = require('../middleware/userAuth');

const controller =
  require('../controllers/salaController');

const router = express.Router();

router.get(
  '/',
  autenticarUsuario,
  asyncHandler(controller.listar)
);

router.get(
  '/:id/consumo-hora',
  autenticarUsuario,
  asyncHandler(controller.consumoPorHora)
);

module.exports = router;