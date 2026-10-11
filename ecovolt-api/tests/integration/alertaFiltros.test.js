const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

const alertaService =
  require('../../src/services/alertaService');

test(
  'listar aceita data_inicio, data_fim e status=TODOS',
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


    const dia = '2026-03-10';
    const diaCinco = '2026-03-15';

    const instanteDia =
      new Date('2026-03-10T12:00:00.000Z');

    const instanteCinco =
      new Date('2026-03-15T12:00:00.000Z');

    await db.Alerta.destroy({
      where: {
        id_sala: 1,
        tipo_alerta:
          'R1_CONSUMO_FORA_HORARIO',
        timestamp_inicio: [
          instanteDia,
          instanteCinco
        ]
      }
    });

    const criados = [];

    try {
      criados.push(
        await db.Alerta.create({
          id_sala: 1,
          id_config: configuracao.id_config,
          tipo_alerta:
            'R1_CONSUMO_FORA_HORARIO',
          descricao:
            'Teste de filtros: aberto no dia',
          valor_detectado: 1,
          timestamp_inicio: instanteDia,
          status: 'ABERTO',
          gravidade: 'MEDIA'
        })
      );

      criados.push(
        await db.Alerta.create({
          id_sala: 1,
          id_config: configuracao.id_config,
          tipo_alerta:
            'R1_CONSUMO_FORA_HORARIO',
          descricao:
            'Teste de filtros: fechado no dia',
          valor_detectado: 1,
          timestamp_inicio: instanteDia,
          timestamp_fim: instanteDia,
          status: 'FECHADO',
          gravidade: 'MEDIA'
        })
      );

      criados.push(
        await db.Alerta.create({
          id_sala: 1,
          id_config: configuracao.id_config,
          tipo_alerta:
            'R1_CONSUMO_FORA_HORARIO',
          descricao:
            'Teste de filtros: aberto cinco dias depois',
          valor_detectado: 1,
          timestamp_inicio: instanteCinco,
          status: 'ABERTO',
          gravidade: 'MEDIA'
        })
      );

      const [
        abertoDia,
        fechadoDia,
        abertoCinco
      ] = criados.map(
        (alerta) => alerta.id_alerta
      );

      const noDia =
        await alertaService.listar({
          status: 'TODOS',
          data_inicio: dia,
          data_fim: dia
        });

      const idsNoDia = noDia.map(
        (alerta) => alerta.id_alerta
      );

      assert.equal(noDia.length, 2);

      assert.ok(idsNoDia.includes(abertoDia));

      assert.ok(idsNoDia.includes(fechadoDia));

      assert.ok(
        !idsNoDia.includes(abertoCinco)
      );

   
      const fechados =
        await alertaService.listar({
          status: 'FECHADO',
          data_inicio: dia,
          data_fim: dia
        });

      const idsFechados = fechados.map(
        (alerta) => alerta.id_alerta
      );

      assert.equal(fechados.length, 1);

      assert.ok(idsFechados.includes(fechadoDia));

      assert.ok(!idsFechados.includes(abertoDia));


      const padrao =
        await alertaService.listar({
          data_inicio: dia,
          data_fim: dia
        });

      const idsPadrao = padrao.map(
        (alerta) => alerta.id_alerta
      );

      assert.equal(padrao.length, 1);

      assert.ok(idsPadrao.includes(abertoDia));

      assert.ok(!idsPadrao.includes(fechadoDia));

  
      const noDiaCinco =
        await alertaService.listar({
          status: 'TODOS',
          data_inicio: diaCinco,
          data_fim: diaCinco
        });

      const idsNoDiaCinco = noDiaCinco.map(
        (alerta) => alerta.id_alerta
      );

      assert.equal(noDiaCinco.length, 1);

      assert.ok(
        idsNoDiaCinco.includes(abertoCinco)
      );

      assert.ok(
        !idsNoDiaCinco.includes(abertoDia)
      );
    } finally {
      if (criados.length > 0) {
        await db.Alerta.destroy({
          where: {
            id_alerta: criados.map(
              (alerta) => alerta.id_alerta
            )
          }
        });
      }
    }
  }
);

test(
  'listar rejeita datas inválidas e períodos invertidos',
  async () => {
    await assert.rejects(
      () =>
        alertaService.listar({
          data_inicio: '10/03/2026'
        }),
      /data_inicio/
    );

    await assert.rejects(
      () =>
        alertaService.listar({
          data_inicio: '2026-03-15',
          data_fim: '2026-03-10'
        }),
      /data_fim/
    );
  }
);