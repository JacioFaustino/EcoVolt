# EcoVolt — Front-end

Painel web do EcoVolt em HTML, CSS e JavaScript puro. O Chart.js já está incluído em `js/vendor/`, portanto os gráficos não dependem de acesso à internet.

O front-end consome a API REST; não acessa o MySQL nem executa regras de anomalia. Custos e períodos dos relatórios são calculados pela API.

## Como executar localmente

### Preparação (uma vez)

1. Crie o banco `ecovolt` no MySQL Workbench:
   ```sql
   CREATE DATABASE ecovolt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Instale a extensão **Live Server** no VS Code.
3. Configure e prepare a API conforme o [README principal](../README.md): copie `ecovolt-api/.env.example` para `ecovolt-api/.env`, preencha as credenciais do MySQL e defina um `JWT_SECRET` longo.
4. No terminal, dentro de `ecovolt-api`, instale dependências, crie as tabelas e carregue os dados de demonstração:
   ```bash
   npm install
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```
   O seed cria o usuário de demonstração (`admin@ecovolt.ifrn.edu.br`, senha `123456`) e dados de exemplo.

### A cada execução

1. Abra a pasta raiz `EcoVolt` no VS Code.
2. Inicie a API no terminal:
   ```bash
   cd ecovolt-api
   npm run dev
   ```
   Mantenha esse terminal aberto.
3. Abra `ecovolt-frontend/login.html` e selecione **Open with Live Server**. A configuração em `.vscode/settings.json` aponta a raiz do Live Server para `ecovolt-frontend`.
4. Acesse `http://127.0.0.1:5500/login.html` e entre com as credenciais do seed.

Em execução local, o front usa `http://localhost:3000` como API. Em hospedagem, usa `https://ecovolt-api.onrender.com`. Para apontar para outra API, defina `window.ECOVOLT_API_URL` antes de carregar `js/config.js`.

## O que o painel oferece

- **Visão geral:** salas, estados dos dispositivos, consumo e custo estimados do dia, alertas abertos e qualidade do sinal.
- **Salas:** lista com consumo/custo diário; o detalhe exibe custos diário e mensal, sensores, alertas, potência das leituras recentes e consumo horário do dia UTC.
- **Alertas:** filtros de sala, gravidade, tipo, status (incluindo **Todos**) e período. As datas são interpretadas pela API em UTC.
- **Configuração de alertas:** consulta, criação, edição e ativação/desativação conforme o perfil. Os campos são apresentados em um formulário geral; a tela ainda não adapta os campos às regras individuais. `acao_automatica` é apenas um campo informativo: a API não executa notificações.
- **Relatórios:** geração por consumo, alertas ou dispositivos offline, com periodicidade diária, semanal, mensal, anual ou personalizada; histórico com consumo, desperdício, custo e pico; detalhes e download do PDF.
- **Sustentabilidade:** economia de energia, custo evitado, CO₂ não emitido e redução do desperdício, com filtros por sala e periodicidade; exibe o contexto do período e sinaliza períodos sem comparação ou aumento do desperdício.

Custos usam a tarifa configurada no servidor (`TARIFA_KWH`). Quando a API não retorna um valor de custo, o painel exibe `—`; não calcula nem substitui o valor.

## Estrutura

```text
index.html        painel (visão geral, salas, alertas, configurações, relatórios e sustentabilidade)
login.html        tela de login
css/style.css     estilos
js/config.js      configuração da URL da API e capacidades da API
js/api.js         sessão, requisições autenticadas, erros e formatação
js/app.js         páginas, gráficos e interações do painel
js/vendor/        Chart.js local
```

## Sustentabilidade e relatórios

Do lado da API, as pendências foram encerradas: o `resumo` do relatório e a sustentabilidade agora usam a mesma regra de desperdício, e os erros de validação da sustentabilidade retornam a mensagem específica do campo. A interface exibe os indicadores de sustentabilidade com filtros de sala e período, inclui o resumo completo nos detalhes do relatório e preserva os filtros ao gerar relatórios.

### Funcionalidades implementadas

#### 1) Página de sustentabilidade

A rota existe na API e devolve **um objeto** (não array). Não usar `lista()`.

```http
GET /api/sustentabilidade
Authorization: Bearer JWT_DO_USUARIO
```

| Query | Obrigatório | Valores |
|---|---|---|
| `id_sala` | não | sem ele, agrega todas as salas |
| `periodicidade` | não | `DIARIO`, `SEMANAL`, `MENSAL`, `ANUAL`, `PERSONALIZADO` (padrão `MENSAL`) |
| `data_referencia` | não | `YYYY-MM-DD`; usado nas periodicidades de calendário |
| `periodo_inicio` / `periodo_fim` | só em `PERSONALIZADO` | `YYYY-MM-DD` |

Campos da resposta:

- Economia: `energia_economizada_kwh`, `custo_evitado_reais`, `co2_nao_emitido_kg`, `reducao_percentual`.
- Contexto: `consumo_kwh`, `desperdicio_kwh`, `taxa_desperdicio_percentual`, `custo_desperdicio_reais`.
- Período: `periodo.inicio`, `periodo.fim_considerado`, `periodo.parcial`, `periodo.comparado_inicio`, `periodo.comparado_fim`, `periodo.dias_considerados`.
- `comparacao_disponivel: false` → os campos de economia vêm `null`. Exibir `—` e um aviso; **nunca** `0`.
- `reducao_percentual` pode ser negativo (aumento do desperdício). Sinalizar como aumento, não como economia.

Implementação:

1. Em `index.html`, depois de Relatórios:

```html
<a href="#/sustentabilidade" data-r="sustentabilidade">Sustentabilidade</a>
```

2. Em `js/app.js`, no objeto `paginas` de `rotear()`:

```js
const paginas = { '': dashboard, salas: id && /^\d+$/.test(id) ? () => salaPg(id) : salasPg, alertas: alertasPg, configuracoes: cfgPg, relatorios: relPg, sustentabilidade: sustentabilidadePg };
```

3. Em `js/app.js`, antes de `rotear()`:

```js
  async function sustentabilidadePg() {
    const ss = await apiFetch('/api/salas').then(lista);
    salasG = ss;

    main.innerHTML = `<h1>Sustentabilidade</h1>
      <form id="fsust" class="filtros">
        <label>Sala<select name="id_sala"><option value="">Todas as salas</option>${opcoes(ss)}</select></label>
        <label>Periodicidade<select name="periodicidade">
          <option value="MENSAL">Mensal</option>
          <option value="DIARIO">Diário</option>
          <option value="SEMANAL">Semanal</option>
          <option value="ANUAL">Anual</option>
          <option value="PERSONALIZADO">Personalizado</option>
        </select></label>
        <label id="sust-ref">Data de referência<input type="date" name="data_referencia"></label>
        <label id="sust-ini" hidden>Data inicial<input type="date" name="periodo_inicio"></label>
        <label id="sust-fim" hidden>Data final<input type="date" name="periodo_fim"></label>
        <button class="pri">Atualizar</button>
      </form>
      <div id="sust-res"></div>`;

    const f = $('#fsust');

    const alternar = () => {
      const personalizado = f.periodicidade.value === 'PERSONALIZADO';
      $('#sust-ref').hidden = personalizado;
      $('#sust-ini').hidden = !personalizado;
      $('#sust-fim').hidden = !personalizado;
      f.periodo_inicio.required = personalizado;
      f.periodo_fim.required = personalizado;
    };

    f.periodicidade.addEventListener('change', alternar);
    alternar();

    async function consultar() {
      const p = new URLSearchParams();
      const periodo = f.periodicidade.value;

      if (f.id_sala.value) p.set('id_sala', f.id_sala.value);
      p.set('periodicidade', periodo);

      if (periodo === 'PERSONALIZADO') {
        if (!f.periodo_inicio.value || !f.periodo_fim.value)
          return aviso('Informe a data inicial e a data final.');
        if (f.periodo_inicio.value > f.periodo_fim.value)
          return aviso('A data inicial não pode ser posterior à final.');
        p.set('periodo_inicio', f.periodo_inicio.value);
        p.set('periodo_fim', f.periodo_fim.value);
      } else if (f.data_referencia.value) {
        p.set('data_referencia', f.data_referencia.value);
      }

      $('#sust-res').innerHTML = '<p class="vazio">Carregando…</p>';

      const r = await apiFetch(`/api/sustentabilidade?${p}`);

      if (!r.periodo.fim_considerado) {
        $('#sust-res').innerHTML = '<p class="banner">Esse período ainda não começou. Não há dados para calcular.</p>';
        return;
      }

      const semComparacao = !r.comparacao_disponivel;
      const eco = (v, u, c) => semComparacao || !valido(v) ? '—' : un(v, u, c);
      const reais = v => semComparacao || !valido(v) ? '—' : 'R$ ' + num(v, 2);
      const textoPeriodo = `${dia(r.periodo.inicio)} a ${dia(r.periodo.fim_considerado)}${r.periodo.parcial ? ' (em andamento)' : ''}`;
      const tarifa = valido(r.tarifa_kwh) ? `R$ ${num(r.tarifa_kwh, 2)}/kWh` : 'não configurada';

      $('#sust-res').innerHTML = `
        <p class="mut">${esc(r.sala || 'Todas as salas')} · ${esc(textoPeriodo)}</p>
        ${semComparacao ? '<p class="banner">Ainda não há leituras suficientes no período anterior para calcular a economia. Os cartões de economia aparecem como “—”.</p>' : ''}
        ${r.periodo.comparado_inicio ? `<p class="banner">Comparação com ${dia(r.periodo.comparado_inicio)} a ${dia(r.periodo.comparado_fim)}, mesma duração (${r.periodo.dias_considerados} dia(s)).</p>` : ''}
        <div class="grade">
          ${card('Energia economizada', eco(r.energia_economizada_kwh, 'kWh', 2))}
          ${card('Custo evitado', reais(r.custo_evitado_reais))}
          ${card('CO₂ não emitido', eco(r.co2_nao_emitido_kg, 'kg', 3))}
          ${card('Redução do desperdício', semComparacao || !valido(r.reducao_percentual) ? '—' : `${num(r.reducao_percentual, 1)} %`, valido(r.reducao_percentual) && r.reducao_percentual < 0 ? 'aumento em relação ao período anterior' : '')}
        </div>
        <h2>Contexto do período</h2>
        <div class="grade">
          ${card('Consumo', un(r.consumo_kwh, 'kWh', 2))}
          ${card('Desperdício identificado', un(r.desperdicio_kwh, 'kWh', 3))}
          ${card('Taxa de desperdício', valido(r.taxa_desperdicio_percentual) ? `${num(r.taxa_desperdicio_percentual, 1)} %` : '—')}
          ${card('Custo do desperdício', valido(r.custo_desperdicio_reais) ? 'R$ ' + num(r.custo_desperdicio_reais, 2) : '—')}
        </div>
        <p class="mut">Tarifa: ${tarifa} · Fator de emissão: ${num(r.fator_co2_kg_kwh, 4)} kgCO₂/kWh</p>`;
    }

    f.addEventListener('submit', async e => {
      e.preventDefault();
      try { await consultar(); } catch (err) { aviso(err.message); }
    });

    await consultar();
  }
```

#### 2) O detalhe do relatório exibe o `resumo`

`GET /api/relatorios/:id` devolve `resumo` como texto JSON. `detalheRel()` apresenta o desperdício e a taxa, além das informações específicas de alertas ou dispositivos offline.

Campos por tipo:

| `tipo_relatorio` | Campos do `resumo` |
|---|---|
| `CONSUMO` | `desperdicio_kWh`, `taxa_desperdicio_percentual` |
| `ALERTAS` | os acima + `por_tipo[]` e `lista[]` (50 mais recentes) |
| `DISPOSITIVOS_OFFLINE` | os acima + `total`, `minutos_totais`, `minutos_medios`, `lista[]` |

A função `detalheRel` lê esse conteúdo e exibe:

```js
  function detalheRel(r, ss) {
    const p = picos(r);
    let resumo = {};
    try { resumo = JSON.parse(r.resumo) || {}; } catch { resumo = {}; }

    const desperdicio = [
      ['Energia desperdiçada', valido(resumo.desperdicio_kWh) ? un(resumo.desperdicio_kWh, 'kWh', 3) : '—'],
      ['Taxa de desperdício', valido(resumo.taxa_desperdicio_percentual) ? `${num(resumo.taxa_desperdicio_percentual, 1)} %` : '—']
    ];

    let extra = '';

    if (r.tipo_relatorio === 'ALERTAS') {
      const porTipo = Array.isArray(resumo.por_tipo) ? resumo.por_tipo : [];
      const lista = Array.isArray(resumo.lista) ? resumo.lista : [];

      extra += '<h3>Alertas por tipo e gravidade</h3>' + tabela(
        ['Tipo', 'Gravidade', 'Status', 'Total'],
        porTipo.map(x => `<tr><td>${esc(nomeRegra(x.tipo_alerta))}</td><td>${esc(x.gravidade || '—')}</td><td>${esc(x.status || '—')}</td><td>${esc(x.total)}</td></tr>`),
        'Nenhum alerta no período.'
      );

      if (lista.length) {
        extra += '<h3>Alertas do período (50 mais recentes)</h3>' + tabela(
          ['Tipo', 'Início', 'Fim', 'Status', 'Valor'],
          lista.map(x => `<tr><td>${esc(nomeRegra(x.tipo_alerta))}</td><td>${dataHora(x.timestamp_inicio)}</td><td>${dataHora(x.timestamp_fim)}</td><td>${esc(x.status || '—')}</td><td>${valido(x.valor_detectado) ? num(x.valor_detectado, 2) : '—'}</td></tr>`)
        );
      }
    }

    if (r.tipo_relatorio === 'DISPOSITIVOS_OFFLINE') {
      const lista = Array.isArray(resumo.lista) ? resumo.lista : [];

      extra += `<h3>Indisponibilidade</h3><div class="grade">
        ${card('Ocorrências', esc(resumo.total ?? '—'))}
        ${card('Tempo total', un(resumo.minutos_totais, 'min', 0))}
        ${card('Tempo médio', un(resumo.minutos_medios, 'min', 0))}</div>`;

      if (lista.length) {
        extra += tabela(
          ['Início', 'Fim', 'Duração', 'Status'],
          lista.map(x => `<tr><td>${dataHora(x.timestamp_inicio)}</td><td>${dataHora(x.timestamp_fim)}</td><td>${un(x.duracao_minutos, 'min', 0)}</td><td>${esc(x.status || '—')}</td></tr>`)
        );
      }
    }

    $('#dlgc').innerHTML = `<div class="detalhe"><h2>Relatório de ${esc(TIPOS_REL[r.tipo_relatorio] || r.tipo_relatorio)}</h2>
      <p>${esc(r.Sala?.nome || nomeSala(ss, r.id_sala))} · ${esc(PERIODICIDADES[r.periodicidade] || 'Personalizado')}: ${dia(r.periodo_inicio)} a ${dia(r.periodo_fim)} · gerado em ${dataHora(r.gerado_em)}</p>
      <div class="grade">${card('Consumo total', un(r.consumo_total_kWh, 'kWh', 2))}${card('Anomalias encontradas', esc(r.anomalias_detectadas ?? '—'))}${card('Custo estimado', valido(r.custo_estimado) ? 'R$ ' + num(r.custo_estimado, 2) : '—')}</div>
      <h3>Resumo de desperdício</h3>${tabela(['Indicador', 'Valor'], desperdicio.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`))}
      ${extra}
      <h3>Picos de consumo</h3>${tabela(['Hora (UTC)', 'Potência máxima'], p.map(x => `<tr><td>${esc(String(x.hora).slice(8, 10))}/${esc(String(x.hora).slice(5, 7))} ${esc(String(x.hora).slice(11, 16))}</td><td>${un(x.potencia_maxima_W, 'W')}</td></tr>`), 'Nenhum pico registrado no período.')}
      <div class="acoes"><button data-a="pdf" data-id="${esc(r.id_relatorio)}">Baixar PDF</button><button data-a="fechar">Fechar</button></div></div>`;

    $('#dlg').showModal();
  }
```

#### 3) Download do PDF confiável

Revogar a URL no mesmo tick do `click()` pode cancelar o download no Firefox e no Safari. O link agora é anexado ao DOM e a URL só é revogada após o navegador iniciar o download.

A função `baixarPdf` também trata os erros de autorização e conexão:

```js
  async function baixarPdf(id) {
    try {
      const resposta = await fetch(`${API_URL}/api/relatorios/${encodeURIComponent(id)}/pdf`, {
        headers: { Authorization: `Bearer ${Sessao.token()}` }
      });

      if (resposta.status === 401) {
        Sessao.limpar();
        location.href = 'login.html';
        return;
      }

      if (!resposta.ok) {
        if (resposta.status === 404) throw new Error('Relatório não encontrado.');
        if (resposta.status === 403) throw new Error('Acesso negado a este relatório.');
        throw new Error('Não foi possível gerar o PDF do relatório.');
      }

      const url = URL.createObjectURL(await resposta.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `ecovolt-relatorio-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      if (err instanceof TypeError) throw new Error('Não foi possível conectar à API.');
      throw err;
    }
  }
```

#### 4) `apiFetch` envia `Content-Type` apenas com corpo

`Content-Type: application/json` em GET pode fazer o navegador enviar um `OPTIONS` antes de cada chamada. O cabeçalho agora é enviado apenas quando há corpo na requisição.

A implementação em `js/api.js` cria os cabeçalhos assim:

```js
const headers = { ...(opcoes.headers || {}) };
if (opcoes.body != null) headers['Content-Type'] = 'application/json';
```

### Ajustes de relatórios implementados

#### 5) Formulário de relatórios preserva os filtros

Depois de gerar o relatório, `relPg()` redesenha a página. Os valores do formulário são restaurados antes de abrir o detalhe:

```js
      else if (f.id === 'frel') {
        const valores = Object.fromEntries(new FormData(f));
        const c = { id_sala: Number(valores.id_sala), tipo_relatorio: valores.tipo_relatorio, periodicidade: valores.periodicidade };

        if (c.periodicidade === 'PERSONALIZADO') {
          c.periodo_inicio = valores.periodo_inicio;
          c.periodo_fim = valores.periodo_fim;
          if (c.periodo_inicio > c.periodo_fim) return aviso('A data inicial não pode ser posterior à final.');
        } else if (valores.data_referencia) {
          c.data_referencia = valores.data_referencia;
        }

        const r = await apiFetch('/api/relatorios', { method: 'POST', body: JSON.stringify(c) });

        aviso('Relatório gerado.', 'ok');
        await relPg();

        const nf = $('#frel');
        Object.entries(valores).forEach(([k, v]) => { if (nf.elements[k] && v) nf.elements[k].value = v; });
        nf.periodicidade.dispatchEvent(new Event('change'));

        detalheRel(r, salasG);
      }
```

#### 6) Configuração de ambiente centralizada

O cálculo de `ehLocal` fica em `js/config.js`, compartilhado pelo login e pelo painel, evitando divergência entre as páginas:

```js
const ehLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_URL = window.ECOVOLT_API_URL || (ehLocal ? 'http://localhost:3000' : 'https://ecovolt-api.onrender.com');
```

E remover os dois `<script>` inline.

### Melhorias de interface implementadas

#### 7) Estado de carregamento do botão PDF

O botão fica desabilitado enquanto o arquivo é solicitado, evitando downloads duplicados por duplo clique.


#### 8) Coluna de desperdício no histórico de relatórios

O histórico exibe `desperdicio_kWh` do `resumo` junto com os demais indicadores.


#Todas as pendências listadas anteriormente foram implementadas: sustentabilidade, detalhes e histórico dos relatórios, download do PDF, cabeçalhos das requisições e preservação dos filtros.

## Solução de problemas

| Sintoma | Verificação |
|---|---|
| Não foi possível conectar à API | Confirme que `npm run dev` continua em execução e teste `http://localhost:3000/api/teste`. |
| Erro 503 ao entrar | Confira se `JWT_SECRET` está definido no `.env` da API. |
| `Access denied` ou `ECONNREFUSED` ao iniciar a API | Confira `DB_PASSWORD` e se o MySQL está ligado. |
| `Unknown database 'ecovolt'` | Crie o banco conforme a etapa de preparação. |
| Tela sem estilos ou scripts | Abra `login.html` usando Live Server na pasta `ecovolt-frontend`; confirme que `css/` e `js/` estão presentes. |
| `npm` não encontra `package.json` | Execute os comandos da API a partir de `ecovolt-api`. |
