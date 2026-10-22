// Única fonte da URL da API (não há URLs fixas em nenhum outro arquivo).
// Para apontar para outra máquina sem editar este arquivo, defina
// window.ECOVOLT_API_URL antes de carregar este script.
const ehLocal =
  location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(location.hostname) ||
  /^(10|127)\./.test(location.hostname) ||
  /^192\.168\./.test(location.hostname) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(location.hostname);
const API_URL = window.ECOVOLT_API_URL || (ehLocal
  ? 'http://localhost:3000'
  : 'https://ecovolt-api.onrender.com');

// A API aceita data_inicio e data_fim em GET /api/alertas.
const API_SUPORTA_PERIODO_ALERTAS = true;
