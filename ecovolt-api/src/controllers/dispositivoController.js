const dispositivoService =
  require('../services/dispositivoService');

const {
  dispositivoSchema
} = require('../schemas/dispositivoSchema');

const AppError =
  require('../utils/AppError');

async function listar(req, res) {
  const dispositivos =
    await dispositivoService.listar();

  return res.json(dispositivos);
}

async function criar(req, res) {
  const resultado =
    dispositivoSchema.safeParse(
      req.body
    );

  if (!resultado.success) {
    throw new AppError(
      'Dados do dispositivo inválidos',
      400
    );
  }

  const dispositivo =
    await dispositivoService.criar(
      resultado.data
    );

  return res.status(201).json(
    dispositivo
  );
}

async function gerarNovoToken(req, res) {
  const idDispositivo =
    Number(req.params.id);

  if (
    !Number.isInteger(idDispositivo) ||
    idDispositivo <= 0
  ) {
    throw new AppError(
      'ID do dispositivo inválido',
      400
    );
  }

  const resposta =
    await dispositivoService.gerarNovoToken(
      idDispositivo
    );

  return res.json(resposta);
}

async function revogarToken(req, res) {
  const idDispositivo =
    Number(req.params.id);

  if (
    !Number.isInteger(idDispositivo) ||
    idDispositivo <= 0
  ) {
    throw new AppError(
      'ID do dispositivo inválido',
      400
    );
  }

  const resposta =
    await dispositivoService.revogarToken(
      idDispositivo
    );

  return res.json(resposta);
}

module.exports = {
  listar,
  criar,
  gerarNovoToken,
  revogarToken
};