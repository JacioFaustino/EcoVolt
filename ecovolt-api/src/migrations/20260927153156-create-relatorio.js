'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('relatorio', {
    id_relatorio: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: {
      type: S.INTEGER, allowNull: true,
      references: { model: 'sala', key: 'id_sala' }, onDelete: 'SET NULL'
    },
    id_usuario: {
      type: S.INTEGER, allowNull: false,
      references: { model: 'usuario', key: 'id_usuario' }, onDelete: 'RESTRICT'
    },
    tipo_relatorio: S.STRING(30),
    periodo_inicio: S.DATEONLY,
    periodo_fim: S.DATEONLY,
    consumo_total_kWh: S.DECIMAL(12, 4),
    custo_estimado: S.DECIMAL(10, 2),
    picos_consumo: S.TEXT,
    anomalias_detectadas: S.INTEGER,
    arquivo_path: S.STRING(255),
    gerado_em: S.DATE
  }),
  down: (qi) => qi.dropTable('relatorio')
};