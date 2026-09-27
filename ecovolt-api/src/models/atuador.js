module.exports = (sequelize, DataTypes) => {
  const Atuador = sequelize.define('Atuador', {
    id_atuador: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_dispositivo: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    tipo_atuador: DataTypes.STRING(30),
    modelo: DataTypes.STRING(50),
    pino_gpio: DataTypes.INTEGER,
    status: DataTypes.STRING(20)
  }, { tableName: 'atuador', timestamps: false });

  Atuador.associate = (m) => {
    Atuador.belongsTo(m.Dispositivo, { foreignKey: 'id_dispositivo' });
    Atuador.hasMany(m.Alerta, { foreignKey: 'id_atuador' });
  };
  return Atuador;
};