module.exports = (sequelize, DataTypes) => {
  const Sala = sequelize.define('Sala', {
    id_sala: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    localizacao: DataTypes.STRING(150),
    capacidade_max_W: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    area_m2: DataTypes.DECIMAL(6, 2),
    status: DataTypes.STRING(20),
    dias_funcionamento: DataTypes.STRING(50),
    horario_inicio: DataTypes.TIME,
    horario_fim: DataTypes.TIME
  }, { tableName: 'sala', timestamps: false });

  Sala.associate = (m) => {
    Sala.hasOne(m.Dispositivo, { foreignKey: 'id_sala' });
    Sala.hasMany(m.ConfiguracaoAlerta, { foreignKey: 'id_sala' });
    Sala.hasMany(m.Alerta, { foreignKey: 'id_sala' });
    Sala.hasMany(m.Relatorio, { foreignKey: 'id_sala' });
};
  return Sala;
};