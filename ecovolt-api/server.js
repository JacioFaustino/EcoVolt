require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./src/models');

const {
  gerarTokenDispositivo,
  gerarHashToken,
  autenticarDispositivo
} = require('./src/middleware/deviceAuth');

const {
  autenticarUsuario,
  exigirPerfis
} = require('./src/middleware/userAuth');

const {
  atualizarDispositivosOffline
} = require('./src/services/deviceStatus');

const {
  verificarLeitura
} = require('./src/services/alertService');

const {
  leituraSchema
} = require('./src/schemas/leituraSchema');

const {
  dispositivoSchema
} = require('./src/schemas/dispositivoSchema');

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

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro:
      'Muitas tentativas de login. Tente novamente mais tarde.'
  }
});

app.use(cors());

app.use(
  express.json({
    limit: '100kb'
  })
);

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

//AUTENTICAÇÃO DE USUÁRIOS
app.post(
  '/api/auth/login',
  limiteLogin,
  async (req, res) => {
    try {
      if (!process.env.JWT_SECRET) {
        return res.status(503).json({
          erro:
            'Autenticação não configurada'
        });
      }

      const {
        email,
        senha
      } = req.body || {};

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
          where: {
            email
          }
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
          id_usuario:
            usuario.id_usuario,
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

//DISPOSITIVOS:

//Lista os dispositivos
app.get(
  '/api/dispositivos',
  autenticarUsuario,
  exigirPerfis(
    'ADMINISTRADOR',
    'TECNICO'
  ),
  async (req, res) => {
    try {
      const dispositivos =
        await db.Dispositivo.findAll({
          attributes: {
            exclude: [
              'token_hash'
            ]
          },
          order: [
            ['id_dispositivo', 'ASC']
          ]
        });

      return res.json(dispositivos);
    } catch (erro) {
      console.error(
        'Erro ao listar dispositivos:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível listar os dispositivos'
      });
    }
  }
);

//Cadastra um dispositivo e gera o token
app.post(
  '/api/dispositivos',
  autenticarUsuario,
  exigirPerfis('ADMINISTRADOR'),
  async (req, res) => {
    const resultado =
      dispositivoSchema.safeParse(
        req.body
      );

    if (!resultado.success) {
      return res.status(400).json({
        erro:
          'Dados do dispositivo inválidos',
        detalhes:
          resultado.error.issues.map(
            (item) => ({
              campo:
                item.path.join('.'),
              mensagem:
                item.message
            })
          )
      });
    }

    try {
      const token =
        gerarTokenDispositivo();

      const tokenHash =
        gerarHashToken(token);

      const dispositivo =
        await db.Dispositivo.create({
          ...resultado.data,
          token_hash: tokenHash,
          status_operacao: 'ONLINE'
        });

      return res.status(201).json({
        dispositivo: {
          id_dispositivo:
            dispositivo.id_dispositivo,
          id_sala:
            dispositivo.id_sala,
          identificador:
            dispositivo.identificador,
          mac_address:
            dispositivo.mac_address,
          modelo:
            dispositivo.modelo,
          intervalo_envio_segundos:
            dispositivo.intervalo_envio_segundos,
          status_operacao:
            dispositivo.status_operacao
        },
        token
      });
    } catch (erro) {
      if (
        erro.name ===
          'SequelizeUniqueConstraintError' ||
        erro.name ===
          'SequelizeForeignKeyConstraintError' ||
        erro.name ===
          'SequelizeValidationError'
      ) {
        return res.status(400).json({
          erro:
            'Dispositivo duplicado ou inválido'
        });
      }

      console.error(
        'Erro ao cadastrar dispositivo:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível cadastrar o dispositivo'
      });
    }
  }
);

//Gera um novo token e invalida o anterior
app.post(
  '/api/dispositivos/:id/gerar-token',
  autenticarUsuario,
  exigirPerfis('ADMINISTRADOR'),
  async (req, res) => {
    const idDispositivo =
      Number(req.params.id);

    if (
      !Number.isInteger(idDispositivo) ||
      idDispositivo <= 0
    ) {
      return res.status(400).json({
        erro:
          'ID do dispositivo inválido'
      });
    }

    try {
      const dispositivo =
        await db.Dispositivo.findByPk(
          idDispositivo
        );

      if (!dispositivo) {
        return res.status(404).json({
          erro:
            'Dispositivo não encontrado'
        });
      }

      const token =
        gerarTokenDispositivo();

      await dispositivo.update({
        token_hash:
          gerarHashToken(token),
        status_operacao: 'ONLINE'
      });

      return res.json({
        mensagem:
          'Novo token gerado. O token anterior foi invalidado.',
        token
      });
    } catch (erro) {
      console.error(
        'Erro ao gerar token:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível gerar o token'
      });
    }
  }
);

//Revoga o token de um dispositivo:
app.post(
  '/api/dispositivos/:id/revogar-token',
  autenticarUsuario,
  exigirPerfis('ADMINISTRADOR'),
  async (req, res) => {
    const idDispositivo =
      Number(req.params.id);

    if (
      !Number.isInteger(idDispositivo) ||
      idDispositivo <= 0
    ) {
      return res.status(400).json({
        erro:
          'ID do dispositivo inválido'
      });
    }

    try {
      const dispositivo =
        await db.Dispositivo.findByPk(
          idDispositivo
        );

      if (!dispositivo) {
        return res.status(404).json({
          erro:
            'Dispositivo não encontrado'
        });
      }

      await dispositivo.update({
        token_hash: null,
        status_operacao: 'INATIVO'
      });

      return res.json({
        mensagem:
          'Token revogado com sucesso'
      });
    } catch (erro) {
      console.error(
        'Erro ao revogar token:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível revogar o token'
      });
    }
  }
);

//SALAS
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
            ON l.id_sensor =
               se.id_sensor
          LEFT JOIN leitura l2
            ON l2.id_sensor =
               l.id_sensor
           AND (
             l2.timestamp > l.timestamp
             OR (
               l2.timestamp =
                 l.timestamp
               AND l2.id_leitura >
                 l.id_leitura
             )
           )
          WHERE l2.id_leitura IS NULL
        `);

      return res.json(linhas);
    } catch (erro) {
      console.error(
        'Erro ao listar salas:',
        erro
      );

      return res.status(500).json({
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
            HOUR(l.timestamp)
              AS hora,
            SUM(
              l.energia_intervalo_kWh
            ) AS consumo_kWh
          FROM leitura l
          JOIN sensor se
            ON se.id_sensor =
               l.id_sensor
          JOIN dispositivo d
            ON d.id_dispositivo =
               se.id_dispositivo
          WHERE d.id_sala = ?
          GROUP BY HOUR(l.timestamp)
          ORDER BY hora
        `, {
          replacements: [idSala]
        });

      return res.json(linhas);
    } catch (erro) {
      console.error(
        'Erro ao consultar consumo:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível consultar o consumo'
      });
    }
  }
);

//ALERTAS
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
          include: [
            db.Sala
          ]
        });

      return res.json(alertas);
    } catch (erro) {
      console.error(
        'Erro ao listar alertas:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível listar os alertas'
      });
    }
  }
);

//LEITURAS DO ESP32
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

    const resultado =
      leituraSchema.safeParse(
        req.body
      );

    if (!resultado.success) {
      return res.status(400).json({
        erro:
          'Dados da leitura inválidos',
        detalhes:
          resultado.error.issues.map(
            (item) => ({
              campo:
                item.path.join('.'),
              mensagem:
                item.message
            })
          )
      });
    }

    const {
      estado_porta,
      ...dados
    } = resultado.data;

    try {
      const sensor =
        await db.Sensor.findOne({
          where: {
            id_sensor:
              dados.id_sensor,
            id_dispositivo:
              req.dispositivo
                .id_dispositivo
          }
        });

      if (!sensor) {
        return res.status(403).json({
          erro:
            'O sensor não pertence a este dispositivo'
        });
      }

      const leitura =
        await db.Leitura.create(
          dados
        );

      if (
        estado_porta !== undefined
      ) {
        await db.EstadoPorta.create({
          id_sensor:
            dados.id_sensor,
          estado: estado_porta,
          timestamp:
            dados.timestamp ||
            new Date()
        });
      }

      await verificarLeitura(
        leitura
      );

      await req.dispositivo.update({
        ultimo_contato:
          new Date(),
        status_operacao:
          'ONLINE'
      });

      return res.status(201).json(
        leitura
      );
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

//TRATAMENTO DE JSON INVÁLIDO
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