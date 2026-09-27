module.exports = (sequelize, DataTypes) => {
  const Relatorio = sequelize.define('Relatorio', {
    id_relatorio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: DataTypes.INTEGER,
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
    tipo_relatorio: DataTypes.STRING(30),
    periodo_inicio: DataTypes.DATEONLY,
    periodo_fim: DataTypes.DATEONLY,
    consumo_total_kWh: DataTypes.DECIMAL(12, 4),
    custo_estimado: DataTypes.DECIMAL(10, 2),
    picos_consumo: DataTypes.TEXT,
    anomalias_detectadas: DataTypes.INTEGER,
    arquivo_path: DataTypes.STRING(255),
    gerado_em: DataTypes.DATE
  }, { tableName: 'relatorio', timestamps: false });

  Relatorio.associate = (m) => {
    Relatorio.belongsTo(m.Sala, { foreignKey: 'id_sala' });
    Relatorio.belongsTo(m.Usuario, { foreignKey: 'id_usuario' });
  };
  return Relatorio;
};