const db = require('../models');
const AppError = require('../utils/AppError');
const { obterTarifaKwh, calcularCustoReais } = require('../utils/custo');

const {
  intervaloDoDiaUtc,
  intervaloDoMesUtc,
  paraDataUtc
} = require('../utils/periodo');

async function listar() {
  const dia = intervaloDoDiaUtc(new Date());
  const mes = intervaloDoMesUtc(new Date());

  const [linhas] =
    await db.sequelize.query(`
      SELECT
        s.id_sala,
        s.nome,
        s.localizacao,
        s.capacidade_max_W,
        s.dias_funcionamento,
        s.horario_inicio,
        s.horario_fim,
        d.status_operacao,
        (
          SELECT l.potencia_ativa_W
          FROM leitura l
          WHERE l.id_sensor = se.id_sensor
          ORDER BY l.timestamp DESC, l.id_leitura DESC
          LIMIT 1
        ) AS potencia_ativa_W,
        (
          SELECT l.timestamp
          FROM leitura l
          WHERE l.id_sensor = se.id_sensor
          ORDER BY l.timestamp DESC, l.id_leitura DESC
          LIMIT 1
        ) AS timestamp,
        (
          SELECT ep.estado
          FROM estado_porta ep
          JOIN sensor sp
            ON sp.id_sensor = ep.id_sensor
          WHERE sp.id_dispositivo =
                d.id_dispositivo
            AND sp.tipo = 'PORTA'
            AND sp.status = 'ATIVO'
          ORDER BY
            ep.timestamp DESC,
            ep.id_estado DESC
          LIMIT 1
        ) AS estado_porta
      FROM sala s
      JOIN dispositivo d
        ON d.id_sala = s.id_sala
      JOIN sensor se
        ON se.id_dispositivo =
           d.id_dispositivo
       AND se.tipo = 'CORRENTE'
      ORDER BY s.id_sala
    `);

  const [agregacoes] =
    await db.sequelize.query(`
      SELECT
        d.id_sala,
        SUM(
          CASE
            WHEN l.timestamp >= ? AND
                 l.timestamp < ?
            THEN l.energia_intervalo_kWh
            ELSE 0
          END
        ) AS consumo_dia_kWh,
        SUM(
          CASE
            WHEN l.timestamp >= ? AND
                 l.timestamp < ?
            THEN l.energia_intervalo_kWh
            ELSE 0
          END
        ) AS consumo_mes_kWh,
        MAX(
          CASE
            WHEN l.timestamp >= ? AND
                 l.timestamp < ?
            THEN l.potencia_ativa_W
            ELSE NULL
          END
        ) AS pico_potencia_W
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE l.timestamp >= ?
        AND l.timestamp < ?
      GROUP BY d.id_sala
    `, {
      replacements: [
        dia.inicio,
        dia.fim,
        mes.inicio,
        mes.fim,
        dia.inicio,
        dia.fim,
        mes.inicio,
        mes.fim
      ]
    });

  const [contagens] =
    await db.sequelize.query(`
      SELECT
        id_sala,
        COUNT(*) AS alertas_abertos
      FROM alerta
      WHERE status = 'ABERTO'
      GROUP BY id_sala
    `);

  const [sensores] =
    await db.sequelize.query(`
      SELECT
        d.id_sala,
        se.id_sensor,
        se.nome,
        se.tipo,
        se.modelo,
        se.unidade_medida,
        se.status
      FROM sensor se
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      ORDER BY se.id_sensor
    `);

  const agregacoesPorSala = new Map(
    agregacoes.map((linha) => [
      Number(linha.id_sala),
      linha
    ])
  );

  const alertasPorSala = new Map(
    contagens.map((linha) => [
      Number(linha.id_sala),
      Number(linha.alertas_abertos)
    ])
  );

  const sensoresPorSala = new Map();

  sensores.forEach((sensor) => {
    const idSala = Number(sensor.id_sala);

    if (!sensoresPorSala.has(idSala)) {
      sensoresPorSala.set(idSala, []);
    }

    sensoresPorSala.get(idSala).push({
      id_sensor: sensor.id_sensor,
      nome: sensor.nome,
      tipo: sensor.tipo,
      modelo: sensor.modelo,
      unidade_medida: sensor.unidade_medida,
      status: sensor.status
    });
  });

  return linhas.map((linha) => {
    const agregacao = agregacoesPorSala.get(
      Number(linha.id_sala)
    );

    return {
      ...linha,
      consumo_dia_kWh: agregacao
        ? agregacao.consumo_dia_kWh
        : null,
      consumo_mes_kWh: agregacao
        ? agregacao.consumo_mes_kWh
        : null,
      pico_potencia_W: agregacao
        ? agregacao.pico_potencia_W
        : null,
      custo_dia_reais: calcularCustoReais(
        agregacao ? agregacao.consumo_dia_kWh : null
      ),
      custo_mes_reais: calcularCustoReais(
        agregacao ? agregacao.consumo_mes_kWh : null
      ),
      tarifa_kwh: obterTarifaKwh(),
      alertas_abertos:
        alertasPorSala.get(
          Number(linha.id_sala)
        ) || 0,
      sensores:
        sensoresPorSala.get(
          Number(linha.id_sala)
        ) || []
    };
  });
}

async function consumoPorHora(idSala, filtros = {}) {
  const sala = await db.Sala.findByPk(idSala);

  if (!sala) {
    throw new AppError(
      'Sala não encontrada',
      404
    );
  }

  const inicio = filtros.dataInicio
    ? paraDataUtc(
        filtros.dataInicio,
        'data_inicio'
      )
    : null;

  const fim = filtros.dataFim
    ? paraDataUtc(
        filtros.dataFim,
        'data_fim'
      )
    : null;

  if (inicio && fim && fim < inicio) {
    throw new AppError(
      'data_fim não pode ser anterior a data_inicio',
      400
    );
  }

  const condicoes = [];
  const replacements = [idSala];

  if (inicio) {
    condicoes.push(
      'AND l.timestamp >= ?'
    );

    replacements.push(
      intervaloDoDiaUtc(inicio).inicio
    );
  }

  if (fim) {
    condicoes.push(
      'AND l.timestamp < ?'
    );

    replacements.push(
      intervaloDoDiaUtc(fim).fim
    );
  }

  const [linhas] =
    await db.sequelize.query(`
      SELECT
        HOUR(l.timestamp) AS hora,
        SUM(
          l.energia_intervalo_kWh
        ) AS consumo_kWh
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE d.id_sala = ?
      ${condicoes.join('\n      ')}
      GROUP BY HOUR(l.timestamp)
      ORDER BY hora
    `, {
      replacements
    });

  return linhas.map((linha) => ({
      ...linha,
      custo_reais: calcularCustoReais(linha.consumo_kWh)
    }));
}

module.exports = {
  listar,
  consumoPorHora
};