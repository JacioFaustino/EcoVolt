'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('sala', {
    id_sala: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: S.STRING(100), allowNull: false },
    localizacao: S.STRING(150),
    capacidade_max_W: { type: S.DECIMAL(10, 2),allowNull: false },
    area_m2: S.DECIMAL(6, 2),
    status: { type: S.STRING(20), defaultValue: 'ATIVA' },
    dias_funcionamento: S.STRING(50), // "SEG,TER,QUA,QUI,SEX"
    horario_inicio: S.TIME,
    horario_fim: S.TIME
  }),
  down: (qi) => qi.dropTable('sala')
};