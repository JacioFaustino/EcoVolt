'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (qi) => {
    const senha = await bcrypt.hash('123456', 10);
    return qi.bulkInsert('usuario', [
      { nome: 'Administrador EcoVolt', email: 'admin@ecovolt.ifrn.edu.br',
        senha_hash: senha, perfil: 'ADMIN', status: 'ATIVO' }
    ]);
  },
  down: (qi) => qi.bulkDelete('usuario', null, {})
};