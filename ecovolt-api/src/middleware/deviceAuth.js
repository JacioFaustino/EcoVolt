const crypto = require('crypto');
const db = require('../models');

function gerarTokenDispositivo() {
  return crypto
    .randomBytes(32)
    .toString('hex');
}

function gerarHashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

async function autenticarDispositivo(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        erro:
          'Token do dispositivo não informado'
      });
    }

    const token = authorization
      .slice(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        erro:
          'Token do dispositivo inválido'
      });
    }

    const tokenHash =
      gerarHashToken(token);

    const dispositivo =
      await db.Dispositivo.findOne({
        where: {
          token_hash: tokenHash
        }
      });

    if (!dispositivo) {
      return res.status(401).json({
        erro:
          'Token do dispositivo inválido'
      });
    }

    if (
      dispositivo.status_operacao ===
      'INATIVO'
    ) {
      return res.status(403).json({
        erro: 'Dispositivo inativo'
      });
    }

    req.dispositivo = dispositivo;

    return next();
  } catch (erro) {
    console.error(
      'Erro na autenticação do dispositivo:',
      erro
    );

    return res.status(500).json({
      erro:
        'Erro ao autenticar dispositivo'
    });
  }
}

module.exports = {
  gerarTokenDispositivo,
  gerarHashToken,
  autenticarDispositivo
};