require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./src/models');

const {
  autenticarDispositivo
} = require('./src/middleware/deviceAuth');

const {
  autenticarUsuario
} = require('./src/middleware/userAuth');

const {
  atualizarDispositivosOffline
} = require('./src/services/deviceStatus');

const {
  verificarLeitura
} = require('./src/services/alertService');

if (!process.env.JWT_SECRET) {
  console.warn(
    'JWT_SECRET não configurado.'
  );
}

const app = express();
const port =
  Number(process.env.PORT) || 3000;

const limiteLeituras = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Muitas requisições em pouco tempo'
  }
});

app.use(cors());

app.use(
  express.json({
    limit: '100kb'
  })
);

function numeroValido(valor) {
  return (
    valor !== undefined &&
    valor !== null &&
    valor !== '' &&
    Number.isFinite(Number(valor))
  );
}

function validarFaixasLeitura(dados) {
  const faixas = [
    ['corrente_rms_A', 0, 1000],
    ['tensao_rms_V', 0, 1000],
    ['potencia_ativa_W', 0, 100000],
    ['fator_potencia', 0, 1],
    ['energia_intervalo_kWh', 0, 1000],
    ['energia_acumulada_kWh', 0, 100000000],
    ['qualidade_sinal', 0, 100]
  ];

  for (const [
    campo,
    minimo,
    maximo
  ] of faixas) {
    if (dados[campo] === undefined) {
      continue;
    }

    if (
      dados[campo] < minimo ||
      dados[campo] > maximo
    ) {
      return (
        `${campo} deve estar entre ` +
        `${minimo} e ${maximo}`
      );
    }
  }

  return null;
}

app.get('/api/teste', async (req, res) => {
  try {
    await db.sequelize.authenticate();

    res.json({
      mensagem:
        'Conectado ao banco via Sequelize!'
    });
  } catch (erro) {
    console.error(
      'Erro ao conectar ao banco:',
      erro
    );

    res.status(503).json({
      erro: 'Banco de dados indisponível'
    });
  }
});

app.post(
  '/api/auth/login',
  async (req, res) => {
    try {
      if (!process.env.JWT_SECRET) {
        return res.status(503).json({
          erro: 'Autenticação não configurada'
        });
      }

      const { email, senha } =
        req.body || {};

      if (
        typeof email !== 'string' ||
        typeof senha !== 'string' ||
        !email ||
        !senha
      ) {
        return res.status(400).json({
          erro:
            'email e senha são obrigatórios'
        });
      }

      const usuario =
        await db.Usuario.findOne({
          where: { email }
        });

      if (!usuario) {
        return res.status(401).json({
          erro: 'Credenciais inválidas'
        });
      }

      if (usuario.status !== 'ATIVO') {
        return res.status(401).json({
          erro: 'Credenciais inválidas'
        });
      }

      const senhaValida =
        await bcrypt.compare(
          senha,
          usuario.senha_hash
        );

      if (!senhaValida) {
        return res.status(401).json({
          erro: 'Credenciais inválidas'
        });
      }

      await usuario.update({
        ultimo_acesso: new Date()
      });

      const token = jwt.sign(
        {
          id_usuario: usuario.id_usuario,
          perfil: usuario.perfil
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '8h'
        }
      );

      return res.json({
        token,
        usuario: {
          id_usuario: usuario.id_usuario,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil
        }
      });
    } catch (erro) {
      console.error(
        'Erro no login:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível realizar o login'
      });
    }
  }
);

app.get(
  '/api/salas',
  autenticarUsuario,
  async (req, res) => {
    try {
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

      res.json(linhas);
    } catch (erro) {
      console.error(
        'Erro ao listar salas:',
        erro
      );

      res.status(500).json({
        erro:
          'Não foi possível listar as salas'
      });
    }
  }
);

app.get(
  '/api/salas/:id/consumo-hora',
  autenticarUsuario,
  async (req, res) => {
    const idSala =
      Number(req.params.id);

    if (
      !Number.isInteger(idSala) ||
      idSala <= 0
    ) {
      return res.status(400).json({
        erro:
          'O id da sala deve ser um número ' +
          'inteiro positivo'
      });
    }

    try {
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

      res.json(linhas);
    } catch (erro) {
      console.error(
        'Erro ao consultar consumo:',
        erro
      );

      res.status(500).json({
        erro:
          'Não foi possível consultar o consumo'
      });
    }
  }
);

app.get(
  '/api/alertas',
  autenticarUsuario,
  async (req, res) => {
    try {
      const alertas =
        await db.Alerta.findAll({
          where: {
            status: 'ABERTO'
          },
          include: [db.Sala]
        });

      res.json(alertas);
    } catch (erro) {
      console.error(
        'Erro ao listar alertas:',
        erro
      );

      res.status(500).json({
        erro:
          'Não foi possível listar os alertas'
      });
    }
  }
);

app.post(
  '/api/leituras',
  limiteLeituras,
  autenticarDispositivo,
  async (req, res) => {
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        erro:
          'O corpo deve ser um objeto JSON'
      });
    }

    const campos = [
      'id_sensor',
      'corrente_rms_A',
      'tensao_rms_V',
      'potencia_ativa_W',
      'fator_potencia',
      'energia_intervalo_kWh',
      'energia_acumulada_kWh',
      'timestamp',
      'qualidade_sinal'
    ];

    const dados =
      Object.fromEntries(
        campos
          .filter(
            (campo) =>
              req.body[campo] !== undefined
          )
          .map((campo) => [
            campo,
            req.body[campo]
          ])
      );

    dados.id_sensor =
      Number(dados.id_sensor);

    if (
      !Number.isInteger(dados.id_sensor) ||
      dados.id_sensor <= 0
    ) {
      return res.status(400).json({
        erro:
          'id_sensor deve ser um número ' +
          'inteiro positivo'
      });
    }

    for (const campo of campos) {
      if (
        campo === 'id_sensor' ||
        campo === 'timestamp'
      ) {
        continue;
      }

      if (dados[campo] !== undefined) {
        if (!numeroValido(dados[campo])) {
          return res.status(400).json({
            erro:
              `${campo} deve ser um número válido`
          });
        }

        dados[campo] =
          Number(dados[campo]);
      }
    }

    const erroFaixa =
      validarFaixasLeitura(dados);

    if (erroFaixa) {
      return res.status(400).json({
        erro: erroFaixa
      });
    }

    if (dados.timestamp !== undefined) {
      const data =
        new Date(dados.timestamp);

      if (Number.isNaN(data.getTime())) {
        return res.status(400).json({
          erro: 'timestamp inválido'
        });
      }

      const limiteFuturo =
        Date.now() + 5 * 60 * 1000;

      if (data.getTime() > limiteFuturo) {
        return res.status(400).json({
          erro:
            'timestamp não pode estar no futuro'
        });
      }

      dados.timestamp = data;
    }

    try {
      const sensor =
        await db.Sensor.findOne({
          where: {
            id_sensor: dados.id_sensor,
            id_dispositivo:
              req.dispositivo.id_dispositivo
          }
        });

      if (!sensor) {
        return res.status(403).json({
          erro:
            'O sensor não pertence a este dispositivo'
        });
      }

      const leitura =
        await db.Leitura.create(dados);

      await verificarLeitura(leitura);

      await req.dispositivo.update({
        ultimo_contato: new Date(),
        status_operacao: 'ONLINE'
      });

      return res.status(201).json(leitura);
    } catch (erro) {
      if (
        erro.name ===
          'SequelizeForeignKeyConstraintError' ||
        erro.name ===
          'SequelizeValidationError'
      ) {
        return res.status(400).json({
          erro:
            'Dados da leitura inválidos'
        });
      }

      console.error(
        'Erro ao criar leitura:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível registrar a leitura'
      });
    }
  }
);

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

  next(erro);
});

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