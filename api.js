'use strict';
// Token JWT guardado só durante a sessão do navegador. O front nunca cria nem altera o token.
const Sessao = {
  token: () => sessionStorage.getItem('token'),
  usuario() { try { return JSON.parse(sessionStorage.getItem('usuario')); } catch { return null; } },
  salvar(t, u) { sessionStorage.setItem('token', t); sessionStorage.setItem('usuario', JSON.stringify(u)); },
  limpar() { sessionStorage.removeItem('token'); sessionStorage.removeItem('usuario'); },
  // Apenas para mostrar/esconder botões. A autorização real é do back-end.
  podeEditar() { return ['ADMIN', 'ADMINISTRADOR'].includes(this.usuario()?.perfil); }
};

async function apiFetch(caminho, opcoes = {}) {
  const token = Sessao.token();
  const headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let r;
  try { r = await fetch(`${API_URL}${caminho}`, { ...opcoes, headers }); }
  catch (e) { console.error(e); throw new Error('Não foi possível conectar à API. Verifique se ela está em execução.'); }
  if (r.status === 401 && token) { Sessao.limpar(); location.href = 'login.html'; throw new Error('Sessão expirada'); }
  const dados = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status >= 500) { console.error('Erro da API', r.status, dados); throw new Error('Erro interno no servidor. Tente novamente mais tarde.'); }
    const fixas = { 403: 'Acesso negado: você não tem permissão para esta ação.', 429: 'Muitas requisições. Aguarde alguns instantes e tente novamente.', 404: 'Recurso não encontrado.' };
    throw new Error(fixas[r.status] || dados?.erro || 'Dados inválidos ou erro na comunicação com a API.');
  }
  return dados;
}

const NOMES = {
  R1_CONSUMO_FORA_HORARIO: 'Consumo fora do horário',
  R2_AR_FORA_HORARIO: 'Ar-condicionado fora do horário',
  R3A_PORTA_ABERTA: 'Porta aberta com ar-condicionado ligado',
  R3B_PORTA_ABERTA_PERSISTENTE: 'Porta aberta por tempo prolongado',
  R4_SOBRECARGA: 'Sobrecarga elétrica',
  R5_PADRAO_HISTORICO: 'Consumo acima do padrão histórico',
  R6_LIMITE_DIARIO: 'Limite diário excedido',
  R7_DISPOSITIVO_OFFLINE: 'Dispositivo offline',
  R8_FALHA_LEITURA: 'Falha ou inconsistência na leitura'
};
const nomeRegra = t => NOMES[t] || t || '—';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (x, d = 1) => x == null || x === '' || isNaN(x) ? '—' : Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const un = (x, u, d = 1) => x == null || x === '' || isNaN(x) ? '—' : `${num(x, d)} ${u}`;
const dataHora = x => x ? new Date(x).toLocaleString('pt-BR') : '—';
const dia = x => x ? String(x).slice(0, 10).split('-').reverse().join('/') : '—';
