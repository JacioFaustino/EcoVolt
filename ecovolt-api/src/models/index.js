'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../../config/config.js').development;

const db = {};
const sequelize = new Sequelize(config.database, config.username, config.password, config);

fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(nome => {
  if (db[nome].associate) db[nome].associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;