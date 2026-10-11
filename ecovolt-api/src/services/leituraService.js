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

  const resultadoVerificacao =
    await verificarLeitura(leitura);

  await dispositivo.update({
    ultimo_contato: new Date(),
    status_operacao: 'ONLINE'
  });
  
  await fecharAlertaDispositivoOnline(dispositivo);

  return {
    ...leitura.toJSON(),
    comandos:
      resultadoVerificacao.comandos ||
      []
  };
}

async function listarLeituras({
  idSensor,
  idSala,
  dataInicio,
  dataFim,
  limite = 100,
  offset = 0
}) {
  const filtros = [];
  const replacements = {};

  if (idSensor) {
    filtros.push('l.id_sensor = :idSensor');
    replacements.idSensor = idSensor;
  }

  if (idSala) {
    filtros.push('d.id_sala = :idSala');
    replacements.idSala = idSala;
  }

  if (dataInicio) {
    filtros.push('l.timestamp >= :dataInicio');
    replacements.dataInicio = dataInicio;
  }

  if (dataFim) {
    filtros.push('l.timestamp <= :dataFim');
    replacements.dataFim = dataFim;
  }

  const where = filtros.length > 0
    ? `WHERE ${filtros.join(' AND ')}`
    : '';

  replacements.limite = limite;
  replacements.offset = offset;

  const [dados] =
    await db.sequelize.query(`
      SELECT
        l.id_leitura,
        l.id_sensor,
        se.id_dispositivo,
        d.id_sala,
        l.corrente_rms_A,
        l.tensao_rms_V,
        l.potencia_ativa_W,
        l.fator_potencia,
        l.energia_intervalo_kWh,
        l.energia_acumulada_kWh,
        l.qualidade_sinal,
        l.timestamp
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      ${where}
      ORDER BY l.timestamp DESC
      LIMIT :limite
      OFFSET :offset
    `, {
      replacements
    });

  const [resultadoTotal] =
    await db.sequelize.query(`
      SELECT COUNT(*) AS total
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      ${where}
    `, {
      replacements
    });

  return {
    dados,
    total: Number(resultadoTotal[0].total),
    limite,
    offset
  };
}

async function obterLeituraPorId(
  idLeitura
) {
  const [linhas] =
    await db.sequelize.query(`
      SELECT
        l.id_leitura,
        l.id_sensor,
        se.id_dispositivo,
        d.id_sala,
        l.corrente_rms_A,
        l.tensao_rms_V,
        l.potencia_ativa_W,
        l.fator_potencia,
        l.energia_intervalo_kWh,
        l.energia_acumulada_kWh,
        l.qualidade_sinal,
        l.timestamp
      FROM leitura l
      JOIN sensor se
        ON se.id_sensor = l.id_sensor
      JOIN dispositivo d
        ON d.id_dispositivo =
           se.id_dispositivo
      WHERE l.id_leitura = ?
      LIMIT 1
    `, {
      replacements: [idLeitura]
    });

  if (!linhas[0]) {
    throw new AppError(
      'Leitura não encontrada',
      404
    );
  }

  return linhas[0];
}

module.exports = {
  criarLeitura,
  listarLeituras,
  obterLeituraPorId
};