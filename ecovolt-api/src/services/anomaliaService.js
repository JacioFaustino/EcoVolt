const db = require('../models');

async function obterContextoLeitura(
  leitura
) {
  const [linhas] =
    await db.sequelize.query(`
      SELECT
        se.id_sensor,
        d.id_dispositivo,
        d.id_sala
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE l.id_leitura = ?
      LIMIT 1
    `, {
      replacements: [
        leitura.id_leitura
      ]
    });

  return linhas[0];
}

async function obterConfiguracao(
  idSala,
  tipoParametro
) {
  return db.ConfiguracaoAlerta.findOne({
    where: {
      id_sala: idSala,
      tipo_parametro: tipoParametro,
      status: 'ATIVA'
    }
  });
}

async function obterSensorPorta(
  idDispositivo
) {
  return db.Sensor.findOne({
    where: {
      id_dispositivo: idDispositivo,
      tipo: 'PORTA',
      status: 'ATIVO'
    }
  });
}

async function obterEstadoAtualPorta(
  idSensor
) {
  return db.EstadoPorta.findOne({
    where: {
      id_sensor: idSensor
    },
    order: [
      ['timestamp', 'DESC']
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
  return (
    new Date(fim).getTime() -
    new Date(inicio).getTime()
  ) / 1000;
}

async function verificarR3A({
  leitura,
  contexto,
  estadoPorta,
  configuracao
}) {
  const potencia =
    Number(leitura.potencia_ativa_W);

  const limite =
    Number(configuracao.valor_limite);

  const portaAberta =
    estadoPorta.estado === 'ABERTA';

  const potenciaAlta =
    Number.isFinite(potencia) &&
    Number.isFinite(limite) &&
    potencia > limite;

  if (
    !portaAberta ||
    !potenciaAlta
  ) {
    const alerta =
      await obterAlertaAberto(
        contexto.id_sala,
        'R3A_PORTA_ABERTA'
      );

    if (alerta) {
      await alerta.update({
        status: 'FECHADO',
        timestamp_fim:
          new Date()
      });
    }

    return null;
  }

  const inicio =
    new Date(estadoPorta.timestamp);

  const agora =
    new Date(leitura.timestamp);

  const tempoAberta =
    segundosEntre(inicio, agora);

  if (
    tempoAberta <
    configuracao.tempo_persistencia_segundos
  ) {
    return null;
  }

  let alerta =
    await obterAlertaAberto(
      contexto.id_sala,
      'R3A_PORTA_ABERTA'
    );

  if (!alerta) {
    alerta =
      await db.Alerta.create({
        id_sala: contexto.id_sala,
        id_config:
          configuracao.id_config,
        id_leitura:
          leitura.id_leitura,
        tipo_alerta:
          'R3A_PORTA_ABERTA',
        descricao:
          'Porta aberta com ar-condicionado ligado',
        valor_detectado:
          leitura.potencia_ativa_W,
        timestamp_inicio:
          inicio,
        status: 'ABERTO',
        gravidade: 'MEDIA'
      });
  }

  return alerta;
}

async function verificarR3B({
  leitura,
  contexto,
  estadoPorta,
  configuracaoR3A,
  configuracaoR3B
}) {
  const portaAberta =
    estadoPorta.estado === 'ABERTA';

  const potencia =
    Number(leitura.potencia_ativa_W);

  const limite =
    Number(configuracaoR3B.valor_limite);

  const potenciaAlta =
    Number.isFinite(potencia) &&
    Number.isFinite(limite) &&
    potencia > limite;

  if (
    !portaAberta ||
    !potenciaAlta
  ) {
    const alerta =
      await obterAlertaAberto(
        contexto.id_sala,
        'R3B_PORTA_ABERTA_PERSISTENTE'
      );

    if (alerta) {
      await alerta.update({
        status: 'FECHADO',
        timestamp_fim:
          new Date()
      });
    }

    return null;
  }

  const alertaR3A =
    await obterAlertaAberto(
      contexto.id_sala,
      'R3A_PORTA_ABERTA'
    );

  if (!alertaR3A) {
    return null;
  }

  const tempoDepoisR3A =
    segundosEntre(
      alertaR3A.timestamp_inicio,
      leitura.timestamp
    );

  const tempoNecessario =
    Number(
      configuracaoR3A
        .tempo_persistencia_segundos
    ) +
    Number(
      configuracaoR3B
        .tempo_persistencia_segundos
    );

  if (tempoDepoisR3A < tempoNecessario) {
    return null;
  }

  const alertaR3B =
    await obterAlertaAberto(
      contexto.id_sala,
      'R3B_PORTA_ABERTA_PERSISTENTE'
    );

  if (alertaR3B) {
    return alertaR3B;
  }

  return db.Alerta.create({
    id_sala: contexto.id_sala,
    id_config:
      configuracaoR3B.id_config,
    id_leitura:
      leitura.id_leitura,
    tipo_alerta:
      'R3B_PORTA_ABERTA_PERSISTENTE',
    descricao:
      'Porta aberta com ar-condicionado ligado após o acionamento do buzzer',
    valor_detectado:
      leitura.potencia_ativa_W,
    timestamp_inicio:
      new Date(alertaR3A.timestamp_inicio),
    status: 'ABERTO',
    gravidade: 'ALTA'
  });
}

async function verificarLeitura(leitura) {
  const contexto =
    await obterContextoLeitura(
      leitura
    );

  if (!contexto) {
    return leitura;
  }

  const sensorPorta =
    await obterSensorPorta(
      contexto.id_dispositivo
    );

  if (!sensorPorta) {
    return leitura;
  }

  const estadoPorta =
    await obterEstadoAtualPorta(
      sensorPorta.id_sensor
    );

  if (!estadoPorta) {
    return leitura;
  }

  const configuracaoR3A =
    await obterConfiguracao(
      contexto.id_sala,
      'R3A_PORTA_ABERTA'
    );

  const configuracaoR3B =
    await obterConfiguracao(
      contexto.id_sala,
      'R3B_PORTA_ABERTA_PERSISTENTE'
    );

  if (
    !configuracaoR3A ||
    !configuracaoR3B
  ) {
    return leitura;
  }

  await verificarR3A({
    leitura,
    contexto,
    estadoPorta,
    configuracao:
      configuracaoR3A
  });

  await verificarR3B({
    leitura,
    contexto,
    estadoPorta,
    configuracaoR3A,
    configuracaoR3B
  });

  return leitura;
}

module.exports = {
  verificarLeitura,
  verificarR3A,
  verificarR3B
};