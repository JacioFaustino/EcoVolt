const AppError = require('./AppError');
const { paraBrasilia, meiaNoiteBrasilia } = require('./fuso');

const MS_DIA = 24 * 60 * 60 * 1000;

function formatarDataSqlUtc(data) {
  const pad = (numero) => String(numero).padStart(2, '0');

  return (
    data.getUTCFullYear() + '-' +
    pad(data.getUTCMonth() + 1) + '-' +
    pad(data.getUTCDate()) + ' ' +
    pad(data.getUTCHours()) + ':' +
    pad(data.getUTCMinutes()) + ':' +
    pad(data.getUTCSeconds())
  );
}

function paraDataUtc(texto, nomeCampo) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new AppError(`${nomeCampo} deve estar no formato YYYY-MM-DD`, 400);
  }

  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = meiaNoiteBrasilia(ano, mes - 1, dia);
  const conferencia = paraBrasilia(data);

  const valida =
    conferencia.getUTCFullYear() === ano &&
    conferencia.getUTCMonth() === mes - 1 &&
    conferencia.getUTCDate() === dia;

  if (!valida) {
    throw new AppError(`${nomeCampo} não é uma data válida`, 400);
  }

  return data;
}

function intervaloDoDiaUtc(referencia) {
  const local = paraBrasilia(referencia);

  const inicio = meiaNoiteBrasilia(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate()
  );

  const fim = new Date(inicio.getTime() + MS_DIA);

  return {
    inicio: formatarDataSqlUtc(inicio),
    fim: formatarDataSqlUtc(fim)
  };
}

function intervaloDoMesUtc(referencia) {
  const local = paraBrasilia(referencia);
  const ano = local.getUTCFullYear();
  const mes = local.getUTCMonth();

  return {
    inicio: formatarDataSqlUtc(meiaNoiteBrasilia(ano, mes, 1)),
    fim: formatarDataSqlUtc(meiaNoiteBrasilia(ano, mes + 1, 1))
  };
}

module.exports = {
  formatarDataSqlUtc,
  paraDataUtc,
  intervaloDoDiaUtc,
  intervaloDoMesUtc
};