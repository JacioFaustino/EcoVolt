'use strict';
module.exports = {
  up: (qi) => qi.bulkInsert('configuracao_alerta', [
    { id_sala: 1, tipo_parametro: 'PORTA_ABERTA_AR_LIGADO', valor_limite: 800, unidade_medida: 'W',
      acionar_buzzer: true, tempo_persistencia_segundos: 300, duracao_buzzer_segundos: 10 },
    { id_sala: 2, tipo_parametro: 'PORTA_ABERTA_AR_LIGADO', valor_limite: 800, unidade_medida: 'W',
      acionar_buzzer: true, tempo_persistencia_segundos: 300, duracao_buzzer_segundos: 10 }
  ]),
  down: (qi) => qi.bulkDelete('configuracao_alerta', null, {})
};