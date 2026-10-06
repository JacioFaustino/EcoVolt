const service =
  require('../services/configuracaoAlertaService');

const AppError =
  require('../utils/AppError');

const {
  configuracaoAlertaSchema,
  atualizarConfiguracaoAlertaSchema,
  statusConfiguracaoAlertaSchema
} = require('../schemas/configuracaoAlertaSchema');

function obterId(req) {
  const id =
    Number(req.params.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new AppError(
      'ID da configuração inválido',
      400
    );
  }

  return id;
}

async function listar(req, res) {
  const configuracoes =
    await service.listar(req.query);

  return res.json(configuracoes);
}

async function criar(req, res) {
  const resultado =
    configuracaoAlertaSchema.safeParse(
      req.body
    );

  if (!resultado.success) {
    throw new AppError(
      'Dados da configuração inválidos',
      400
    );
  }

  const configuracao =
    await service.criar(
      resultado.data
    );

  return res.status(201).json(
    configuracao
  );
}

async function atualizar(req, res) {
  const id = obterId(req);

  const resultado =
    atualizarConfiguracaoAlertaSchema
      .safeParse(req.body);

  if (!resultado.success) {
    throw new AppError(
      'Dados da configuração inválidos',
      400
    );
  }

  const configuracao =
    await service.atualizar(
      id,
      resultado.data
    );

  return res.json(configuracao);
}

async function alterarStatus(req, res) {
  const id = obterId(req);

  const resultado =
    statusConfiguracaoAlertaSchema
      .safeParse(req.body);

  if (!resultado.success) {
    throw new AppError(
      'Status inválido',
      400
    );
  }

  const configuracao =
    await service.alterarStatus(
      id,
      resultado.data.status
    );

  return res.json(configuracao);
}

module.exports = {
  listar,
  criar,
  atualizar,
  alterarStatus
};