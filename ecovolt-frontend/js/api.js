'use strict';

// ---------- Sessão ----------
// O token JWT fica só na sessão do navegador (some ao fechar a aba).
// O front nunca cria, edita nem decodifica o token: só guarda e reenvia.
const Sessao = {
  token: () => sessionStorage.getItem('token'),
  usuario() { try { return JSON.parse(sessionStorage.getItem('usuario')); } catch { return null; } },
  salvar(token, usuario) { sessionStorage.setItem('token', token); sessionStorage.setItem('usuario', JSON.stringify(usuario)); },
  limpar() { sessionStorage.removeItem('token'); sessionStorage.removeItem('usuario'); },
  // Estes dois métodos só mostram/escondem botões. A autorização real é do back-end.
  podeEditar() { return ['ADMIN', 'ADMINISTRADOR'].includes(this.usuario()?.perfil); },
  podeEncerrarAlerta() { return ['ADMIN', 'ADMINISTRADOR', 'TECNICO'].includes(this.usuario()?.perfil); }
};

// ---------- Requisições ----------
async function apiFetch(caminho, opcoes = {}) {
  const token = Sessao.token();
  const headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, headers });
  } catch (e) {
    console.error(e);
    throw new Error('Não foi possível conectar à API. Verifique se ela está em execução.');
  }

  // 401 com token = sessão expirada. (Sem token é o login com senha errada: mostra a mensagem da API.)
  if (resposta.status === 401 && token) {
    Sessao.limpar();
    location.href = 'login.html';
    throw new Error('Sessão expirada');
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (resposta.status >= 500) {
      console.error('Erro da API', resposta.status, dados); // nunca mostrar detalhes técnicos ao usuário
      throw new Error('Erro interno no servidor. Tente novamente mais tarde.');
    }
    const fixas = {
      403: 'Acesso negado: você não tem permissão para esta ação.',
      404: 'Recurso não encontrado.',
      429: 'Muitas requisições. Aguarde alguns instantes e tente novamente.'
    };
    throw new Error(fixas[resposta.status] || dados?.erro || 'Dados inválidos ou erro na comunicação com a API.');
  }
  return dados;
}

// ---------- Nomes amigáveis (o front só traduz o que a API devolve) ----------
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

const ACOES = {
  NOTIFICAR_ADMINISTRADOR: 'Notificar administrador',
  NOTIFICAR_ADMINISTRADOR_TECNICO: 'Notificar administrador e técnico',
  NOTIFICAR_TECNICO: 'Notificar técnico',
  ACIONAR_BUZZER: 'Acionar buzzer'
};
const nomeAcao = a => a ? (ACOES[a] || String(a).replace(/_/g, ' ').toLowerCase()) : '—';

const UNIDADES = { DESVIOS_PADRAO: 'desvios padrão', INTERVALOS: 'intervalos' };
const nomeUnidade = u => UNIDADES[u] || u || '';

// ---------- Formatação ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const valido = x => x !== null && x !== undefined && x !== '' && !isNaN(x);
const num = (x, d = 1) => valido(x) ? Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const un = (x, u, d = 1) => valido(x) ? `${num(x, d)} ${u}` : '—';
const dataHora = x => x ? new Date(x).toLocaleString('pt-BR') : '—';
const dia = x => x ? String(x).slice(0, 10).split('-').reverse().join('/') : '—';
