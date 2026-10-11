'use strict';

module.exports = {
  up: (qi, S) => qi.createTable('sensor', {
    id_sensor: {
      type: S.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_dispositivo: {
      type: S.INTEGER,
      allowNull: false,
      references: {
        model: 'dispositivo',
        key: 'id_dispositivo'
      },
      onDelete: 'CASCADE'
    },
    nome: S.STRING(50),
    tipo: S.STRING(30),
    modelo: S.STRING(50),
    unidade_medida: {
      type: S.STRING(20),
      allowNull: true
    },
    status: {
      type: S.STRING(20),
      defaultValue: 'ATIVO'
    }
  }),

  down: (qi) => qi.dropTable('sensor')
};