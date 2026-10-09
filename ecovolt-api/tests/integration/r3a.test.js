const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  verificarR3A
} =
  require('../../src/services/anomaliaService');

test(
  'R3A cria alerta quando a porta está aberta com o ar-condicionado acima do limite',
  async () => {
    const configuracao =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R3A_PORTA_ABERTA',
          status: 'ATIVA'
        }
      });

    assert.ok(
      configuracao,
      'Configuração da R3A não encontrada'
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

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R3A_PORTA_ABERTA'
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
            limite + 100,
          fator_potencia: 1,
          energia_intervalo_kWh: 1,
          energia_acumulada_kWh: 1,
          timestamp: new Date(),
          qualidade_sinal: 100
        });

      const estadoPorta = {
        estado: 'ABERTA'
      };

      const alerta =
        await verificarR3A({
          leitura,
          contexto: {
            id_sala: 1
          },
          estadoPorta,
          configuracao
        });

      assert.ok(
        alerta,
        'A R3A não retornou alerta'
      );

      assert.equal(
        alerta.tipo_alerta,
        'R3A_PORTA_ABERTA'
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
        limite + 100
      );
    } finally {
      await db.Alerta.destroy({
        where: {
          id_sala: 1,
          tipo_alerta:
            'R3A_PORTA_ABERTA'
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