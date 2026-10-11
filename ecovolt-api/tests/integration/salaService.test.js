const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const salaService =
  require('../../src/services/salaService');

async function obterSensorCorrenteDaSala(
  idSala
) {
  return db.Sensor.findOne({
    where: {
      tipo: 'CORRENTE'
    },
    include: [
      {
        model: db.Dispositivo,
        where: {
          id_sala: idSala
        }
      }
    ]
  });
}

test(
  'listar devolve os campos novos e as agregações por sala',
  async () => {
    const sensor =
      await obterSensorCorrenteDaSala(1);

    assert.ok(
      sensor,
      'Sensor da sala 1 não encontrado'
    );

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

    const antes =
      await salaService.listar();

    const salaAntes = antes.find(
      (sala) => Number(sala.id_sala) === 1
    );

    assert.ok(
      salaAntes,
      'Sala 1 não apareceu em GET /api/salas'
    );

    assert.equal(
      salaAntes.status_operacao,
      'ONLINE'
    );

    assert.notEqual(
      salaAntes.capacidade_max_W,
      null
    );

    assert.notEqual(
      salaAntes.horario_inicio,
      null
    );

    assert.notEqual(
      salaAntes.horario_fim,
      null
    );

    assert.notEqual(
      salaAntes.dias_funcionamento,
      null
    );


    assert.equal(
      salaAntes.estado_porta,
      'ABERTA'
    );

    assert.equal(
      typeof salaAntes.alertas_abertos,
      'number'
    );

    let leitura = null;
    let alerta = null;

    try {
      leitura = await db.Leitura.create({
        id_sensor: sensor.id_sensor,
        corrente_rms_A: 2,
        tensao_rms_V: 220,
        potencia_ativa_W: 2000,
        fator_potencia: 1,
        energia_intervalo_kWh: 0.5,
        energia_acumulada_kWh: 1,
        timestamp: new Date(),
        qualidade_sinal: 100
      });

      alerta = await db.Alerta.create({
        id_sala: 1,
        id_config: configuracao.id_config,
        tipo_alerta:
          'R1_CONSUMO_FORA_HORARIO',
        descricao:
          'Teste das agregações de GET /api/salas',
        valor_detectado: 1,
        timestamp_inicio: new Date(),
        status: 'ABERTO',
        gravidade: 'MEDIA'
      });

      const depois =
        await salaService.listar();

      const salaDepois = depois.find(
        (sala) =>
          Number(sala.id_sala) === 1
      );

      assert.ok(
        salaDepois,
        'Sala 1 não apareceu em GET /api/salas'
      );

      const diferencaDia =
        Number(salaDepois.consumo_dia_kWh) -
        Number(salaAntes.consumo_dia_kWh || 0);

      const diferencaMes =
        Number(salaDepois.consumo_mes_kWh) -
        Number(salaAntes.consumo_mes_kWh || 0);

      assert.ok(
        Math.abs(diferencaDia - 0.5) < 1e-6,
        'consumo_dia_kWh deveria crescer 0.5 ' +
        `(cresceu ${diferencaDia})`
      );

      assert.ok(
        Math.abs(diferencaMes - 0.5) < 1e-6,
        'consumo_mes_kWh deveria crescer 0.5 ' +
        `(cresceu ${diferencaMes})`
      );

      assert.ok(
        Number(salaDepois.pico_potencia_W) >=
          2000,
        'pico_potencia_W deveria incluir ' +
        'a leitura de 2000 W'
      );

      assert.equal(
        salaDepois.alertas_abertos,
        (salaAntes.alertas_abertos || 0) + 1
      );
    } finally {
      if (alerta) {
        await db.Alerta.destroy({
          where: {
            id_alerta: alerta.id_alerta
          }
        });
      }

      if (leitura) {
        await db.Leitura.destroy({
          where: {
            id_leitura: leitura.id_leitura
          }
        });
      }
    }
  }
);

test(
  'consumoPorHora filtra por data (dias inclusivos, em UTC)',
  async () => {
    const sensor =
      await obterSensorCorrenteDaSala(1);

    assert.ok(
      sensor,
      'Sensor da sala 1 não encontrado'
    );

  
    const dia = '2026-03-10';
    const diaSeguinte = '2026-03-11';

    const timestamps = [
      '2026-03-10T10:15:00.000Z',
      '2026-03-10T11:45:00.000Z',
      '2026-03-11T09:00:00.000Z'
    ];

    await db.Leitura.destroy({
      where: {
        id_sensor: sensor.id_sensor,
        timestamp: timestamps
      }
    });

    const criadas = [];

    try {
      criadas.push(
        await db.Leitura.create({
          id_sensor: sensor.id_sensor,
          corrente_rms_A: 1,
          tensao_rms_V: 220,
          potencia_ativa_W: 220,
          fator_potencia: 1,
          energia_intervalo_kWh: 1.25,
          energia_acumulada_kWh: 1,
          timestamp: timestamps[0],
          qualidade_sinal: 100
        })
      );

      criadas.push(
        await db.Leitura.create({
          id_sensor: sensor.id_sensor,
          corrente_rms_A: 0.68,
          tensao_rms_V: 220,
          potencia_ativa_W: 150,
          fator_potencia: 1,
          energia_intervalo_kWh: 0.75,
          energia_acumulada_kWh: 1,
          timestamp: timestamps[1],
          qualidade_sinal: 100
        })
      );

      criadas.push(
        await db.Leitura.create({
          id_sensor: sensor.id_sensor,
          corrente_rms_A: 2.27,
          tensao_rms_V: 220,
          potencia_ativa_W: 500,
          fator_potencia: 1,
          energia_intervalo_kWh: 99,
          energia_acumulada_kWh: 1,
          timestamp: timestamps[2],
          qualidade_sinal: 100
        })
      );

      const linhas =
        await salaService.consumoPorHora(1, {
          dataInicio: dia,
          dataFim: dia
        });

      assert.equal(
        linhas.length,
        2,
        'O filtro deveria trazer só as ' +
        'duas leituras do dia informado'
      );

      const porHora = new Map(
        linhas.map((linha) => [
          Number(linha.hora),
          Number(linha.consumo_kWh)
        ])
      );

      assert.ok(
        Math.abs(porHora.get(10) - 1.25) < 1e-6,
        'A hora 10 do dia deveria somar 1.25 kWh'
      );

      assert.ok(
        Math.abs(porHora.get(11) - 0.75) < 1e-6,
        'A hora 11 do dia deveria somar 0.75 kWh'
      );

      assert.equal(
        porHora.get(9),
        undefined,
        'A leitura do dia seguinte ' +
        'não deveria aparecer'
      );

   
      const historico =
        await salaService.consumoPorHora(1);

      const porHoraHistorico = new Map(
        historico.map((linha) => [
          Number(linha.hora),
          Number(linha.consumo_kWh)
        ])
      );

      assert.ok(
        porHoraHistorico.get(9) >= 99,
        'Sem filtro, o histórico deveria ' +
        'incluir a leitura de 99 kWh'
      );
    } finally {
      if (criadas.length > 0) {
        await db.Leitura.destroy({
          where: {
            id_leitura: criadas.map(
              (leitura) => leitura.id_leitura
            )
          }
        });
      }
    }
  }
);

test(
  'consumoPorHora rejeita datas inválidas e períodos invertidos',
  async () => {
    await assert.rejects(
      () =>
        salaService.consumoPorHora(1, {
          dataInicio: '11/10/2026'
        }),
      /data_inicio/
    );

    await assert.rejects(
      () =>
        salaService.consumoPorHora(1, {
          dataInicio: '2026-02-31'
        }),
      /data_inicio/
    );

    await assert.rejects(
      () =>
        salaService.consumoPorHora(1, {
          dataInicio: '2026-03-11',
          dataFim: '2026-03-10'
        }),
      /data_fim/
    );

    await assert.rejects(
      () => salaService.consumoPorHora(9999),
      /Sala não encontrada/
    );
  }
);