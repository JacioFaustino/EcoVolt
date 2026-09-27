module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    senha_hash: { type: DataTypes.STRING(255), allowNull: false },
    perfil: DataTypes.STRING(20),
    telefone: DataTypes.STRING(20),
    status: DataTypes.STRING(20),
    ultimo_acesso: DataTypes.DATE
  }, { tableName: 'usuario', timestamps: false });

  Usuario.associate = (m) => {
    Usuario.hasMany(m.Relatorio, { foreignKey: 'id_usuario' });
  };
  return Usuario;
};