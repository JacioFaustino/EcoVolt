const db = require('../models');

const { calcularCustoReais } = require('../utils/custo');

const {
  paraDataUtc,
  formatarDataSqlUtc
} = require('../utils/periodo');

const AppError = require('../utils/AppError');

function obterPeriodo(periodoInicio, periodoFim) {
  const inicio = paraDataUtc(periodoInicio, 'periodo_inicio');
  const ultimoDia = paraDataUtc(periodoFim, 'periodo_fim');

  if (ultimoDia < inicio) {
    throw new AppError(
      'periodo_fim não pode ser anterior ao periodo_inicio',
      400
    );
  }

  const fim = new Date(ultimoDia.getTime() + 24 * 60 * 60 * 1000);

  return { inicio, fim };
}

async function validarSala(idSala) {
  const sala = await db.Sala.findByPk(idSala);

  if (!sala) {
    throw new AppError('Sala não encontrada', 404);
  }

  return sala;
}

async function calcularConsumo({ idSala, inicio, fim }) {
  const [resultado] = await db.sequelize.query(`
      SELECT
        COALESCE(SUM(l.energia_intervalo_kWh), 0) AS consumo_total,
        COALESCE(SUM(
          CASE WHEN EXISTS (
            SELECT 1 FROM alerta a
            WHERE a.id_sala = d.id_sala
              AND a.tipo_alerta IN (
                'R1_CONSUMO_FORA_HORARIO',
                'R2_AR_FORA_HORARIO',
                'R3A_PORTA_ABERTA',
                'R3B_PORTA_ABERTA_PERSISTENTE'
              )
              AND a.timestamp_inicio <= l.timestamp
              AND (a.timestamp_fim IS NULL OR a.timestamp_fim >= l.timestamp)
              AND (a.timestamp_fim IS NOT NULL OR a.status IN ('PENDENTE', 'ABERTO')
              )
          ) THEN l.energia_intervalo_kWh ELSE 0 END
        ), 0) AS desperdicio_total
      FROM leitura l
      JOIN sensor se ON se.id_sensor = l.id_sensor
      JOIN dispositivo d ON d.id_dispositivo = se.id_dispositivo
      WHERE d.id_sala = ? AND l.timestamp >= ? AND l.timestamp < ?
    `, {
    replacements: [idSala, formatarDataSqlUtc(inicio), formatarDataSqlUtc(fim)]
  });

  const linha = resultado[0] || {};

  return {
    consumo: Number(linha.consumo_total) || 0,
    desperdicio: Number(linha.desperdicio_total) || 0
  };
}

async function calcularPicos({ idSala, inicio, fim }) {
  const [linhas] = await db.sequelize.query(`
      SELECT
        DATE_FORMAT(CONVERT_TZ(l.timestamp, '+00:00', '-03:00'), '%Y-%m-%d %H:00:00') AS hora,
        MAX(l.potencia_ativa_W) AS potencia_maxima_W
      FROM leitura l
      JOIN sensor se ON se.id_sensor = l.id_sensor
      JOIN dispositivo d ON d.id_dispositivo = se.id_dispositivo
      WHERE d.id_sala = ? AND l.timestamp >= ? AND l.timestamp < ?
      GROUP BY DATE_FORMAT(CONVERT_TZ(l.timestamp, '+00:00', '-03:00'), '%Y-%m-%d %H:00:00')
      ORDER BY potencia_maxima_W DESC
      LIMIT 10
    `, {
    replacements: [idSala, formatarDataSqlUtc(inicio), formatarDataSqlUtc(fim)]
  });

  return linhas.map((linha) => ({
    hora: linha.hora,
    potencia_maxima_W: Number(linha.potencia_maxima_W)
  }));
}

async function contarAnomalias({ idSala, inicio, fim }) {
  const [resultado] = await db.sequelize.query(`
      SELECT COUNT(*) AS total
      FROM alerta
      WHERE id_sala = ? AND timestamp_inicio >= ? AND timestamp_inicio < ?
    `, {
    replacements: [idSala, formatarDataSqlUtc(inicio), formatarDataSqlUtc(fim)]
  });

  return Number(resultado[0].total) || 0;
}

async function resumoAlertas({ idSala, inicio, fim }) {
  const [porTipo] = await db.sequelize.query(`
      SELECT tipo_alerta, gravidade, status, COUNT(*) AS total
      FROM alerta
      WHERE id_sala = ? AND timestamp_inicio >= ? AND timestamp_inicio < ?
      GROUP BY tipo_alerta, gravidade, status
      ORDER BY total DESC
    `, {
    replacements: [idSala, formatarDataSqlUtc(inicio), formatarDataSqlUtc(fim)]
  });

  const [lista] = await db.sequelize.query(`
      SELECT tipo_alerta, gravidade, status, valor_detectado,
             timestamp_inicio, timestamp_fim
      FROM alerta
      WHERE id_sala = ? AND timestamp_inicio >= ? AND timestamp_inicio < ?
      ORDER BY timestamp_inicio DESC
      LIMIT 50
    `, {
    replacements: [idSala, formatarDataSqlUtc(inicio), formatarDataSqlUtc(fim)]
  });

  return {
    por_tipo: porTipo.map((linha) => ({
      tipo_alerta: linha.tipo_alerta,
      gravidade: linha.gravidade,
      status: linha.status,
      total: Number(linha.total)
    })),
    lista
  };
}

async function resumoOffline({ idSala, inicio, fim }) {
  const [linhas] = await db.sequelize.query(`
      SELECT status, timestamp_inicio, timestamp_fim
      FROM alerta
      WHERE id_sala = ?
        AND tipo_alerta = 'R7_DISPOSITIVO_OFFLINE'
        AND timestamp_inicio >= ? AND timestamp_inicio < ?
      ORDER BY timestamp_inicio DESC
      LIMIT 100
    `, {
    replacements: [idSala, formatarDataSqlUtc(inicio), formatarDataSqlUtc(fim)]
  });

  const agora = Date.now();

  const lista = linhas.map((linha) => {
    const inicioMs = new Date(linha.timestamp_inicio).getTime();
    const fimMs = linha.timestamp_fim
      ? new Date(linha.timestamp_fim).getTime()
      : agora;

    return {
      status: linha.status,
      timestamp_inicio: linha.timestamp_inicio,
      timestamp_fim: linha.timestamp_fim,
      duracao_minutos: Math.max(Math.round((fimMs - inicioMs) / 60000), 0)
    };
  });

  const minutosTotais = lista.reduce(
    (soma, item) => soma + item.duracao_minutos,
    0
  );

  return {
    total: lista.length,
    minutos_totais: minutosTotais,
    minutos_medios: lista.length
      ? Math.round(minutosTotais / lista.length)
      : 0,
    lista
  };
}

async function criarRelatorio({ dados, idUsuario }) {
  await validarSala(dados.id_sala);

  const { inicio, fim } = obterPeriodo(
    dados.periodo_inicio,
    dados.periodo_fim
  );

  const consumo = await calcularConsumo({
    idSala: dados.id_sala,
    inicio,
    fim
  });

  const picos = await calcularPicos({
    idSala: dados.id_sala,
    inicio,
    fim
  });

  const anomalias = await contarAnomalias({
    idSala: dados.id_sala,
    inicio,
    fim
  });

  let resumo = {
    consumo_kWh: Number(consumo.consumo.toFixed(3)),
    desperdicio_kWh: Number(consumo.desperdicio.toFixed(3)),
    taxa_desperdicio_percentual:
      consumo.consumo > 0
        ? Number(((consumo.desperdicio / consumo.consumo) * 100).toFixed(1))
        : null
  };

  if (dados.tipo_relatorio === 'ALERTAS') {
    resumo = {
      ...resumo,
      ...(await resumoAlertas({
        idSala: dados.id_sala,
        inicio,
        fim
      }))
    };
  }

  if (dados.tipo_relatorio === 'DISPOSITIVOS_OFFLINE') {
    resumo = {
      ...resumo,
      ...(await resumoOffline({
        idSala: dados.id_sala,
        inicio,
        fim
      }))
    };
  }

  const relatorio = await db.Relatorio.create({
    id_sala: dados.id_sala,
    id_usuario: idUsuario,
    tipo_relatorio: dados.tipo_relatorio,
    periodicidade: dados.periodicidade || 'PERSONALIZADO',
    periodo_inicio: dados.periodo_inicio,
    periodo_fim: dados.periodo_fim,
    consumo_total_kWh: Number(consumo.consumo.toFixed(4)),
    custo_estimado: calcularCustoReais(consumo.consumo),
    picos_consumo: JSON.stringify(picos),
    anomalias_detectadas: anomalias,
    resumo: JSON.stringify(resumo),
    arquivo_path: null,
    gerado_em: new Date()
  });

  return relatorio;
}

async function listarRelatorios({ idSala, tipoRelatorio, idUsuario }) {
  const where = {};

  if (idSala) where.id_sala = idSala;
  if (tipoRelatorio) where.tipo_relatorio = tipoRelatorio;

  return db.Relatorio.findAll({
    where,
    include: [{ model: db.Sala, attributes: ['id_sala', 'nome'] }],
    order: [['gerado_em', 'DESC']]
  });
}

async function obterRelatorioPorId(idRelatorio) {
  const relatorio = await db.Relatorio.findByPk(idRelatorio, {
    include: [{ model: db.Sala, attributes: ['id_sala', 'nome'] }]
  });

  if (!relatorio) {
    throw new AppError('Relatório não encontrado', 404);
  }

  return relatorio;
}

module.exports = {
  criarRelatorio,
  listarRelatorios,
  obterRelatorioPorId,
  obterPeriodo
};