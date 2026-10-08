const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  verificarR5
} =
  require('../../src/services/anomaliaService');

test(
  'R5 cria alerta quando o consumo atual supera o padrão histórico',
  async () => {
    const configuracao =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R5_PADRAO_HISTORICO',
          status: 'ATIVA'
        }
      });

    assert.ok(
      configuracao,
      'Configuração da R5 não encontrada'
    );

    const sensor =
      await db.Sensor.findOne({
        include: [
          {
            model: db.Dispositivo,
            where: {
              id_sala: 1
            }
          }
        ]
      });

    assert.ok(
      sensor,
      'Sensor da sala 1 não encontrado'
    );

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R5_PADRAO_HISTORICO'
      }
    });

    const timestampsHistoricos = [
      '2026-09-10 10:00:00',
      '2026-09-17 10:00:00',
      '2026-09-24 10:00:00',
      '2026-10-01 10:00:00'
    ];

    const timestampAtual =
      '2026-10-08 10:00:00';

    await db.Leitura.destroy({
      where: {
        id_sensor:
          sensor.id_sensor,
        timestamp: [
          ...timestampsHistoricos,
          timestampAtual
        ]
      }
    });

    const leiturasHistoricas = [];

    for (
      const timestamp
      of timestampsHistoricos
    ) {
      const leitura =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh: 1,
          energia_acumulada_kWh: 1,
          timestamp,
          qualidade_sinal: 100
        });

      leiturasHistoricas.push(
        leitura.id_leitura
      );
    }

    const leituraAtual =
      await db.Leitura.create({
        id_sensor:
          sensor.id_sensor,
        corrente_rms_A: 10,
        tensao_rms_V: 220,
        potencia_ativa_W: 2200,
        fator_potencia: 1,
        energia_intervalo_kWh: 10,
        energia_acumulada_kWh: 10,
        timestamp:
          timestampAtual,
        qualidade_sinal: 100
      });

    const contexto = {
      id_sala: 1
    };

    const [
      historicoDiagnostico
    ] = await db.sequelize.query(`
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
      WHERE d.id_sala = 1
        AND l.timestamp >= '2026-09-10 10:00:00'
        AND l.timestamp < '2026-10-08 10:00:00'
        AND DAYOFWEEK(l.timestamp) =
            DAYOFWEEK('2026-10-08 10:00:00')
        AND HOUR(l.timestamp) =
            HOUR('2026-10-08 10:00:00')
      GROUP BY
        DATE_FORMAT(
          l.timestamp,
          '%Y-%m-%d %H:00:00'
        )
      ORDER BY hora_referencia
    `);

    const [
      atualDiagnostico
    ] = await db.sequelize.query(`
      SELECT
        SUM(
          l.energia_intervalo_kWh
        ) AS consumo_atual
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE d.id_sala = 1
        AND l.timestamp >= '2026-10-08 10:00:00'
        AND l.timestamp < '2026-10-08 11:00:00'
    `);

    console.log(
      'Histórico usado pela R5:',
      historicoDiagnostico
    );

    console.log(
      'Consumo atual usado pela R5:',
      atualDiagnostico
    );

    const alerta =
      await verificarR5({
        leitura: leituraAtual,
        contexto,
        configuracao
      });

    assert.ok(
      alerta,
      'A R5 não retornou alerta'
    );

    assert.equal(
      alerta.tipo_alerta,
      'R5_PADRAO_HISTORICO'
    );

    assert.equal(
      alerta.status,
      'ABERTO'
    );

    assert.equal(
      Number(alerta.valor_detectado),
      10
    );

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R5_PADRAO_HISTORICO'
      }
    });

    await db.Leitura.destroy({
      where: {
        id_leitura: [
          ...leiturasHistoricas,
          leituraAtual.id_leitura
        ]
      }
    });
  }
);