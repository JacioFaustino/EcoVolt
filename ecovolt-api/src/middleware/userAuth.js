const jwt = require('jsonwebtoken');
const db = require('../models');

function autenticarUsuario(req, res, next) {
  const authorization = req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith('Bearer ')
  ) {
    return res.status(401).json({
      erro: 'Token de usuário não informado'
    });
  }

  try {
    const token = authorization
      .slice(7)
      .trim();

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = payload;

    return next();
  } catch (erro) {
    return res.status(401).json({
      erro: 'Token de usuário inválido ou expirado'
    });
  }
}

function exigirPerfis(...perfis) {
  return async (req, res, next) => {
    try {
      const usuario = await db.Usuario.findByPk(
        req.usuario.id_usuario
      );

      if (!usuario || usuario.status !== 'ATIVO') {
        return res.status(403).json({
          erro: 'Usuário inativo ou não encontrado'
        });
      }

      if (
        perfis.length > 0 &&
        !perfis.includes(usuario.perfil)
      ) {
        return res.status(403).json({
          erro: 'Usuário sem permissão'
        });
      }

      req.usuarioRegistro = usuario;

      return next();
    } catch (erro) {
      console.error(
        'Erro ao validar usuário:',
        erro
      );

      return res.status(500).json({
        erro: 'Erro ao validar usuário'
      });
    }
  };
}

module.exports = {
  autenticarUsuario,
  exigirPerfis
};