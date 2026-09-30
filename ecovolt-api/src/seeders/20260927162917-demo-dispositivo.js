'use strict';

module.exports = {
  up: (qi) => qi.bulkInsert(
    'dispositivo',
    [
      {
        id_sala: 1,
        identificador: 'ESP32-SALA101',
        mac_address: 'AA:BB:CC:DD:EE:01',
        modelo: 'ESP32 DevKit V1',
        data_instalacao: new Date(),
        intervalo_envio_segundos: 2,
        status_operacao: 'ONLINE'
      },
      {
        id_sala: 2,
        identificador: 'ESP32-LABINFO',
        mac_address: 'AA:BB:CC:DD:EE:02',
        modelo: 'ESP32 DevKit V1',
        data_instalacao: new Date(),
        intervalo_envio_segundos: 2,
        status_operacao: 'ONLINE'
      }
    ]
  ),

  down: (qi) => qi.bulkDelete(
    'dispositivo',
    null,
    {}
  )
};