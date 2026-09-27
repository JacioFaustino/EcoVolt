'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('calibracao', {
    id_calibracao: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    id_sensor: {
      type: S.INTEGER, allowNull: false,
      references: { model: 'sensor', key: 'id_sensor' }, onDelete: 'CASCADE'
    },
    data_calibracao: { type: S.DATE, allowNull: false },
    equipamento_referencia: S.STRING(100),
    valor_referencia: S.DECIMAL(10, 3),
    valor_medido: S.DECIMAL(10, 3),
    fator_correcao: S.DECIMAL(8, 5),
    offset_adc_V: S.DECIMAL(8, 4),
    erro_percentual: S.DECIMAL(5, 2),
    observacoes: S.TEXT
  }),
  down: (qi) => qi.dropTable('calibracao')
};