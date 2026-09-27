'use strict';
module.exports = {
  up: (qi) => qi.bulkInsert('atuador', [
    { id_dispositivo: 1, tipo_atuador: 'BUZZER', modelo: 'Buzzer ativo 5V', pino_gpio: 25, status: 'ATIVO' },
    { id_dispositivo: 2, tipo_atuador: 'BUZZER', modelo: 'Buzzer ativo 5V', pino_gpio: 25, status: 'ATIVO' }
  ]),
  down: (qi) => qi.bulkDelete('atuador', null, {})
};