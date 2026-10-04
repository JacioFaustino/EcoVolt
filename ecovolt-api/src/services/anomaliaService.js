const db = require('../models');

const {
  obterAlertaAberto,
  processarAlertaPersistente
} = require('./alertaPersistenciaService');

const DIAS_SEMANA = [
  'DOM',
  'SEG',
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SAB'
];

async function obterContextoLeitura(
  leitura
) {
  const [linhas] =
    await db.sequelize.query(`
      SELECT
        se.id_sensor,
        d.id_dispositivo,
        d.id_sala,
        s.dias_funcionamento,
        s.horario_inicio,
        s.horario_fim
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      JOIN sala s
        ON s.id_sala = d.id_sala
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

function obterInstanteLeitura(
  leitura
) {
  const instante =
    leitura.timestamp
      ? new Date(leitura.timestamp)
      : new Date();

  if (
    Number.isNaN(
      instante.getTime()
    )
  ) {
    return null;
  }

  return instante;
}

function converterHoraParaSegundos(
  valor
) {
  if (!valor) {
    return null;
  }

  const partes =
    String(valor).split(':');

  const horas =
    Number(partes[0]);

  const minutos =
    Number(partes[1]);

  const segundos =
    Number(partes[2] || 0);

  if (
    !Number.isFinite(horas) ||
    !Number.isFinite(minutos) ||
    !Number.isFinite(segundos)
  ) {
    return null;
  }

  return (
    horas * 3600 +
    minutos * 60 +
    segundos
  );
}

function horarioEstaForaDaSala(
  data,
  contexto
) {
  const diaAtual =
    DIAS_SEMANA[data.getDay()];

  const diasFuncionamento =
    String(
      contexto.dias_funcionamento || ''
    )
      .split(',')
      .map((dia) => dia.trim().toUpperCase())
      .filter(Boolean);

  if (
    !diasFuncionamento.includes(
      diaAtual
    )
  ) {
    return true;
  }

  const horaAtual =
    data.getHours() * 3600 +
    data.getMinutes() * 60 +
    data.getSeconds();

  const inicio =
    converterHoraParaSegundos(
      contexto.horario_inicio
    );

  const fim =
    converterHoraParaSegundos(
      contexto.horario_fim
    );

  if (
    inicio === null ||
    fim === null
  ) {
    return true;
  }

  return (
    horaAtual < inicio ||
    horaAtual > fim
  );
}

async function verificarR1({
  leitura,
  contexto,
  configuracao
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const potencia =
    Number(leitura.potencia_ativa_W);

  const limite =
    Number(configuracao.valor_limite);

  const condicaoAtiva =
    Number.isFinite(potencia) &&
    Number.isFinite(limite) &&
    potencia > limite &&
    horarioEstaForaDaSala(
      instante,
      contexto
    );

  return processarAlertaPersistente({
    idSala: contexto.id_sala,
    idConfig: configuracao.id_config,
    idLeitura: leitura.id_leitura,
    tipoAlerta:
      'R1_CONSUMO_FORA_HORARIO',
    descricao:
      'Consumo detectado fora do horário de funcionamento',
    valorDetectado:
      leitura.potencia_ativa_W,
    gravidade: 'MEDIA',
    condicaoAtiva,
    timestamp: instante,
    tempoPersistencia:
      Number(
        configuracao
          .tempo_persistencia_segundos
      )
  });
}

async function verificarR2({
  leitura,
  contexto,
  configuracao
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const potencia =
    Number(leitura.potencia_ativa_W);

  const limite =
    Number(configuracao.valor_limite);

  const condicaoAtiva =
    Number.isFinite(potencia) &&
    Number.isFinite(limite) &&
    potencia > limite &&
    horarioEstaForaDaSala(
      instante,
      contexto
    );

  return processarAlertaPersistente({
    idSala: contexto.id_sala,
    idConfig: configuracao.id_config,
    idLeitura: leitura.id_leitura,
    tipoAlerta:
      'R2_AR_FORA_HORARIO',
    descricao:
      'Ar-condicionado ligado fora do horário de funcionamento',
    valorDetectado:
      leitura.potencia_ativa_W,
    gravidade: 'MEDIA',
    condicaoAtiva,
    timestamp: instante,
    tempoPersistencia:
      Number(
        configuracao
          .tempo_persistencia_segundos
      )
  });
}

async function verificarR3A({
  leitura,
  contexto,
  estadoPorta,
  configuracao
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const potencia =
    Number(leitura.potencia_ativa_W);

  const limite =
    Number(configuracao.valor_limite);

  const condicaoAtiva =
    estadoPorta.estado === 'ABERTA' &&
    Number.isFinite(potencia) &&
    Number.isFinite(limite) &&
    potencia > limite;

  return processarAlertaPersistente({
    idSala: contexto.id_sala,
    idConfig: configuracao.id_config,
    idLeitura: leitura.id_leitura,
    tipoAlerta:
      'R3A_PORTA_ABERTA',
    descricao:
      'Porta aberta com ar-condicionado ligado',
    valorDetectado:
      leitura.potencia_ativa_W,
    gravidade: 'MEDIA',
    condicaoAtiva,
    timestamp: instante,
    tempoPersistencia:
      Number(
        configuracao
          .tempo_persistencia_segundos
      )
  });
}

async function verificarR3B({
  leitura,
  contexto,
  estadoPorta,
  configuracaoR3A,
  configuracaoR3B
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const potencia =
    Number(leitura.potencia_ativa_W);

  const limite =
    Number(configuracaoR3B.valor_limite);

  const condicaoAtiva =
    estadoPorta.estado === 'ABERTA' &&
    Number.isFinite(potencia) &&
    Number.isFinite(limite) &&
    potencia > limite;

  if (!condicaoAtiva) {
    const alerta =
      await obterAlertaAberto(
        contexto.id_sala,
        'R3B_PORTA_ABERTA_PERSISTENTE'
      );

    if (alerta) {
      await alerta.update({
        status: 'FECHADO',
        timestamp_fim: instante
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

  const inicioR3A =
    new Date(
      alertaR3A.timestamp_inicio
    );

  const tempoDesdeR3A =
    (
      instante.getTime() -
      inicioR3A.getTime()
    ) / 1000;

  const tempoNecessario =
    Number(
      configuracaoR3A
        .tempo_persistencia_segundos
    ) +
    Number(
      configuracaoR3B
        .tempo_persistencia_segundos
    );

  if (
    tempoDesdeR3A <
    tempoNecessario
  ) {
    return null;
  }

  const alertaExistente =
    await obterAlertaAberto(
      contexto.id_sala,
      'R3B_PORTA_ABERTA_PERSISTENTE'
    );

  if (alertaExistente) {
    return alertaExistente;
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
    timestamp_inicio: instante,
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

  const configuracaoR1 =
    await obterConfiguracao(
      contexto.id_sala,
      'R1_CONSUMO_FORA_HORARIO'
    );

  if (configuracaoR1) {
    await verificarR1({
      leitura,
      contexto,
      configuracao:
        configuracaoR1
    });
  }

  const configuracaoR2 =
    await obterConfiguracao(
      contexto.id_sala,
      'R2_AR_FORA_HORARIO'
    );

  if (configuracaoR2) {
    await verificarR2({
      leitura,
      contexto,
      configuracao:
        configuracaoR2
    });
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
    configuracaoR3A &&
    configuracaoR3B
  ) {
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
  }

  return leitura;
}

module.exports = {
  verificarLeitura,
  verificarR1,
  verificarR2,
  verificarR3A,
  verificarR3B
};