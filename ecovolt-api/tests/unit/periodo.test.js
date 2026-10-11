const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const {
  formatarDataSqlUtc,
  paraDataUtc,
  intervaloDoDiaUtc,
  intervaloDoMesUtc
} = require('../../src/utils/periodo');

test(
  'formatarDataSqlUtc formata a data em UTC',
  () => {
    assert.equal(
      formatarDataSqlUtc(
        new Date('2026-10-11T03:04:05.000Z')
      ),
      '2026-10-11 03:04:05'
    );
  }
);

test(
  'intervaloDoDiaUtc cobre o dia inteiro em UTC',
  () => {
    const intervalo = intervaloDoDiaUtc(
      new Date('2026-10-11T15:30:45.000Z')
    );

    assert.equal(
      intervalo.inicio,
      '2026-10-11 00:00:00'
    );

    assert.equal(
      intervalo.fim,
      '2026-10-12 00:00:00'
    );
  }
);

test(
  'intervaloDoDiaUtc vira o mês corretamente',
  () => {
    const intervalo = intervaloDoDiaUtc(
      new Date('2026-10-31T23:59:59.000Z')
    );

    assert.equal(
      intervalo.inicio,
      '2026-10-31 00:00:00'
    );

    assert.equal(
      intervalo.fim,
      '2026-11-01 00:00:00'
    );
  }
);

test(
  'intervaloDoMesUtc cobre o mês e vira o ano',
  () => {
    const dezembro = intervaloDoMesUtc(
      new Date('2026-12-15T10:00:00.000Z')
    );

    assert.equal(
      dezembro.inicio,
      '2026-12-01 00:00:00'
    );

    assert.equal(
      dezembro.fim,
      '2027-01-01 00:00:00'
    );

    const fevereiro = intervaloDoMesUtc(
      new Date('2026-02-28T23:00:00.000Z')
    );

    assert.equal(
      fevereiro.inicio,
      '2026-02-01 00:00:00'
    );

    assert.equal(
      fevereiro.fim,
      '2026-03-01 00:00:00'
    );
  }
);

test(
  'paraDataUtc aceita YYYY-MM-DD e rejeita formatos e datas inválidas',
  () => {
    const data = paraDataUtc(
      '2026-10-11',
      'data_inicio'
    );

    assert.equal(
      data.toISOString(),
      '2026-10-11T00:00:00.000Z'
    );

    const invalidas = [
      '11/10/2026',
      '2026-13-01',
      '2026-02-31',
      '2026-10-11T00:00:00.000Z',
      '',
      null,
      ['2026-10-11']
    ];

    for (const invalida of invalidas) {
      assert.throws(
        () =>
          paraDataUtc(
            invalida,
            'data_inicio'
          ),
        /data_inicio/
      );
    }
  }
);