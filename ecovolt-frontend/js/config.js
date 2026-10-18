// Única fonte da URL da API (não há URLs fixas em nenhum outro arquivo).
// Para apontar para outra máquina sem editar este arquivo, defina
// window.ECOVOLT_API_URL antes de carregar este script.
const API_URL = window.ECOVOLT_API_URL || 'http://localhost:3000';

// A API aceita data_inicio e data_fim em GET /api/alertas.
const API_SUPORTA_PERIODO_ALERTAS = true;
