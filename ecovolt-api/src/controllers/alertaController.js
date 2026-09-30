const alertaService =
  require('../services/alertaService');

const AppError =
  require('../utils/AppError');

async function listar(req, res) {
  const alertas =
    await alertaService.listar(
      req.query
    );

  return res.json(alertas);
}

async function buscarPorId(req, res) {
  const idAlerta =
    Number(req.params.id);

  if (
    !Number.isInteger(idAlerta) ||
    idAlerta <= 0
  ) {
    throw new AppError(
      'ID do alerta inválido',
      400
    );
  }

  const alerta =
    await alertaService.buscarPorId(
      idAlerta
    );

  return res.json(alerta);
}

async function encerrar(req, res) {
  const idAlerta =
    Number(req.params.id);

  if (
    !Number.isInteger(idAlerta) ||
    idAlerta <= 0
  ) {
    throw new AppError(
      'ID do alerta inválido',
      400
    );
  }

  const alerta =
    await alertaService.encerrar(
      idAlerta
    );

  return res.json(alerta);
}

module.exports = {
  listar,
  buscarPorId,
  encerrar
};