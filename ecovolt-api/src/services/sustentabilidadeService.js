const db = require('../models');

const {
  calcularCustoReais,
  obterTarifaKwh
} = require('../utils/custo');

const {
  obterFatorCo2KgKwh,
  calcularCo2Kg
} = require('../utils/sustentabilidade');

const {
  paraDataUtc,
  formatarDataSqlUtc
} = require('../utils/periodo');

const AppError = require('../utils/AppError');

const MS_DIA = 24 * 60 * 60 * 1000;

const TIPOS_DESPERDICIO = [
  'R1_CONSUMO_FORA_HORARIO',
  'R2_AR_FORA_HORARIO',
  'R3A_PORTA_ABERTA',
  'R3B_PORTA_ABERTA_PERSISTENTE'
];

const LISTA_TIPOS = TIPOS_DESPERDICIO
  .map((tipo) => `'${tipo}'`)
  .join(', ');

const arredondar = (valor, casas) =>
  Number(Number(valor).toFixed(casas));

const { meiaNoiteBrasilia } = require('../utils/fuso');

const formatarData = (data) =>
  data.toISOString().slice(0, 10);

async function validarSala(idSala) {
  const sala = await db.Sala.findByPk(idSala);

  if (!sala) {
    throw new AppError('Sala não encontrada', 404);
  }

  return sala;
}



function montarPeriodos({
  periodicidade,
  periodoInicio,
  periodoFim,
  agora = new Date()
}) {
  const inicio = paraDataUtc(
    periodoInicio,
    'periodo_inicio'
  );

  const ultimoDia = paraDataUtc(
    periodoFim,
    'periodo_fim'
  );

  if (ultimoDia < inicio) {
    throw new AppError(
      'periodo_fim não pode ser anterior ao periodo_inicio',
      400
    );
  }

  const fimPeriodo = new Date(
    ultimoDia.getTime() + MS_DIA
  );

  const fimConsiderado = new Date(
    Math.min(fimPeriodo.getTime(), agora.getTime())
  );

  if (fimConsiderado <= inicio) {
    return {
      inicio,
      fimConsiderado,
      inicioComparado: null,
      fimComparado: null,
      diasConsiderados: 0,
      completo: false
    };
  }

  const completo =
    fimConsiderado.getTime() >= fimPeriodo.getTime();

  const duracaoMs =
    fimConsiderado.getTime() - inicio.getTime();

  let inicioComparado;
  let fimComparadoCalendario = inicio;

  switch (periodicidade) {
    case 'DIARIO':
      inicioComparado = new Date(
        inicio.getTime() - MS_DIA
      );
      break;

    case 'SEMANAL':
      inicioComparado = new Date(
        inicio.getTime() - 7 * MS_DIA
      );
      break;

    case 'MENSAL':
      inicioComparado = meiaNoiteBrasilia(
        inicio.getUTCFullYear(),
        inicio.getUTCMonth() - 1,
        1
      );
      break;

    case 'ANUAL':
      inicioComparado = meiaNoiteBrasilia(
        inicio.getUTCFullYear() - 1,
        0,
        1
      );
      break;

    case 'PERSONALIZADO':
      inicioComparado = new Date(
        inicio.getTime() - duracaoMs
      );
      break;

    default:
      throw new AppError('periodicidade inválida', 400);
  }

  const fimComparado = completo
    ? fimComparadoCalendario
    : new Date(
        inicioComparado.getTime() + duracaoMs
      );

  return {
    inicio,
    fimConsiderado,
    inicioComparado,
    fimComparado,
    diasConsiderados: Math.max(
      Math.ceil(duracaoMs / MS_DIA),
      1
    ),
    completo
  };
}

async function calcularEnergia({
  idSala,
  inicio,
  fim
}) {
  const filtroSala = idSala
    ? ' AND d.id_sala = ?'
    : '';

  const replacements = [
    formatarDataSqlUtc(inicio),
    formatarDataSqlUtc(fim)
  ];

  if (idSala) {
    replacements.push(idSala);
  }

  const [resultado] = await db.sequelize.query(
    `
    SELECT
      COALESCE(
        SUM(l.energia_intervalo_kWh),
        0
      ) AS consumo_total,

      COALESCE(SUM(
        CASE WHEN EXISTS (
          SELECT 1
          FROM alerta a
          WHERE a.id_sala = d.id_sala
            AND a.tipo_alerta IN (${LISTA_TIPOS})
            AND a.timestamp_inicio <= l.timestamp
            AND (
              a.timestamp_fim IS NULL OR
              a.timestamp_fim >= l.timestamp
            )
            AND (
              a.timestamp_fim IS NOT NULL OR
              a.status IN ('PENDENTE', 'ABERTO')
            )
        ) THEN l.energia_intervalo_kWh
        ELSE 0 END
      ), 0) AS desperdicio_total,

      COUNT(l.energia_intervalo_kWh) AS total_leituras
    FROM leitura l
    JOIN sensor se
      ON se.id_sensor = l.id_sensor
    JOIN dispositivo d
      ON d.id_dispositivo = se.id_dispositivo
    WHERE l.timestamp >= ?
      AND l.timestamp < ?${filtroSala}
    `,
    { replacements }
  );

  const linha = resultado[0] || {};

  return {
    consumo: Number(linha.consumo_total) || 0,
    desperdicio:
      Number(linha.desperdicio_total) || 0,
    totalLeituras:
      Number(linha.total_leituras) || 0
  };
}

async function obterSustentabilidade({
  id_sala: idSala,
  periodicidade,
  periodo_inicio: periodoInicio,
  periodo_fim: periodoFim,
  agora
}) {
  const sala = idSala
    ? await validarSala(idSala)
    : null;

  const periodos = montarPeriodos({
    periodicidade,
    periodoInicio,
    periodoFim,
    agora: agora || new Date()
  });

  let atual = {
    consumo: 0,
    desperdicio: 0,
    totalLeituras: 0
  };

  let anterior = null;

  if (periodos.diasConsiderados > 0) {
    [atual, anterior] = await Promise.all([
      calcularEnergia({
        idSala,
        inicio: periodos.inicio,
        fim: periodos.fimConsiderado
      }),

      calcularEnergia({
        idSala,
        inicio: periodos.inicioComparado,
        fim: periodos.fimComparado
      })
    ]);
  }

  const comparacaoDisponivel = Boolean(
    anterior &&
      anterior.totalLeituras > 0 &&
      atual.totalLeituras > 0
  );

  const economia = comparacaoDisponivel
    ? Math.max(
        anterior.desperdicio - atual.desperdicio,
        0
      )
    : null;

  const reducao =
    comparacaoDisponivel &&
    anterior.desperdicio > 0
      ? arredondar(
          ((anterior.desperdicio -
            atual.desperdicio) /
            anterior.desperdicio) *
            100,
          1
        )
      : null;

  const tarifa = obterTarifaKwh();
  const fator = obterFatorCo2KgKwh();

  return {
    id_sala: idSala || null,
    sala: sala ? sala.nome : null,

    periodo: {
      periodicidade,
      inicio: periodoInicio,
      fim_solicitado: periodoFim,

      fim_considerado:
        periodos.diasConsiderados > 0
          ? formatarData(
              new Date(
                periodos.fimConsiderado.getTime() - 1
              )
            )
          : null,

      comparado_inicio:
        periodos.inicioComparado
          ? formatarData(periodos.inicioComparado)
          : null,

      comparado_fim:
        periodos.fimComparado
          ? formatarData(
              new Date(
                periodos.fimComparado.getTime() - 1
              )
            )
          : null,

      dias_considerados:
        periodos.diasConsiderados,

      parcial: !periodos.completo
    },

    consumo_kwh: arredondar(atual.consumo, 3),

    desperdicio_kwh: arredondar(
      atual.desperdicio,
      3
    ),

    taxa_desperdicio_percentual:
      atual.consumo > 0
        ? arredondar(
            (atual.desperdicio / atual.consumo) *
              100,
            1
          )
        : null,

    periodo_anterior: anterior
      ? {
          consumo_kwh: arredondar(
            anterior.consumo,
            3
          ),
          desperdicio_kwh: arredondar(
            anterior.desperdicio,
            3
          ),
          total_leituras:
            anterior.totalLeituras
        }
      : null,

    comparacao_disponivel: comparacaoDisponivel,

    energia_economizada_kwh:
      economia === null
        ? null
        : arredondar(economia, 3),

    reducao_percentual: reducao,

    custo_evitado_reais:
      economia === null
        ? null
        : calcularCustoReais(economia),

    co2_nao_emitido_kg:
      economia === null
        ? null
        : calcularCo2Kg(economia),

    custo_desperdicio_reais:
      calcularCustoReais(atual.desperdicio),

    tarifa_kwh: tarifa,
    fator_co2_kg_kwh: fator
  };
}

module.exports = {
  obterSustentabilidade,
  montarPeriodos
};