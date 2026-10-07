const test =
  require('node:test');

const assert =
  require('node:assert/strict');

test(
  'ambiente de testes está funcionando',
  () => {
    assert.equal(
      1 + 1,
      2
    );
  }
);