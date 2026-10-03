'use strict';

module.exports = {
  up: (qi) => qi.bulkInsert(
    'configuracao_alerta',
    [
      /*
       * Sala 1 — R1
       */
      {
        id_sala: 1,
        tipo_parametro:
          'R1_CONSUMO_FORA_HORARIO',
        valor_limite: 100,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 10,
        duracao_buzzer_segundos: 0
      },

      /*
       * Sala 1 — R3A
       */
      {
        id_sala: 1,
        tipo_parametro:
          'R3A_PORTA_ABERTA',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica:
          'ACIONAR_BUZZER',
        acionar_buzzer: true,
        tempo_persistencia_segundos: 10,
        duracao_buzzer_segundos: 10
      },

      /*
       * Sala 1 — R3B
       */
      {
        id_sala: 1,
        tipo_parametro:
          'R3B_PORTA_ABERTA_PERSISTENTE',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 10,
        duracao_buzzer_segundos: 0
      },

      /*
       * Sala 2 — R1
       */
      {
        id_sala: 2,
        tipo_parametro:
          'R1_CONSUMO_FORA_HORARIO',
        valor_limite: 100,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 10,
        duracao_buzzer_segundos: 0
      },

      /*
       * Sala 2 — R3A
       */
      {
        id_sala: 2,
        tipo_parametro:
          'R3A_PORTA_ABERTA',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica:
          'ACIONAR_BUZZER',
        acionar_buzzer: true,
        tempo_persistencia_segundos: 10,
        duracao_buzzer_segundos: 10
      },

      /*
       * Sala 2 — R3B
       */
      {
        id_sala: 2,
        tipo_parametro:
          'R3B_PORTA_ABERTA_PERSISTENTE',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 10,
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