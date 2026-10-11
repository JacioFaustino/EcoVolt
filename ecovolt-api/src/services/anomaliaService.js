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

const MINIMO_PONTOS_HISTORICOS_R5 = 3;

function formatarDataSqlUtc(data) {
  const pad = (numero) =>
    String(numero).padStart(2, '0');

  return (
    data.getUTCFullYear() +
    '-' +
    pad(data.getUTCMonth() + 1) +
    '-' +
    pad(data.getUTCDate()) +
    ' ' +
    pad(data.getUTCHours()) +
    ':' +
    pad(data.getUTCMinutes()) +
    ':' +
    pad(data.getUTCSeconds())
  );
}

async function obterContextoLeitura(
  leitura
) {
  const [linhas] =
    await db.sequelize.query(`
      SELECT
        d.id_dispositivo,
        d.id_sala,
        s.dias_funcionamento,
        s.horario_inicio,
        s.horario_fim,
        s.capacidade_max_W
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo = se.id_dispositivo
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

async function obterEstadoPorta(
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
  const instante = leitura.timestamp
    ? new Date(leitura.timestamp)
    : new Date();

  return Number.isNaN(
    instante.getTime()
  )
    ? null
    : instante;
}

function alertaEstaAtivo(
  alerta
) {
  return (
    Boolean(alerta) &&
    (
      alerta.status === 'PENDENTE' ||
      alerta.status === 'ABERTO'
    )
  );
}

function horaEmSegundos(valor) {
  if (!valor) {
    return null;
  }

  const [
    horas = 0,
    minutos = 0,
    segundos = 0
  ] = String(valor)
    .split(':')
    .map(Number);

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

function foraDoHorario(
  data,
  contexto
) {
  const diaAtual =
    DIAS_SEMANA[data.getDay()];

  const dias =
    String(
      contexto.dias_funcionamento || ''
    )
      .split(',')
      .map((dia) =>
        dia.trim().toUpperCase()
      )
      .filter(Boolean);

  if (!dias.includes(diaAtual)) {
    return true;
  }

  const horaAtual =
    data.getHours() * 3600 +
    data.getMinutes() * 60 +
    data.getSeconds();

  const inicio =
    horaEmSegundos(
      contexto.horario_inicio
    );

  const fim =
    horaEmSegundos(
      contexto.horario_fim
    );

  return (
    inicio === null ||
    fim === null ||
    horaAtual < inicio ||
    horaAtual > fim
  );
}

function acimaDoLimite(
  valor,
  limite
) {
  const numero = Number(valor);
  const limiteNumerico =
    Number(limite);

  return (
    Number.isFinite(numero) &&
    Number.isFinite(limiteNumerico) &&
    numero > limiteNumerico
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

  const condicaoAtiva =
    acimaDoLimite(
      leitura.potencia_ativa_W,
      configuracao.valor_limite
    ) &&
    foraDoHorario(
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
    tempoPersistencia: Number(
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

  const condicaoAtiva =
    acimaDoLimite(
      leitura.potencia_ativa_W,
      configuracao.valor_limite
    ) &&
    foraDoHorario(
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
    tempoPersistencia: Number(
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

  const condicaoAtiva =
    estadoPorta.estado === 'ABERTA' &&
    acimaDoLimite(
      leitura.potencia_ativa_W,
      configuracao.valor_limite
    );

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
    tempoPersistencia: Number(
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

  const condicaoAtiva =
    estadoPorta.estado === 'ABERTA' &&
    acimaDoLimite(
      leitura.potencia_ativa_W,
      configuracaoR3B.valor_limite
    );

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

  const tempoTotal =
    Number(
      configuracaoR3A
        .tempo_persistencia_segundos
    ) +
    Number(
      configuracaoR3B
        .tempo_persistencia_segundos
    );

  if (tempoDesdeR3A < tempoTotal) {
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
    id_config: configuracaoR3B.id_config,
    id_leitura: leitura.id_leitura,
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

async function verificarR4({
  leitura,
  contexto,
  configuracao
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const condicaoAtiva =
    acimaDoLimite(
      leitura.potencia_ativa_W,
      contexto.capacidade_max_W
    );

  return processarAlertaPersistente({
    idSala: contexto.id_sala,
    idConfig: configuracao.id_config,
    idLeitura: leitura.id_leitura,
    tipoAlerta:
      'R4_SOBRECARGA',
    descricao:
      'Potência acima da capacidade máxima do circuito',
    valorDetectado:
      leitura.potencia_ativa_W,
    gravidade: 'ALTA',
    condicaoAtiva,
    timestamp: instante,
    tempoPersistencia: Number(
      configuracao
        .tempo_persistencia_segundos
    )
  });
}

async function verificarR6({
  leitura,
  contexto,
  configuracao
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const inicioDia =
    new Date(instante);

  inicioDia.setUTCHours(
    0,
    0,
    0,
    0
  );

  const fimDia =
    new Date(inicioDia);

  fimDia.setUTCDate(
    fimDia.getUTCDate() + 1
  );

  const inicioDiaSql =
    formatarDataSqlUtc(inicioDia);

  const fimDiaSql =
    formatarDataSqlUtc(fimDia);

  const [resultado] =
    await db.sequelize.query(`
      SELECT COALESCE(
        SUM(l.energia_intervalo_kWh),
        0
      ) AS consumo_total
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE d.id_sala = ?
        AND l.timestamp >= ?
        AND l.timestamp < ?
    `, {
      replacements: [
        contexto.id_sala,
        inicioDiaSql,
        fimDiaSql
      ]
    });

  const consumo =
    Number(
      resultado[0].consumo_total
    );

  const condicaoAtiva =
    acimaDoLimite(
      consumo,
      configuracao.valor_limite
    );

  return processarAlertaPersistente({
    idSala: contexto.id_sala,
    idConfig: configuracao.id_config,
    idLeitura: leitura.id_leitura,
    tipoAlerta:
      'R6_LIMITE_DIARIO',
    descricao:
      'Limite diário de consumo excedido',
    valorDetectado: consumo,
    gravidade: 'BAIXA',
    condicaoAtiva,
    timestamp: instante,
    tempoPersistencia: 0
  });
}

async function verificarR8({
  leitura,
  contexto,
  configuracao
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const corrente =
    Number(leitura.corrente_rms_A);

  const qualidade =
    Number(leitura.qualidade_sinal);

  const condicaoAtiva =
    !Number.isFinite(corrente) ||
    corrente < 0 ||
    !Number.isFinite(qualidade) ||
    qualidade <
      Number(configuracao.valor_limite);

  return processarAlertaPersistente({
    idSala: contexto.id_sala,
    idConfig: configuracao.id_config,
    idLeitura: leitura.id_leitura,
    tipoAlerta:
      'R8_FALHA_LEITURA',
    descricao:
      'Falha ou inconsistência na leitura do sensor',
    valorDetectado:
      Number.isFinite(qualidade)
        ? qualidade
        : 0,
    gravidade: 'MEDIA',
    condicaoAtiva,
    timestamp: instante,
    tempoPersistencia: Number(
      configuracao
        .tempo_persistencia_segundos
    )
  });
}

async function verificarR5({
  leitura,
  contexto,
  configuracao
}) {
  const instante =
    obterInstanteLeitura(leitura);

  if (!instante) {
    return null;
  }

  const inicioHora =
    new Date(instante);

  inicioHora.setUTCMinutes(
    0,
    0,
    0
  );

  const fimHora =
    new Date(inicioHora);

  fimHora.setUTCHours(
    fimHora.getUTCHours() + 1
  );

  const quatroSemanasAntes =
    new Date(inicioHora);

  quatroSemanasAntes.setUTCDate(
    quatroSemanasAntes.getUTCDate() - 28
  );

  const inicioHoraSql =
    formatarDataSqlUtc(inicioHora);

  const fimHoraSql =
    formatarDataSqlUtc(fimHora);

  const quatroSemanasAntesSql =
    formatarDataSqlUtc(
      quatroSemanasAntes
    );

  const [resultado] =
    await db.sequelize.query(`
      SELECT
        AVG(consumo_hora)
          AS media_historica,
        STDDEV_POP(consumo_hora)
          AS desvio_historico,
        COUNT(*)
          AS pontos_historicos
      FROM (
        SELECT
          DATE_FORMAT(
            l.timestamp,
            '%Y-%m-%d %H:00:00'
          ) AS hora_referencia,
          SUM(
            l.energia_intervalo_kWh
          ) AS consumo_hora
        FROM leitura l
        JOIN sensor se
          ON se.id_sensor = l.id_sensor
        JOIN dispositivo d
          ON d.id_dispositivo =
             se.id_dispositivo
        WHERE d.id_sala = ?
          AND l.timestamp >= ?
          AND l.timestamp < ?
          AND DAYOFWEEK(l.timestamp) =
              DAYOFWEEK(?)
          AND HOUR(l.timestamp) =
              HOUR(?)
        GROUP BY
          DATE_FORMAT(
            l.timestamp,
            '%Y-%m-%d %H:00:00'
          )
      ) AS historico
    `, {
      replacements: [
        contexto.id_sala,
        quatroSemanasAntesSql,
        inicioHoraSql,
        inicioHoraSql,
        inicioHoraSql
      ]
    });

  const media =
    Number(
      resultado[0].media_historica
    );

  const desvio =
    Number(
      resultado[0].desvio_historico
    );

  const pontosHistoricos =
    Number(
      resultado[0].pontos_historicos
    );

  const [
    consumoAtualResultado
  ] = await db.sequelize.query(`
    SELECT
      COALESCE(
        SUM(l.energia_intervalo_kWh),
        0
      ) AS consumo_atual
    FROM leitura l
    JOIN sensor se
      ON se.id_sensor = l.id_sensor
    JOIN dispositivo d
      ON d.id_dispositivo =
         se.id_dispositivo
    WHERE d.id_sala = ?
      AND l.timestamp >= ?
      AND l.timestamp < ?
  `, {
    replacements: [
      contexto.id_sala,
      inicioHoraSql,
      fimHoraSql
    ]
  });

  const consumoAtual =
    Number(
      consumoAtualResultado[0]
        .consumo_atual
    );

  if (
    !Number.isFinite(media) ||
    !Number.isFinite(desvio) ||
    !Number.isFinite(consumoAtual) ||
    !Number.isFinite(
      pontosHistoricos
    ) ||
    pontosHistoricos <
      MINIMO_PONTOS_HISTORICOS_R5
  ) {
    return null;
  }

  const numeroDesvios =
    Number(
      configuracao.valor_limite
    );

  const limite =
    media +
    numeroDesvios * desvio;

  const condicaoAtiva =
    consumoAtual > limite;

  return processarAlertaPersistente({
    idSala: contexto.id_sala,
    idConfig: configuracao.id_config,
    idLeitura: leitura.id_leitura,
    tipoAlerta:
      'R5_PADRAO_HISTORICO',
    descricao:
      'Consumo acima do padrão histórico',
    valorDetectado:
      consumoAtual,
    gravidade: 'BAIXA',
    condicaoAtiva,
    timestamp: instante,
    tempoPersistencia: 0
  });
}

async function verificarLeitura(
  leitura
) {
  const contexto =
    await obterContextoLeitura(
      leitura
    );

  const comandos = [];

  if (!contexto) {
    return { leitura, comandos };
  }

  const regras = [
    [
      'R1_CONSUMO_FORA_HORARIO',
      verificarR1
    ],
    [
      'R2_AR_FORA_HORARIO',
      verificarR2
    ],
    [
      'R4_SOBRECARGA',
      verificarR4
    ],
    [
      'R5_PADRAO_HISTORICO',
      verificarR5
    ],
    [
      'R6_LIMITE_DIARIO',
      verificarR6
    ],
    [
      'R8_FALHA_LEITURA',
      verificarR8
    ]
  ];

  for (const [
    tipoParametro,
    verificar
  ] of regras) {
    const configuracao =
      await obterConfiguracao(
        contexto.id_sala,
        tipoParametro
      );

    if (!configuracao) {
      continue;
    }

    const alerta =
      await verificar({
        leitura,
        contexto,
        configuracao
      });

    if (configuracao.acionar_buzzer) {
      comandos.push({
        acionar_buzzer:
          alertaEstaAtivo(alerta),
        duracao_buzzer_segundos:
          Number(
            configuracao
              .duracao_buzzer_segundos
          ) || 0
      });
    }
  }

  const sensorPorta =
    await obterSensorPorta(
      contexto.id_dispositivo
    );

  if (!sensorPorta) {
    return { leitura, comandos };
  }

  const estadoPorta =
    await obterEstadoPorta(
      sensorPorta.id_sensor
    );

  if (!estadoPorta) {
    return { leitura, comandos };
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
    const alertaR3A =
      await verificarR3A({
        leitura,
        contexto,
        estadoPorta,
        configuracao:
          configuracaoR3A
      });

    const alertaR3B =
      await verificarR3B({
        leitura,
        contexto,
        estadoPorta,
        configuracaoR3A,
        configuracaoR3B
      });

    if (configuracaoR3A.acionar_buzzer) {
      const r3aAtivo =
        alertaEstaAtivo(alertaR3A);

      const r3bAtivo =
        alertaEstaAtivo(alertaR3B);

      comandos.push({
        acionar_buzzer:
          r3aAtivo && !r3bAtivo,
        duracao_buzzer_segundos:
          Number(
            configuracaoR3A
              .duracao_buzzer_segundos
          ) || 0
      });
    }
  }

  return { leitura, comandos };
}

module.exports = {
  verificarLeitura,
  verificarR1,
  verificarR2,
  verificarR3A,
  verificarR3B,
  verificarR4,
  verificarR5,
  verificarR6,
  verificarR8
};