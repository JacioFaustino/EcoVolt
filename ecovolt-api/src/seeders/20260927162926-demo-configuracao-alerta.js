'use strict';

module.exports = {
  up: (qi) => qi.bulkInsert(
    'configuracao_alerta',
    [
      {
        id_sala: 1,
        tipo_parametro: 'R3A_PORTA_ABERTA',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica: 'ACIONAR_BUZZER',
        acionar_buzzer: true,
        tempo_persistencia_segundos: 10,
        duracao_buzzer_segundos: 10
      },
      {
        id_sala: 1,
        tipo_parametro: 'R3B_PORTA_ABERTA_PERSISTENTE',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica: 'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 30,
        duracao_buzzer_segundos: 0
      },
      {
        id_sala: 2,
        tipo_parametro: 'R3A_PORTA_ABERTA',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica: 'ACIONAR_BUZZER',
        acionar_buzzer: true,
        tempo_persistencia_segundos: 10,
        duracao_buzzer_segundos: 10
      },
      {
        id_sala: 2,
        tipo_parametro: 'R3B_PORTA_ABERTA_PERSISTENTE',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica: 'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 30,
        duracao_buzzer_segundos: 0
      }
    ]
  ),

  down: (qi) => qi.bulkDelete(
    'configuracao_alerta',
    null,
    {}
  )
};