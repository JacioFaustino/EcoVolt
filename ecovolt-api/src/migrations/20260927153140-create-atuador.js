'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('atuador', {
    id_atuador: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    id_dispositivo: {
      type: S.INTEGER, allowNull: false, unique: true,
      references: { model: 'dispositivo', key: 'id_dispositivo' }, onDelete: 'CASCADE'
    },
    tipo_atuador: S.STRING(30),
    modelo: S.STRING(50),
    pino_gpio: S.INTEGER,
    status: { type: S.STRING(20), defaultValue: 'ATIVO' }
  }),
  down: (qi) => qi.dropTable('atuador')
};