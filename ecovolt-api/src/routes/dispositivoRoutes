const express = require('express');

const asyncHandler =
  require('../utils/asyncHandler');

const {
  autenticarUsuario,
  exigirPerfis
} = require('../middleware/userAuth');

const controller =
  require('../controllers/dispositivoController');

const router = express.Router();

router.get(
  '/',
  autenticarUsuario,
  exigirPerfis('ADMIN', 'ADMINISTRADOR', 'TECNICO'),
  asyncHandler(controller.listar)
);

router.post(
  '/',
  autenticarUsuario,
  exigirPerfis('ADMIN', 'ADMINISTRADOR'),
  asyncHandler(controller.criar)
);

router.post(
  '/:id/gerar-token',
  autenticarUsuario,
  exigirPerfis('ADMIN', 'ADMINISTRADOR'),
  asyncHandler(controller.gerarNovoToken)
);

router.post(
  '/:id/revogar-token',
  autenticarUsuario,
  exigirPerfis('ADMIN', 'ADMINISTRADOR'),
  asyncHandler(controller.revogarToken)
);

module.exports = router;