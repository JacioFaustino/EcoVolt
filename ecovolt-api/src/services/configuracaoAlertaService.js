const db = require('../models');
const AppError =
  require('../utils/AppError');

async function listar(filtros = {}) {
  const where = {};

  if (filtros.id_sala) {
    const idSala =
      Number(filtros.id_sala);

    if (
      !Number.isInteger(idSala) ||
      idSala <= 0
    ) {
      throw new AppError(
        'id_sala inválido',
        400
      );
    }

    where.id_sala = idSala;
  }

  if (filtros.status) {
    where.status = filtros.status;
  }

  if (filtros.tipo_parametro) {
    where.tipo_parametro =
      filtros.tipo_parametro;
  }

  return db.ConfiguracaoAlerta.findAll({
    where,
    include: [
      db.Sala
    ],
    order: [
      ['id_config', 'ASC']
    ]
  });
}

async function criar(dados) {
  try {
    return await db.ConfiguracaoAlerta.create(
      dados
    );
  } catch (erro) {
    if (
      erro.name ===
        'SequelizeForeignKeyConstraintError' ||
      erro.name ===
        'SequelizeValidationError'
    ) {
      throw new AppError(
        'Configuração inválida',
        400
      );
    }

    throw erro;
  }
}

async function atualizar(
  idConfig,
  dados
) {
  const configuracao =
    await db.ConfiguracaoAlerta.findByPk(
      idConfig
    );

  if (!configuracao) {
    throw new AppError(
      'Configuração não encontrada',
      404
    );
  }

  await configuracao.update(dados);

  return configuracao;
}

async function alterarStatus(
  idConfig,
  status
) {
  const configuracao =
    await db.ConfiguracaoAlerta.findByPk(
      idConfig
    );

  if (!configuracao) {
    throw new AppError(
      'Configuração não encontrada',
      404
    );
  }

  await configuracao.update({
    status
  });

  return configuracao;
}

module.exports = {
  listar,
  criar,
  atualizar,
  alterarStatus
};