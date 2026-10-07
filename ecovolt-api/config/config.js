require('dotenv').config();

const configuracaoBase = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  dialect: 'mysql'
};

module.exports = {
  development: {
    ...configuracaoBase,
    database: process.env.DB_NAME
  },

  test: {
    ...configuracaoBase,
    database:
      process.env.DB_NAME_TEST ||
      'ecovolt_test'
  },

  production: {
    ...configuracaoBase,
    database: process.env.DB_NAME
  }
};