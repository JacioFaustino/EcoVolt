const leituraService = require('../services/leituraService');
const {
  leituraSchema
} = require('../schemas/leituraSchema');
const AppError = require('../utils/AppError');

async function criar(req, res) {
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body)
  ) {
    throw new AppError(
      'O corpo deve ser um objeto JSON',
      400
    );
  }

  const resultado =
    leituraSchema.safeParse(req.body);

  if (!resultado.success) {
    throw new AppError(
      'Dados da leitura inválidos',
      400
    );
  }

  const leitura =
    await leituraService.criarLeitura({
      dados: resultado.data,
      dispositivo: req.dispositivo
    });

  return res.status(201).json(leitura);
}

module.exports = {
  criar
};