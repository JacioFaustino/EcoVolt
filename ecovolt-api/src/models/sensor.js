module.exports = (sequelize, DataTypes) => {
  const Sensor = sequelize.define('Sensor', {
    id_sensor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_dispositivo: { type: DataTypes.INTEGER, allowNull: false },
    nome: DataTypes.STRING(50),
    tipo: DataTypes.STRING(30),
    modelo: DataTypes.STRING(50),
    status: DataTypes.STRING(20)
  }, { tableName: 'sensor', timestamps: false });

  Sensor.associate = (m) => {
    Sensor.belongsTo(m.Dispositivo, { foreignKey: 'id_dispositivo' });
    Sensor.hasMany(m.Leitura, { foreignKey: 'id_sensor' });
    Sensor.hasMany(m.EstadoPorta, { foreignKey: 'id_sensor' });
    Sensor.hasMany(m.Calibracao, { foreignKey: 'id_sensor' });
  };
  return Sensor;
};