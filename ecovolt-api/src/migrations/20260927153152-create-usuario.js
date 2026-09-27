'use strict';
module.exports = {
  up: (qi, S) => qi.createTable('usuario', {
    id_usuario: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: S.STRING(100), allowNull: false },
    email: { type: S.STRING(100), allowNull: false, unique: true },
    senha_hash: { type: S.STRING(255), allowNull: false },
    perfil: S.STRING(20),
    telefone: S.STRING(20),
    status: { type: S.STRING(20), defaultValue: 'ATIVO' },
    ultimo_acesso: S.DATE
  }),
  down: (qi) => qi.dropTable('usuario')
};