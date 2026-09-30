const salaService =
  require('../services/salaService');

const AppError =
  require('../utils/AppError');

async function listar(req, res) {
  const salas =
    await salaService.listar();

  return res.json(salas);
}

async function consumoPorHora(req, res) {
  const idSala =
    Number(req.params.id);

  if (
    !Number.isInteger(idSala) ||
    idSala <= 0
  ) {
    throw new AppError(
      'O id da sala deve ser um número inteiro positivo',
      400
    );
  }

  const consumo =
    await salaService.consumoPorHora(
      idSala
    );

  return res.json(consumo);
}

module.exports = {
  listar,
  consumoPorHora
};