'use strict';

function gerarLeituras(idSensor, potenciaBase, variacao, quantidade, intervaloMin) {
  const agora = new Date();
  const leituras = [];

  for (let i = quantidade; i > 0; i--) {
    const timestamp = new Date(agora.getTime() - i * intervaloMin * 60000);
    const potencia = potenciaBase + (Math.random() * variacao - variacao / 2);
    const corrente = potencia / 220;
    const energia = (potencia * intervaloMin * 60) / 3600000; // kWh

    leituras.push({
      id_sensor: idSensor,
      corrente_rms_A: corrente.toFixed(3),
      tensao_rms_V: 220,
      potencia_ativa_W: potencia.toFixed(2),
      fator_potencia: 1.0,
      energia_intervalo_kWh: energia.toFixed(6),
      timestamp,
      qualidade_sinal: 100
    });
  }
  return leituras;
}

module.exports = {
  up: (qi) => {
    const salaLeituras = gerarLeituras(1, 1500, 300, 20, 10); // sensor de corrente da Sala 101
    const labLeituras  = gerarLeituras(3, 2800, 400, 20, 10); // sensor de corrente do Lab. Informática
    return qi.bulkInsert('leitura', [...salaLeituras, ...labLeituras]);
  },
  down: (qi) => qi.bulkDelete('leitura', null, {})
};