const {
  sustentabilidadeSchema
} = require('../schemas/sustentabilidadeSchema');

const sustentabilidadeService = require('../services/sustentabilidadeService');

const AppError = require('../utils/AppError');

async function obter(req, res) {
  const resultado =
    sustentabilidadeSchema.safeParse(
      req.query
    );

  if (!resultado.success) {
    throw new AppError(
      resultado.error.issues[0]?.message ||
        'Parâmetros de sustentabilidade inválidos',
      400
    );
  }

  const dados =
    await sustentabilidadeService.obterSustentabilidade(
      resultado.data
    );

  return res.json(dados);
}

module.exports = { obter };