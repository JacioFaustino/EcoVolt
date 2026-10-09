const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  verificarR8
} =
  require('../../src/services/anomaliaService');

test(
  'R8 cria alerta quando a leitura vem com corrente inválida',
  async () => {
    const configuracao =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R8_FALHA_LEITURA',
          status: 'ATIVA'
        }
      });

    assert.ok(
      configuracao,
      'Configuração da R8 não encontrada'
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
          'R8_FALHA_LEITURA'
      }
    });

    let leitura = null;

    try {
      leitura =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: -1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh: 1,
          energia_acumulada_kWh: 1,
          timestamp: new Date(),
          qualidade_sinal: 80
        });

      const alerta =
        await verificarR8({
          leitura,
          contexto: {
            id_sala: 1
          },
          configuracao
        });

      assert.ok(
        alerta,
        'A R8 não retornou alerta'
      );

      assert.equal(
        alerta.tipo_alerta,
        'R8_FALHA_LEITURA'
      );

      const tempoPersistencia =
        Number(
          configuracao
            .tempo_persistencia_segundos
        );

      const statusEsperado =
        tempoPersistencia > 0
          ? 'PENDENTE'
          : 'ABERTO';

      assert.equal(
        alerta.status,
        statusEsperado
      );

      assert.equal(
        Number(
          alerta.valor_detectado
        ),
        80
      );
    } finally {
      await db.Alerta.destroy({
        where: {
          id_sala: 1,
          tipo_alerta:
            'R8_FALHA_LEITURA'
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