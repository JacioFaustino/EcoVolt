const relatorioService =
  require('../services/relatorioService');

const {
  relatorioSchema
} = require('../schemas/relatorioSchema');

const AppError =
  require('../utils/AppError');

async function criar(req, res) {
  const resultado =
    relatorioSchema.safeParse(
      req.body
    );

  if (!resultado.success) {
    throw new AppError(
      'Dados do relatório inválidos',
      400
    );
  }

  if (!req.usuario) {
    throw new AppError(
      'Usuário não autenticado',
      401
    );
  }

  const relatorio =
    await relatorioService.criarRelatorio({
      dados: resultado.data,
      idUsuario:
        req.usuario.id_usuario
    });

  return res.status(201).json(
    relatorio
  );
}

async function listar(req, res) {
  const idSala =
    req.query.id_sala
      ? Number(req.query.id_sala)
      : undefined;

  if (
    idSala !== undefined &&
    (!Number.isInteger(idSala) ||
      idSala <= 0)
  ) {
    throw new AppError(
      'id_sala inválido',
      400
    );
  }

  const relatorios =
    await relatorioService.listarRelatorios({
      idSala,
      tipoRelatorio:
        req.query.tipo_relatorio,
      idUsuario:
        req.usuario.id_usuario
    });

  return res.json(relatorios);
}

async function obterPorId(req, res) {
  const id =
    Number(req.params.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new AppError(
      'ID do relatório inválido',
      400
    );
  }

  const relatorio =
    await relatorioService.obterRelatorioPorId(
      id
    );

  return res.json(relatorio);
}

module.exports = {
  criar,
  listar,
  obterPorId
};