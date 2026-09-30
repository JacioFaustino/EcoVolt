'use strict';

module.exports = {
  up: (qi) => qi.bulkInsert(
    'estado_porta',
    [
      {
        id_sensor: 2,
        estado: 'FECHADA',
        timestamp: new Date(
          Date.now() - 3600000
        )
      },
      {
        id_sensor: 2,
        estado: 'ABERTA',
        timestamp: new Date()
      },
      {
        id_sensor: 4,
        estado: 'FECHADA',
        timestamp: new Date()
      }
    ]
  ),

  down: (qi) => qi.bulkDelete(
    'estado_porta',
    null,
    {}
  )
};