const db = require('../models');

async function atualizarDispositivosOffline() {
  const dispositivos = await db.Dispositivo.findAll({
    where: {
      status_operacao: 'ONLINE'
    }
  });

  const agora = Date.now();

  for (const dispositivo of dispositivos) {
    if (!dispositivo.ultimo_contato) {
      continue;
    }

    const limiteEmMilissegundos =
      dispositivo.intervalo_envio_segundos * 5 * 1000;

    const tempoSemContato =
      agora - new Date(dispositivo.ultimo_contato).getTime();

    if (tempoSemContato > limiteEmMilissegundos) {
      await dispositivo.update({
        status_operacao: 'OFFLINE'
      });
    }
  }
}

module.exports = {
  atualizarDispositivosOffline
};