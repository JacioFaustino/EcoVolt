async function verificarLeitura(leitura) {
  //Aqui é o lugar para as regras de anomalia
  // Por enquanto o serviço apenas recebe a leitura
  console.log(
    `Leitura ${leitura.id_leitura} recebida para análise`
  );
}

module.exports = {
  verificarLeitura
};