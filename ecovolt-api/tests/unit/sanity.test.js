const test =
  require('node:test');

const assert =
  require('node:assert/strict');

test(
  'ambiente de testes utiliza o banco de teste',
  () => {
    assert.equal(
      process.env.DB_NAME_TEST,
      'ecovolt_test'
    );

    assert.equal(
      process.env.NODE_ENV,
      'test'
    );
  }
);

test(
  'ambiente de testes está funcionando',
  () => {
    assert.equal(
      1 + 1,
      2
    );
  }
);