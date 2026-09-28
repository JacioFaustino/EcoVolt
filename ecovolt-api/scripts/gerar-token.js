//Pra gerar um token pra um dispositivo(o número no final é o id_dispositivo):
//node scripts/gerar-token.js 1 
//Será necessário para a pessoa do ESP32:
//URL da API,Token do dispositivo,id_sensor,Intervalo de envio(em segundos) e o Formato do JSON

require('dotenv').config();

const db = require('../src/models');

const {
  gerarTokenDispositivo,
  gerarHashToken
} = require('../src/middleware/deviceAuth');

async function executar() {
  const idDispositivo = Number(process.argv[2]);

  if (!Number.isInteger(idDispositivo)) {
    throw new Error(
      'Informe o ID do dispositivo. Exemplo: node scripts/gerar-token.js 1'
    );
  }

  const dispositivo = await db.Dispositivo.findByPk(idDispositivo);

  if (!dispositivo) {
    throw new Error('Dispositivo não encontrado');
  }

  const token = gerarTokenDispositivo();
  const tokenHash = gerarHashToken(token);

  await dispositivo.update({
    token_hash: tokenHash,
    status_operacao: 'ONLINE'
  });

  console.log('');
  console.log('Token gerado com sucesso.');
  console.log('Copie este token para a pessoa responsável pelo ESP32:');
  console.log('');
  console.log(token);
  console.log('');

  await db.sequelize.close();
}

executar().catch(async (erro) => {
  console.error('Erro:', erro.message);

  await db.sequelize.close();
  process.exit(1);
});