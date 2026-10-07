const db = require('../models');
const AppError = require('../utils/AppError');

function obterPeriodo(
  periodoInicio,
  periodoFim
) {
  const inicio =
    new Date(`${periodoInicio}T00:00:00`);

  const fim =
    new Date(`${periodoFim}T00:00:00`);

  fim.setDate(
    fim.getDate() + 1
  );

  return {
    inicio,
    fim
  };
}

async function validarSala(idSala) {
  const sala =
    await db.Sala.findByPk(idSala);

  if (!sala) {
    throw new AppError(
      'Sala não encontrada',
      404
    );
  }

  return sala;
}

async function calcularConsumo({
  idSala,
  inicio,
  fim
}) {
  const [resultado] =
    await db.sequelize.query(`
      SELECT
        COALESCE(
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
        idSala,
        inicio,
        fim
      ]
    });

  return Number(
    resultado[0].consumo_total
  );
}

async function calcularPicos({
  idSala,
  inicio,
  fim
}) {
  const [linhas] =
    await db.sequelize.query(`
      SELECT
        DATE_FORMAT(
          l.timestamp,
          '%Y-%m-%d %H:00:00'
        ) AS hora,
        MAX(l.potencia_ativa_W)
          AS potencia_maxima_W
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE d.id_sala = ?
        AND l.timestamp >= ?
        AND l.timestamp < ?
      GROUP BY
        DATE_FORMAT(
          l.timestamp,
          '%Y-%m-%d %H:00:00'
        )
      ORDER BY potencia_maxima_W DESC
      LIMIT 10
    `, {
      replacements: [
        idSala,
        inicio,
        fim
      ]
    });

  return linhas.map((linha) => ({
    hora: linha.hora,
    potencia_maxima_W:
      Number(linha.potencia_maxima_W)
  }));
}

async function contarAnomalias({
  idSala,
  inicio,
  fim
}) {
  const [resultado] =
    await db.sequelize.query(`
      SELECT COUNT(*) AS total
      FROM alerta
      WHERE id_sala = ?
        AND timestamp_inicio >= ?
        AND timestamp_inicio < ?
    `, {
      replacements: [
        idSala,
        inicio,
        fim
      ]
    });

  return Number(
    resultado[0].total
  );
}

async function criarRelatorio({
  dados,
  idUsuario
}) {
  await validarSala(
    dados.id_sala
  );

  const {
    inicio,
    fim
  } = obterPeriodo(
    dados.periodo_inicio,
    dados.periodo_fim
  );

  const consumoTotal =
    await calcularConsumo({
      idSala: dados.id_sala,
      inicio,
      fim
    });

  const picos =
    await calcularPicos({
      idSala: dados.id_sala,
      inicio,
      fim
    });

  const anomalias =
    await contarAnomalias({
      idSala: dados.id_sala,
      inicio,
      fim
    });

  const relatorio =
    await db.Relatorio.create({
      id_sala: dados.id_sala,
      id_usuario: idUsuario,
      tipo_relatorio:
        dados.tipo_relatorio,
      periodo_inicio:
        dados.periodo_inicio,
      periodo_fim:
        dados.periodo_fim,
      consumo_total_kWh:
        consumoTotal,
      custo_estimado: null,
      picos_consumo:
        JSON.stringify(picos),
      anomalias_detectadas:
        anomalias,
      arquivo_path: null,
      gerado_em: new Date()
    });

  return relatorio;
}

async function listarRelatorios({
  idSala,
  tipoRelatorio,
  idUsuario
}) {
  const where = {};

  if (idSala) {
    where.id_sala = idSala;
  }

  if (tipoRelatorio) {
    where.tipo_relatorio =
      tipoRelatorio;
  }

  const relatorios =
    await db.Relatorio.findAll({
      where,
      include: [
        {
          model: db.Sala,
          attributes: [
            'id_sala',
            'nome'
          ]
        }
      ],
      order: [
        ['gerado_em', 'DESC']
      ]
    });

  return relatorios;
}

async function obterRelatorioPorId(
  idRelatorio
) {
  const relatorio =
    await db.Relatorio.findByPk(
      idRelatorio,
      {
        include: [
          {
            model: db.Sala,
            attributes: [
              'id_sala',
              'nome'
            ]
          }
        ]
      }
    );

  if (!relatorio) {
    throw new AppError(
      'Relatório não encontrado',
      404
    );
  }

  return relatorio;
}

module.exports = {
  criarRelatorio,
  listarRelatorios,
  obterRelatorioPorId
};