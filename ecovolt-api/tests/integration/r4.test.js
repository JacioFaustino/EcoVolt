const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  verificarR4
} =
  require('../../src/services/anomaliaService');

test(
  'R4 cria alerta quando a potência ultrapassa a capacidade máxima da sala',
  async () => {
    const configuracao =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R4_SOBRECARGA',
          status: 'ATIVA'
        }
      });

    assert.ok(
      configuracao,
      'Configuração da R4 não encontrada'
    );

    const sala =
      await db.Sala.findByPk(1);

    assert.ok(
      sala,
      'Sala 1 não encontrada'
    );

    const capacidadeMaxima =
      Number(sala.capacidade_max_W);

    assert.ok(
      Number.isFinite(
        capacidadeMaxima
      ),
      'capacidade_max_W da sala não é um número válido'
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
          'R4_SOBRECARGA'
      }
    });

    let leitura = null;

    try {
      leitura =
        await db.Leitura.create({
          id_sensor:
            sensor.id_sensor,
          corrente_rms_A: 50,
          tensao_rms_V: 220,
          potencia_ativa_W:
            capacidadeMaxima + 500,
          fator_potencia: 1,
          energia_intervalo_kWh: 1,
          energia_acumulada_kWh: 1,
          timestamp: new Date(),
          qualidade_sinal: 100
        });

      const contexto = {
        id_sala: 1,
        capacidade_max_W:
          sala.capacidade_max_W
      };

      const alerta =
        await verificarR4({
          leitura,
          contexto,
          configuracao
        });

      assert.ok(
        alerta,
        'A R4 não retornou alerta'
      );

      assert.equal(
        alerta.tipo_alerta,
        'R4_SOBRECARGA'
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
        capacidadeMaxima + 500
      );
    } finally {
      await db.Alerta.destroy({
        where: {
          id_sala: 1,
          tipo_alerta:
            'R4_SOBRECARGA'
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