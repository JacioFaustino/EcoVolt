const leituraService = require('../services/leituraService');
const {
  leituraSchema
} = require('../schemas/leituraSchema');
const AppError = require('../utils/AppError');

async function criar(req, res) {
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body)
  ) {
    throw new AppError(
      'O corpo deve ser um objeto JSON',
      400
    );
  }

  const resultado =
    leituraSchema.safeParse(req.body);

  if (!resultado.success) {
    throw new AppError(
      'Dados da leitura inválidos',
      400
    );
  }

  const leitura =
    await leituraService.criarLeitura({
      dados: resultado.data,
      dispositivo: req.dispositivo
    });

  return res.status(201).json(leitura);
}

async function listar(req, res) {
  const idSensor =
    req.query.id_sensor
      ? Number(req.query.id_sensor)
      : undefined;

  const idSala =
    req.query.id_sala
      ? Number(req.query.id_sala)
      : undefined;

  const limite =
    req.query.limite
      ? Number(req.query.limite)
      : 100;

  const offset =
    req.query.offset
      ? Number(req.query.offset)
      : 0;

  if (
    idSensor !== undefined &&
    (!Number.isInteger(idSensor) ||
      idSensor <= 0)
  ) {
    throw new AppError(
      'id_sensor inválido',
      400
    );
  }

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

  if (
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > 1000
  ) {
    throw new AppError(
      'limite deve estar entre 1 e 1000',
      400
    );
  }

  if (
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    throw new AppError(
      'offset deve ser um número maior ou igual a zero',
      400
    );
  }

  const resultado =
    await leituraService.listarLeituras({
      idSensor,
      idSala,
      dataInicio:
        req.query.data_inicio,
      dataFim:
        req.query.data_fim,
      limite,
      offset
    });

  return res.json(resultado);
}

async function obterPorId(req, res) {
  const id =
    Number(req.params.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new AppError(
      'ID da leitura inválido',
      400
    );
  }

  const leitura =
    await leituraService.obterLeituraPorId(
      id
    );

  return res.json(leitura);
}

module.exports = {
  criar,
  listar,
  obterPorId
};