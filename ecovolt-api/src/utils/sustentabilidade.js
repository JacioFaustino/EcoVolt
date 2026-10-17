const FATOR_CO2_PADRAO_KG_KWH = 0.0385;

function obterFatorCo2KgKwh() {
  const valor = Number(process.env.FATOR_CO2_KG_KWH);

  return Number.isFinite(valor) && valor > 0
    ? valor
    : FATOR_CO2_PADRAO_KG_KWH;
}

function calcularCo2Kg(kWh) {
  const energia = Number(kWh);

  if (!Number.isFinite(energia)) {
    return null;
  }

  return Number((energia * obterFatorCo2KgKwh()).toFixed(3));
}

module.exports = {
  FATOR_CO2_PADRAO_KG_KWH,
  obterFatorCo2KgKwh,
  calcularCo2Kg
};