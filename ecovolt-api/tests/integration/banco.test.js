const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const db =
  require('../../src/models');

test(
  'consegue conectar ao banco de testes',
  async () => {
    await db.sequelize.authenticate();

    assert.ok(true);
  }
);