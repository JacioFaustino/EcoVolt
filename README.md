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

```
(as migrations do Sequelize em `ecovolt-api/src/migrations`)
```

### 2. API

Inicie a API:

```bash
cd ecovolt-api
cp .env.example .env
npm install
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

### 3. Front-end

Abra o front-end disponível no projeto com o **Live Server**, quando ele estiver configurado.

---

## 🔌 Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/salas` | Lista as salas com a última leitura |
| GET | `/api/salas/:id/consumo-hora` | Consumo por hora de uma sala |
| GET | `/api/alertas` | Lista os alertas registrados |
| POST | `/api/leituras` | Recebe as medições enviadas pelo ESP32 |

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
