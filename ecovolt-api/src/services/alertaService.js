const db = require('../models');
const AppError = require('../utils/AppError');

const {
  intervaloDoDiaUtc,
  paraDataUtc
} = require('../utils/periodo');

const {
  Op
} = db.Sequelize;

async function listar(filtros = {}) {
  const where = {};

  const status =
    filtros.status || 'ABERTO';


  if (status !== 'TODOS') {
    where.status = status;
  }

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

  const inicio = filtros.data_inicio
    ? paraDataUtc(
        filtros.data_inicio,
        'data_inicio'
      )
    : null;

  const fim = filtros.data_fim
    ? paraDataUtc(
        filtros.data_fim,
        'data_fim'
      )
    : null;

  if (inicio && fim && fim < inicio) {
    throw new AppError(
      'data_fim não pode ser anterior a data_inicio',
      400
    );
  }

  const periodo = {};

  if (inicio) {
    periodo[Op.gte] =
      intervaloDoDiaUtc(inicio).inicio;
  }

  if (fim) {
    periodo[Op.lt] =
      intervaloDoDiaUtc(fim).fim;
  }

  if (Object.keys(periodo).length > 0) {
    where.timestamp_inicio = periodo;
  }

  return db.Alerta.findAll({
    where,
    include: [
      db.Sala,
      db.ConfiguracaoAlerta,
      db.Atuador
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