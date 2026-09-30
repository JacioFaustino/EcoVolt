const db = require('../models');
const AppError = require('../utils/AppError');

async function listar() {
  const [linhas] =
    await db.sequelize.query(`
      SELECT
        s.id_sala,
        s.nome,
        s.localizacao,
        l.potencia_ativa_W,
        l.timestamp
      FROM sala s
      JOIN dispositivo d
        ON d.id_sala = s.id_sala
      JOIN sensor se
        ON se.id_dispositivo =
           d.id_dispositivo
       AND se.tipo = 'CORRENTE'
      LEFT JOIN leitura l
        ON l.id_sensor = se.id_sensor
      LEFT JOIN leitura l2
        ON l2.id_sensor = l.id_sensor
       AND (
         l2.timestamp > l.timestamp
         OR (
           l2.timestamp = l.timestamp
           AND l2.id_leitura >
               l.id_leitura
         )
       )
      WHERE l2.id_leitura IS NULL
    `);

  return linhas;
}

async function consumoPorHora(idSala) {
  const [salas] =
    await db.Sala.findAll({
      where: {
        id_sala: idSala
      },
      limit: 1
    });

  if (!salas) {
    throw new AppError(
      'Sala não encontrada',
      404
    );
  }

  const [linhas] =
    await db.sequelize.query(`
      SELECT
        HOUR(l.timestamp) AS hora,
        SUM(
          l.energia_intervalo_kWh
        ) AS consumo_kWh
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE d.id_sala = ?
      GROUP BY HOUR(l.timestamp)
      ORDER BY hora
    `, {
      replacements: [idSala]
    });

  return linhas;
}

module.exports = {
  listar,
  consumoPorHora
};