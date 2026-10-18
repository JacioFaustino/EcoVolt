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
- **Relatórios:** geração por consumo, alertas ou dispositivos offline, com periodicidade diária, semanal, mensal, anual ou personalizada; consulta de detalhes e download do PDF.

Custos usam a tarifa configurada no servidor (`TARIFA_KWH`). Quando a API não retorna um valor de custo, o painel exibe `—`; não calcula nem substitui o valor.

## Estrutura

```text
index.html        painel (visão geral, salas, alertas, configurações e relatórios)
login.html        tela de login
css/style.css     estilos
js/config.js      configuração da URL e capacidades da API
js/api.js         sessão, requisições autenticadas, erros e formatação
js/app.js         páginas, gráficos e interações do painel
js/vendor/        Chart.js local
```

## Limitações atuais

- O formulário de configurações não oculta campos sem efeito para uma regra específica.
- A API possui o endpoint de sustentabilidade, mas o painel ainda não tem uma página para ele.
- O histórico de calibração e as notificações automáticas não estão implementados no painel/API.
- O seed não cria alertas. Eles surgem com leituras enviadas por um dispositivo autenticado; dispositivos do seed precisam de um token gerado antes do uso.

## Solução de problemas

| Sintoma | Verificação |
|---|---|
| Não foi possível conectar à API | Confirme que `npm run dev` continua em execução e teste `http://localhost:3000/api/teste`. |
| Erro 503 ao entrar | Confira se `JWT_SECRET` está definido no `.env` da API. |
| `Access denied` ou `ECONNREFUSED` ao iniciar a API | Confira `DB_PASSWORD` e se o MySQL está ligado. |
| `Unknown database 'ecovolt'` | Crie o banco conforme a etapa de preparação. |
| Tela sem estilos ou scripts | Abra `login.html` usando Live Server na pasta `ecovolt-frontend`; confirme que `css/` e `js/` estão presentes. |
| `npm` não encontra `package.json` | Execute os comandos da API a partir de `ecovolt-api`. |
