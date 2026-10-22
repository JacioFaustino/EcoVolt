'use strict';

// Gera histórico de leituras, alertas e estados de porta para uma sala
// já cadastrada, para analisar o painel (dashboard, gráficos, alertas,
// relatórios e sustentabilidade) antes de o ESP32 coletar de verdade.
//
//   node scripts/gerar-historico.js
//   node scripts/gerar-historico.js --sala 1 --dias 180 --intervalo 5
//   node scripts/gerar-historico.js --remover --confirmar
//
// Tudo em UTC, a mesma convenção da API. Os números são fictícios.

require('dotenv').config();

const DIAS_PADRAO = 120;
const INTERVALO_PADRAO = 10;
const LOTE = 500;
const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

// Carga média por hora (W) em dia útil. Índice = hora UTC.
const CARGA_DIA_UTIL = [
  90, 90, 90, 90, 90, 90, 90, 800, 1800, 1800, 1800, 1800, 900,
  1800, 1800, 1800, 1800, 1200, 1100, 1100, 1100, 400, 90, 90
];

const CARGA_STANDBY = 90;
const CARGA_PICO = 5400;
const CARGA_NOTURNA = [620, 900];

// Com a porta aberta o ar não desliga e consome mais: é esse
// excedente que caracteriza o desperdício.
const FATOR_PORTA_ABERTA = 1.35;
const FATOR_DIA_QUENTE = 1.45;

const TIPOS = {
  R1: 'R1_CONSUMO_FORA_HORARIO',
  R2: 'R2_AR_FORA_HORARIO',
  R3A: 'R3A_PORTA_ABERTA',
  R3B: 'R3B_PORTA_ABERTA_PERSISTENTE',
  R4: 'R4_SOBRECARGA',
  R5: 'R5_PADRAO_HISTORICO',
  R6: 'R6_LIMITE_DIARIO',
  R7: 'R7_DISPOSITIVO_OFFLINE',
  R8: 'R8_FALHA_LEITURA'
};

const DESCRICOES = {
  [TIPOS.R1]: 'Consumo detectado fora do horário de funcionamento',
  [TIPOS.R2]: 'Ar-condicionado ligado fora do horário de funcionamento',
  [TIPOS.R3A]: 'Porta aberta com ar-condicionado ligado',
  [TIPOS.R3B]: 'Porta aberta com ar-condicionado ligado após o acionamento do buzzer',
  [TIPOS.R4]: 'Potência acima da capacidade máxima do circuito',
  [TIPOS.R5]: 'Consumo acima do padrão histórico',
  [TIPOS.R6]: 'Limite diário de consumo excedido',
  [TIPOS.R7]: 'Dispositivo sem contato com o servidor',
  [TIPOS.R8]: 'Falha ou inconsistência na leitura do sensor'
};

const GRAVIDADES = {
  [TIPOS.R1]: 'MEDIA',
  [TIPOS.R2]: 'MEDIA',
  [TIPOS.R3A]: 'MEDIA',
  [TIPOS.R3B]: 'ALTA',
  [TIPOS.R4]: 'ALTA',
  [TIPOS.R5]: 'BAIXA',
  [TIPOS.R6]: 'BAIXA',
  [TIPOS.R7]: 'ALTA',
  [TIPOS.R8]: 'MEDIA'
};

const DESPERDICIO = [
  TIPOS.R1,
  TIPOS.R2,
  TIPOS.R3A,
  TIPOS.R3B
];

const arredondar = (valor, casas) => Number(Number(valor).toFixed(casas));

// PRNG determinístico (mulberry32): o mesmo --seed gera os mesmos dados.
function criarRandom(seed) {
  let estado = seed >>> 0;

  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;

    let t = estado;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inicioDoDia = (data) =>
  new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));

const ehFimDeSemana = (data) => [0, 6].includes(data.getUTCDay());

const entre = (random, minimo, maximo) => minimo + random() * (maximo - minimo);

const inteiro = (random, minimo, maximo) =>
  Math.floor(entre(random, minimo, maximo + 1));

const contem = (evento, instante) =>
  instante.getTime() >= evento.inicio.getTime() &&
  instante.getTime() < evento.fim.getTime();

// ------------------------------------------------------------- eventos

function planejarEventos({ inicio, fim, random }) {
  const eventos = [];
  const cursor = new Date(inicio.getTime());
  const duracao = fim.getTime() - inicio.getTime();

  // O desperdício cai ao longo do período, simulando ações de
  // eficiência energética. É essa melhora que a tela de
  // sustentabilidade precisa mostrar.
  const progresso = (data) =>
    duracao > 0
      ? Math.min(Math.max((data.getTime() - inicio.getTime()) / duracao, 0), 1)
      : 0;

  const janela = (dia, hora, minuto, minutos) => {
    const inicioJanela = new Date(
      Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), hora, minuto)
    );

    return {
      inicio: inicioJanela,
      fim: new Date(inicioJanela.getTime() + minutos * MINUTO)
    };
  };

  while (cursor.getTime() < fim.getTime()) {
    const dia = new Date(cursor);
    const util = !ehFimDeSemana(dia);
    const andamento = progresso(dia);

    const hora = () => inteiro(random, 0, 11) * 5;

    if (util) {
      // R3A: porta aberta com o ar-condicionado ligado.
      if (random() < 0.95 * (1 - 0.85 * andamento)) {
        const r3a = janela(dia, inteiro(random, 8, 20), hora(), inteiro(random, 45, 180));

        eventos.push({ tipo: TIPOS.R3A, ...r3a });

        // R3B: continua aberta depois do aviso sonoro.
        if (random() < 0.3) {
          eventos.push({
            tipo: TIPOS.R3B,
            inicio: new Date(r3a.inicio.getTime() + 15 * MINUTO),
            fim: r3a.fim
          });
        }
      }

      // R4: pico acima da capacidade do circuito.
      if (random() < 0.04) {
        eventos.push({
          tipo: TIPOS.R4,
          ...janela(dia, inteiro(random, 13, 17), hora(), inteiro(random, 15, 45)),
          carga: CARGA_PICO
        });
      }

      // R7: dispositivo sem contato (a janela fica sem leituras).
      if (random() < 0.03) {
        eventos.push({
          tipo: TIPOS.R7,
          ...janela(dia, inteiro(random, 9, 19), hora(), inteiro(random, 20, 90))
        });
      }

      // R8: qualidade do sinal abaixo do limite.
      if (random() < 0.04) {
        eventos.push({
          tipo: TIPOS.R8,
          ...janela(dia, inteiro(random, 8, 20), hora(), inteiro(random, 10, 40)),
          qualidade: inteiro(random, 20, 40)
        });
      }

      // R5: consumo acima do padrão histórico no mesmo horário.
      if (random() < 0.02) {
        eventos.push({
          tipo: TIPOS.R5,
          ...janela(dia, inteiro(random, 14, 16), 0, inteiro(random, 40, 70))
        });
      }
    }

    // R1/R2: equipamento ligado fora do horário.
    if (random() < (util ? 0.2 : 0.22) * (1 - 0.7 * andamento)) {
      eventos.push({
        tipo: random() < 0.5 ? TIPOS.R1 : TIPOS.R2,
        ...janela(dia, inteiro(random, 22, 23), hora(), inteiro(random, 60, 180)),
        carga: entre(random, ...CARGA_NOTURNA)
      });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Descarta o que começa depois do fim da janela (o dia de hoje
  // ainda está em andamento) e corta o que termina depois.
  const validos = eventos
    .filter((e) => e.inicio < fim && e.fim > inicio)
    .map((e) => ({
      ...e,
      inicio: new Date(Math.max(e.inicio.getTime(), inicio.getTime())),
      fim: new Date(Math.min(e.fim.getTime(), fim.getTime()))
    }));

  return garantirEventos(validos, { inicio, fim });
}

// Garante ao menos uma ocorrência de cada tipo, para nenhum filtro
// do painel ficar vazio quando o sorteio é econômico.
function garantirEventos(eventos, { inicio, fim }) {
  const diasJanela = Math.max(1, Math.floor((fim - inicio) / DIA) - 1);
  const base = inicioDoDia(fim);

  const criar = (tipo, diasAtras, hora, minutos, extras = {}) => {
    const dia = new Date(base.getTime() - Math.min(diasAtras, diasJanela) * DIA);

    const inicioEvento = new Date(
      Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), hora)
    );

    if (inicioEvento < inicio || inicioEvento >= fim) return null;

    const evento = {
      tipo,
      inicio: inicioEvento,
      fim: new Date(inicioEvento.getTime() + minutos * MINUTO),
      ...extras
    };

    eventos.push(evento);

    return evento;
  };

  const tem = (tipo) => eventos.some((e) => e.tipo === tipo);

  if (!tem(TIPOS.R3A)) criar(TIPOS.R3A, 6, 10, 60);

  if (!tem(TIPOS.R3B)) {
    const r3a = eventos.find((e) => e.tipo === TIPOS.R3A);

    if (r3a) {
      eventos.push({
        tipo: TIPOS.R3B,
        inicio: new Date(r3a.inicio.getTime() + 15 * MINUTO),
        fim: r3a.fim
      });
    }
  }

  if (!tem(TIPOS.R1)) criar(TIPOS.R1, 9, 23, 120, { carga: 750 });
  if (!tem(TIPOS.R2)) criar(TIPOS.R2, 13, 22, 90, { carga: 800 });
  if (!tem(TIPOS.R4)) criar(TIPOS.R4, 17, 15, 30, { carga: CARGA_PICO });
  if (!tem(TIPOS.R5)) criar(TIPOS.R5, 21, 14, 60);
  if (!tem(TIPOS.R7)) criar(TIPOS.R7, 25, 11, 45);
  if (!tem(TIPOS.R8)) criar(TIPOS.R8, 29, 16, 25, { qualidade: 30 });

  // Um dia mais quente que os outros, em dia útil: garante uma
  // ocorrência de R6 (limite diário) sem depender do sorteio.
  let diasQuente = Math.min(11, diasJanela);

  while (diasQuente > 0 && ehFimDeSemana(new Date(base.getTime() - diasQuente * DIA))) {
    diasQuente -= 1;
  }

  const diaQuente = new Date(base.getTime() - diasQuente * DIA);

  eventos.push({
    tipo: 'DIA_QUENTE',
    dia: diaQuente.toISOString().slice(0, 10)
  });

  return eventos;
}

// ------------------------------------------------------------ leituras

function gerarLeituras({ inicio, fim, intervaloMin, eventos, random, idSensor }) {
  const passo = intervaloMin * MINUTO;
  const leituras = [];

  const offline = eventos.filter((e) => e.tipo === TIPOS.R7);
  const picos = eventos.filter((e) => e.tipo === TIPOS.R4);
  const falhas = eventos.filter((e) => e.tipo === TIPOS.R8);
  const externos = eventos.filter((e) => e.tipo === TIPOS.R1 || e.tipo === TIPOS.R2);
  const portas = eventos.filter((e) => e.tipo === TIPOS.R3A || e.tipo === TIPOS.R3B);

  const diaQuente = eventos.find((e) => e.tipo === 'DIA_QUENTE');

  for (let t = inicio.getTime(); t < fim.getTime(); t += passo) {
    const instante = new Date(t);

    if (offline.some((e) => contem(e, instante))) continue;

    let potencia =
      (ehFimDeSemana(instante) ? CARGA_STANDBY : CARGA_DIA_UTIL[instante.getUTCHours()]) *
      (1 + 0.08 * Math.sin(instante.getUTCDate() * 0.7));

    const pico = picos.find((e) => contem(e, instante));

    if (pico) potencia = pico.carga;

    if (diaQuente && instante.toISOString().slice(0, 10) === diaQuente.dia) {
      potencia *= FATOR_DIA_QUENTE;
    }

    if (portas.some((e) => contem(e, instante))) potencia *= FATOR_PORTA_ABERTA;

    const externo = externos.find((e) => contem(e, instante));

    if (externo) potencia = Math.max(potencia, externo.carga);

    potencia = Math.max(potencia * (1 + (random() - 0.5) * 0.06), CARGA_STANDBY * 0.7);

    const falha = falhas.find((e) => contem(e, instante));

    leituras.push({
      id_sensor: idSensor,
      corrente_rms_A: arredondar(potencia / 220, 3),
      tensao_rms_V: 220,
      potencia_ativa_W: arredondar(potencia, 2),
      fator_potencia: arredondar(entre(random, 0.92, 0.99), 3),
      energia_intervalo_kWh: arredondar((potencia * intervaloMin) / 60 / 1000, 6),
      timestamp: instante,
      qualidade_sinal: falha ? falha.qualidade : inteiro(random, 92, 100)
    });
  }

  return leituras;
}

function gerarEstadosPorta({ inicio, fim, eventos, idSensor }) {
  const estados = [];
  const cursor = new Date(inicio.getTime());

  while (cursor.getTime() < fim.getTime()) {
    const dia = new Date(cursor);

    if (!ehFimDeSemana(dia)) {
      for (const [hora, estado] of [[7, 'ABERTA'], [22, 'FECHADA']]) {
        const instante = new Date(
          Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), hora)
        );

        if (instante >= inicio && instante < fim) {
          estados.push({ id_sensor: idSensor, estado, timestamp: instante });
        }
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const evento of eventos.filter((e) => e.tipo === TIPOS.R3A)) {
    if (evento.inicio >= inicio && evento.inicio < fim) {
      estados.push({ id_sensor: idSensor, estado: 'ABERTA', timestamp: evento.inicio });
    }
  }

  return estados.sort((a, b) => a.timestamp - b.timestamp);
}

// --------------------------------------------------------------- plano

function montarPlano(contexto, opcoes) {
  const { sala, sensorCorrente, sensorPorta, configuracoes, agora } = contexto;

  const passo = opcoes.intervaloMin * MINUTO;
  const fim = new Date(Math.floor(agora.getTime() / passo) * passo);
  const inicio = new Date(inicioDoDia(fim).getTime() - (opcoes.dias - 1) * DIA);

  const random = criarRandom(opcoes.seed);
  const eventos = planejarEventos({ inicio, fim, random });

  const leituras = gerarLeituras({
    inicio,
    fim,
    intervaloMin: opcoes.intervaloMin,
    eventos,
    random,
    idSensor: sensorCorrente.id_sensor
  });

  const estados = sensorPorta
    ? gerarEstadosPorta({ inicio, fim, eventos, idSensor: sensorPorta.id_sensor })
    : [];

  const alertas = [];
  const idConfig = (tipo) => configuracoes[tipo] || null;

  const potenciaEm = (instante) => {
    let encontrada = null;

    for (const leitura of leituras) {
      if (leitura.timestamp > instante) break;
      encontrada = leitura.potencia_ativa_W;
    }

    return encontrada;
  };

  for (const evento of eventos) {
    const config = idConfig(evento.tipo);

    if (!config) continue;

    let valor;

    if (evento.carga != null) valor = evento.carga;
    else if (evento.qualidade != null) valor = evento.qualidade;
    else if (evento.tipo === TIPOS.R7) valor = 0;
    else valor = potenciaEm(new Date((evento.inicio.getTime() + evento.fim.getTime()) / 2));

    alertas.push({
      id_sala: sala.id_sala,
      id_config: config,
      tipo_alerta: evento.tipo,
      descricao: DESCRICOES[evento.tipo],
      valor_detectado: valor == null ? null : arredondar(valor, 2),
      timestamp_inicio: evento.inicio,
      timestamp_fim: evento.fim,
      status: 'FECHADO',
      gravidade: GRAVIDADES[evento.tipo]
    });
  }

  // R6: dias acima do limite configurado.
  const porDia = new Map();

  for (const leitura of leituras) {
    const chave = leitura.timestamp.toISOString().slice(0, 10);

    porDia.set(chave, (porDia.get(chave) || 0) + leitura.energia_intervalo_kWh);
  }

  const configR6 = idConfig(TIPOS.R6);

  if (configR6) {
    const limite = Number(contexto.limiteDiarioKwh) || 25;

    for (const [dia, total] of porDia) {
      if (arredondar(total, 3) <= limite) continue;

      const instante = new Date(`${dia}T23:55:00.000Z`);

      if (instante >= fim) continue;

      alertas.push({
        id_sala: sala.id_sala,
        id_config: configR6,
        tipo_alerta: TIPOS.R6,
        descricao: DESCRICOES[TIPOS.R6],
        valor_detectado: arredondar(total, 2),
        timestamp_inicio: instante,
        timestamp_fim: instante,
        status: 'FECHADO',
        gravidade: GRAVIDADES[TIPOS.R6]
      });
    }
  }

  alertas.sort((a, b) => a.timestamp_inicio - b.timestamp_inicio);

  return { inicio, fim, leituras, alertas, estados };
}

// ---------------------------------------------------------------- banco

async function carregarContexto(db, opcoes) {
  const sala = await db.Sala.findByPk(opcoes.salaId);

  if (!sala) throw new Error(`Sala ${opcoes.salaId} não encontrada.`);

  const dispositivo = await db.Dispositivo.findOne({ where: { id_sala: sala.id_sala } });

  if (!dispositivo) {
    throw new Error(`A sala "${sala.nome}" não tem dispositivo cadastrado.`);
  }

  const sensorCorrente = await db.Sensor.findOne({
    where: { id_dispositivo: dispositivo.id_dispositivo, tipo: 'CORRENTE' }
  });

  if (!sensorCorrente) throw new Error('O dispositivo não tem sensor do tipo CORRENTE.');

  const sensorPorta = await db.Sensor.findOne({
    where: { id_dispositivo: dispositivo.id_dispositivo, tipo: 'PORTA' }
  });

  const lista = await db.ConfiguracaoAlerta.findAll({ where: { id_sala: sala.id_sala } });

  const configuracoes = {};
  let limiteDiarioKwh = null;

  for (const configuracao of lista) {
    configuracoes[configuracao.tipo_parametro] = configuracao.id_config;

    if (configuracao.tipo_parametro === TIPOS.R6) {
      limiteDiarioKwh = Number(configuracao.valor_limite);
    }
  }

  return {
    sala,
    dispositivo,
    sensorCorrente,
    sensorPorta,
    configuracoes,
    limiteDiarioKwh,
    agora: new Date()
  };
}

async function inserirEmLotes(Model, linhas) {
  for (let i = 0; i < linhas.length; i += LOTE) {
    await Model.bulkCreate(linhas.slice(i, i + LOTE));
  }
}

async function gravar(db, plano) {
  await inserirEmLotes(db.Leitura, plano.leituras);
  await inserirEmLotes(db.Alerta, plano.alertas);

  if (plano.estados.length) await inserirEmLotes(db.EstadoPorta, plano.estados);
}

const periodoDe = (db, plano) => ({
  [db.Sequelize.Op.gte]: plano.inicio,
  [db.Sequelize.Op.lt]: plano.fim
});

async function contarLeituras(db, contexto, plano) {
  return db.Leitura.count({
    where: {
      id_sensor: contexto.sensorCorrente.id_sensor,
      timestamp: periodoDe(db, plano)
    }
  });
}

async function remover(db, contexto, plano) {
  const periodo = periodoDe(db, plano);

  const idsSensores = [contexto.sensorCorrente.id_sensor];

  if (contexto.sensorPorta) idsSensores.push(contexto.sensorPorta.id_sensor);

  return {
    alertas: await db.Alerta.destroy({
      where: { id_sala: contexto.sala.id_sala, timestamp_inicio: periodo }
    }),
    leituras: await db.Leitura.destroy({
      where: { id_sensor: idsSensores, timestamp: periodo }
    }),
    estadosPorta: await db.EstadoPorta.destroy({
      where: { id_sensor: idsSensores, timestamp: periodo }
    })
  };
}

// Confere o resultado com a mesma regra da tela de sustentabilidade.
async function resumoDoPeriodo(db, contexto, plano) {
  const lista = DESPERDICIO.map((tipo) => `'${tipo}'`).join(', ');

  const [resultado] = await db.sequelize.query(
    `
    SELECT
      COALESCE(SUM(l.energia_intervalo_kWh), 0) AS consumo_total,
      COALESCE(SUM(
        CASE WHEN EXISTS (
          SELECT 1 FROM alerta a
          WHERE a.id_sala = d.id_sala
            AND a.tipo_alerta IN (${lista})
            AND a.timestamp_inicio <= l.timestamp
            AND (a.timestamp_fim IS NULL OR a.timestamp_fim >= l.timestamp)
        ) THEN l.energia_intervalo_kWh ELSE 0 END
      ), 0) AS desperdicio_total
    FROM leitura l
    JOIN sensor se ON se.id_sensor = l.id_sensor
    JOIN dispositivo d ON d.id_dispositivo = se.id_dispositivo
    WHERE d.id_sala = ? AND l.timestamp >= ? AND l.timestamp < ?
    `,
    {
      replacements: [
        contexto.sala.id_sala,
        plano.inicio.toISOString().slice(0, 19).replace('T', ' '),
        plano.fim.toISOString().slice(0, 19).replace('T', ' ')
      ]
    }
  );

  const linha = resultado[0] || {};

  return {
    consumo: Number(linha.consumo_total) || 0,
    desperdicio: Number(linha.desperdicio_total) || 0
  };
}

// ----------------------------------------------------------------- main

function obterArgumento(nome, padrao) {
  const indice = process.argv.indexOf(`--${nome}`);

  if (indice === -1) return padrao;

  const valor = Number(process.argv[indice + 1]);

  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

const numero = (valor, casas = 2) =>
  Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });

async function main() {
  const db = require('../src/models');

  const opcoes = {
    salaId: obterArgumento('sala', 1),
    dias: obterArgumento('dias', DIAS_PADRAO),
    intervaloMin: obterArgumento('intervalo', INTERVALO_PADRAO),
    seed: obterArgumento('seed', 20261022)
  };

  const contexto = await carregarContexto(db, opcoes);
  const plano = montarPlano(contexto, opcoes);

  console.log('');
  console.log(`Sala: ${contexto.sala.nome} (id ${contexto.sala.id_sala})`);
  console.log(
    `Sensores: corrente ${contexto.sensorCorrente.id_sensor}, ` +
      `porta ${contexto.sensorPorta ? contexto.sensorPorta.id_sensor : 'não cadastrado'}`
  );
  console.log(
    `Período: ${plano.inicio.toISOString().slice(0, 10)} a ` +
      `${plano.fim.toISOString().slice(0, 10)} (UTC)`
  );

  if (process.argv.includes('--remover')) {
    if (!process.argv.includes('--confirmar')) {
      console.log('');
      console.log('Nada foi apagado.');
      console.log(
        'Esse comando remove TODAS as leituras, alertas e estados de porta da ' +
          'sala dentro do período acima, inclusive os que não foram gerados aqui.'
      );
      console.log('Para confirmar: node scripts/gerar-historico.js --remover --confirmar');

      await db.sequelize.close();
      return;
    }

    console.log('');
    console.log('Removidos:', await remover(db, contexto, plano));

    await db.sequelize.close();
    return;
  }

  const existentes = await contarLeituras(db, contexto, plano);

  if (existentes > 0) {
    console.log('');
    console.log(`Já existem ${existentes} leituras nesse período.`);
    console.log('Para não duplicar, apague antes:');
    console.log('  node scripts/gerar-historico.js --remover --confirmar');
    console.log('Depois rode este comando novamente.');

    await db.sequelize.close();
    return;
  }

  console.log(
    `Intervalo: ${opcoes.intervaloMin} min | Leituras: ${numero(plano.leituras.length, 0)} | ` +
      `Alertas: ${plano.alertas.length} | Estados de porta: ${plano.estados.length}`
  );
  console.log('Gravando...');

  await gravar(db, plano);

  const resumo = await resumoDoPeriodo(db, contexto, plano);
  const tarifa = Number(process.env.TARIFA_KWH);

  console.log('');
  console.log(`  Consumo total: ${numero(resumo.consumo, 3)} kWh`);
  console.log(`  Média por dia: ${numero(resumo.consumo / opcoes.dias, 3)} kWh`);
  console.log(
    `  Desperdício: ${numero(resumo.desperdicio, 3)} kWh ` +
      `(${numero((resumo.desperdicio / resumo.consumo) * 100, 1)}%)`
  );

  if (Number.isFinite(tarifa) && tarifa > 0) {
    console.log(`  Custo estimado: R$ ${numero(resumo.consumo * tarifa)}`);
  }

  console.log('');
  console.log('Pronto. Confira no painel: visão geral, a sala, os alertas,');
  console.log('os relatórios (diário/semanal/mensal) e a sustentabilidade.');
  console.log('Para desfazer: node scripts/gerar-historico.js --remover --confirmar');

  await db.sequelize.close();
}

if (require.main === module) {
  main().catch((erro) => {
    console.error('');
    console.error('Erro:', erro.message);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
  DIAS_PADRAO,
  INTERVALO_PADRAO,
  TIPOS,
  criarRandom,
  planejarEventos,
  montarPlano,
  carregarContexto,
  contarLeituras,
  gravar,
  remover
};