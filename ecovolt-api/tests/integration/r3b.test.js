const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  verificarR3B
} =
  require('../../src/services/anomaliaService');

test(
  'R3B cria alerta persistente quando a porta continua aberta após o tempo total de R3A + R3B',
  async () => {
    const configuracaoR3A =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R3A_PORTA_ABERTA',
          status: 'ATIVA'
        }
      });

    const configuracaoR3B =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R3B_PORTA_ABERTA_PERSISTENTE',
          status: 'ATIVA'
        }
      });

    assert.ok(
      configuracaoR3A,
      'Configuração da R3A não encontrada'
    );

    assert.ok(
      configuracaoR3B,
      'Configuração da R3B não encontrada'
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

    const limiteR3B =
      Number(
        configuracaoR3B.valor_limite
      );

    const tempoTotal =
      Number(
        configuracaoR3A
          .tempo_persistencia_segundos
      ) +
      Number(
        configuracaoR3B
          .tempo_persistencia_segundos
      );

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta: [
          'R3A_PORTA_ABERTA',
          'R3B_PORTA_ABERTA_PERSISTENTE'
        ]
      }
    });

    let leitura = null;

    try {
      leitura =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 5,
          tensao_rms_V: 220,
          potencia_ativa_W:
            limiteR3B + 100,
          fator_potencia: 1,
          energia_intervalo_kWh: 1,
          energia_acumulada_kWh: 1,
          timestamp: new Date(),
          qualidade_sinal: 100
        });

      const agora = new Date();

      const inicioR3APassado =
        new Date(
          agora.getTime() -
          (tempoTotal + 120) * 1000
        );

      await db.Alerta.create({
        id_sala: 1,
        id_config:
          configuracaoR3A.id_config,
        id_leitura:
          leitura.id_leitura,
        tipo_alerta:
          'R3A_PORTA_ABERTA',
        descricao:
          'Fixture de teste - R3A já aberto',
        valor_detectado:
          limiteR3B + 100,
        timestamp_inicio:
          inicioR3APassado,
        status: 'ABERTO',
        gravidade: 'MEDIA'
      });

      const estadoPorta = {
        estado: 'ABERTA'
      };

      const alerta =
        await verificarR3B({
          leitura,
          contexto: {
            id_sala: 1
          },
          estadoPorta,
          configuracaoR3A,
          configuracaoR3B
        });

      assert.ok(
        alerta,
        'A R3B não retornou alerta'
      );

      assert.equal(
        alerta.tipo_alerta,
        'R3B_PORTA_ABERTA_PERSISTENTE'
      );

      assert.equal(
        alerta.status,
        'ABERTO'
      );

      assert.equal(
        alerta.gravidade,
        'ALTA'
      );
    } finally {
      await db.Alerta.destroy({
        where: {
          id_sala: 1,
          tipo_alerta: [
            'R3A_PORTA_ABERTA',
            'R3B_PORTA_ABERTA_PERSISTENTE'
          ]
        }
      });

      if (leitura) {
        await db.Leitura.destroy({
          where: {
            id_leitura:
              leitura.id_leitura
          }
        });
      }
    }
  }
);