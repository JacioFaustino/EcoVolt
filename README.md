# ⚡EcoVolt
**Sistema IoT de monitoramento de consumo de energia elétrica em salas de aula, com ESP32, API Node.js e dashboard web.**

Projeto de Trabalho de Conclusão de Curso do Curso Técnico em Informática do **IFRN – Campus Santa Cruz**.

O EcoVolt é um sistema baseado em Internet das Coisas (IoT) que monitora o consumo de energia elétrica em salas de aula e laboratórios. Os dados são coletados por sensores conectados a um microcontrolador ESP32, armazenados em um banco de dados e apresentados em uma plataforma web com gráficos, relatórios e alertas.

---

## 🎯 Objetivo

Fornecer à gestão do campus informações sobre o consumo de energia de cada ambiente, permitindo identificar desperdícios, como ar-condicionado ligado fora do horário ou com a porta aberta, e apoiar ações de eficiência energética.

---

## 🧩 Funcionalidades

- Monitoramento do consumo de energia por sala
- Dashboard com indicadores de consumo e custo estimado
- Detalhes por sala com gráficos de potência recente e consumo por hora
- Detecção de anomalias com regras configuráveis
- Alerta sonoro local (buzzer) quando a porta permanece aberta com o ar-condicionado ligado
- Alertas na plataforma para administradores e técnicos
- Histórico de calibração dos sensores (planejamento futuro; ainda não implementado)
- Geração de relatórios de consumo, alertas e dispositivos offline, com filtro por periodicidade e exportação em PDF
- Indicadores de sustentabilidade: energia economizada, custo evitado, CO₂ não emitido e redução de desperdício

---

## 🛠️ Tecnologias

| Camada | Tecnologias |
|---|---|
| Hardware | ESP32, sensor de corrente SCT-013, fim de curso, buzzer |
| Back-end | Node.js, Express |
| Banco de dados | MySQL |
| Front-end | HTML5, CSS3, JavaScript, Chart.js |
| Ferramentas | VS Code, MySQL Workbench, Figma, Git/GitHub |

---

## ☁️ Hospedagem (ambiente publicado)

O sistema está publicado em serviços gratuitos, dividido em três camadas:

| Camada | Serviço | Endereço |
|---|---|---|
| Banco de dados | TiDB Cloud Starter (MySQL compatível, região São Paulo) | acesso interno |
| API | Render | https://ecovolt-api.onrender.com |
| Front-end | Netlify | https://ecovolt-ifrn.netlify.app |
| Front-end | Render | https://ecovolt-front.onrender.com |

> A instância gratuita do Render hiberna após 15 minutos sem requisições; a primeira chamada depois disso pode levar cerca de 1 minuto para responder.

### Variáveis de ambiente em produção

Nenhuma credencial é versionada neste repositório. Em produção a API lê as variáveis abaixo, configuradas no painel do Render; para rodar migrations e seeds a partir da sua máquina, usa-se um arquivo `.env.producao` local (ignorado pelo Git):

| Variável | Valor |
|---|---|
| `DB_HOST` | host da instância TiDB (ex.: `gateway01.xxx.prod.aws.tidbcloud.com`) |
| `DB_PORT` | `4000` no TiDB Cloud (no MySQL local é `3306`) |
| `DB_USER` | usuário do TiDB (termina em `.root`) |
| `DB_PASSWORD` | senha do TiDB |
| `DB_NAME` | `ecovolt` |
| `DB_SSL` | `true` no TiDB Cloud (TLS obrigatório); ausente/`false` no MySQL local |
| `DB_SSL_CA` | opcional: caminho de um certificado CA, caso seja exigido |
| `JWT_SECRET` | chave de assinatura do JWT |
| `TARIFA_KWH` | tarifa em R$/kWh usada no cálculo de custo (ex.: `0.95`) |
| `FATOR_CO2_KG_KWH` | fator de emissão em kgCO₂/kWh; padrão `0.0385` (média anual do SIN, MCTI/SIRENE, ano-base 2023) |
| `NODE_ENV` | `production` |

Os valores são de conhecimento apenas de quem administra o banco, e ficam fora do repositório (arquivo `.env.producao` local e variáveis de ambiente do Render). Para desenvolvimento local continua valendo o `.env` apontando para o MySQL da máquina.

---

## 🚀 Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS)
- [MySQL](https://dev.mysql.com/downloads/) e MySQL Workbench
- VS Code com a extensão Live Server

### 1. Banco de dados

Execute no MySQL Workbench o script:

```sql
CREATE DATABASE ecovolt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. API

Configure a API seguindo os comandos na ordem:

```bash
cd ecovolt-api
cp .env.example .env
```
(No Windows, caso o comando acima não funcione, copie o arquivo .env.example manualmente e renomeie a cópia para .env.)

Abra o arquivo .env e insira a senha root do MySQL no lugar do "sua_senha_aqui":

```env

PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=ecovolt
```

Instale as dependências e crie as tabelas no SQL executando as migrations do Sequelize:
```Bash

npm install
npx sequelize-cli db:migrate
```

Para desfazer a última migration,portanto, apagando as tabelas criadas no SQL:

```bash
npx sequelize-cli db:migrate:undo
```

Se quiser inserir os dados de exemplo, execute:

```bash
npx sequelize-cli db:seed:all
```

Inicie a API:

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

### 3. Front-end

Com a API rodando (`npm run dev` no terminal do VS Code), abra a pasta `ecovolt-frontend`, clique com o botão direito em `login.html` e escolha **Open with Live Server**. O front abre em `http://127.0.0.1:5500/login.html`. O arquivo `.vscode/settings.json` configura essa pasta como raiz do Live Server. Em acesso local, a API é `http://localhost:3000`; em hospedagem, as páginas usam `https://ecovolt-api.onrender.com`. O passo a passo e as limitações atuais do painel estão em [ecovolt-frontend/README-frontend.md](ecovolt-frontend/README-frontend.md).

---

## 🔌 Endpoints da API

A API utiliza o padrão REST e troca dados no formato JSON.

A URL base durante o desenvolvimento é:

```text
http://localhost:3000
```

## 🔐 Autenticação
A API possui dois tipos de autenticação:
1. autenticação de usuários, utilizada pelo front-end;
2. autenticação de dispositivos, utilizada pelo ESP32.
### Login de usuário
```http
POST /api/auth/login
Content-Type: application/json
```
Corpo:
```json
{
  "email": "admin@ecovolt.ifrn.edu.br",
  "senha": "SUA_SENHA"
}
```
Resposta:
```json
{
  "token": "JWT_DO_USUARIO",
  "usuario": {
    "id_usuario": 1,
    "nome": "Administrador EcoVolt",
    "email": "admin@ecovolt.ifrn.edu.br",
    "perfil": "ADMIN"
  }
}
```
Nas rotas protegidas, o front-end deve enviar:
```http
Authorization: Bearer JWT_DO_USUARIO
```
### Token de dispositivo e hash
O ESP32 utiliza um token próprio para enviar leituras:
```http
Authorization: Bearer TOKEN_DO_DISPOSITIVO
```
O token original é exibido somente durante o cadastro ou a geração de um novo token. O banco armazena somente `token_hash`.
O `token_hash` nunca deve ser exibido, enviado pelo front-end ou armazenado no firmware. O `mac_address` é apenas a identificação física do dispositivo e não substitui o token.
## 🔌 Rotas e recursos
A API utiliza REST e JSON. As rotas protegidas exigem o JWT do usuário, exceto `POST /api/leituras`, que exige o token do dispositivo.
### Teste da API
```http
GET /api/teste
```
Verifica a conexão com o banco.
### Salas
```http
GET /api/salas
GET /api/salas/:id/consumo-hora
```
A primeira lista as salas com dispositivo e sensor de corrente, com a última leitura disponível e os campos `status_operacao`, `capacidade_max_W`, `horario_inicio`, `horario_fim`, `dias_funcionamento`, `estado_porta` (último estado registrado do sensor de porta), `consumo_dia_kWh`, `consumo_mes_kWh`, `pico_potencia_W` (dia e mês correntes, em UTC), `custo_dia_reais`, `custo_mes_reais`, `tarifa_kwh`, `alertas_abertos` e `sensores` (lista por sala com `nome`, `tipo`, `modelo`, `unidade_medida` e `status`). Campos de custo dependem de `TARIFA_KWH`; sem tarifa configurada, vêm como `null`.

A segunda agrupa o consumo por hora (UTC) e aceita, opcionalmente, `data_inicio` e `data_fim` no formato `YYYY-MM-DD` (dias inclusivos). Sem esses parâmetros, soma todo o histórico.
### Dispositivos
```http
GET /api/dispositivos
POST /api/dispositivos
POST /api/dispositivos/:id/gerar-token
POST /api/dispositivos/:id/revogar-token
```
O token original é retornado somente na criação ou geração de novo token. `token_hash` não deve ser retornado.
### Leituras
Para o ESP32:
```http
POST /api/leituras
```
Exemplo:
```json
{
  "id_sensor": 1,
  "corrente_rms_A": 2.5,
  "tensao_rms_V": 220,
  "potencia_ativa_W": 550,
  "fator_potencia": 0.95,
  "energia_intervalo_kWh": 0.0003,
  "energia_acumulada_kWh": 10.5,
  "timestamp": "2026-09-28T20:00:00.000Z",
  "qualidade_sinal": 100,
  "estado_porta": "FECHADA"
}
```
`estado_porta` aceita somente `ABERTA` ou `FECHADA` e é enviado junto com a leitura.

Resposta (201 Created):
```json
{
  "id_leitura": 123,
  "id_sensor": 1,
  "corrente_rms_A": 2.5,
  "tensao_rms_V": 220,
  "potencia_ativa_W": 850,
  "fator_potencia": 0.95,
  "energia_intervalo_kWh": 0.0003,
  "energia_acumulada_kWh": 10.5,
  "qualidade_sinal": 100,
  "timestamp": "2026-09-28T20:00:00.000Z",
  "comandos": [
    { "acionar_buzzer": true, "duracao_buzzer_segundos": 300 }
  ]
}
```

O campo `comandos` é o único canal de controle do buzzer físico, já que o dispositivo não possui nenhum endpoint de polling — ele só se comunica com o servidor através do próprio `POST /api/leituras`. Por isso, `comandos` é reenviado em toda leitura, sempre refletindo o estado atual da regra `R3A_PORTA_ABERTA` naquele instante (porta aberta + consumo acima do limite = `true`; caso contrário, `false`). O firmware deve tratar `acionar_buzzer` como o estado desejado no momento (ligado/desligado), não como um evento cumulativo — ou seja, receber `true` várias vezes seguidas não deve somar tempo ao buzzer, e receber `false` deve desligá-lo imediatamente.

Para consultas autenticadas pelo usuário:
```http
GET /api/leituras
GET /api/leituras/:id
```
Filtros possíveis para a listagem:
```text
id_sensor
id_sala
data_inicio
data_fim
limite
offset
```
Exemplo:
```http
GET /api/leituras?id_sala=3&limite=100&offset=0
```
### Alertas
```http
GET /api/alertas
GET /api/alertas/:id
PATCH /api/alertas/:id/encerrar
```
Filtros possíveis, conforme a implementação da API:
```text
status
gravidade
tipo_alerta
id_sala
data_inicio
data_fim
```

Sem `status`, a listagem assume `ABERTO`. `status=TODOS` desativa esse filtro. `data_inicio` e `data_fim` (`YYYY-MM-DD`, dias inclusivos, em UTC) filtram por `timestamp_inicio`.

As regras implementadas são:
```text
R1_CONSUMO_FORA_HORARIO
R2_AR_FORA_HORARIO
R3A_PORTA_ABERTA
R3B_PORTA_ABERTA_PERSISTENTE
R4_SOBRECARGA
R5_PADRAO_HISTORICO
R6_LIMITE_DIARIO
R7_DISPOSITIVO_OFFLINE
R8_FALHA_LEITURA
```
Estados possíveis:
```text
PENDENTE
ABERTO
FECHADO
```
### Configurações de alertas
```http
GET /api/configuracoes-alertas
POST /api/configuracoes-alertas
PATCH /api/configuracoes-alertas/:id
PATCH /api/configuracoes-alertas/:id/status
```
Filtro por sala:
```http
GET /api/configuracoes-alertas?id_sala=3
```
Exemplo de criação:
```json
{
  "id_sala": 3,
  "tipo_parametro": "R6_LIMITE_DIARIO",
  "valor_limite": 25,
  "unidade_medida": "kWh",
  "status": "ATIVA",
  "acionar_buzzer": false,
  "tempo_persistencia_segundos": 0,
  "duracao_buzzer_segundos": 0
}
```
### Relatórios
```http
GET /api/relatorios
GET /api/relatorios/:id
GET /api/relatorios/:id/pdf
POST /api/relatorios
```
Exemplo de geração:
```json
{
  "id_sala": 3,
  "tipo_relatorio": "CONSUMO",
  "periodicidade": "PERSONALIZADO",
  "periodo_inicio": "2026-10-01",
  "periodo_fim": "2026-10-06"
}
```
`periodicidade` aceita `DIARIO`, `SEMANAL`, `MENSAL`, `ANUAL` ou `PERSONALIZADO` (padrão). Para períodos de calendário, envie `data_referencia` opcionalmente; a API calcula `periodo_inicio` e `periodo_fim`. Para `PERSONALIZADO`, as duas datas são obrigatórias. As datas são interpretadas em UTC. O PDF é gerado pela API e seu download exige autenticação de usuário.
Tipos aceitos:
```text
CONSUMO
ALERTAS
DISPOSITIVOS_OFFLINE
```
O usuário autenticado é associado automaticamente. O cliente não deve enviar `id_usuario`, `consumo_total_kWh`, `picos_consumo`, `anomalias_detectadas` ou `gerado_em`, pois esses campos são calculados ou preenchidos pela API.

### Sustentabilidade
```http
GET /api/sustentabilidade
```
Parâmetros de query:

| Campo | Obrigatório | Valores |
|---|---|---|
| `id_sala` | não | sem ele, agrega todas as salas |
| `periodicidade` | não | `DIARIO`, `SEMANAL`, `MENSAL`, `ANUAL`, `PERSONALIZADO` (padrão `MENSAL`) |
| `data_referencia` | não | `YYYY-MM-DD` |
| `periodo_inicio` / `periodo_fim` | só em `PERSONALIZADO` | `YYYY-MM-DD` |

Regras de cálculo:

- **Desperdício**: energia das leituras da sala dentro de um alerta `R1`, `R2`, `R3A` ou `R3B`. Se dois alertas se sobrepõem, a leitura conta uma vez.
- **Comparação**: período anterior de mesma duração. Um mês em andamento é comparado com os mesmos dias do mês anterior.
- **Energia economizada**: `max(0, desperdício anterior − desperdício atual)`.
- **Custo evitado**: energia economizada × `TARIFA_KWH`.
- **CO₂ não emitido**: energia economizada × `FATOR_CO2_KG_KWH`.
- Sem leituras em um dos períodos, `comparacao_disponivel` é `false` e os campos de economia vêm `null`.

Exemplo:

```json
{
  "id_sala": 1,
  "sala": "Sala 101",
  "periodo": {
    "periodicidade": "MENSAL",
    "inicio": "2026-10-01",
    "fim_solicitado": "2026-10-31",
    "fim_considerado": "2026-10-17",
    "comparado_inicio": "2026-09-01",
    "comparado_fim": "2026-09-17",
    "dias_considerados": 17,
    "parcial": true
  },
  "consumo_kwh": 123.457,
  "desperdicio_kwh": 18.4,
  "taxa_desperdicio_percentual": 14.9,
  "periodo_anterior": { "consumo_kwh": 150, "desperdicio_kwh": 25, "total_leituras": 90 },
  "comparacao_disponivel": true,
  "energia_economizada_kwh": 6.6,
  "reducao_percentual": 26.4,
  "custo_evitado_reais": 6.27,
  "co2_nao_emitido_kg": 0.254,
  "custo_desperdicio_reais": 17.48,
  "tarifa_kwh": 0.95,
  "fator_co2_kg_kwh": 0.0385
}
```

## 📡 Códigos HTTP
| Código | Significado |
|---|---|
| 200 | Requisição processada com sucesso |
| 201 | Registro criado com sucesso |
| 400 | Dados inválidos |
| 401 | Autenticação ausente ou inválida |
| 403 | Usuário ou dispositivo sem permissão |
| 404 | Registro não encontrado |
| 429 | Limite de requisições excedido |
| 500 | Erro interno do servidor |
| 503 | Serviço ou banco indisponível |
## 👥 Equipe
- Jacio Faustino de Souza
- João Victor Ferreira do Nascimento
- Joyce Karenyne Ayres da Costa
- Kalyne Maryeli Brilhante Carlos
**Orientador:** Prof. Dr. Danyel Aguiar
## 🏫 Instituição
Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte  
Campus Santa Cruz – Curso Técnico em Informática – 2026
