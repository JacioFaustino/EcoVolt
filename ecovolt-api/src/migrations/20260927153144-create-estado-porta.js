'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('estado_porta', {
    id_estado: { type: S.BIGINT, primaryKey: true, autoIncrement: true },
    id_sensor: {
      type: S.INTEGER, allowNull: false,
      references: { model: 'sensor', key: 'id_sensor' }, onDelete: 'CASCADE'
    },
    estado: { type: S.ENUM('ABERTA', 'FECHADA'), allowNull: false },
    timestamp: { type: S.DATE, allowNull: false, defaultValue: S.NOW }
  }),
  down: (qi) => qi.dropTable('estado_porta')
};