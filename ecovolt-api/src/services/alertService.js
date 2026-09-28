async function verificarLeitura(leitura) {
  //Aqui é o lugar para as regras de anomalia
  //Pra quando o formato dos dados do ESP32 tiver já definido
  // Por enquanto o serviço apenas recebe a leitura
  return leitura;
}

module.exports = {
  verificarLeitura
};