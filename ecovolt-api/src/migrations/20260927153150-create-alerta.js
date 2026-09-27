'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('alerta', {
    id_alerta: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: {
      type: S.INTEGER, allowNull: false,
      references: { model: 'sala', key: 'id_sala' }, onDelete: 'CASCADE'
    },
    id_config: {
      type: S.INTEGER, allowNull: false,
      references: { model: 'configuracao_alerta', key: 'id_config' }, onDelete: 'RESTRICT'
    },
    id_leitura: {
      type: S.BIGINT, allowNull: true,
      references: { model: 'leitura', key: 'id_leitura' }, onDelete: 'SET NULL'
    },
    id_atuador: {
      type: S.INTEGER, allowNull: true,
      references: { model: 'atuador', key: 'id_atuador' }, onDelete: 'SET NULL'
    },
    tipo_alerta: S.STRING(50),
    descricao: S.TEXT,
    valor_detectado: S.DECIMAL(10, 2),
    timestamp_inicio: S.DATE,
    timestamp_fim: S.DATE,
    status: { type: S.STRING(20), defaultValue: 'ABERTO' },
    gravidade: S.STRING(20)
  }),
  down: (qi) => qi.dropTable('alerta')
};