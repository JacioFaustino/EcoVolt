const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const {
  verificarR1
} =
  require('../../src/services/anomaliaService');

const DIAS_SEMANA = [
  'DOM',
  'SEG',
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SAB'
];

function proximaDataForaDoExpediente(
  diasPermitidos
) {
  const diaForaIndex =
    DIAS_SEMANA.findIndex(
      (dia) =>
        !diasPermitidos.includes(dia)
    );

  if (diaForaIndex === -1) {
    return null;
  }

  const agora = new Date();

  const data = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    12,
    0,
    0,
    0
  );

  const diferenca =
    (
      (diaForaIndex - data.getDay()) +
      7
    ) % 7 || 7;

  data.setDate(
    data.getDate() + diferenca
  );

  return data;
}

test(
  'R1 cria alerta quando o consumo está acima do limite fora do horário de funcionamento',
  async () => {
    const configuracao =
      await db.ConfiguracaoAlerta.findOne({
        where: {
          id_sala: 1,
          tipo_parametro:
            'R1_CONSUMO_FORA_HORARIO',
          status: 'ATIVA'
        }
      });

    assert.ok(
      configuracao,
      'Configuração da R1 não encontrada'
    );

    const sala =
      await db.Sala.findByPk(1);

    assert.ok(
      sala,
      'Sala 1 não encontrada'
    );

    const diasPermitidos =
      String(
        sala.dias_funcionamento || ''
      )
        .split(',')
        .map((dia) =>
          dia.trim().toUpperCase()
        )
        .filter(Boolean);

    const instanteForaDoHorario =
      proximaDataForaDoExpediente(
        diasPermitidos
      );

    assert.ok(
      instanteForaDoHorario,
      'Não foi possível calcular uma data fora do expediente ' +
      '(a sala está configurada para funcionar todos os dias da semana)'
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
          'R1_CONSUMO_FORA_HORARIO'
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
          timestamp:
            instanteForaDoHorario,
          qualidade_sinal: 100
        });

      const contexto = {
        id_sala: 1,
        dias_funcionamento:
          sala.dias_funcionamento,
        horario_inicio:
          sala.horario_inicio,
        horario_fim:
          sala.horario_fim,
        capacidade_max_W:
          sala.capacidade_max_W
      };

      const alerta =
        await verificarR1({
          leitura,
          contexto,
          configuracao
        });

      assert.ok(
        alerta,
        'A R1 não retornou alerta'
      );

      assert.equal(
        alerta.tipo_alerta,
        'R1_CONSUMO_FORA_HORARIO'
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
            'R1_CONSUMO_FORA_HORARIO'
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