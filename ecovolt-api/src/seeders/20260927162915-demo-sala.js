'use strict';

module.exports = {
  up: (qi) => qi.bulkInsert(
    'sala',
    [
      {
        nome: 'Sala 101',
        localizacao: 'Bloco A',
        capacidade_max_W: 5000,
        area_m2: 48.00,
        status: 'ATIVA',
        dias_funcionamento:
          'SEG,TER,QUA,QUI,SEX',
        horario_inicio: '07:00:00',
        horario_fim: '22:00:00'
      },
      {
        nome: 'Lab. Informática',
        localizacao: 'Bloco B',
        capacidade_max_W: 10000,
        area_m2: 60.00,
        status: 'ATIVA',
        dias_funcionamento:
          'SEG,TER,QUA,QUI,SEX',
        horario_inicio: '07:00:00',
        horario_fim: '22:00:00'
      }
    ]
  ),

  down: (qi) => qi.bulkDelete(
    'sala',
    null,
    {}
  )
};