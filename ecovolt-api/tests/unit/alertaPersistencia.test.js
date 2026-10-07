const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const alertaPersistenciaService =
  require('../../src/services/alertaPersistenciaService');

test(
  'serviço de persistência de alertas exporta a função principal',
  () => {
    assert.equal(
      typeof alertaPersistenciaService
        .processarAlertaPersistente,
      'function'
    );
  }
);