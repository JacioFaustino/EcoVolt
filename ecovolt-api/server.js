require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const leituraRoutes = require('./src/routes/leituraRoutes');
const db = require('./src/models');
const authRoutes = require('./src/routes/authRoutes');
const dispositivoRoutes = require('./src/routes/dispositivoRoutes');
const salaRoutes = require('./src/routes/salaRoutes');
const alertaRoutes = require('./src/routes/alertaRoutes');
const {atualizarDispositivosOffline} = require('./src/services/deviceStatus');
const app = express();
const port = Number(process.env.PORT) || 3000;
const configuracaoAlertaRoutes = require('./src/routes/configuracaoAlertaRoutes');

if (!process.env.JWT_SECRET) {
  console.warn(
    'JWT_SECRET não configurado.'
  );
}

app.use(cors());
app.use(express.json({limit: '100kb'}));

app.use('/api/leituras',leituraRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/dispositivos',dispositivoRoutes);
app.use('/api/salas',salaRoutes);
app.use('/api/alertas',alertaRoutes);
app.use('/api/configuracoes-alertas',configuracaoAlertaRoutes);


//TESTE DA API
app.get('/api/teste', async (req, res) => {
  try {
    await db.sequelize.authenticate();

    return res.json({
      mensagem:
        'Conectado ao banco via Sequelize!'
    });
  } catch (erro) {
    console.error(
      'Erro ao conectar ao banco:',
      erro
    );

    return res.status(503).json({
      erro: 'Banco de dados indisponível'
    });
  }
});

//TRATAMENTO DE ERROS
app.use((erro, req, res, next) => {
  if (
    erro instanceof SyntaxError &&
    erro.status === 400 &&
    erro.body
  ) {
    return res.status(400).json({
      erro: 'JSON inválido'
    });
  }

  if (erro.name === 'AppError') {
    return res.status(
      erro.statusCode
    ).json({
      erro: erro.message
    });
  }

  console.error(
    'Erro não tratado:',
    erro
  );

  return res.status(500).json({
    erro: 'Erro interno do servidor'
  });
});


//SERVIDOR
app.listen(
  port,
  '0.0.0.0',
  () => {
    console.log(
      `API rodando na porta ${port}`
    );

    atualizarDispositivosOffline()
      .catch((erro) => {
        console.error(
          'Erro ao verificar dispositivos offline:',
          erro
        );
      });

    setInterval(() => {
      atualizarDispositivosOffline()
        .catch((erro) => {
          console.error(
            'Erro ao verificar dispositivos offline:',
            erro
          );
        });
    }, 30000);
  }
);

module.exports = app;