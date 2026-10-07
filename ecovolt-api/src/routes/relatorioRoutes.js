const express = require('express');

const asyncHandler =
  require('../utils/asyncHandler');

const {
  autenticarUsuario
} = require('../middleware/userAuth');

const relatorioController =
  require('../controllers/relatorioController');

const router = express.Router();

router.get(
  '/',
  autenticarUsuario,
  asyncHandler(
    relatorioController.listar
  )
);

router.get(
  '/:id',
  autenticarUsuario,
  asyncHandler(
    relatorioController.obterPorId
  )
);

router.post(
  '/',
  autenticarUsuario,
  asyncHandler(
    relatorioController.criar
  )
);

module.exports = router;