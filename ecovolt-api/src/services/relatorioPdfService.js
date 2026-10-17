const PDFDocument = require('pdfkit');

const COR_PRIMARIA = '#0E7C86';
const COR_TEXTO = '#10252B';
const COR_MUDO = '#6B7A80';
const COR_LINHA = '#E3E8EA';

const TIPOS = {
  CONSUMO: 'Consumo de energia',
  ALERTAS: 'Alertas',
  DISPOSITIVOS_OFFLINE: 'Dispositivos offline'
};

const PERIODICIDADES = {
  DIARIO: 'Diário',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  ANUAL: 'Anual',
  PERSONALIZADO: 'Personalizado'
};

const MARGEM = 48;

function numero(valor, casas = 2) {
  const n = Number(valor);

  if (!Number.isFinite(n)) {
    return '-';
  }

  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function dataBr(texto) {
  if (!texto) {
    return '-';
  }

  return String(texto)
    .slice(0, 10)
    .split('-')
    .reverse()
    .join('/');
}

function horaBr(data) {
  if (!data) {
    return '-';
  }

  return new Date(data).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
}

function lerJson(texto, padrao) {
  try {
    const valor = JSON.parse(texto);
    return valor ?? padrao;
  } catch {
    return padrao;
  }
}

function cabecalho(doc) {
  const largura = doc.page.width;

  doc.rect(0, 0, largura, 64).fill(COR_PRIMARIA);

  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('#FFFFFF')
    .text('EcoVolt', MARGEM, 20);

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#D7EFF1')
    .text('Monitoramento de energia em salas de aula', MARGEM, 43);

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#FFFFFF')
    .text('Relatório', MARGEM, 24, {
      width: largura - MARGEM * 2,
      align: 'right'
    });

  doc.y = 88;
}

function caixasResumo(doc, itens) {
  const larguraPagina = doc.page.width - MARGEM * 2;
  const porLinha = 3;
  const espaco = 10;
  const largura = (larguraPagina - espaco * (porLinha - 1)) / porLinha;
  const altura = 54;
  const topo = doc.y;

  itens.forEach((item, indice) => {
    const coluna = indice % porLinha;
    const linha = Math.floor(indice / porLinha);
    const x = MARGEM + coluna * (largura + espaco);
    const y = topo + linha * (altura + espaco);

    doc
      .roundedRect(x, y, largura, altura, 6)
      .lineWidth(0.8)
      .strokeColor(COR_LINHA)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COR_MUDO)
      .text(String(item.rotulo).toUpperCase(), x + 10, y + 10, {
        width: largura - 20
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(COR_TEXTO)
      .text(String(item.valor), x + 10, y + 26, {
        width: largura - 20
      });
  });

  const linhas = Math.ceil(itens.length / porLinha);

  doc.y = topo + linhas * (altura + espaco);
}

function tituloSecao(doc, texto) {
  if (doc.y > doc.page.height - 120) {
    doc.addPage();
  }

  const y = doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(COR_TEXTO)
    .text(texto, MARGEM, y, {
      width: doc.page.width - MARGEM * 2
    });

  doc.y = y + 22;
}

function tabela(doc, colunas, linhas, vazio) {
  const larguraPagina = doc.page.width - MARGEM * 2;
  const totalPesos = colunas.reduce((soma, c) => soma + c.peso, 0);

  const desenharCabecalho = () => {
    const yCabecalho = doc.y;
    let x = MARGEM;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COR_MUDO);

    colunas.forEach((coluna) => {
      const largura = (larguraPagina * coluna.peso) / totalPesos;

      doc.text(coluna.titulo, x, yCabecalho, {
        width: largura - 6
      });

      x += largura;
    });

    const yLinha = yCabecalho + 12;

    doc
      .moveTo(MARGEM, yLinha)
      .lineTo(MARGEM + larguraPagina, yLinha)
      .lineWidth(0.8)
      .strokeColor(COR_LINHA)
      .stroke();

    doc.y = yLinha + 6;
  };

  if (!linhas.length) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(COR_MUDO)
      .text(vazio || 'Nenhum registro no período.');

    doc.moveDown(0.6);
    return;
  }

  desenharCabecalho();

  linhas.forEach((linha) => {
    if (doc.y > doc.page.height - 90) {
      doc.addPage();
      desenharCabecalho();
    }

    const y = doc.y;
    let x = MARGEM;
    let altura = 0;

    colunas.forEach((coluna, indice) => {
      const largura = (larguraPagina * coluna.peso) / totalPesos;

      doc
        .font(indice === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.5)
        .fillColor(COR_TEXTO)
        .text(String(linha[indice] ?? '-'), x, y, {
          width: largura - 6
        });

      altura = Math.max(
        altura,
        doc.heightOfString(String(linha[indice] ?? '-'), {
          width: largura - 6
        })
      );

      x += largura;
    });

    doc.y = y + Math.max(altura, 11) + 6;
  });

  doc.moveDown(0.4);
}

function rodape(doc) {
  const paginas = doc.bufferedPageRange();

  for (let i = 0; i < paginas.count; i += 1) {
    doc.switchToPage(paginas.start + i);

    const margemInferiorOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COR_MUDO)
      .text(
        `EcoVolt - documento gerado automaticamente pela API em ${horaBr(new Date())}. ` +
          'Valores de consumo em kWh e custo estimado pela tarifa configurada no servidor.',
        MARGEM,
        doc.page.height - 56,
        { width: doc.page.width - MARGEM * 2 - 60, align: 'left' }
      );

    doc.text(
      `${i + 1} / ${paginas.count}`,
      doc.page.width - MARGEM - 60,
      doc.page.height - 56,
      { width: 60, align: 'right' }
    );

    doc.page.margins.bottom = margemInferiorOriginal;
  }
}

function gerar({ relatorio, usuario }) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGEM,
    bufferPages: true
  });

  const resumo = lerJson(relatorio.resumo, {});
  const picos = lerJson(relatorio.picos_consumo, []);

  cabecalho(doc);

  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(COR_TEXTO)
    .text(TIPOS[relatorio.tipo_relatorio] || relatorio.tipo_relatorio);

  doc.moveDown(0.3);

  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(COR_MUDO)
    .text(
      `${relatorio.Sala?.nome || `Sala ${relatorio.id_sala}`} - ` +
        `${PERIODICIDADES[relatorio.periodicidade] || 'Período'} de ` +
        `${dataBr(relatorio.periodo_inicio)} a ${dataBr(relatorio.periodo_fim)}`
    );

  doc.text(
    `Gerado em ${horaBr(relatorio.gerado_em)}` +
      (usuario ? ` por ${usuario.nome}` : '')
  );

  doc.moveDown(1);

  const itensResumo = [
    {
      rotulo: 'Consumo total',
      valor: `${numero(relatorio.consumo_total_kWh, 2)} kWh`
    },
    {
      rotulo: 'Custo estimado',
      valor:
        relatorio.custo_estimado === null
          ? 'não configurado'
          : `R$ ${numero(relatorio.custo_estimado, 2)}`
    },
    {
      rotulo: 'Anomalias detectadas',
      valor: String(relatorio.anomalias_detectadas ?? 0)
    }
  ];

  if (resumo.desperdicio_kWh !== undefined) {
    itensResumo.push({
      rotulo: 'Energia desperdiçada',
      valor: `${numero(resumo.desperdicio_kWh, 2)} kWh`
    });
  }

  if (
    resumo.taxa_desperdicio_percentual !== undefined &&
    resumo.taxa_desperdicio_percentual !== null
  ) {
    itensResumo.push({
      rotulo: 'Desperdício sobre o consumo',
      valor: `${numero(resumo.taxa_desperdicio_percentual, 1)}%`
    });
  }

  caixasResumo(doc, itensResumo);

  if (relatorio.tipo_relatorio === 'CONSUMO') {
    tituloSecao(doc, 'Picos de consumo (10 maiores)');

    tabela(
      doc,
      [
        { titulo: 'Data e hora (UTC)', peso: 2 },
        { titulo: 'Potência máxima', peso: 2 }
      ],
      picos.map((pico) => [
        String(pico.hora || '-').replace('T', ' ').slice(0, 16),
        `${numero(pico.potencia_maxima_W, 0)} W`
      ]),
      'Nenhum pico registrado no período.'
    );
  }

  if (relatorio.tipo_relatorio === 'ALERTAS') {
    tituloSecao(doc, 'Alertas por tipo e gravidade');

    tabela(
      doc,
      [
        { titulo: 'Tipo', peso: 3 },
        { titulo: 'Gravidade', peso: 2 },
        { titulo: 'Status', peso: 2 },
        { titulo: 'Quantidade', peso: 1.4 }
      ],
      (resumo.por_tipo || []).map((linha) => [
        linha.tipo_alerta,
        linha.gravidade || '-',
        linha.status || '-',
        linha.total
      ]),
      'Nenhum alerta registrado no período.'
    );

    tituloSecao(doc, 'Alertas do período (50 mais recentes)');

    tabela(
      doc,
      [
        { titulo: 'Tipo', peso: 3 },
        { titulo: 'Início', peso: 2.4 },
        { titulo: 'Fim', peso: 2.4 },
        { titulo: 'Valor', peso: 1.6 }
      ],
      (resumo.lista || []).map((alerta) => [
        alerta.tipo_alerta,
        horaBr(alerta.timestamp_inicio),
        alerta.timestamp_fim ? horaBr(alerta.timestamp_fim) : 'em aberto',
        alerta.valor_detectado === null
          ? '-'
          : numero(alerta.valor_detectado, 2)
      ]),
      'Nenhum alerta registrado no período.'
    );
  }

  if (relatorio.tipo_relatorio === 'DISPOSITIVOS_OFFLINE') {
    tituloSecao(doc, 'Períodos de indisponibilidade');

    tabela(
      doc,
      [
        { titulo: 'Início', peso: 2.6 },
        { titulo: 'Fim', peso: 2.6 },
        { titulo: 'Duração', peso: 1.6 },
        { titulo: 'Situação', peso: 1.8 }
      ],
      (resumo.lista || []).map((alerta) => [
        horaBr(alerta.timestamp_inicio),
        alerta.timestamp_fim ? horaBr(alerta.timestamp_fim) : 'em aberto',
        `${numero(alerta.duracao_minutos, 0)} min`,
        alerta.status
      ]),
      'Nenhuma indisponibilidade registrada no período.'
    );

    tituloSecao(doc, 'Resumo');

    tabela(
      doc,
      [
        { titulo: 'Indicador', peso: 3 },
        { titulo: 'Valor', peso: 2 }
      ],
      [
        ['Total de indisponibilidades', String(resumo.total ?? 0)],
        ['Tempo total indisponível', `${numero(resumo.minutos_totais ?? 0, 0)} min`],
        ['Duração média', `${numero(resumo.minutos_medios ?? 0, 0)} min`]
      ]
    );
  }

  rodape(doc);

  return doc;
}

module.exports = { gerar };