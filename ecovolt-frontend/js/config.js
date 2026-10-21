// Única fonte da URL da API (não há URLs fixas em nenhum outro arquivo).
// Para apontar para outra máquina sem editar este arquivo, defina
// window.ECOVOLT_API_URL antes de carregar este script.
const ehLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_URL = window.ECOVOLT_API_URL || (ehLocal
  ? 'http://localhost:3000'
  : 'https://ecovolt-api.onrender.com');

// A API aceita data_inicio e data_fim em GET /api/alertas.
const API_SUPORTA_PERIODO_ALERTAS = true;
