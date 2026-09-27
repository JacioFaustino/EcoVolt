module.exports = (sequelize, DataTypes) => {
  const EstadoPorta = sequelize.define('EstadoPorta', {
    id_estado: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_sensor: { type: DataTypes.INTEGER, allowNull: false },
    estado: DataTypes.ENUM('ABERTA', 'FECHADA'),
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'estado_porta', timestamps: false });

  EstadoPorta.associate = (m) => {
    EstadoPorta.belongsTo(m.Sensor, { foreignKey: 'id_sensor' });
  };
  return EstadoPorta;
};