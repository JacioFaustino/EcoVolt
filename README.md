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

### Autenticação de usuários

#### Login

```http
POST /api/auth/login
```

Realiza o login de um usuário da plataforma.

**Corpo da requisição:**

```json
{
  "email": "admin@ecovolt.ifrn.edu.br",
  "senha": "123456"
}
```

**Resposta de sucesso:**

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

O token retornado deve ser enviado nas rotas protegidas usando o cabeçalho:

```http
Authorization: Bearer JWT_DO_USUARIO
```

---

### Teste da API

#### Verificar conexão com o banco

```http
GET /api/teste
```

Verifica se a API consegue se conectar ao banco de dados.

**Resposta de sucesso:**

```json
{
  "mensagem": "Conectado ao banco via Sequelize!"
}
```

---

### Leituras do ESP32

#### Registrar leitura

```http
POST /api/leituras
```

Recebe e registra os dados enviados pelo ESP32.

Essa rota exige o token específico do dispositivo:

```http
Authorization: Bearer TOKEN_DO_DISPOSITIVO
```

**Corpo da requisição:**

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

O campo `estado_porta` aceita somente:

```text
ABERTA
FECHADA
```

A API armazena os dados elétricos na tabela `leitura` e o estado da porta na tabela `estado_porta`.

A API também verifica se o sensor pertence ao dispositivo autenticado.

**Resposta de sucesso:**

```http
201 Created
```

**Possíveis respostas de erro:**

| Código | Descrição                          |
| ------ | ---------------------------------- |
| `400`  | Dados inválidos ou JSON malformado |
| `401`  | Token ausente ou inválido          |
| `403`  | Sensor não pertence ao dispositivo |
| `429`  | Muitas requisições em pouco tempo  |
| `500`  | Erro interno do servidor           |

---

### Salas e consumo

#### Listar salas

```http
GET /api/salas
```

Lista as salas cadastradas e apresenta a última leitura disponível de cada ambiente.

Essa rota exige autenticação de usuário:

```http
Authorization: Bearer JWT_DO_USUARIO
```

#### Consultar consumo por hora

```http
GET /api/salas/:id/consumo-hora
```

Consulta o consumo agrupado por hora de uma sala.

**Exemplo:**

```http
GET /api/salas/3/consumo-hora
```

**Resposta de exemplo:**

```json
[
  {
    "hora": 8,
    "consumo_kWh": 4.2
  },
  {
    "hora": 9,
    "consumo_kWh": 5.8
  }
]
```

---

### Dispositivos(entidade para cada ESP32)

As rotas de dispositivos exigem autenticação de usuário.

#### Listar dispositivos

```http
GET /api/dispositivos
```

Lista os dispositivos cadastrados.

O campo `token_hash` nunca é retornado pela API.

#### Cadastrar dispositivo

```http
POST /api/dispositivos
```

Cadastra um ESP32 e gera um token exclusivo para ele.

**Corpo da requisição:**

```json
{
  "id_sala": 3,
  "identificador": "ESP32-SALA102",
  "mac_address": "AA:BB:CC:DD:EE:03",
  "modelo": "ESP32 DevKit",
  "intervalo_envio_segundos": 2
}
```

**Resposta de sucesso:**

```json
{
  "dispositivo": {
    "id_dispositivo": 9,
    "id_sala": 3,
    "identificador": "ESP32-SALA102",
    "mac_address": "AA:BB:CC:DD:EE:03",
    "modelo": "ESP32 DevKit",
    "intervalo_envio_segundos": 2,
    "status_operacao": "ONLINE"
  },
  "token": "TOKEN_DO_DISPOSITIVO"
}
```

O token original deve ser copiado e armazenado no firmware do ESP32. O banco de dados armazena somente o hash do token.

#### Gerar novo token

```http
POST /api/dispositivos/:id/gerar-token
```

Gera um novo token para o dispositivo e invalida o token anterior.

**Exemplo:**

```http
POST /api/dispositivos/9/gerar-token
```

#### Revogar token

```http
POST /api/dispositivos/:id/revogar-token
```

Revoga o token do dispositivo e desativa o equipamento.

**Exemplo:**

```http
POST /api/dispositivos/9/revogar-token
```

Depois da revogação, o dispositivo não poderá mais enviar leituras à API.

---

### Alertas

#### Listar alertas abertos

```http
GET /api/alertas
```

Lista os alertas que estão com status `ABERTO`.

#### Filtrar alertas

```http
GET /api/alertas?gravidade=ALTA
```

Filtros disponíveis:

```text
status
gravidade
tipo_alerta
id_sala
```

**Exemplo:**

```http
GET /api/alertas?id_sala=3&gravidade=ALTA
```

#### Consultar alerta específico

```http
GET /api/alertas/:id
```

**Exemplo:**

```http
GET /api/alertas/1
```

#### Encerrar alerta

```http
PATCH /api/alertas/:id/encerrar
```

Altera o status do alerta para `FECHADO` e registra o horário de encerramento.

**Exemplo:**

```http
PATCH /api/alertas/1/encerrar
```

---

### Autenticação das rotas

As rotas da plataforma web utilizam o token JWT do usuário:

```http
Authorization: Bearer JWT_DO_USUARIO
```

A rota utilizada pelo ESP32 utiliza o token específico do dispositivo:

```http
Authorization: Bearer TOKEN_DO_DISPOSITIVO
```

Os tokens de usuários e dispositivos possuem finalidades diferentes e são validados por middlewares separados.

---

### Códigos HTTP utilizados

| Código | Significado                            |
| ------ | -------------------------------------- |
| `200`  | Requisição processada com sucesso      |
| `201`  | Registro criado com sucesso            |
| `400`  | Dados enviados são inválidos           |
| `401`  | Autenticação ausente ou inválida       |
| `403`  | Usuário ou dispositivo sem permissão   |
| `404`  | Registro não encontrado                |
| `429`  | Limite de requisições excedido         |
| `500`  | Erro interno do servidor               |
| `503`  | Serviço ou banco de dados indisponível |

---

## 👥 Equipe

- Jacio Faustino de Souza
- João Victor Ferreira do Nascimento
- Joyce Karenyne Ayres da Costa
- Kalyne Maryeli Brilhante Carlos

**Orientador:** Prof. Dr. Danyel Aguiar

---

## 🏫 Instituição

Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte  
Campus Santa Cruz – Curso Técnico em Informática – 2026
