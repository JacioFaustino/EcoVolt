module.exports = (sequelize, DataTypes) => {
  const Calibracao = sequelize.define('Calibracao', {
    id_calibracao: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_sensor: { type: DataTypes.INTEGER, allowNull: false },
    data_calibracao: DataTypes.DATE,
    equipamento_referencia: DataTypes.STRING(100),
    valor_referencia: DataTypes.DECIMAL(10, 3),
    valor_medido: DataTypes.DECIMAL(10, 3),
    fator_correcao: DataTypes.DECIMAL(8, 5),
    offset_adc_V: DataTypes.DECIMAL(8, 4),
    erro_percentual: DataTypes.DECIMAL(5, 2),
    observacoes: DataTypes.TEXT
  }, { tableName: 'calibracao', timestamps: false });

  Calibracao.associate = (m) => {
    Calibracao.belongsTo(m.Sensor, { foreignKey: 'id_sensor' });
  };
  return Calibracao;
};