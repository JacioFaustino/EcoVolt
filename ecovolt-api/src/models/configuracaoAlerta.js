module.exports = (sequelize, DataTypes) => {
  const ConfiguracaoAlerta = sequelize.define('ConfiguracaoAlerta', {
    id_config: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_sala: { type: DataTypes.INTEGER, allowNull: false },
    tipo_parametro: DataTypes.STRING(50),
    valor_limite: DataTypes.DECIMAL(10, 2),
    unidade_medida: DataTypes.STRING(10),
    status: DataTypes.STRING(20),
    acao_automatica: DataTypes.STRING(100),
    acionar_buzzer: DataTypes.BOOLEAN,
    tempo_persistencia_segundos: DataTypes.INTEGER,
    duracao_buzzer_segundos: DataTypes.INTEGER
  }, { tableName: 'configuracao_alerta', timestamps: false });

  ConfiguracaoAlerta.associate = (m) => {
    ConfiguracaoAlerta.belongsTo(m.Sala, { foreignKey: 'id_sala' });
    ConfiguracaoAlerta.hasMany(m.Alerta, { foreignKey: 'id_config' });
  };
  return ConfiguracaoAlerta;
};