module.exports = (sequelize, DataTypes) => {
  const Leitura = sequelize.define('Leitura', {
    id_leitura: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_sensor: { type: DataTypes.INTEGER, allowNull: false },
    corrente_rms_A: DataTypes.DECIMAL(8, 3),
    tensao_rms_V: DataTypes.DECIMAL(6, 2),
    potencia_ativa_W: DataTypes.DECIMAL(10, 2),
    fator_potencia: DataTypes.DECIMAL(4, 3),
    energia_intervalo_kWh: DataTypes.DECIMAL(12, 6),
    energia_acumulada_kWh: DataTypes.DECIMAL(12, 4),
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    qualidade_sinal: DataTypes.INTEGER
  }, { tableName: 'leitura', timestamps: false });

  Leitura.associate = (m) => {
    Leitura.belongsTo(m.Sensor, { foreignKey: 'id_sensor' });
    Leitura.hasMany(m.Alerta, { foreignKey: 'id_leitura' });
  };
  return Leitura;
};