const express = require('express');

const asyncHandler =
  require('../utils/asyncHandler');

const {
  autenticarUsuario,
  exigirPerfis
} = require('../middleware/userAuth');

const controller =
  require('../controllers/alertaController');

const router = express.Router();

router.get(
  '/',
  autenticarUsuario,
  asyncHandler(controller.listar)
);

router.get(
  '/:id',
  autenticarUsuario,
  asyncHandler(controller.buscarPorId)
);

router.patch(
  '/:id/encerrar',
  autenticarUsuario,
  exigirPerfis(
    'ADMIN',
    'ADMINISTRADOR',
    'TECNICO'
  ),
  asyncHandler(controller.encerrar)
);

module.exports = router;