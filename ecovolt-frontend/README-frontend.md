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

Para apontar para outra API, edite `js/config.js` ou acrescente um
`<script>window.ECOVOLT_API_URL = '...'</script>` antes do `js/config.js`
nas páginas.

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

## Sustentabilidade

Página com filtros de sala (incluindo "Todas as salas") e periodicidade
(diária, semanal, mensal, anual ou personalizada).

Exibe quatro indicadores calculados pela API:

- energia economizada (kWh);
- custo evitado (R$);
- CO₂ não emitido (kg);
- redução percentual do desperdício.

Abaixo, o contexto do período: consumo, desperdício identificado, taxa de
desperdício e custo do desperdício. O rodapé informa a tarifa e o fator de
emissão usados pela API.

Comportamentos:

- quando não há leituras no período anterior, `comparacao_disponivel` vem
  `false` e os cartões de economia mostram `—` com um aviso, em vez de `0`;
- `reducao_percentual` negativa é sinalizada como aumento do desperdício;
- período ainda não iniciado mostra mensagem própria.

## Relatórios

O histórico exibe sala, tipo, periodicidade com o período, consumo total,
desperdício, custo estimado, maior pico, anomalias e data de geração.

O detalhe mostra o resumo de desperdício para todos os tipos e, conforme o
tipo escolhido, tabelas adicionais:

- `ALERTAS`: agrupamento por tipo e gravidade e os 50 alertas mais recentes;
- `DISPOSITIVOS_OFFLINE`: ocorrências, tempo total e médio, e a lista de
  períodos de indisponibilidade.

O download do PDF usa `fetch` com o header `Authorization` e dispara o
download via `Blob`, já que um link direto não envia o token. O botão fica
desabilitado durante a requisição.

Ao gerar um relatório, os filtros do formulário são preservados.

## Solução de problemas

| Sintoma | Verificação |
|---|---|
| Não foi possível conectar à API | Confirme que `npm run dev` continua em execução e teste `http://localhost:3000/api/teste`. |
| Erro 503 ao entrar | Confira se `JWT_SECRET` está definido no `.env` da API. |
| `Access denied` ou `ECONNREFUSED` ao iniciar a API | Confira `DB_PASSWORD` e se o MySQL está ligado. |
| `Unknown database 'ecovolt'` | Crie o banco conforme a etapa de preparação. |
| Tela sem estilos ou scripts | Abra `login.html` usando Live Server na pasta `ecovolt-frontend`; confirme que `css/` e `js/` estão presentes. |
| `npm` não encontra `package.json` | Execute os comandos da API a partir de `ecovolt-api`. |
