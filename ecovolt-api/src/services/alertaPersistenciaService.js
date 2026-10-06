const db = require('../models');

const {
  Op
} = db.Sequelize;

async function obterAlertaEmAndamento(
  idSala,
  tipoAlerta
) {
  return db.Alerta.findOne({
    where: {
      id_sala: idSala,
      tipo_alerta: tipoAlerta,
      status: {
        [Op.in]: [
          'PENDENTE',
          'ABERTO'
        ]
      }
    },
    order: [
      ['timestamp_inicio', 'ASC']
    ]
  });
}

async function obterAlertaAberto(
  idSala,
  tipoAlerta
) {
  return db.Alerta.findOne({
    where: {
      id_sala: idSala,
      tipo_alerta: tipoAlerta,
      status: 'ABERTO'
    }
  });
}

function segundosEntre(
  inicio,
  fim
) {
  const dataInicio =
    new Date(inicio);

  const dataFim =
    new Date(fim);

  return (
    dataFim.getTime() -
    dataInicio.getTime()
  ) / 1000;
}

async function processarAlertaPersistente({
  idSala,
  idConfig,
  idLeitura,
  tipoAlerta,
  descricao,
  valorDetectado,
  gravidade,
  condicaoAtiva,
  timestamp,
  tempoPersistencia
}) {
  const alertaEmAndamento =
    await obterAlertaEmAndamento(
      idSala,
      tipoAlerta
    );

  if (!condicaoAtiva) {
    if (alertaEmAndamento) {
      await alertaEmAndamento.update({
        status: 'FECHADO',
        timestamp_fim: timestamp
      });
    }

    return null;
  }

if (!alertaEmAndamento) {
  const alerta =
    await db.Alerta.create({
      id_sala: idSala,
      id_config: idConfig,
      id_leitura: idLeitura,
      tipo_alerta: tipoAlerta,
      descricao,
      valor_detectado: valorDetectado,
      timestamp_inicio: timestamp,
      status:
        Number(tempoPersistencia) <= 0
          ? 'ABERTO'
          : 'PENDENTE',
      gravidade
    });

  return alerta;
}

  const tempoAtivo =
    segundosEntre(
      alertaEmAndamento.timestamp_inicio,
      timestamp
    );

  if (
    alertaEmAndamento.status === 'PENDENTE' &&
    tempoAtivo >= tempoPersistencia
  ) {
    await alertaEmAndamento.update({
      status: 'ABERTO',
      id_leitura: idLeitura,
      valor_detectado: valorDetectado
    });

    return alertaEmAndamento;
  }

  if (
    alertaEmAndamento.status === 'PENDENTE'
  ) {
    await alertaEmAndamento.update({
      id_leitura: idLeitura,
      valor_detectado: valorDetectado
    });
  }

  return alertaEmAndamento;
}

module.exports = {
  obterAlertaAberto,
  processarAlertaPersistente
};