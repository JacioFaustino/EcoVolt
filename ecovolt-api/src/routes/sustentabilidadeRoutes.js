const express = require('express');

const asyncHandler = require('../utils/asyncHandler');

const {
  autenticarUsuario
} = require('../middleware/userAuth');

const sustentabilidadeController = require('../controllers/sustentabilidadeController');

const router = express.Router();

router.get(
  '/',
  autenticarUsuario,
  asyncHandler(
    sustentabilidadeController.obter
  )
);

module.exports = router;