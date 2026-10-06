const express = require('express');

const asyncHandler =
  require('../utils/asyncHandler');

const {
  autenticarUsuario,
  exigirPerfis
} = require('../middleware/userAuth');

const controller =
  require('../controllers/configuracaoAlertaController');

const router = express.Router();

router.get(
  '/',
  autenticarUsuario,
  asyncHandler(controller.listar)
);

router.post(
  '/',
  autenticarUsuario,
  exigirPerfis(
    'ADMIN',
    'ADMINISTRADOR'
  ),
  asyncHandler(controller.criar)
);

router.patch(
  '/:id',
  autenticarUsuario,
  exigirPerfis(
    'ADMIN',
    'ADMINISTRADOR'
  ),
  asyncHandler(controller.atualizar)
);

router.patch(
  '/:id/status',
  autenticarUsuario,
  exigirPerfis(
    'ADMIN',
    'ADMINISTRADOR'
  ),
  asyncHandler(controller.alterarStatus)
);

module.exports = router;