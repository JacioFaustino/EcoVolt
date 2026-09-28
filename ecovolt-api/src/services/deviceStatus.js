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

    const intervalo = Number(
      dispositivo.intervalo_envio_segundos
    );

    if (
      !Number.isFinite(intervalo) ||
      intervalo <= 0
    ) {
      continue;
    }

    const limite =
      intervalo * 5 * 1000;

    const ultimoContato =
      new Date(
        dispositivo.ultimo_contato
      ).getTime();

    const tempoSemContato =
      agora - ultimoContato;

    if (tempoSemContato > limite) {
      await dispositivo.update({
        status_operacao: 'OFFLINE'
      });
    }
  }
}

module.exports = {
  atualizarDispositivosOffline
};