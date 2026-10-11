# EcoVolt — Front-end

Painel web do EcoVolt em HTML, CSS e JavaScript puro, com Chart.js (já incluído em `js/vendor/`, não precisa de internet).

O front só conversa com a API REST. Ele não acessa o MySQL, não calcula consumo e não cria regras de anomalia.

## Como rodar

Tudo é feito em **uma única janela do VS Code**.

### Antes de começar (uma vez)

1. Crie o banco no MySQL Workbench:
   ```sql
   CREATE DATABASE ecovolt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Instale a extensão **Live Server** (Ritwick Dey) no VS Code.
3. Configure a API: dentro de `ecovolt-api`, copie `.env.example` para `.env` e preencha:
   - `DB_PASSWORD`: a senha do usuário `root` do MySQL;
   - `JWT_SECRET`: qualquer texto longo (sem ele o login responde erro 503).
4. No terminal, dentro de `ecovolt-api`:
   ```bash
   npm install
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```
   O seed cria o usuário administrador, 2 salas, 2 dispositivos, sensores e os dados fictícios do ESP32 (20 leituras por sala). Os horários das leituras são relativos ao momento em que o seed roda, então rode-o perto do dia da demonstração.

### Toda vez que for usar

1. No VS Code, abra a pasta **`EcoVolt`** (a que contém `ecovolt-api` e `ecovolt-frontend1`).
2. Abra o terminal do VS Code (`` Ctrl+` ``) e inicie a API:
   ```bash
   cd ecovolt-api
   npm run dev
   ```
   Deve aparecer `API rodando na porta 3000`. **Deixe esse terminal aberto**: se ele for fechado, a API para.
3. No painel da esquerda, abra `ecovolt-frontend1`, clique com o botão direito em **`login.html`** e escolha **Open with Live Server**.
4. O navegador abre em `http://127.0.0.1:5500/login.html`. O arquivo `.vscode/settings.json` já faz o Live Server usar `ecovolt-frontend1` como raiz.
5. Entre com o usuário do seed:
   - e-mail: `admin@ecovolt.ifrn.edu.br`
   - senha: `123456`

Para encerrar, feche o terminal da API (ou aperte `Ctrl+C` nele) e pare o Live Server em *Port: 5500* na barra inferior.

### Se algo der errado

| Sintoma | Causa provável |
|---|---|
| "Não foi possível conectar à API" | A API não está rodando. Confira se o terminal com `npm run dev` está aberto e se `http://localhost:3000/api/teste` abre no navegador. |
| Login sem estilo ou botão sem efeito | As pastas `css` e `js` não estão dentro de `ecovolt-frontend1`, ou algum arquivo está com o nome ou conteúdo trocado. |
| Aparece o texto de um `.md` em vez da tela | O Live Server abriu o arquivo errado. Abra o `login.html`. |
| Erro 503 ao entrar | Falta o `JWT_SECRET` no `.env`. |
| `Access denied` ou `ECONNREFUSED` ao iniciar a API | `DB_PASSWORD` incorreta ou MySQL desligado. |
| `Unknown database 'ecovolt'` | O banco ainda não foi criado. |
| "Muitas requisições" no login | O login permite 10 tentativas a cada 15 minutos. Aguarde. |
| `npm` não encontra `package.json` | O terminal não está dentro de `ecovolt-api`. |

Se a API rodar em outro endereço ou porta, altere **somente** `API_URL` em `js/config.js`.

## Estrutura

```
index.html        painel (visão geral, salas, alertas, configurações, relatórios)
login.html        tela de login
css/style.css     estilos
js/config.js      URL da API (única) e flag de filtro de alertas por período
js/api.js         sessão, apiFetch (token e erros 401/403/429/500) e nomes amigáveis
js/app.js         páginas do painel
js/vendor/        Chart.js 4.4.1
```

## Para ver alertas na tela (opcional)

O seed não cria alertas. Eles surgem quando o ESP32 envia leituras (`POST /api/leituras`) com o token do dispositivo. Os dispositivos do seed ainda não têm token. Para gerar um (aparece uma única vez):

```bash
cd ecovolt-api
node scripts/gerar-token.js 1     # 1 = id do dispositivo
```

O seed só traz configurações de alerta para a **Sala 101**. Para o Lab. Informática, cadastre pela tela "Configuração de alertas".

## O que o front cumpre do escopo

- A URL da API fica só em `js/config.js`.
- O token JWT fica em `sessionStorage`, é enviado como `Authorization: Bearer …` e é removido no logout. Erro 401 volta ao login, 403 mostra "acesso negado", 429 pede para aguardar e 500 mostra mensagem amigável (o detalhe fica só no console).
- Nunca exibe `token_hash`, `senha_hash` nem token de dispositivo. O MAC aparece só como identificação física.
- O perfil só esconde ou mostra botões (criar e editar configurações: ADMIN/ADMINISTRADOR; encerrar alerta: ADMIN/ADMINISTRADOR/TECNICO). A autorização real é da API.
- As regras R1 a R8 aparecem com nomes amigáveis e os alertas ABERTOS ficam em destaque.
- No relatório, o usuário informa só sala, tipo, data inicial e final.
- Os valores aparecem sempre com unidade (W, kWh, s, %).

## Diferenças entre o PDF e a API real

O front segue a API.

| PDF | API real |
|---|---|
| Login `admin@ecovolt.com` | `admin@ecovolt.ifrn.edu.br` (seed) |
| Dispositivo: `nome`, `intervalo_leitura_segundos` | `identificador`, `intervalo_envio_segundos` |
| `status_operacao`: ONLINE ou OFFLINE | Também `INATIVO` (token revogado), exibido em cinza |
| `GET /api/leituras` devolve uma lista | Devolve `{ dados, total, limite, offset }` |
| Alertas filtráveis por período e por status | Filtros `data_inicio`/`data_fim` e `status=TODOS` implementados (sem `status`, assume `ABERTO`) |

## Ajustes necessários no front-end

A API já entrega os campos e filtros que estavam pendentes, inclusive `sensores` por sala (`nome`, `tipo`, `modelo`, `unidade_medida`, `status`). Para o front consumir o que é novo, faltam estes ajustes:

| Onde | Ajuste |
|---|---|
| `GET /api/salas/:id/consumo-hora` | Passar `data_inicio` e `data_fim` (ex.: o dia de hoje) para o gráfico virar "consumo de hoje por hora". Sem parâmetros, a rota soma todo o histórico. |
| Tela de alertas | Adicionar a opção "Todos" no `<select name="status">`: `status=TODOS` desativa o filtro de status (sem `status`, a API assume `ABERTO`). |
| `js/config.js` | Trocar `API_SUPORTA_PERIODO_ALERTAS` para `true`: a API já aceita `data_inicio`/`data_fim` (dias inclusivos, em UTC). |
| Banner de status | A API agora envia `status_operacao` em `GET /api/salas`; o aviso "status indisponível" só deve aparecer quando o campo não vier. |

Já ajustado: `maxlength` da unidade em `app.js` (20 caracteres, igual ao schema da API).