const express = require('express');
const rateLimit = require('express-rate-limit');

const asyncHandler =
  require('../utils/asyncHandler');

const authController =
  require('../controllers/authController');

const router = express.Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro:
      'Muitas tentativas de login. Tente novamente mais tarde.'
  }
});

router.post(
  '/login',
  limiteLogin,
  asyncHandler(authController.login)
);

module.exports = router;