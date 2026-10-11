const AppError = require('./AppError');

function formatarDataSqlUtc(data) {
  const pad = (numero) =>
    String(numero).padStart(2, '0');

  return (
    data.getUTCFullYear() +
    '-' +
    pad(data.getUTCMonth() + 1) +
    '-' +
    pad(data.getUTCDate()) +
    ' ' +
    pad(data.getUTCHours()) +
    ':' +
    pad(data.getUTCMinutes()) +
    ':' +
    pad(data.getUTCSeconds())
  );
}

function paraDataUtc(texto, nomeCampo) {
  if (
    typeof texto !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(texto)
  ) {
    throw new AppError(
      `${nomeCampo} deve estar no formato YYYY-MM-DD`,
      400
    );
  }

  const [ano, mes, dia] = texto
    .split('-')
    .map(Number);

  const data = new Date(
    Date.UTC(ano, mes - 1, dia)
  );

  const valida =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia;

  if (!valida) {
    throw new AppError(
      `${nomeCampo} não é uma data válida`,
      400
    );
  }

  return data;
}

function intervaloDoDiaUtc(referencia) {
  const inicio = new Date(referencia);

  inicio.setUTCHours(0, 0, 0, 0);

  const fim = new Date(inicio);

  fim.setUTCDate(fim.getUTCDate() + 1);

  return {
    inicio: formatarDataSqlUtc(inicio),
    fim: formatarDataSqlUtc(fim)
  };
}

function intervaloDoMesUtc(referencia) {
  const base = new Date(referencia);

  const ano = base.getUTCFullYear();
  const mes = base.getUTCMonth();

  return {
    inicio: formatarDataSqlUtc(
      new Date(Date.UTC(ano, mes, 1))
    ),
    fim: formatarDataSqlUtc(
      new Date(Date.UTC(ano, mes + 1, 1))
    )
  };
}

module.exports = {
  formatarDataSqlUtc,
  paraDataUtc,
  intervaloDoDiaUtc,
  intervaloDoMesUtc
};