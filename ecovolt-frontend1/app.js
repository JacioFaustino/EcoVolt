'use strict';
if (!Sessao.token()) location.replace('login.html');
const $ = s => document.querySelector(s);
const main = $('#conteudo');
const u0 = Sessao.usuario() || {};
$('#usuario').textContent = `${u0.nome || ''} (${u0.perfil || ''})`;
$('#sair').onclick = () => { Sessao.limpar(); location.href = 'login.html'; };

let graficos = [], cfgs = [], salasG = [], filtroCfg = '';
// Formato exato das respostas ainda precisa ser confirmado no back-end: ajuste aqui.
const lista = d => Array.isArray(d) ? d : (d?.dados || d?.data || d?.itens || d?.rows || []);
const v = (o, k) => o?.ultima_leitura?.[k] ?? o?.[k];
const op = s => s.status_operacao ?? s.dispositivo?.status_operacao;
const tag = (t, c = '') => `<span class="tag ${c}">${esc(t)}</span>`;
const GRAV = { BAIXA: '', MEDIA: 'wa', ALTA: 'er' };
const stat = x => { x = String(x || '').toUpperCase(); return `<span class="st ${x === 'ONLINE' ? 'on' : x === 'OFFLINE' ? 'off' : 'nd'}"><i></i>${x === 'ONLINE' ? 'Online' : x === 'OFFLINE' ? 'Offline' : x ? esc(x) : 'Desconhecido'}</span>`; };
const nomeSala = (ss, id) => ss.find(s => s.id_sala == id)?.nome ?? `Sala ${id ?? '—'}`;
const card = (r, val, sub = '') => `<div class="card"><small>${r}</small><strong>${val}</strong>${sub ? `<em>${sub}</em>` : ''}</div>`;
const tabela = (cab, linhas, vazio = 'Nenhum registro encontrado.') => linhas.length ? `<div class="tab"><table><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table></div>` : `<p class="vazio">${vazio}</p>`;
const opcoes = (ss, sel) => ss.map(s => `<option value="${esc(s.id_sala)}" ${s.id_sala == sel ? 'selected' : ''}>${esc(s.nome)}</option>`).join('');
const horario = s => s.horario_inicio ? `${esc(String(s.horario_inicio).slice(0, 5))}–${esc(String(s.horario_fim).slice(0, 5))}${s.dias_funcionamento ? ` (${esc(s.dias_funcionamento)})` : ''}` : '—';
function aviso(m, t = 'erro') { const e = $('#toast'); e.textContent = m; e.className = `show ${t}`; clearTimeout(aviso.t); aviso.t = setTimeout(() => e.className = '', 5000); }

const tabAlertas = (al, ss) => tabela(['Descrição', 'Sala', 'Tipo', 'Gravidade', 'Status', 'Valor detectado', 'Início', 'Encerramento'],
  al.map(a => `<tr class="${a.status === 'ABERTO' ? 'aberto' : ''}"><td>${esc(a.descricao)}</td><td>${esc(nomeSala(ss, a.id_sala))}</td><td>${esc(nomeRegra(a.tipo_alerta))}</td><td>${tag(a.gravidade, GRAV[a.gravidade])}</td><td>${tag(a.status, a.status === 'ABERTO' ? 'er' : '')}</td><td>${num(a.valor_detectado, 2)}</td><td>${dataHora(a.timestamp_inicio)}</td><td>${dataHora(a.timestamp_fim)}</td></tr>`), 'Nenhum alerta encontrado.');

const tabCfg = (c, ss, ed) => tabela(['Regra', 'Sala', 'Limite', 'Unidade', 'Persistência', 'Status', 'Buzzer', 'Ação automática', ...(ed ? ['Ações'] : [])],
  c.map(x => { const at = x.status === 'ATIVA'; return `<tr><td>${esc(nomeRegra(x.tipo_parametro))}</td><td>${esc(nomeSala(ss, x.id_sala))}</td><td>${num(x.valor_limite, 2)}</td><td>${esc(x.unidade_medida || '—')}</td><td>${un(x.tempo_persistencia_segundos, 's', 0)}</td><td>${tag(at ? 'Ativa' : 'Inativa', at ? 'on' : '')}</td><td>${x.acionar_buzzer ? `Sim (${un(x.duracao_buzzer_segundos, 's', 0)})` : 'Não'}</td><td>${esc(x.acao_automatica || '—')}</td>${ed ? `<td><div class="acoes"><button data-a="editar" data-id="${esc(x.id_config)}">Editar</button><button data-a="status" data-id="${esc(x.id_config)}" data-st="${at ? 'INATIVA' : 'ATIVA'}">${at ? 'Desativar' : 'Ativar'}</button></div></td>` : ''}</tr>`; }),
  'Nenhuma configuração encontrada.');

function graf(id, tipo, labels, dados, rot, unid) {
  if (typeof Chart === 'undefined') return;
  const cor = getComputedStyle(document.documentElement).getPropertyValue('--br').trim();
  graficos.push(new Chart($(`#${id}`), { type: tipo, data: { labels, datasets: [{ label: rot, data: dados, borderColor: cor, backgroundColor: tipo === 'bar' ? cor : cor + '33', fill: tipo === 'line', tension: .3, pointRadius: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: unid } } } } }));
}

async function dashboard() {
  const [ss, ab] = await Promise.all([apiFetch('/api/salas').then(lista), apiFetch('/api/alertas?status=ABERTO').then(lista)]);
  const vs = k => ss.map(s => v(s, k)).filter(x => x != null && !isNaN(x)).map(Number);
  const soma = a => a.length ? a.reduce((x, y) => x + y, 0) : null;
  const pk = vs('pico_potencia_W'), pt = pk.length ? pk : vs('potencia_ativa_W'), ql = vs('qualidade_sinal');
  main.innerHTML = `<h1>Visão geral</h1><div class="grade">
    ${card('Total de salas', ss.length)}${card('Salas online', ss.filter(s => op(s) === 'ONLINE').length)}
    ${card('Dispositivos offline', ss.filter(s => op(s) === 'OFFLINE').length)}${card('Consumo do dia', un(soma(vs('consumo_dia_kWh')), 'kWh', 2))}
    ${card('Alertas abertos', ab.length)}${card('Maior pico de potência', un(pt.length ? Math.max(...pt) : null, 'W'))}
    ${card('Qualidade média do sinal', un(soma(ql) == null ? null : soma(ql) / ql.length, '%', 0))}</div>
    <h2>Alertas abertos</h2>${tabAlertas(ab, ss)}`;
}

async function salasPg() {
  const [ss, ab] = await Promise.all([apiFetch('/api/salas').then(lista), apiFetch('/api/alertas?status=ABERTO').then(lista)]);
  main.innerHTML = `<h1>Salas</h1>` + tabela(['Sala', 'Localização', 'Status', 'Potência atual', 'Consumo do dia', 'Funcionamento', 'Capacidade elétrica', 'Alertas abertos'],
    ss.map(s => `<tr><td><a href="#/salas/${esc(s.id_sala)}">${esc(s.nome)}</a></td><td>${esc(s.localizacao || '—')}</td><td>${stat(op(s))}</td><td>${un(v(s, 'potencia_ativa_W'), 'W')}</td><td>${un(v(s, 'consumo_dia_kWh'), 'kWh', 2)}</td><td>${horario(s)}</td><td>${un(s.capacidade_max_W, 'W', 0)}</td><td>${s.alertas_abertos ?? ab.filter(a => a.id_sala == s.id_sala).length}</td></tr>`), 'Nenhuma sala cadastrada.');
}

async function salaPg(id) {
  const q = encodeURIComponent(id), opc = p => p.then(lista).catch(e => { console.error(e); return []; });
  const [ss, horas, leit, al, cf] = await Promise.all([apiFetch('/api/salas').then(lista), opc(apiFetch(`/api/salas/${q}/consumo-hora`)),
    apiFetch(`/api/leituras?id_sala=${q}&limite=100`).then(lista), opc(apiFetch(`/api/alertas?id_sala=${q}`)), opc(apiFetch(`/api/configuracoes-alertas?id_sala=${q}`))]);
  const s = ss.find(x => x.id_sala == id); if (!s) throw new Error('Sala não encontrada.');
  const d = s.dispositivo || {}, porta = s.estado_porta ?? s.ultima_leitura?.estado_porta, sens = s.sensores || d.sensores || [];
  main.innerHTML = `<p><a href="#/salas">Voltar para salas</a></p><h1>${esc(s.nome)} ${stat(op(s))}</h1><div class="grade">
    ${card('Potência atual', un(v(s, 'potencia_ativa_W'), 'W'))}${card('Consumo diário', un(v(s, 'consumo_dia_kWh'), 'kWh', 2))}
    ${card('Consumo mensal', un(v(s, 'consumo_mes_kWh'), 'kWh', 2))}${card('Capacidade elétrica', un(s.capacidade_max_W, 'W', 0))}
    ${card('Porta', porta === 'ABERTA' ? tag('Aberta', 'er') : porta === 'FECHADA' ? tag('Fechada', 'on') : '<span class="mut">Não informado</span>')}</div>
    <div class="duas"><div class="graf"><canvas id="gp"></canvas></div><div class="graf"><canvas id="ge"></canvas></div></div>
    <h2>Dispositivo e sensores</h2><p>${d.nome ? `${esc(d.nome)} · MAC ${esc(d.mac_address || '—')} · último contato ${dataHora(d.ultimo_contato)} · leitura a cada ${un(d.intervalo_leitura_segundos, 's', 0)}` : '<span class="mut">Dispositivo não informado pela API.</span>'}</p>
    ${tabela(['Tipo', 'Unidade', 'Status'], sens.map(x => `<tr><td>${esc(x.tipo)}</td><td>${esc(x.unidade_medida || '—')}</td><td>${esc(x.status || '—')}</td></tr>`), 'Sensores não informados pela API.')}
    <h2>Alertas da sala</h2>${tabAlertas(al, ss)}<h2>Configurações da sala</h2>${tabCfg(cf, ss, false)}`;
  const l = [...leit].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  graf('gp', 'line', l.map(x => new Date(x.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })), l.map(x => x.potencia_ativa_W), 'Potência ativa', 'Potência (W)');
  graf('ge', 'bar', horas.map(h => `${h.hora ?? h.periodo}h`), horas.map(h => h.consumo_kWh ?? h.energia_kWh ?? h.total_kWh), 'Energia por hora', 'Energia (kWh)');
}

async function alertasPg() {
  const ss = await apiFetch('/api/salas').then(lista); salasG = ss;
  main.innerHTML = `<h1>Alertas</h1><form id="fal" class="filtros">
    <label>Sala<select name="id_sala"><option value="">Todas</option>${opcoes(ss)}</select></label>
    <label>Gravidade<select name="gravidade"><option value="">Todas</option><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option></select></label>
    <label>Status<select name="status"><option value="ABERTO">Aberto</option><option value="PENDENTE">Pendente</option><option value="FECHADO">Fechado</option><option value="">Todos</option></select></label>
    <label>Tipo<select name="tipo_alerta"><option value="">Todos</option>${Object.entries(NOMES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
    <label>De<input type="date" name="data_inicio"></label><label>Até<input type="date" name="data_fim"></label><button class="pri">Filtrar</button></form><div id="res"></div>`;
  await carregarAlertas();
}
async function carregarAlertas() {
  const p = new URLSearchParams(); // filtros são enviados à API, não aplicados no front
  new FormData($('#fal')).forEach((val, k) => { if (val) p.set(k, val); });
  $('#res').innerHTML = tabAlertas(await apiFetch(`/api/alertas?${p}`).then(lista), salasG);
}

async function cfgPg() {
  const q = filtroCfg ? `?id_sala=${encodeURIComponent(filtroCfg)}` : '';
  [salasG, cfgs] = await Promise.all([apiFetch('/api/salas').then(lista), apiFetch(`/api/configuracoes-alertas${q}`).then(lista)]);
  const ed = Sessao.podeEditar();
  main.innerHTML = `<h1>Configuração de alertas</h1><div class="filtros"><label>Sala<select id="fsala"><option value="">Todas</option>${opcoes(salasG, filtroCfg)}</select></label>${ed ? '<button class="pri" data-a="novo">Nova configuração</button>' : ''}</div>${tabCfg(cfgs, salasG, ed)}`;
}
function abrirCfg(c) {
  const novo = !c; c = c || {}; const f = $('#fcfg'); f.dataset.id = c.id_config || '';
  const campo = (n, r, t = 'number', extra = '') => `<label>${r}<input name="${n}" type="${t}" ${extra} value="${esc(c[n] ?? '')}"></label>`;
  f.innerHTML = `<h2>${novo ? 'Nova configuração' : 'Editar configuração'}</h2>
    <label>Sala<select name="id_sala" ${novo ? 'required' : 'disabled'}>${opcoes(salasG, c.id_sala)}</select></label>
    <label>Regra<select name="tipo_parametro" ${novo ? 'required' : 'disabled'}>${Object.entries(NOMES).map(([k, n]) => `<option value="${k}" ${k === c.tipo_parametro ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    ${campo('valor_limite', 'Limite', 'number', 'step="any" required')}${campo('unidade_medida', 'Unidade', 'text')}
    ${campo('tempo_persistencia_segundos', 'Persistência (s)', 'number', 'min="0"')}${campo('duracao_buzzer_segundos', 'Duração do buzzer (s)', 'number', 'min="0"')}
    ${campo('acao_automatica', 'Ação automática', 'text')}
    <label class="chk"><input name="acionar_buzzer" type="checkbox" ${c.acionar_buzzer ? 'checked' : ''}> Acionar buzzer</label>
    <div class="acoes"><button type="button" data-a="fechar">Cancelar</button><button class="pri">Salvar configuração</button></div>`;
  $('#dlg').showModal();
}

async function relPg() {
  const [ss, rels] = await Promise.all([apiFetch('/api/salas').then(lista), apiFetch('/api/relatorios').then(lista)]);
  const T = { CONSUMO: 'Consumo', ALERTAS: 'Alertas', DISPOSITIVOS_OFFLINE: 'Dispositivos offline' };
  main.innerHTML = `<h1>Relatórios</h1><form id="frel" class="filtros">
    <label>Sala<select name="id_sala" required>${opcoes(ss)}</select></label>
    <label>Tipo<select name="tipo_relatorio">${Object.entries(T).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
    <label>Data inicial<input type="date" name="periodo_inicio" required></label><label>Data final<input type="date" name="periodo_fim" required></label>
    <button class="pri">Gerar relatório</button></form><h2>Histórico</h2>` +
    tabela(['Sala', 'Tipo', 'Período', 'Consumo total', 'Custo estimado', 'Picos', 'Anomalias', 'Gerado em'],
      rels.map(r => `<tr><td>${esc(nomeSala(ss, r.id_sala))}</td><td>${esc(T[r.tipo_relatorio] || r.tipo_relatorio)}</td><td>${dia(r.periodo_inicio)} a ${dia(r.periodo_fim)}</td><td>${un(r.consumo_total_kWh, 'kWh', 2)}</td><td>${r.custo_estimado == null ? '—' : 'R$ ' + num(r.custo_estimado, 2)}</td><td>${esc(r.picos_consumo ?? '—')}</td><td>${esc(r.anomalias_detectadas ?? '—')}</td><td>${dataHora(r.gerado_em)}</td></tr>`), 'Nenhum relatório gerado ainda.');
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  try {
    const a = b.dataset.a;
    if (a === 'novo') abrirCfg();
    else if (a === 'editar') abrirCfg(cfgs.find(c => c.id_config == b.dataset.id));
    else if (a === 'fechar') $('#dlg').close();
    else if (a === 'status') { await apiFetch(`/api/configuracoes-alertas/${encodeURIComponent(b.dataset.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: b.dataset.st }) }); aviso('Status atualizado.', 'ok'); rotear(); }
  } catch (err) { aviso(err.message); }
});
document.addEventListener('change', e => { if (e.target.id === 'fsala') { filtroCfg = e.target.value; rotear(); } });
document.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target;
  try {
    if (f.id === 'fal') await carregarAlertas();
    else if (f.id === 'fcfg') {
      const id = f.dataset.id, corpo = {};
      new FormData(f).forEach((val, k) => { if (val !== '') corpo[k] = ['valor_limite', 'tempo_persistencia_segundos', 'duracao_buzzer_segundos', 'id_sala'].includes(k) ? Number(val) : val; });
      corpo.acionar_buzzer = f.elements.acionar_buzzer.checked;
      await apiFetch(id ? `/api/configuracoes-alertas/${encodeURIComponent(id)}` : '/api/configuracoes-alertas', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(corpo) });
      $('#dlg').close(); aviso('Configuração salva.', 'ok'); rotear();
    } else if (f.id === 'frel') {
      const c = Object.fromEntries(new FormData(f)); // só os 4 campos permitidos; o resto o back-end calcula
      if (c.periodo_inicio > c.periodo_fim) return aviso('A data inicial deve ser anterior à final.');
      await apiFetch('/api/relatorios', { method: 'POST', body: JSON.stringify({ ...c, id_sala: Number(c.id_sala) }) });
      aviso('Relatório gerado.', 'ok'); rotear();
    }
  } catch (err) { aviso(err.message); }
});

async function rotear() {
  graficos.forEach(g => g.destroy()); graficos = [];
  const [, p = '', id] = location.hash.slice(1).split('/');
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('ativo', a.dataset.r === p));
  main.innerHTML = '<p class="vazio">Carregando…</p>';
  const pg = { '': dashboard, salas: id ? () => salaPg(id) : salasPg, alertas: alertasPg, configuracoes: cfgPg, relatorios: relPg }[p] || dashboard;
  try { await pg(); } catch (e) { main.innerHTML = `<p class="erro">${esc(e.message)}</p>`; }
}
addEventListener('hashchange', rotear); rotear();
