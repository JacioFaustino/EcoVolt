/* EcoVolt · camada de Visão (MVC).
   USE_MOCK = true simula a API; defina false para consumir a API RESTful em API_BASE. */
const CONFIG = { API_BASE: '/api', USE_MOCK: true, REFRESH_MS: 15000 };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rand = (a, b) => Math.random() * (b - a) + a;
const fmt = (n, d = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Mock: mesmo formato JSON esperado da API ---------- */
const NOMES = ['Lab. Informática 1', 'Lab. Informática 2', 'Lab. Redes', 'Lab. Física', 'Sala 101', 'Sala 102'];
const settings = { picoConsumo: true, arForaHorario: true, falhaSensor: false };
const mock = {
  resumo: () => ({ consumoTotalKwh: rand(1180, 1320), salasMonitoradas: NOMES.length, economiaPct: rand(15, 21), economiaReais: rand(3200, 3600) }),
  hora: () => ({
    labels: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`),
    valores: Array.from({ length: 24 }, (_, h) => +(h >= 7 && h <= 22 ? 40 + 30 * Math.sin((h - 7) / 15 * Math.PI) + rand(-4, 4) : rand(5, 9)).toFixed(1))
  }),
  salas: () => NOMES.map((nome, i) => ({
    id: i + 1, nome, consumoKwh: +rand(18, 95).toFixed(1), arCondicionado: Math.random() > .35,
    tomadas: { ativas: Math.floor(rand(2, 16)), total: 16 }, eficiencia: Math.round(rand(55, 98))
  })),
  historico: p => {
    const n = { diario: 7, semanal: 8, mensal: 12, anual: 5 }[p];
    const escala = { diario: 1, semanal: 7, mensal: 30, anual: 365 }[p];
    const hoje = new Date();
    const labels = Array.from({ length: n }, (_, i) => {
      const k = n - 1 - i, d = new Date(hoje);
      if (p === 'diario') { d.setDate(d.getDate() - k); return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }); }
      if (p === 'semanal') return `Sem ${n - k}`;
      if (p === 'mensal') { d.setMonth(d.getMonth() - k); return d.toLocaleDateString('pt-BR', { month: 'short' }); }
      return String(hoje.getFullYear() - k);
    });
    return { labels, valores: labels.map(() => +(rand(35, 60) * escala).toFixed(0)) };
  }
};

/* ---------- Camada de acesso à API ---------- */
async function request(path, mockFn, opts) {
  if (CONFIG.USE_MOCK) { await new Promise(r => setTimeout(r, 250)); return mockFn(); }
  const res = await fetch(CONFIG.API_BASE + path, { headers: { Accept: 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
const api = {
  resumo: () => request('/resumo', mock.resumo),
  hora: () => request('/consumo/hora', mock.hora),
  salas: () => request('/salas', mock.salas),
  historico: p => request(`/historico?periodo=${p}`, () => mock.historico(p)),
  getConfig: () => request('/configuracoes', () => ({ ...settings })),
  setConfig: body => request('/configuracoes', () => Object.assign(settings, body),
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
};

/* ---------- Gráficos (Chart.js) ---------- */
Chart.defaults.color = '#8da2b8';
Chart.defaults.borderColor = '#26394d';
Chart.defaults.font.family = '"IBM Plex Sans", system-ui, sans-serif';
const charts = {};
function draw(id, config) {
  if (charts[id]) { charts[id].data = config.data; charts[id].update(); return; }
  config.options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, ...config.options };
  charts[id] = new Chart($('#' + id), config);
}

/* ---------- Telas ---------- */
const TITULOS = { dashboard: 'Dashboard geral', salas: 'Detalhamento por sala', historico: 'Histórico e relatórios', config: 'Configurações e alertas' };
const views = {
  async dashboard() {
    const [r, h, s] = await Promise.all([api.resumo(), api.hora(), api.salas()]);
    $('#kpi-consumo').textContent = `${fmt(r.consumoTotalKwh)} kWh`;
    $('#kpi-salas').textContent = r.salasMonitoradas;
    $('#kpi-economia').textContent = `${fmt(r.economiaPct)}%`;
    $('#kpi-economia-sub').textContent = `≈ R$ ${fmt(r.economiaReais, 0)} no mês`;
    draw('chart-hora', {
      type: 'line',
      data: { labels: h.labels, datasets: [{ data: h.valores, borderColor: '#4cc9f0', backgroundColor: 'rgba(76,201,240,.15)', fill: true, tension: .4, pointRadius: 0, pointHoverRadius: 5 }] },
      options: { interaction: { mode: 'index', intersect: false } }
    });
    const rank = [...s].sort((a, b) => b.consumoKwh - a.consumoKwh);
    draw('chart-ranking', {
      type: 'bar',
      data: { labels: rank.map(x => x.nome), datasets: [{ data: rank.map(x => x.consumoKwh), backgroundColor: '#ffb830', borderRadius: 4 }] },
      options: { indexAxis: 'y' }
    });
  },
  async salas() {
    const s = await api.salas();
    $('#rooms').innerHTML = s.map(r => {
      const cor = r.eficiencia >= 80 ? 'var(--mint)' : r.eficiencia >= 65 ? 'var(--amber)' : 'var(--red)';
      return `<article class="card room">
        <header><h2>${esc(r.nome)}</h2><span class="badge ${r.arCondicionado ? 'on' : 'off'}">Ar ${r.arCondicionado ? 'ligado' : 'desligado'}</span></header>
        <strong class="kwh">${fmt(r.consumoKwh)} <small>kWh</small></strong>
        <dl><dt>Tomadas</dt><dd>${r.tomadas.ativas} de ${r.tomadas.total} ativas</dd><dt>Eficiência</dt><dd>${r.eficiencia}%</dd></dl>
        <div class="meter"><i style="width:${r.eficiencia}%;background:${cor}"></i></div>
      </article>`;
    }).join('');
  },
  async historico(p = $('.filters .active').dataset.periodo) {
    const h = await api.historico(p);
    draw('chart-hist', {
      type: 'bar',
      data: { labels: h.labels, datasets: [{ data: h.valores, backgroundColor: '#4ade9b', borderRadius: 4 }] }
    });
  },
  async config() {
    const c = await api.getConfig();
    $$('[data-key]').forEach(i => { i.checked = !!c[i.dataset.key]; });
  }
};

/* ---------- Navegação e eventos ---------- */
let current = 'dashboard';
const run = v => views[v]()
  .then(() => $('.live').classList.remove('offline'))
  .catch(e => { console.error(e); $('.live').classList.add('offline'); });

function show(view) {
  if (!views[view]) view = 'dashboard';
  current = view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === view));
  $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  $('#titulo').textContent = TITULOS[view];
  run(view);
}

window.addEventListener('hashchange', () => show(location.hash.slice(1)));

$('.filters').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('.filters button').forEach(x => x.classList.toggle('active', x === b));
  views.historico(b.dataset.periodo).catch(console.error);
});

// Troque por GET /api/relatorios/pdf?periodo=... se o back-end gerar o arquivo.
$('#btn-pdf').addEventListener('click', () => window.print());

$$('[data-key]').forEach(i => i.addEventListener('change', async () => {
  try {
    await api.setConfig({ [i.dataset.key]: i.checked });
    $('#save-status').textContent = `Salvo às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    i.checked = !i.checked;
    $('#save-status').textContent = 'Não foi possível salvar. Tente novamente.';
  }
}));

// Simula o fluxo contínuo de telemetria (polling).
setInterval(() => { if (!document.hidden && ['dashboard', 'salas'].includes(current)) run(current); }, CONFIG.REFRESH_MS);

show(location.hash.slice(1));
