'use strict';
module.exports = {
  up: async (qi, S) => {
    await qi.createTable('leitura', {
      id_leitura: { type: S.BIGINT, primaryKey: true, autoIncrement: true },
      id_sensor: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'sensor', key: 'id_sensor' }, onDelete: 'CASCADE'
      },
      corrente_rms_A: S.DECIMAL(8, 3),
      tensao_rms_V: S.DECIMAL(6, 2),
      potencia_ativa_W: S.DECIMAL(10, 2),
      fator_potencia: S.DECIMAL(4, 3),
      energia_intervalo_kWh: S.DECIMAL(12, 6),
      energia_acumulada_kWh: S.DECIMAL(12, 4),
      timestamp: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      qualidade_sinal: S.INTEGER
    });
    await qi.addIndex('leitura', ['id_sensor', 'timestamp']);
  },
  down: (qi) => qi.dropTable('leitura')
};