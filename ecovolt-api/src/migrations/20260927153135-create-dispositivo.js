'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('dispositivo', {
    id_dispositivo: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: {
      type: S.INTEGER, allowNull: false, unique: true,
      references: { model: 'sala', key: 'id_sala' }, onDelete: 'CASCADE'
    },
    identificador: { type: S.STRING(50), allowNull: false, unique: true },
    mac_address: { type: S.STRING(17), unique: true },
    modelo: S.STRING(50),
    data_instalacao: S.DATEONLY,
    ultimo_contato: S.DATE,
    status_operacao: { type: S.STRING(20), defaultValue: 'ONLINE' }
  }),
  down: (qi) => qi.dropTable('dispositivo')
};