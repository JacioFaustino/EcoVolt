const db = require('../models');
const AppError = require('../utils/AppError');

const {
  gerarTokenDispositivo,
  gerarHashToken
} = require('../middleware/deviceAuth');

async function listar() {
  return db.Dispositivo.findAll({
    attributes: {
      exclude: ['token_hash']
    },
    order: [
      ['id_dispositivo', 'ASC']
    ]
  });
}

async function criar(dados) {
  const token =
    gerarTokenDispositivo();

  const tokenHash =
    gerarHashToken(token);

  try {
    const dispositivo =
      await db.Dispositivo.create({
        ...dados,
        token_hash: tokenHash,
        status_operacao: 'ONLINE'
      });

    return {
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
    };
  } catch (erro) {
    if (
      erro.name ===
        'SequelizeUniqueConstraintError' ||
      erro.name ===
        'SequelizeForeignKeyConstraintError' ||
      erro.name ===
        'SequelizeValidationError'
    ) {
      throw new AppError(
        'Dispositivo duplicado ou inválido',
        400
      );
    }

    throw erro;
  }
}

async function gerarNovoToken(idDispositivo) {
  const dispositivo =
    await db.Dispositivo.findByPk(
      idDispositivo
    );

  if (!dispositivo) {
    throw new AppError(
      'Dispositivo não encontrado',
      404
    );
  }

  const token =
    gerarTokenDispositivo();

  await dispositivo.update({
    token_hash:
      gerarHashToken(token),
    status_operacao: 'ONLINE'
  });

  return {
    mensagem:
      'Novo token gerado. O token anterior foi invalidado.',
    token
  };
}

async function revogarToken(idDispositivo) {
  const dispositivo =
    await db.Dispositivo.findByPk(
      idDispositivo
    );

  if (!dispositivo) {
    throw new AppError(
      'Dispositivo não encontrado',
      404
    );
  }

  await dispositivo.update({
    token_hash: null,
    status_operacao: 'INATIVO'
  });

  return {
    mensagem:
      'Token revogado com sucesso'
  };
}

module.exports = {
  listar,
  criar,
  gerarNovoToken,
  revogarToken
};