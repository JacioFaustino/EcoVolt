const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  processarAlertaPersistente
} =
  require('../../src/services/alertaPersistenciaService');

test(
  'alerta percorre PENDENTE, ABERTO e FECHADO',
  async () => {
    const configuracao =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          tipo_parametro:
            'R1_CONSUMO_FORA_HORARIO',
          id_sala: 1
        }
      });

    assert.ok(
      configuracao,
      'Configuração da R1 não encontrada'
    );

    const leitura =
      await db.Leitura.findOne({
        order: [
          ['id_leitura', 'ASC']
        ]
      });

    assert.ok(
      leitura,
      'Nenhuma leitura encontrada'
    );





    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R1_CONSUMO_FORA_HORARIO'
      }
    });

    const inicio =
      new Date('2026-10-01T10:00:00.000Z');

    const alertaPendente =
      await processarAlertaPersistente({
        idSala: 1,
        idConfig:
          configuracao.id_config,
        idLeitura:
          leitura.id_leitura,
        tipoAlerta:
          'R1_CONSUMO_FORA_HORARIO',
        descricao:
          'Teste automatizado da R1',
        valorDetectado: 150,
        gravidade: 'MEDIA',
        condicaoAtiva: true,
        timestamp: inicio,
        tempoPersistencia:
          Number(
            configuracao
              .tempo_persistencia_segundos
          )
      });

    assert.equal(
      alertaPendente.status,
      'PENDENTE'
    );

    const depoisDaPersistencia =
      new Date(
        inicio.getTime() +
        (
          Number(
            configuracao
              .tempo_persistencia_segundos
          ) * 1000
        )
      );

    const alertaAberto =
      await processarAlertaPersistente({
        idSala: 1,
        idConfig:
          configuracao.id_config,
        idLeitura:
          leitura.id_leitura,
        tipoAlerta:
          'R1_CONSUMO_FORA_HORARIO',
        descricao:
          'Teste automatizado da R1',
        valorDetectado: 150,
        gravidade: 'MEDIA',
        condicaoAtiva: true,
        timestamp:
          depoisDaPersistencia,
        tempoPersistencia:
          Number(
            configuracao
              .tempo_persistencia_segundos
          )
      });

    assert.equal(
      alertaAberto.status,
      'ABERTO'
    );

    const resultadoFechamento =
      await processarAlertaPersistente({
        idSala: 1,
        idConfig:
          configuracao.id_config,
        idLeitura:
          leitura.id_leitura,
        tipoAlerta:
          'R1_CONSUMO_FORA_HORARIO',
        descricao:
          'Teste automatizado da R1',
        valorDetectado: 0,
        gravidade: 'MEDIA',
        condicaoAtiva: false,
        timestamp:
          new Date(
            depoisDaPersistencia.getTime() +
            1000
          ),
        tempoPersistencia:
          Number(
            configuracao
              .tempo_persistencia_segundos
          )
      });

    assert.equal(
      resultadoFechamento,
      null
    );

    const alertaFechado =
      await db.Alerta.findOne({
        where: {
          id_sala: 1,
          tipo_alerta:
            'R1_CONSUMO_FORA_HORARIO'
        },
        order: [
          ['id_alerta', 'DESC']
        ]
      });

    assert.ok(
      alertaFechado,
      'Alerta fechado não encontrado'
    );

    assert.equal(
      alertaFechado.status,
      'FECHADO'
    );

    assert.ok(
      alertaFechado.timestamp_fim,
      'timestamp_fim não foi preenchido'
    );

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R1_CONSUMO_FORA_HORARIO'
      }
    });
  }
);