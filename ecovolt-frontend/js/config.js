// Única fonte da URL da API (não há URLs fixas em nenhum outro arquivo).
// Para apontar para outra máquina sem editar este arquivo, defina
// window.ECOVOLT_API_URL antes de carregar este script.
const API_URL = window.ECOVOLT_API_URL || 'http://localhost:3000';

// A API ainda não filtra alertas por período (data_inicio / data_fim).
// Quando o back-end implementar, troque para true e os campos "De/Até" passam a funcionar.
const API_SUPORTA_PERIODO_ALERTAS = false;
