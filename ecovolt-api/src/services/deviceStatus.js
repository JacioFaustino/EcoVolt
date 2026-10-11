const db = require('../models');

const {
  Op
} = db.Sequelize;

const MULTIPLICADOR_PADRAO_OFFLINE = 5;

async function obterConfiguracaoR7(
  idSala
) {
  return db.ConfiguracaoAlerta.findOne({
    where: {
      id_sala: idSala,
      tipo_parametro:
        'R7_DISPOSITIVO_OFFLINE',
      status: 'ATIVA'
    }
  });
}

async function criarAlertaDispositivoOffline(
  dispositivo,
  configuracaoPreCarregada
) {
  const configuracao =
    configuracaoPreCarregada ||
    await obterConfiguracaoR7(
      dispositivo.id_sala
    );

  if (!configuracao) {
    return;
  }

  const alertaExistente =
    await db.Alerta.findOne({
      where: {
        id_sala: dispositivo.id_sala,
        tipo_alerta:
          'R7_DISPOSITIVO_OFFLINE',
        status: {
          [Op.in]: [
            'PENDENTE',
            'ABERTO'
          ]
        }
      }
    });

  if (alertaExistente) {
    return;
  }

  await db.Alerta.create({
    id_sala: dispositivo.id_sala,
    id_config:
      configuracao.id_config,
    tipo_alerta:
      'R7_DISPOSITIVO_OFFLINE',
    descricao:
      `Dispositivo ${dispositivo.identificador} está offline`,
    valor_detectado: 0,
    timestamp_inicio: new Date(),
    status: 'ABERTO',
    gravidade: 'ALTA'
  });
}

async function fecharAlertaDispositivoOnline(
  dispositivo
) {
  await db.Alerta.update(
    {
      status: 'FECHADO',
      timestamp_fim: new Date()
    },
    {
      where: {
        id_sala: dispositivo.id_sala,
        tipo_alerta:
          'R7_DISPOSITIVO_OFFLINE',
        status: {
          [Op.in]: [
            'PENDENTE',
            'ABERTO'
          ]
        }
      }
    }
  );
}

async function atualizarDispositivosOffline() {
  const dispositivos =
    await db.Dispositivo.findAll({
      where: {
        status_operacao: 'ONLINE'
      }
    });

  const agora = Date.now();

  for (const dispositivo of dispositivos) {
    if (!dispositivo.ultimo_contato) {
      continue;
    }

    const intervalo =
      Number(
        dispositivo.intervalo_envio_segundos
      );

    if (
      !Number.isFinite(intervalo) ||
      intervalo <= 0
    ) {
      continue;
    }

    const configuracao =
      await obterConfiguracaoR7(
        dispositivo.id_sala
      );

    const valorLimiteConfigurado =
      configuracao
        ? Number(
            configuracao.valor_limite
          )
        : NaN;

    const multiplicador =
      Number.isFinite(
        valorLimiteConfigurado
      ) &&
      valorLimiteConfigurado > 0
        ? valorLimiteConfigurado
        : MULTIPLICADOR_PADRAO_OFFLINE;

    const limite =
      intervalo *
      multiplicador *
      1000;

    const ultimoContato =
      new Date(
        dispositivo.ultimo_contato
      ).getTime();

    const tempoSemContato =
      agora - ultimoContato;

    if (
      tempoSemContato > limite
    ) {
      await dispositivo.update({
        status_operacao: 'OFFLINE'
      });

      await criarAlertaDispositivoOffline(
        dispositivo,
        configuracao
      );
    }
  }
}

module.exports = {
  criarAlertaDispositivoOffline,
  fecharAlertaDispositivoOnline,
  atualizarDispositivosOffline
};