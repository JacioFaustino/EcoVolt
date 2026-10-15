require('dotenv').config();

const configuracaoBase = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
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