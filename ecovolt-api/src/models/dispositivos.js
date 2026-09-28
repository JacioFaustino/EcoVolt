module.exports = (sequelize, DataTypes) => {
  const Dispositivo = sequelize.define('Dispositivo', {
    id_dispositivo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    identificador: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    mac_address: { type: DataTypes.STRING(17), unique: true },
    modelo: DataTypes.STRING(50),
    data_instalacao: DataTypes.DATEONLY,
    ultimo_contato: DataTypes.DATE,
    status_operacao: DataTypes.STRING(20),
    token_hash: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    intervalo_envio_segundos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 }
  }, { tableName: 'dispositivo', timestamps: false });

  Dispositivo.associate = (m) => {
    Dispositivo.belongsTo(m.Sala, { foreignKey: 'id_sala' });
    Dispositivo.hasMany(m.Sensor, { foreignKey: 'id_dispositivo' });
    Dispositivo.hasOne(m.Atuador, { foreignKey: 'id_dispositivo' });
  };
  return Dispositivo;
};