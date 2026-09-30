const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const AppError = require('../utils/AppError');

async function autenticar({
  email,
  senha
}) {
  if (
    !process.env.JWT_SECRET
  ) {
    throw new AppError(
      'Autenticação não configurada',
      503
    );
  }

  const usuario =
    await db.Usuario.findOne({
      where: {
        email
      }
    });

  if (!usuario) {
    throw new AppError(
      'Credenciais inválidas',
      401
    );
  }

  if (usuario.status !== 'ATIVO') {
    throw new AppError(
      'Credenciais inválidas',
      401
    );
  }

  const senhaValida =
    await bcrypt.compare(
      senha,
      usuario.senha_hash
    );

  if (!senhaValida) {
    throw new AppError(
      'Credenciais inválidas',
      401
    );
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

  return {
    token,
    usuario: {
      id_usuario:
        usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil
    }
  };
}

module.exports = {
  autenticar
};