module.exports = (sequelize, DataTypes) => {
  const Alerta = sequelize.define('Alerta', {
    id_alerta: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: { type: DataTypes.INTEGER, allowNull: false },
    id_config: { type: DataTypes.INTEGER, allowNull: false },
    id_leitura: DataTypes.BIGINT,
    id_atuador: DataTypes.INTEGER,
    tipo_alerta: DataTypes.STRING(50),
    descricao: DataTypes.TEXT,
    valor_detectado: DataTypes.DECIMAL(10, 2),
    timestamp_inicio: DataTypes.DATE,
    timestamp_fim: DataTypes.DATE,
    status: DataTypes.STRING(20),
    gravidade: DataTypes.STRING(20)
  }, { tableName: 'alerta', timestamps: false });

  Alerta.associate = (m) => {
    Alerta.belongsTo(m.Sala, { foreignKey: 'id_sala' });
    Alerta.belongsTo(m.ConfiguracaoAlerta, { foreignKey: 'id_config' });
    Alerta.belongsTo(m.Leitura, { foreignKey: 'id_leitura' });
    Alerta.belongsTo(m.Atuador, { foreignKey: 'id_atuador' });
  };
  return Alerta;
};