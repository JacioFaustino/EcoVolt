const db = require('../models');
const AppError = require('../utils/AppError');

async function listar(filtros = {}) {
  const where = {
    status: filtros.status || 'ABERTO'
  };

  if (filtros.gravidade) {
    where.gravidade =
      filtros.gravidade;
  }

  if (filtros.tipo_alerta) {
    where.tipo_alerta =
      filtros.tipo_alerta;
  }

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

  return db.Alerta.findAll({
    where,
    include: [
      db.Sala
    ],
    order: [
      ['timestamp_inicio', 'DESC']
    ]
  });
}

async function buscarPorId(idAlerta) {
  const alerta =
    await db.Alerta.findByPk(
      idAlerta,
      {
        include: [
          db.Sala,
          db.ConfiguracaoAlerta,
          db.Leitura,
          db.Atuador
        ]
      }
    );

  if (!alerta) {
    throw new AppError(
      'Alerta não encontrado',
      404
    );
  }

  return alerta;
}

async function encerrar(
  idAlerta
) {
  const alerta =
    await db.Alerta.findByPk(
      idAlerta
    );

  if (!alerta) {
    throw new AppError(
      'Alerta não encontrado',
      404
    );
  }

  if (alerta.status === 'FECHADO') {
    throw new AppError(
      'O alerta já está fechado',
      400
    );
  }

  await alerta.update({
    status: 'FECHADO',
    timestamp_fim: new Date()
  });

  return alerta;
}

module.exports = {
  listar,
  buscarPorId,
  encerrar
};