require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/models');

const app = express();
app.use(cors());
app.use(express.json());

//Testando conexão com o SQL usando Sequelize
app.get('/api/teste', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({ mensagem: 'Conectado ao banco via Sequelize!' });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

//Salas com a última leitura(relatório complexo)
app.get('/api/salas', async (req, res) => {
  try {
    const [linhas] = await db.sequelize.query(`
      SELECT s.id_sala, s.nome, s.localizacao,
             l.potencia_ativa_W, l.timestamp
      FROM sala s
      JOIN dispositivo d ON d.id_sala = s.id_sala
      JOIN sensor se     ON se.id_dispositivo = d.id_dispositivo AND se.tipo = 'CORRENTE'
      LEFT JOIN leitura l ON l.id_leitura = (
        SELECT MAX(id_leitura) FROM leitura WHERE id_sensor = se.id_sensor
      )
    `);
    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

//Consumo p/hora
app.get('/api/salas/:id/consumo-hora', async (req, res) => {
  try {
    const [linhas] = await db.sequelize.query(`
      SELECT HOUR(l.timestamp) AS hora, SUM(l.energia_intervalo_kWh) AS consumo_kWh
      FROM leitura l
      JOIN sensor se     ON se.id_sensor = l.id_sensor
      JOIN dispositivo d ON d.id_dispositivo = se.id_dispositivo
      WHERE d.id_sala = ?
      GROUP BY HOUR(l.timestamp) ORDER BY hora
    `, { replacements: [req.params.id] });
    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

//Alertas em aberto
app.get('/api/alertas', async (req, res) => {
  try {
    const alertas = await db.Alerta.findAll({
      where: { status: 'ABERTO' },
      include: [db.Sala]
    });
    res.json(alertas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

//Rota do ESP32:
app.post('/api/leituras', async (req, res) => {
  try {
    const leitura = await db.Leitura.create(req.body);
    res.status(201).json(leitura);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`API rodando em http://localhost:${process.env.PORT || 3000}`);
});