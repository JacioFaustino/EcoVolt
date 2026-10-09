const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  verificarR6
} =
  require('../../src/services/anomaliaService');

test(
  'R6 soma apenas o consumo do dia certo em UTC e cria alerta quando excede o limite diário',
  async () => {
    const configuracao =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R6_LIMITE_DIARIO',
          status: 'ATIVA'
        }
      });

    assert.ok(
      configuracao,
      'Configuração da R6 não encontrada'
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

    const limite =
      Number(
        configuracao.valor_limite
      );

    const timestampForaAntes =
      '2026-02-01T23:59:00.000Z';

    const timestampDentroInicio =
      '2026-02-02T00:00:00.000Z';

    const timestampDentroFim =
      '2026-02-02T23:59:00.000Z';

    const timestampForaDepois =
      '2026-02-03T00:00:00.000Z';

    const todosOsTimestamps = [
      timestampForaAntes,
      timestampDentroInicio,
      timestampDentroFim,
      timestampForaDepois
    ];

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R6_LIMITE_DIARIO'
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
      const leituraForaAntes =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh:
            limite * 50,
          energia_acumulada_kWh:
            limite * 50,
          timestamp:
            timestampForaAntes,
          qualidade_sinal: 100
        });

      const leituraDentroInicio =
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
            timestampDentroInicio,
          qualidade_sinal: 100
        });

      const leituraDentroFim =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh:
            limite,
          energia_acumulada_kWh:
            limite,
          timestamp:
            timestampDentroFim,
          qualidade_sinal: 100
        });

      const leituraForaDepois =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh:
            limite * 50,
          energia_acumulada_kWh:
            limite * 50,
          timestamp:
            timestampForaDepois,
          qualidade_sinal: 100
        });

      idsLeituras = [
        leituraForaAntes.id_leitura,
        leituraDentroInicio.id_leitura,
        leituraDentroFim.id_leitura,
        leituraForaDepois.id_leitura
      ];

      const contexto = {
        id_sala: 1
      };


      
      const alerta =
        await verificarR6({
          leitura: leituraDentroFim,
          contexto,
          configuracao
        });

      assert.ok(
        alerta,
        'A R6 não retornou alerta'
      );

      assert.equal(
        alerta.tipo_alerta,
        'R6_LIMITE_DIARIO'
      );

      assert.equal(
        alerta.status,
        'ABERTO'
      );

      const consumoEsperado =
        1 + limite;

      assert.equal(
        Number(
          alerta.valor_detectado
        ),
        consumoEsperado
      );
    } finally {
      await db.Alerta.destroy({
        where: {
          id_sala: 1,
          tipo_alerta:
            'R6_LIMITE_DIARIO'
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