'use strict';

module.exports = {
  up: (qi) => qi.bulkInsert(
    'configuracao_alerta',
    [

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
        tempo_persistencia_segundos: 600,
        duracao_buzzer_segundos: 0
      },


      {
        id_sala: 1,
        tipo_parametro: 'R2_AR_FORA_HORARIO',
        valor_limite: 800,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica: 'NOTIFICAR_ADMINISTRADOR_TECNICO',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 600,
        duracao_buzzer_segundos: 0
      },


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
        tempo_persistencia_segundos: 300,
        duracao_buzzer_segundos: 300
      },

  
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
        tempo_persistencia_segundos: 300,
        duracao_buzzer_segundos: 0
      },


      {
        id_sala: 1,
        tipo_parametro: 'R4_SOBRECARGA',
        valor_limite: 5000,
        unidade_medida: 'W',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR_TECNICO',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 600,
        duracao_buzzer_segundos: 0
      },

      {
        id_sala: 1,
        tipo_parametro:
          'R5_PADRAO_HISTORICO',
        valor_limite: 2,
        unidade_medida:
          'DESVIOS_PADRAO',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 0,
        duracao_buzzer_segundos: 0
      },

      {
        id_sala: 1,
        tipo_parametro: 'R6_LIMITE_DIARIO',
        valor_limite: 25,
        unidade_medida: 'kWh',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 0,
        duracao_buzzer_segundos: 0
      },

      {
        id_sala: 1,
        tipo_parametro: 'R7_DISPOSITIVO_OFFLINE',
        valor_limite: 5,
        unidade_medida: 'INTERVALOS',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_ADMINISTRADOR_TECNICO',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 0,
        duracao_buzzer_segundos: 0
      },

      {
        id_sala: 1,
        tipo_parametro: 'R8_FALHA_LEITURA',
        valor_limite: 50,
        unidade_medida: '%',
        status: 'ATIVA',
        acao_automatica:
          'NOTIFICAR_TECNICO',
        acionar_buzzer: false,
        tempo_persistencia_segundos: 600,
        duracao_buzzer_segundos: 0
      },
    
    ]
  ),

  down: (qi) => qi.bulkDelete(
    'configuracao_alerta',
    null,
    {}
  )
};