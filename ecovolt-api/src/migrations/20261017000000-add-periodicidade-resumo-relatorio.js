'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('relatorio', 'periodicidade', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'PERSONALIZADO'
    });

    await queryInterface.addColumn('relatorio', 'resumo', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('relatorio', 'resumo');

    await queryInterface.removeColumn('relatorio', 'periodicidade');
  }
};