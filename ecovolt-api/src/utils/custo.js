function obterTarifaKwh() {
  const tarifa = Number(process.env.TARIFA_KWH);
  return Number.isFinite(tarifa) && tarifa > 0 ? tarifa : null;
}

function calcularCustoReais(kWh) {
  const tarifa = obterTarifaKwh();
  const energia = Number(kWh);

  if (tarifa === null || !Number.isFinite(energia)) {
    return null;
  }

  return Number((energia * tarifa).toFixed(2));
}

module.exports = {
  obterTarifaKwh,
  calcularCustoReais
};