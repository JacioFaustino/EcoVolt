require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/models');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/teste', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({ mensagem: 'Conectado ao banco via Sequelize!' });
  } catch (erro) {
    console.error('Erro ao conectar ao banco:', erro);
    res.status(503).json({ erro: 'Banco de dados indisponível' });
  }
});

app.get('/api/salas', async (req, res) => {
  try {
    const [linhas] = await db.sequelize.query(`
      SELECT s.id_sala, s.nome, s.localizacao,
             l.potencia_ativa_W, l.timestamp
      FROM sala s
      JOIN dispositivo d ON d.id_sala = s.id_sala
      JOIN sensor se ON se.id_dispositivo = d.id_dispositivo
                    AND se.tipo = 'CORRENTE'
      LEFT JOIN leitura l ON l.id_sensor = se.id_sensor
      LEFT JOIN leitura l2 ON l2.id_sensor = l.id_sensor
        AND (l2.timestamp > l.timestamp
             OR (l2.timestamp = l.timestamp AND l2.id_leitura > l.id_leitura))
      WHERE l2.id_leitura IS NULL
    `);
    res.json(linhas);
  } catch (erro) {
    console.error('Erro ao listar salas:', erro);
    res.status(500).json({ erro: 'Não foi possível listar as salas' });
  }
});

app.get('/api/salas/:id/consumo-hora', async (req, res) => {
  const idSala = Number(req.params.id);
  if (!Number.isInteger(idSala) || idSala <= 0) {
    return res.status(400).json({ erro: 'O id da sala deve ser um número inteiro positivo' });
  }

  try {
    const [linhas] = await db.sequelize.query(`
      SELECT HOUR(l.timestamp) AS hora,
             SUM(l.energia_intervalo_kWh) AS consumo_kWh
      FROM leitura l
      JOIN sensor se ON se.id_sensor = l.id_sensor
      JOIN dispositivo d ON d.id_dispositivo = se.id_dispositivo
      WHERE d.id_sala = ?
      GROUP BY HOUR(l.timestamp)
      ORDER BY hora
    `, { replacements: [idSala] });
    res.json(linhas);
  } catch (erro) {
    console.error('Erro ao consultar consumo:', erro);
    res.status(500).json({ erro: 'Não foi possível consultar o consumo' });
  }
});

app.get('/api/alertas', async (req, res) => {
  try {
    const alertas = await db.Alerta.findAll({
      where: { status: 'ABERTO' },
      include: [db.Sala]
    });
    res.json(alertas);
  } catch (erro) {
    console.error('Erro ao listar alertas:', erro);
    res.status(500).json({ erro: 'Não foi possível listar os alertas' });
  }
});

app.post('/api/leituras', async (req, res) => {
  const campos = [
    'id_sensor', 'corrente_rms_A', 'tensao_rms_V', 'potencia_ativa_W',
    'fator_potencia', 'energia_intervalo_kWh', 'energia_acumulada_kWh',
    'timestamp', 'qualidade_sinal'
  ];
  const dados = Object.fromEntries(
    campos.filter((campo) => req.body[campo] !== undefined)
      .map((campo) => [campo, req.body[campo]])
  );

  if (!Number.isInteger(Number(dados.id_sensor)) || Number(dados.id_sensor) <= 0) {
    return res.status(400).json({ erro: 'id_sensor deve ser um número inteiro positivo' });
  }
  dados.id_sensor = Number(dados.id_sensor);

  try {
    const leitura = await db.Leitura.create(dados);
    res.status(201).json(leitura);
  } catch (erro) {
    if (erro.name === 'SequelizeForeignKeyConstraintError' || erro.name === 'SequelizeValidationError') {
      return res.status(400).json({ erro: 'Dados da leitura inválidos' });
    }
    console.error('Erro ao criar leitura:', erro);
    res.status(500).json({ erro: 'Não foi possível registrar a leitura' });
  }
});

app.use((erro, req, res, next) => {
  if (erro instanceof SyntaxError && erro.status === 400 && erro.body) {
    return res.status(400).json({ erro: 'JSON inválido' });
  }
  next(erro);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API rodando na porta ${port}`);
});

module.exports = app;
