'use strict';
module.exports = {
  up: (qi) => qi.bulkInsert('sensor', [
    { id_dispositivo: 1, nome: 'Corrente geral', tipo: 'CORRENTE', modelo: 'SCT-013', status: 'ATIVO' },
    { id_dispositivo: 1, nome: 'Porta principal', tipo: 'PORTA', modelo: 'REED SWITCH', status: 'ATIVO' },
    { id_dispositivo: 2, nome: 'Corrente geral', tipo: 'CORRENTE', modelo: 'SCT-013', status: 'ATIVO' },
    { id_dispositivo: 2, nome: 'Porta principal', tipo: 'PORTA', modelo: 'REED SWITCH', status: 'ATIVO' }
  ]),
  down: (qi) => qi.bulkDelete('sensor', null, {})
};