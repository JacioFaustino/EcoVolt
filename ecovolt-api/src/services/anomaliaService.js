const db = require('../models');

const {
  Op
} = db.Sequelize;

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

  const condicaoAtiva =
    portaAberta && potenciaAlta;

  const instanteLeitura =
    leitura.timestamp
      ? new Date(leitura.timestamp)
      : new Date();

  if (
    Number.isNaN(
      instanteLeitura.getTime()
    )
  ) {
    return null;
  }

  const alertaEmAndamento =
    await obterAlertaEmAndamento(
      contexto.id_sala,
      'R3A_PORTA_ABERTA'
    );

  /*
   * Se a porta fechou ou a potência
   * caiu abaixo do limite, encerra
   * qualquer alerta R3A em andamento.
   */
  if (!condicaoAtiva) {
    if (alertaEmAndamento) {
      await alertaEmAndamento.update({
        status: 'FECHADO',
        timestamp_fim:
          instanteLeitura
      });
    }

    return null;
  }

  /*
   * A contagem começa somente agora:
   * porta aberta + potência acima do limite.
   */
  if (!alertaEmAndamento) {
    return db.Alerta.create({
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
        instanteLeitura,
      status: 'PENDENTE',
      gravidade: 'MEDIA'
    });
  }

  const tempoAtivo =
    segundosEntre(
      alertaEmAndamento.timestamp_inicio,
      instanteLeitura
    );

  const tempoNecessario =
    Number(
      configuracao
        .tempo_persistencia_segundos
    );

  /*
   * A condição ainda não atingiu
   * o tempo configurado.
   */
  if (
    alertaEmAndamento.status ===
      'PENDENTE' &&
    tempoAtivo < tempoNecessario
  ) {
    await alertaEmAndamento.update({
      id_leitura:
        leitura.id_leitura,
      valor_detectado:
        leitura.potencia_ativa_W
    });

    return alertaEmAndamento;
  }

  /*
   * A condição permaneceu ativa pelo
   * tempo necessário.
   */
  if (
    alertaEmAndamento.status ===
      'PENDENTE' &&
    tempoAtivo >= tempoNecessario
  ) {
    await alertaEmAndamento.update({
      status: 'ABERTO',
      id_leitura:
        leitura.id_leitura,
      valor_detectado:
        leitura.potencia_ativa_W
    });
  }

  return alertaEmAndamento;
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

  const condicaoAtiva =
    portaAberta && potenciaAlta;

  const instanteLeitura =
    leitura.timestamp
      ? new Date(leitura.timestamp)
      : new Date();

  if (
    Number.isNaN(
      instanteLeitura.getTime()
    )
  ) {
    return null;
  }

  /*
   * Se a condição terminou, encerra
   * a R3B caso ela esteja aberta.
   */
  if (!condicaoAtiva) {
    const alertaR3B =
      await obterAlertaAberto(
        contexto.id_sala,
        'R3B_PORTA_ABERTA_PERSISTENTE'
      );

    if (alertaR3B) {
      await alertaR3B.update({
        status: 'FECHADO',
        timestamp_fim:
          instanteLeitura
      });
    }

    return null;
  }

  /*
   * A R3B só pode começar depois
   * que a R3A estiver ABERTA.
   */
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
      instanteLeitura
    );

  const tempoR3A =
    Number(
      configuracaoR3A
        .tempo_persistencia_segundos
    );

  const tempoR3B =
    Number(
      configuracaoR3B
        .tempo_persistencia_segundos
    );

  const tempoNecessario =
    tempoR3A + tempoR3B;

  /*
   * Aguarda o tempo adicional
   * configurado para a R3B.
   */
  if (
    tempoDepoisR3A <
    tempoNecessario
  ) {
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
      instanteLeitura,
    status: 'ABERTO',
    gravidade: 'ALTA'
  });
}

async function verificarLeitura(
  leitura
) {
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