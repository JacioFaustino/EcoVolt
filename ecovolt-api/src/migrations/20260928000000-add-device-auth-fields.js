'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('dispositivo', 'token_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true
    });

    await queryInterface.addColumn(
      'dispositivo',
      'intervalo_envio_segundos',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2
      }
    );

    await queryInterface.addIndex(
      'dispositivo',
      ['ultimo_contato'],
      {
        name: 'idx_dispositivo_ultimo_contato'
      }
    );

    await queryInterface.addIndex(
      'leitura',
      ['timestamp'],
      {
        name: 'idx_leitura_timestamp'
      }
    );

    await queryInterface.addIndex(
      'estado_porta',
      ['id_sensor', 'timestamp'],
      {
        name: 'idx_estado_porta_sensor_timestamp'
      }
    );

    await queryInterface.addIndex(
      'alerta',
      ['status'],
      {
        name: 'idx_alerta_status'
      }
    );

    await queryInterface.addIndex(
      'alerta',
      ['id_sala', 'status'],
      {
        name: 'idx_alerta_sala_status'
      }
    );

    await queryInterface.addIndex(
      'configuracao_alerta',
      ['id_sala', 'status'],
      {
        name: 'idx_config_alerta_sala_status'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'configuracao_alerta',
      'idx_config_alerta_sala_status'
    );

    await queryInterface.removeIndex(
      'alerta',
      'idx_alerta_sala_status'
    );

    await queryInterface.removeIndex(
      'alerta',
      'idx_alerta_status'
    );

    await queryInterface.removeIndex(
      'estado_porta',
      'idx_estado_porta_sensor_timestamp'
    );

    await queryInterface.removeIndex(
      'leitura',
      'idx_leitura_timestamp'
    );

    await queryInterface.removeIndex(
      'dispositivo',
      'idx_dispositivo_ultimo_contato'
    );

    await queryInterface.removeColumn(
      'dispositivo',
      'intervalo_envio_segundos'
    );

    await queryInterface.removeColumn(
      'dispositivo',
      'token_hash'
    );
  }
};