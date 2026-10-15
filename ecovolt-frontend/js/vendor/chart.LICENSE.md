'use strict';
// Painel EcoVolt. Só consome a API REST: sem SQL, sem regras de anomalia, sem cálculos de negócio.
// Quando a API não informa um dado, a tela mostra "—" e um aviso (ver avisoLacunas).

if (!Sessao.token()) location.replace('login.html');
else iniciar();

function iniciar() {
  const $ = s => document.querySelector(s);
  const main = $('#conteudo');
  const u0 = Sessao.usuario() || {};
  $('#usuario').textContent = `${u0.nome || ''} (${u0.perfil || ''})`;
  $('#sair').onclick = () => { Sessao.limpar(); location.href = 'login.html'; };

  let graficos = [], cfgs = [], salasG = [], filtroCfg = '';

  // ---------- Helpers de dados ----------
  // /api/leituras devolve { dados, total, limite, offset }; as demais rotas devolvem um array.
  const lista = d => Array.isArray(d) ? d : (d && Array.isArray(d.dados) ? d.dados : []);
  // Rotas que o perfil do usuário pode não ter (403): a tela segue sem elas.
  const opcional = p => p.then(lista).catch(e => { console.warn(e.message); return null; });
  const statusOp = s => s.status_operacao ?? s.dispositivo?.status_operacao;

  // /api/salas é enxuta (id, nome, localização, última potência). Complemento:
  //  - /api/dispositivos (só ADMIN/TECNICO) -> status operacional, MAC, último contato
  //  - objeto "Sala" embutido nas configurações de alerta -> capacidade e horário (quando houver)
  async function carregarSalas() {
    const [salas, disp, cf] = await Promise.all([
      apiFetch('/api/salas').then(lista),
      opcional(apiFetch('/api/dispositivos')),
      opcional(apiFetch('/api/configuracoes-alertas'))
    ]);
    const extras = {};
    (cf || []).forEach(c => { if (c.Sala) extras[c.Sala.id_sala] = c.Sala; });
    salasG = salas.map(s => ({
      ...extras[s.id_sala], ...s,
      dispositivo: (disp || []).find(d => d.id_sala == s.id_sala) || s.dispositivo || null
    }));
    return salasG;
  }

  // ---------- Helpers de HTML ----------
  const tag = (t, c = '') => `<span class="tag ${c}">${esc(t)}</span>`;
  const GRAV = { BAIXA: ['Baixa', ''], MEDIA: ['Média', 'wa'], ALTA: ['Alta', 'er'] };
  const STAT = { ABERTO: ['Aberto', 'er'], PENDENTE: ['Pendente', 'wa'], FECHADO: ['Fechado', ''] };
  const OP = { ONLINE: ['Online', 'on'], OFFLINE: ['Offline', 'off'], INATIVO: ['Inativo', 'nd'] };
  const stat = x => {
    const [rot, cls] = OP[String(x || '').toUpperCase()] || ['Desconhecido', 'nd'];
    return `<span class="st ${cls}"><i></i>${rot}</span>`;
  };
  const nomeSala = (ss, id) => ss.find(s => s.id_sala == id)?.nome ?? `Sala ${id ?? '—'}`;
  const card = (rotulo, valor, sub = '') => `<div class="card"><small>${rotulo}</small><strong>${valor}</strong>${sub ? `<em>${sub}</em>` : ''}</div>`;
  const tabela = (cab, linhas, vazio = 'Nenhum registro encontrado.') => linhas.length
    ? `<div class="tab"><table><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table></div>`
    : `<p class="vazio">${vazio}</p>`;
  const opcoes = (ss, sel) => ss.map(s => `<option value="${esc(s.id_sala)}" ${s.id_sala == sel ? 'selected' : ''}>${esc(s.nome)}</option>`).join('');
  const horario = s => s.horario_inicio
    ? `${esc(String(s.horario_inicio).slice(0, 5))}–${esc(String(s.horario_fim).slice(0, 5))}${s.dias_funcionamento ? ` <span class="mut">(${esc(s.dias_funcionamento)})</span>` : ''}`
    : '—';
  const aviso = (m, t = 'erro') => {
    const e = $('#toast'); e.textContent = m; e.className = `show ${t}`;
    clearTimeout(aviso.t); aviso.t = setTimeout(() => e.className = '', 5000);
  };
  // Mostra quais campos a API ainda não envia, para a tela vazia não parecer defeito do front.
  function avisoLacunas(ss, campos) {
    const falta = campos.filter(([k]) => ss.length && ss.every(s => s[k] == null && s.dispositivo?.[k] == null)).map(([, n]) => n);
    return falta.length ? `<p class="banner">A API ainda não informa: ${falta.join(', ')}. Esses itens aparecem como “—”.</p>` : '';
  }
  const dispInfo = ss => ss.some(s => s.dispositivo) ? '' :
    '<p class="banner">Status dos dispositivos indisponível para o seu perfil (a API só libera para administrador e técnico). Exibindo “Desconhecido”.</p>';

  // ---------- Tabelas ----------
  const tabAlertas = (al, ss, encerrar = false) => tabela(
    ['Descrição', 'Sala', 'Tipo', 'Gravidade', 'Status', 'Valor detectado', 'Início', 'Encerramento', ...(encerrar ? ['Ações'] : [])],
    al.map(a => {
      const g = GRAV[a.gravidade] || [a.gravidade || '—', ''], s = STAT[a.status] || [a.status || '—', ''];
      const u = nomeUnidade(a.ConfiguracaoAlerta?.unidade_medida);
      return `<tr class="${a.status === 'ABERTO' ? 'aberto' : ''}"><td>${esc(a.descricao || '—')}</td>
        <td>${esc(a.Sala?.nome || nomeSala(ss, a.id_sala))}</td><td>${esc(nomeRegra(a.tipo_alerta))}</td>
        <td>${tag(g[0], g[1])}</td><td>${tag(s[0], s[1])}</td>
        <td>${valido(a.valor_detectado) ? `${num(a.valor_detectado, 2)} ${esc(u)}` : '—'}</td>
        <td>${dataHora(a.timestamp_inicio)}</td><td>${dataHora(a.timestamp_fim)}</td>
        ${encerrar ? `<td>${a.status !== 'FECHADO' ? `<button data-a="encerrar" data-id="${esc(a.id_alerta)}">Encerrar</button>` : ''}</td>` : ''}</tr>`;
    }), 'Nenhum alerta encontrado.');

  const tabCfg = (c, ss, ed) => tabela(
    ['Regra', 'Sala', 'Limite', 'Persistência', 'Status', 'Buzzer', 'Ação automática', ...(ed ? ['Ações'] : [])],
    c.map(x => {
      const at = x.status === 'ATIVA';
      return `<tr><td>${esc(nomeRegra(x.tipo_parametro))}</td><td>${esc(x.Sala?.nome || nomeSala(ss, x.id_sala))}</td>
        <td>${num(x.valor_limite, 2)} ${esc(nomeUnidade(x.unidade_medida))}</td>
        <td>${un(x.tempo_persistencia_segundos, 's', 0)}</td><td>${tag(at ? 'Ativa' : 'Inativa', at ? 'on' : '')}</td>
        <td>${x.acionar_buzzer ? `Sim (${un(x.duracao_buzzer_segundos, 's', 0)})` : 'Não'}</td><td>${esc(nomeAcao(x.acao_automatica))}</td>
        ${ed ? `<td><div class="acoes"><button data-a="editar" data-id="${esc(x.id_config)}">Editar</button>
          <button data-a="status" data-id="${esc(x.id_config)}" data-st="${at ? 'INATIVA' : 'ATIVA'}">${at ? 'Desativar' : 'Ativar'}</button></div></td>` : ''}</tr>`;
    }), 'Nenhuma configuração encontrada.');

  // ---------- Gráficos ----------
  function graf(id, tipo, labels, dados, rotulo, unidade, tituloX) {
    const canvas = $(`#${id}`);
    if (!dados.length) { canvas.parentElement.innerHTML = '<p class="vazio">Sem dados para exibir.</p>'; return; }
    if (typeof Chart === 'undefined') { canvas.parentElement.innerHTML = '<p class="vazio">Biblioteca de gráficos não carregada.</p>'; return; }
    const css = getComputedStyle(document.documentElement);
    const cor = css.getPropertyValue('--br').trim();
    Chart.defaults.color = css.getPropertyValue('--mut').trim();
    graficos.push(new Chart(canvas, {
      type: tipo,
      data: { labels, datasets: [{ label: rotulo, data: dados, borderColor: cor, backgroundColor: tipo === 'bar' ? cor : cor + '33', fill: tipo === 'line', tension: .3, pointRadius: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: rotulo } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: unidade } },
          x: tituloX ? { title: { display: true, text: tituloX } } : {}
        }
      }
    }));
  }

  // ---------- Páginas ----------
  async function dashboard() {
    const [ss, ab, leit] = await Promise.all([
      carregarSalas(),
      apiFetch('/api/alertas?status=ABERTO').then(lista),
      opcional(apiFetch('/api/leituras?limite=200'))
    ]);
    const nums = k => ss.map(s => s[k]).filter(valido).map(Number);
    const conhecido = ss.some(s => statusOp(s));
    const pot = nums('potencia_ativa_W'), pico = nums('pico_potencia_W');
    const consumo = nums('consumo_dia_kWh');
    // Qualidade do sinal: usa a leitura mais recente de cada sala (a lista vem do mais novo para o mais antigo).
    const ultima = {}; (leit || []).forEach(l => { if (!(l.id_sala in ultima)) ultima[l.id_sala] = l; });
    const ql = Object.values(ultima).map(l => l.qualidade_sinal).filter(valido).map(Number);
    const maior = (pico.length ? pico : pot);
    main.innerHTML = `<h1>Visão geral</h1>${dispInfo(ss)}
      ${avisoLacunas(ss, [['consumo_dia_kWh', 'consumo do dia']])}
      <div class="grade">
      ${card('Total de salas', ss.length)}
      ${card('Salas online', conhecido ? ss.filter(s => statusOp(s) === 'ONLINE').length : '—')}
      ${card('Dispositivos offline', conhecido ? ss.filter(s => statusOp(s) === 'OFFLINE').length : '—')}
      ${card('Consumo do dia', consumo.length ? un(consumo.reduce((a, b) => a + b, 0), 'kWh', 2) : '—')}
      ${card('Alertas abertos', ab.length)}
      ${card(pico.length ? 'Maior pico de potência' : 'Maior potência atual', un(maior.length ? Math.max(...maior) : null, 'W'), pico.length ? '' : 'entre as salas, na última leitura')}
      ${card('Qualidade média do sinal', un(ql.length ? ql.reduce((a, b) => a + b, 0) / ql.length : null, '%', 0))}</div>
      <h2>Alertas abertos</h2>${tabAlertas(ab, ss)}`;
  }

  async function salasPg() {
    const [ss, ab] = await Promise.all([carregarSalas(), apiFetch('/api/alertas?status=ABERTO').then(lista)]);
    main.innerHTML = `<h1>Salas</h1>${dispInfo(ss)}
      ${avisoLacunas(ss, [['consumo_dia_kWh', 'consumo do dia'], ['capacidade_max_W', 'capacidade elétrica'], ['horario_inicio', 'horário de funcionamento']])}` +
      tabela(['Sala', 'Localização', 'Status', 'Potência atual', 'Consumo do dia', 'Funcionamento', 'Capacidade elétrica', 'Alertas abertos'],
        ss.map(s => `<tr><td><a href="#/salas/${esc(s.id_sala)}">${esc(s.nome)}</a></td><td>${esc(s.localizacao || '—')}</td><td>${stat(statusOp(s))}</td>
          <td>${un(s.potencia_ativa_W, 'W')}</td><td>${un(s.consumo_dia_kWh, 'kWh', 2)}</td><td>${horario(s)}</td>
          <td>${un(s.capacidade_max_W, 'W', 0)}</td><td>${s.alertas_abertos ?? ab.filter(a => a.id_sala == s.id_sala).length}</td></tr>`),
        'Nenhuma sala com dispositivo cadastrada.');
  }

  async function salaPg(id) {
    const q = encodeURIComponent(id);
    const [ss, horas, leit, al, cf] = await Promise.all([
      carregarSalas(),
      opcional(apiFetch(`/api/salas/${q}/consumo-hora`)),
      opcional(apiFetch(`/api/leituras?id_sala=${q}&limite=100`)),
      opcional(apiFetch(`/api/alertas?id_sala=${q}&status=ABERTO`)),
      opcional(apiFetch(`/api/configuracoes-alertas?id_sala=${q}`))
    ]);
    const s = ss.find(x => x.id_sala == id);
    if (!s) throw new Error('Sala não encontrada.');
    const d = s.dispositivo, porta = s.estado_porta, sens = s.sensores || d?.sensores || [];
    main.innerHTML = `<p><a href="#/salas">← Voltar para salas</a></p>
      <h1>${esc(s.nome)} ${stat(statusOp(s))}</h1><p class="mut">${esc(s.localizacao || '')} · Funcionamento: ${horario(s)}</p>
      ${avisoLacunas([s], [['consumo_dia_kWh', 'consumo diário'], ['consumo_mes_kWh', 'consumo mensal'], ['estado_porta', 'estado da porta'], ['capacidade_max_W', 'capacidade elétrica']])}
      <div class="grade">
      ${card('Potência atual', un(s.potencia_ativa_W, 'W'), s.timestamp ? `em ${dataHora(s.timestamp)}` : '')}
      ${card('Consumo diário', un(s.consumo_dia_kWh, 'kWh', 2))}
      ${card('Consumo mensal', un(s.consumo_mes_kWh, 'kWh', 2))}
      ${card('Capacidade elétrica', un(s.capacidade_max_W, 'W', 0))}
      ${card('Porta', porta === 'ABERTA' ? tag('Aberta', 'er') : porta === 'FECHADA' ? tag('Fechada', 'on') : '<span class="mut">Não informado</span>')}</div>
      <div class="duas"><div class="graf"><canvas id="gp"></canvas></div><div class="graf"><canvas id="ge"></canvas></div></div>
      <h2>Dispositivo e sensores</h2>
      <p>${d ? `${esc(d.identificador || d.nome || '—')} · MAC ${esc(d.mac_address || '—')} · ${esc(d.modelo || '')} · último contato ${dataHora(d.ultimo_contato)} · envia a cada ${un(d.intervalo_envio_segundos ?? d.intervalo_leitura_segundos, 's', 0)}`
        : '<span class="mut">Dispositivo não informado pela API para o seu perfil.</span>'}</p>
      ${tabela(['Sensor', 'Tipo', 'Unidade', 'Status'], sens.map(x => `<tr><td>${esc(x.nome || '—')}</td><td>${esc(x.tipo)}</td><td>${esc(x.unidade_medida || '—')}</td><td>${esc(x.status || '—')}</td></tr>`), 'Sensores não informados pela API.')}
      <h2>Alertas abertos da sala</h2>${tabAlertas(al || [], ss)}
      <h2>Configurações da sala</h2>${tabCfg(cf || [], ss, false)}`;
    // A API entrega as leituras da mais nova para a mais antiga; o gráfico precisa da ordem cronológica.
    const l = lista(leit).slice().reverse();
    graf('gp', 'line', l.map(x => new Date(x.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })),
      l.map(x => Number(x.potencia_ativa_W)), 'Potência ativa (últimas leituras)', 'Potência (W)');
    // A API agrupa por hora do dia somando TODO o histórico (não só hoje) e a hora vem em UTC.
    const h = horas || [];
    graf('ge', 'bar', h.map(x => `${String(x.hora).padStart(2, '0')}h`), h.map(x => Number(x.consumo_kWh)),
      'Energia por hora do dia (histórico)', 'Energia (kWh)', 'Hora do dia (UTC)');
  }

  async function alertasPg() {
    const ss = await carregarSalas();
    const per = API_SUPORTA_PERIODO_ALERTAS ? '' : 'disabled title="Filtro por período ainda não existe na API"';
    main.innerHTML = `<h1>Alertas</h1><form id="fal" class="filtros">
      <label>Sala<select name="id_sala"><option value="">Todas</option>${opcoes(ss)}</select></label>
      <label>Gravidade<select name="gravidade"><option value="">Todas</option><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option></select></label>
      <label>Status<select name="status"><option value="ABERTO">Aberto</option><option value="PENDENTE">Pendente</option><option value="FECHADO">Fechado</option></select></label>
      <label>Tipo<select name="tipo_alerta"><option value="">Todos</option>${Object.entries(NOMES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <label>De<input type="date" name="data_inicio" ${per}></label><label>Até<input type="date" name="data_fim" ${per}></label>
      <button class="pri">Filtrar</button></form>
      ${API_SUPORTA_PERIODO_ALERTAS ? '' : '<p class="banner">O filtro por período está desativado: a API ainda não o oferece (filtrar só no navegador não é confiável com muitos alertas).</p>'}
      <div id="res"></div>`;
    await carregarAlertas();
  }
  async function carregarAlertas() {
    const p = new URLSearchParams(); // os filtros vão para a API; o front não filtra sozinho
    new FormData($('#fal')).forEach((val, k) => { if (val) p.set(k, val); });
    $('#res').innerHTML = tabAlertas(await apiFetch(`/api/alertas?${p}`).then(lista), salasG, Sessao.podeEncerrarAlerta());
  }

  async function cfgPg() {
    const q = filtroCfg ? `?id_sala=${encodeURIComponent(filtroCfg)}` : '';
    [salasG, cfgs] = await Promise.all([apiFetch('/api/salas').then(lista), apiFetch(`/api/configuracoes-alertas${q}`).then(lista)]);
    const ed = Sessao.podeEditar();
    main.innerHTML = `<h1>Configuração de alertas</h1><div class="filtros">
      <label>Sala<select id="fsala"><option value="">Todas</option>${opcoes(salasG, filtroCfg)}</select></label>
      ${ed ? '<button class="pri" data-a="novo">Nova configuração</button>' : ''}</div>
      ${ed ? '' : '<p class="banner">Somente administradores podem criar ou alterar configurações.</p>'}${tabCfg(cfgs, salasG, ed)}`;
  }

  // Unidade sugerida por regra (conforme os dados de exemplo da API). O limite de 10 caracteres vem do schema da API.
  const UNID_SUGERIDA = { R1_CONSUMO_FORA_HORARIO: 'W', R2_AR_FORA_HORARIO: 'W', R3A_PORTA_ABERTA: 'W', R3B_PORTA_ABERTA_PERSISTENTE: 'W', R4_SOBRECARGA: 'W', R5_PADRAO_HISTORICO: 'DESVIOS', R6_LIMITE_DIARIO: 'kWh', R7_DISPOSITIVO_OFFLINE: 'INTERVALOS', R8_FALHA_LEITURA: '%' };

  function abrirCfg(c) {
    const novo = !c; c = c || {};
    const campo = (n, r, t = 'number', extra = '') => `<label>${r}<input name="${n}" type="${t}" ${extra} value="${esc(c[n] ?? '')}"></label>`;
    $('#dlgc').innerHTML = `<form id="fcfg" data-id="${esc(c.id_config || '')}"><h2>${novo ? 'Nova configuração' : 'Editar configuração'}</h2>
      <label>Sala<select name="id_sala" ${novo ? 'required' : 'disabled'}>${opcoes(salasG, c.id_sala)}</select></label>
      <label>Regra<select name="tipo_parametro" ${novo ? 'required' : 'disabled'}>${Object.entries(NOMES).map(([k, n]) => `<option value="${k}" ${k === c.tipo_parametro ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${campo('valor_limite', 'Limite', 'number', 'step="any" min="0" required')}
      ${campo('unidade_medida', 'Unidade (máx. 10 caracteres)', 'text', 'required maxlength="10"')}
      ${campo('tempo_persistencia_segundos', 'Persistência (s)', 'number', 'min="0" step="1"')}
      ${campo('duracao_buzzer_segundos', 'Duração do buzzer (s)', 'number', 'min="0" step="1"')}
      ${campo('acao_automatica', 'Ação automática', 'text', 'maxlength="100" list="acoes"')}
      <datalist id="acoes">${Object.keys(ACOES).map(a => `<option value="${a}">`).join('')}</datalist>
      <label class="chk"><input name="acionar_buzzer" type="checkbox" ${c.acionar_buzzer ? 'checked' : ''}> Acionar buzzer</label>
      <div class="acoes"><button type="button" data-a="fechar">Cancelar</button><button class="pri">Salvar configuração</button></div></form>`;
    if (novo) {
      const f = $('#fcfg'), sug = () => { f.unidade_medida.value = UNID_SUGERIDA[f.tipo_parametro.value] || ''; };
      f.tipo_parametro.addEventListener('change', sug); sug();
    }
    $('#dlg').showModal();
  }

  async function relPg() {
    const [ss, rels] = await Promise.all([apiFetch('/api/salas').then(lista), apiFetch('/api/relatorios').then(lista)]);
    salasG = ss;
    main.innerHTML = `<h1>Relatórios</h1><form id="frel" class="filtros">
      <label>Sala<select name="id_sala" required>${opcoes(ss)}</select></label>
      <label>Tipo<select name="tipo_relatorio">${Object.entries(TIPOS_REL).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <label>Data inicial<input type="date" name="periodo_inicio" required></label><label>Data final<input type="date" name="periodo_fim" required></label>
      <button class="pri">Gerar relatório</button></form><h2>Histórico</h2>` +
      tabela(['Sala', 'Tipo', 'Período', 'Consumo total', 'Custo estimado', 'Maior pico', 'Anomalias', 'Gerado em', ''],
        rels.map(r => { const p = picos(r)[0]; return `<tr><td>${esc(r.Sala?.nome || nomeSala(ss, r.id_sala))}</td><td>${esc(TIPOS_REL[r.tipo_relatorio] || r.tipo_relatorio)}</td>
          <td>${dia(r.periodo_inicio)} a ${dia(r.periodo_fim)}</td><td>${un(r.consumo_total_kWh, 'kWh', 2)}</td>
          <td>${valido(r.custo_estimado) ? 'R$ ' + num(r.custo_estimado, 2) : '—'}</td>
          <td>${p ? un(p.potencia_maxima_W, 'W') : '—'}</td><td>${esc(r.anomalias_detectadas ?? '—')}</td><td>${dataHora(r.gerado_em)}</td>
          <td><button data-a="relatorio" data-id="${esc(r.id_relatorio)}">Detalhes</button></td></tr>`; }),
        'Nenhum relatório gerado ainda.');
  }
  const TIPOS_REL = { CONSUMO: 'Consumo', ALERTAS: 'Alertas', DISPOSITIVOS_OFFLINE: 'Dispositivos offline' };
  // picos_consumo chega como texto JSON: [{ hora, potencia_maxima_W }]
  const picos = r => { try { const p = JSON.parse(r.picos_consumo); return Array.isArray(p) ? p : []; } catch { return []; } };
  function detalheRel(r, ss) {
    const p = picos(r);
    $('#dlgc').innerHTML = `<div class="detalhe"><h2>Relatório de ${esc(TIPOS_REL[r.tipo_relatorio] || r.tipo_relatorio)}</h2>
      <p>${esc(r.Sala?.nome || nomeSala(ss, r.id_sala))} · ${dia(r.periodo_inicio)} a ${dia(r.periodo_fim)} · gerado em ${dataHora(r.gerado_em)}</p>
      <div class="grade">${card('Consumo total', un(r.consumo_total_kWh, 'kWh', 2))}${card('Anomalias encontradas', esc(r.anomalias_detectadas ?? '—'))}${card('Custo estimado', valido(r.custo_estimado) ? 'R$ ' + num(r.custo_estimado, 2) : '—')}</div>
      <h3>Picos de consumo</h3>${tabela(['Hora (UTC)', 'Potência máxima'], p.map(x => `<tr><td>${esc(String(x.hora).slice(8, 10))}/${esc(String(x.hora).slice(5, 7))} ${esc(String(x.hora).slice(11, 16))}</td><td>${un(x.potencia_maxima_W, 'W')}</td></tr>`), 'Nenhum pico registrado no período.')}
      <div class="acoes"><button data-a="fechar">Fechar</button></div></div>`;
    $('#dlg').showModal();
  }

  // ---------- Eventos ----------
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    try {
      const a = b.dataset.a;
      if (a === 'novo') abrirCfg();
      else if (a === 'editar') abrirCfg(cfgs.find(c => c.id_config == b.dataset.id));
      else if (a === 'fechar') $('#dlg').close();
      else if (a === 'status') {
        await apiFetch(`/api/configuracoes-alertas/${encodeURIComponent(b.dataset.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: b.dataset.st }) });
        aviso('Status atualizado.', 'ok'); rotear();
      } else if (a === 'encerrar') {
        if (!confirm('Encerrar este alerta?')) return;
        await apiFetch(`/api/alertas/${encodeURIComponent(b.dataset.id)}/encerrar`, { method: 'PATCH' });
        aviso('Alerta encerrado.', 'ok'); await carregarAlertas();
      } else if (a === 'relatorio') {
        detalheRel(await apiFetch(`/api/relatorios/${encodeURIComponent(b.dataset.id)}`), salasG);
      }
    } catch (err) { aviso(err.message); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'fsala') { filtroCfg = e.target.value; rotear(); } });
  document.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    try {
      if (f.id === 'fal') await carregarAlertas();
      else if (f.id === 'fcfg') await salvarCfg(f);
      else if (f.id === 'frel') {
        const c = Object.fromEntries(new FormData(f)); // só os 4 campos permitidos; o resto o back-end calcula
        if (c.periodo_inicio > c.periodo_fim) return aviso('A data inicial não pode ser posterior à final.');
        const r = await apiFetch('/api/relatorios', { method: 'POST', body: JSON.stringify({ ...c, id_sala: Number(c.id_sala) }) });
        aviso('Relatório gerado.', 'ok'); await relPg(); detalheRel(r, salasG);
      }
    } catch (err) { aviso(err.message); }
  });

  async function salvarCfg(f) {
    const id = f.dataset.id, original = id ? cfgs.find(c => c.id_config == id) : null;
    const NUMS = ['valor_limite', 'tempo_persistencia_segundos', 'duracao_buzzer_segundos', 'id_sala'];
    const corpo = {};
    new FormData(f).forEach((val, k) => { if (val !== '') corpo[k] = NUMS.includes(k) ? Number(val) : val.trim(); });
    corpo.acionar_buzzer = f.elements.acionar_buzzer.checked;
    if (!id) {
      if (cfgs.some(c => c.id_sala == corpo.id_sala && c.tipo_parametro === corpo.tipo_parametro))
        return aviso('Essa sala já tem configuração para esta regra. Edite a existente.');
    } else {
      // Edição: envia só o que mudou (a API rejeita campos não permitidos e revalida os enviados).
      for (const k of Object.keys(corpo)) {
        const antes = original[k];
        if (String(antes ?? '') === String(corpo[k]) || (NUMS.includes(k) && Number(antes) === corpo[k])) delete corpo[k];
      }
      if (!Object.keys(corpo).length) { $('#dlg').close(); return aviso('Nada foi alterado.', 'ok'); }
    }
    await apiFetch(id ? `/api/configuracoes-alertas/${encodeURIComponent(id)}` : '/api/configuracoes-alertas', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(corpo) });
    $('#dlg').close(); aviso('Configuração salva.', 'ok'); rotear();
  }

  // ---------- Rotas (hash) ----------
  async function rotear() {
    graficos.forEach(g => g.destroy()); graficos = [];
    const [, p = '', id] = location.hash.slice(1).split('/');
    document.querySelectorAll('nav a').forEach(a => a.classList.toggle('ativo', a.dataset.r === p));
    main.innerHTML = '<p class="vazio">Carregando…</p>';
    const paginas = { '': dashboard, salas: id && /^\d+$/.test(id) ? () => salaPg(id) : salasPg, alertas: alertasPg, configuracoes: cfgPg, relatorios: relPg };
    try { await (paginas[p] || dashboard)(); } catch (e) { main.innerHTML = `<p class="erro">${esc(e.message)}</p>`; }
  }
  addEventListener('hashchange', rotear);
  rotear();
}
