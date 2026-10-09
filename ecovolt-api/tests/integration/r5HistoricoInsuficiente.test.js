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
  'R5 não cria alerta quando o histórico disponível é insuficiente',
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

    const timestampHistorico1 =
      '2026-03-10T10:00:00.000Z';

    const timestampHistorico2 =
      '2026-03-17T10:00:00.000Z';

    const timestampAtual =
      '2026-04-07T10:00:00.000Z';

    const todosOsTimestamps = [
      timestampHistorico1,
      timestampHistorico2,
      timestampAtual
    ];

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R5_PADRAO_HISTORICO'
      }
    });

    await db.Leitura.destroy({
      where: {
        id_sensor:
          sensor.id_sensor,
        timestamp:
          todosOsTimestamps
      }
    });

    let idsLeituras = [];

    try {
      const leituraHistorica1 =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh: 1,
          energia_acumulada_kWh: 1,
          timestamp:
            timestampHistorico1,
          qualidade_sinal: 100
        });

      const leituraHistorica2 =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh: 1,
          energia_acumulada_kWh: 1,
          timestamp:
            timestampHistorico2,
          qualidade_sinal: 100
        });

      const leituraAtual =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 50,
          tensao_rms_V: 220,
          potencia_ativa_W: 11000,
          fator_potencia: 1,
          energia_intervalo_kWh: 50,
          energia_acumulada_kWh: 50,
          timestamp:
            timestampAtual,
          qualidade_sinal: 100
        });

      idsLeituras = [
        leituraHistorica1.id_leitura,
        leituraHistorica2.id_leitura,
        leituraAtual.id_leitura
      ];

      const contexto = {
        id_sala: 1
      };

      const alerta =
        await verificarR5({
          leitura: leituraAtual,
          contexto,
          configuracao
        });

      assert.equal(
        alerta,
        null,
        'A R5 criou alerta mesmo com histórico insuficiente ' +
        '(apenas 2 semanas de dados disponíveis)'
      );
    } finally {
      await db.Alerta.destroy({
        where: {
          id_sala: 1,
          tipo_alerta:
            'R5_PADRAO_HISTORICO'
        }
      });

      if (
        idsLeituras.length > 0
      ) {
        await db.Leitura.destroy({
          where: {
            id_leitura: idsLeituras
          }
        });
      }
    }
  }
);