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
- Dashboard com gráficos de consumo por hora, dia e mês
- Comparativo e ranking de consumo entre salas
- Detecção de anomalias com regras configuráveis
- Alerta sonoro local (buzzer) quando a porta permanece aberta com o ar-condicionado ligado
- Alertas na plataforma para administradores e técnicos
- Histórico de calibração dos sensores
- Geração de relatórios de consumo

---

## 🛠️ Tecnologias

| Camada | Tecnologias |
|---|---|
| Hardware | ESP32, sensor de corrente SCT-013, reed switch, buzzer |
| Back-end | Node.js, Express |
| Banco de dados | MySQL |
| Front-end | HTML5, CSS3, JavaScript, Chart.js |
| Ferramentas | VS Code, MySQL Workbench, Figma, Git/GitHub |

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

Abra o front-end disponível no projeto com a extensão **Live Server**, quando ele estiver configurado.

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
## 🔌 Endpoints da API
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
A primeira lista as salas com a última leitura disponível. A segunda agrupa o consumo por hora.
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
```
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
POST /api/relatorios
```
Exemplo de geração:
```json
{
  "id_sala": 3,
  "tipo_relatorio": "CONSUMO",
  "periodo_inicio": "2026-10-01",
  "periodo_fim": "2026-10-06"
}
```
Tipos aceitos:
```text
CONSUMO
ALERTAS
DISPOSITIVOS_OFFLINE
```
O usuário autenticado é associado automaticamente. O cliente não deve enviar `id_usuario`, `consumo_total_kWh`, `picos_consumo`, `anomalias_detectadas` ou `gerado_em`, pois esses campos são calculados ou preenchidos pela API.
## ⚡ Regras de dados importantes
- `capacidade_max_W` representa a capacidade elétrica máxima da sala em watts, não a quantidade de pessoas;
- `potencia_ativa_W` representa potência instantânea;
- `energia_intervalo_kWh` representa o consumo do intervalo;
- `energia_acumulada_kWh` representa o consumo acumulado;
- R5 compara o consumo total da hora atual com o histórico da mesma hora;
- R7 depende da ausência de comunicação do dispositivo e não de uma leitura individual;
- o front-end não deve acessar o banco diretamente;
- o front-end não deve implementar novamente as regras de anomalia.
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