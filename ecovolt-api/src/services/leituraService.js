const db = require('../models');
const AppError = require('../utils/AppError');

const {
  verificarLeitura
} = require('./anomaliaService');
const {
  fecharAlertaDispositivoOnline
} = require('./deviceStatus');

async function obterSensorPorta(
  idDispositivo
) {
  return db.Sensor.findOne({
    where: {
      id_dispositivo: idDispositivo,
      tipo: 'PORTA',
      status: 'ATIVO'
    }
  });
}

async function criarLeitura({
  dados,
  dispositivo
}) {
  const sensor =
    await db.Sensor.findOne({
      where: {
        id_sensor: dados.id_sensor,
        id_dispositivo:
          dispositivo.id_dispositivo
      }
    });

  if (!sensor) {
    throw new AppError(
      'O sensor não pertence a este dispositivo',
      403
    );
  }

  const leitura =
    await db.Leitura.create(dados);

  if (dados.estado_porta !== undefined){
    const sensorPorta =
      await obterSensorPorta(
        dispositivo.id_dispositivo
      );

    if (!sensorPorta) {
      throw new AppError(
        'Sensor de porta não cadastrado para este dispositivo',
        400
      );
    }

 const ultimoEstado =
    await db.EstadoPorta.findOne({
      where: {
        id_sensor:
          sensorPorta.id_sensor
      },
      order: [
        ['timestamp', 'DESC']
      ]
    });

  const estadoMudou =
    !ultimoEstado ||
    ultimoEstado.estado !==
      dados.estado_porta;

  if (estadoMudou) {
    await db.EstadoPorta.create({
      id_sensor:
        sensorPorta.id_sensor,
      estado:
        dados.estado_porta,
      timestamp:
        dados.timestamp || new Date()
    });
  }
}

  await verificarLeitura(leitura);

  await dispositivo.update({
    ultimo_contato: new Date(),
    status_operacao: 'ONLINE'
  });
  
  await fecharAlertaDispositivoOnline(dispositivo);

  return leitura;
}

module.exports = {
  criarLeitura
};