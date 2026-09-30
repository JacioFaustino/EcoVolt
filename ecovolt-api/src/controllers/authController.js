const authService =
  require('../services/authService');

const {
  loginSchema
} = require('../schemas/loginSchema');

const AppError =
  require('../utils/AppError');

async function login(req, res) {
  const resultado =
    loginSchema.safeParse(req.body);

  if (!resultado.success) {
    throw new AppError(
      'Dados de login inválidos',
      400
    );
  }

  const resposta =
    await authService.autenticar(
      resultado.data
    );

  return res.json(resposta);
}

module.exports = {
  login
};