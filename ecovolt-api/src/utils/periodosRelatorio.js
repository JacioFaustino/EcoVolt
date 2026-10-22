const AppError = require('./AppError');
const { paraDataUtc } = require('./periodo');
const { hojeBrasilia, meiaNoiteBrasilia } = require('./fuso');
const MS_DIA = 24 * 60 * 60 * 1000;

function formatar(data) {
  return data.toISOString().slice(0, 10);
}

function hojeUtc() {
  return hojeBrasilia();
}

function calcularPeriodo(periodicidade, dataReferencia) {
  const base = dataReferencia
    ? paraDataUtc(dataReferencia, 'data_referencia')
    : hojeUtc();

  let inicio = new Date(base.getTime());
  let fim = new Date(base.getTime());

  switch (periodicidade) {
    case 'DIARIO':
      break;

    case 'SEMANAL': {
      const diaDaSemana = (base.getUTCDay() + 6) % 7;

      inicio = new Date(base.getTime() - diaDaSemana * MS_DIA);
      fim = new Date(inicio.getTime() + 6 * MS_DIA);

      break;
    }

    case 'MENSAL': {
      const ano = base.getUTCFullYear();
      const mes = base.getUTCMonth();

     inicio = meiaNoiteBrasilia(ano, mes, 1);
      fim = meiaNoiteBrasilia(ano, mes + 1, 0);

      break;
    }

    case 'ANUAL': {
      const ano = base.getUTCFullYear();

      inicio = meiaNoiteBrasilia(ano, 0, 1);
      fim = meiaNoiteBrasilia(ano, 11, 31);

      break;
    }

    default:
      throw new AppError('periodicidade inválida', 400);
  }

  return {
    inicio: formatar(inicio),
    fim: formatar(fim)
  };
}

module.exports = { calcularPeriodo };