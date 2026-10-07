'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('configuracao_alerta', {
    id_config: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: {
      type: S.INTEGER, allowNull: false,
      references: { model: 'sala', key: 'id_sala' }, onDelete: 'CASCADE'
    },
    tipo_parametro: S.STRING(50),
    valor_limite: S.DECIMAL(10, 2),
    unidade_medida: S.STRING(20),
    status: { type: S.STRING(20), defaultValue: 'ATIVA' },
    acao_automatica: S.STRING(100),
    acionar_buzzer: { type: S.BOOLEAN, defaultValue: false },
    tempo_persistencia_segundos: S.INTEGER,
    duracao_buzzer_segundos: S.INTEGER
  }),
  down: (qi) => qi.dropTable('configuracao_alerta')
};