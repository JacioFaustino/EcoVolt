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

## Configuração de alertas: comportamento esperado da tela

O formulário de configuração mostra hoje os mesmos campos para todas as regras. No back-end, vários campos **não têm efeito** em determinadas regras (o valor é salvo, mas nunca influencia o alerta), e o buzzer existe **somente na R3A**. Esconder ou desabilitar esses campos evita que o usuário configure algo que nunca vai acontecer.

### 1) Buzzer: somente na R3A_PORTA_ABERTA

`acionar_buzzer` e `duracao_buzzer_segundos` só têm efeito na regra **R3A_PORTA_ABERTA** — é ela que liga o buzzer enquanto a porta está aberta e o consumo está acima do limite.

- **R3B_PORTA_ABERTA_PERSISTENTE:** não exibir as opções de buzzer. Quando a R3B dispara, quem desliga o buzzer é o back-end, automaticamente (comparação R3A × R3B); não existe campo para isso.
- **R1, R2, R4, R5, R6, R7 e R8:** não exibir as opções de buzzer. Ao criar ou editar uma configuração dessas, enviar `acionar_buzzer: false` e `duracao_buzzer_segundos: 0`.

> Para quem mexer no back-end: tecnicamente a API emitiria o comando se `acionar_buzzer` viesse `true` nessas regras, mas o buzzer do projeto é exclusivo da porta aberta — por isso o front não deve oferecer a opção.

### 2) Campos sem efeito por regra (ocultar no formulário)

| Regra | Não exibir | Continuam valendo |
|---|---|---|
| R1_CONSUMO_FORA_HORARIO | buzzer | limite (W), unidade, persistência |
| R2_AR_FORA_HORARIO | buzzer | limite (W), unidade, persistência |
| R3A_PORTA_ABERTA | — (usa tudo) | limite (W), unidade, persistência, buzzer |
| R3B_PORTA_ABERTA_PERSISTENTE | buzzer | limite (W), unidade, persistência |
| R4_SOBRECARGA | limite, unidade e buzzer | persistência |
| R5_PADRAO_HISTORICO | persistência e buzzer | limite (nº de desvios), unidade |
| R6_LIMITE_DIARIO | persistência e buzzer | limite (kWh do dia), unidade |
| R7_DISPOSITIVO_OFFLINE | persistência e buzzer | limite (nº de intervalos), unidade |
| R8_FALHA_LEITURA | buzzer | limite (% mínimo), unidade, persistência |

Na **R4**, em vez do campo de limite, exibir uma observação somente leitura, por exemplo: "A R4 usa a capacidade elétrica cadastrada na sala."

Na **lista** de configurações, exibir "—" nos campos que a regra não usa (hoje ela mostra valores que não têm efeito, o que confunde).

### 3) O que cada "limite" significa (evita unidade errada)

| Regra | `valor_limite` representa | Unidade sugerida |
|---|---|---|
| R1, R2, R3A, R3B | potência (W) a partir da qual o ar-condicionado é considerado ligado | `W` |
| R4 | não é usado (vem da capacidade da sala) | — |
| R5 | quantos desvios padrão acima da média histórica | `DESVIOS_PADRAO` |
| R6 | consumo máximo do dia | `kWh` |
| R7 | quantos intervalos de envio sem contato indicam offline | `INTERVALOS` |
| R8 | qualidade mínima aceitável do sinal | `%` |

### 4) R3A e R3B são um par

As duas precisam existir e estar ativas: a R3A liga o buzzer; a R3B registra o alerta persistente se a porta continuar aberta depois de `tempo_persistencia_segundos` da R3A **+** o tempo da própria R3B. A tela não deve tratar as duas como regras independentes (não sugerir cadastrar ou desativar só uma).

### 5) `acao_automatica`: não prometer o que não existe

O campo é salvo, mas **nenhuma ação é executada** pela API hoje — não há sistema de notificação/e-mail implementado, então opções como "Notificar administrador" não acontecem de fato. Remover o campo do formulário (e exibir "—" na lista) ou, se a equipe preferir mantê-lo como anotação, deixar explícito que é informativo e ainda não executado.

## Custos em R$ (campos novos da API)

> **Divisão de responsabilidade:** o cálculo do custo é do **back-end**. O front só formata e exibe.
> Isso mantém a regra do projeto (`app.js`): "sem SQL, sem regras de anomalia, sem cálculos de negócio".
> A tarifa (R$/kWh) é configurada no servidor pela variável de ambiente `TARIFA_KWH` — não existe no front.

### Campos que a API passa a devolver

| Rota | Campo novo | Significado |
|---|---|---|
| `GET /api/salas` | `custo_dia_reais` | custo do consumo de hoje (dia UTC) |
| `GET /api/salas` | `custo_mes_reais` | custo do consumo do mês corrente |
| `GET /api/salas` | `tarifa_kwh` | tarifa usada no cálculo (para exibir a legenda) |
| `GET /api/salas/:id/consumo-hora` | `custo_reais` | custo da energia daquela hora |
| `GET/POST /api/relatorios` | `custo_estimado` | já existia na API; antes vinha sempre `null`, agora é calculado |

Comportamento quando a tarifa **não** está configurada no servidor: os campos vêm `null` (o front mostra `—`, nunca `R$ 0,00`).

### Regras de exibição

- Formatar sempre como `'R$ ' + num(valor, 2)` — o `num` de `js/api.js` já usa o padrão pt-BR (vírgula decimal).
- Se o campo não vier, mostrar `—` (usar o helper `valido`).
- Exibir **uma vez por tela** a legenda da tarifa, porque o valor é estimado:

  > Custos estimados com tarifa de R$ 0,95/kWh, sem impostos nem bandeiras tarifárias.

- Nunca recalcular: se precisar de um valor novo (total do dia, custo por hora), pedir o campo à API.

### O que falta fazer no front

| Onde | Ajuste |
|---|---|
| `js/app.js` → helper novo | Adicionar `notaTarifa` (código abaixo) e usar nas telas de Visão geral, Salas e detalhe da sala |
| `js/app.js` → `dashboard()` | Novo card "Custo estimado do dia" (soma de `custo_dia_reais` das salas) |
| `js/app.js` → `salasPg()` | Nova coluna "Custo do dia" na tabela (entre "Consumo do dia" e "Funcionamento") |
| `js/app.js` → `salaPg(id)` | Novos cards "Custo diário" e "Custo mensal" na grade do topo |
| Relatórios | Nada a fazer: o card "Custo estimado" já existe e passa a sair de `—` automaticamente |

Helper a adicionar em `js/app.js`, logo depois do `const dispInfo = ...`:

```js
  // Legenda da tarifa usada no cálculo de custo (o valor vem da API, não do front).
  const notaTarifa = ss => {
    const t = ss.map(s => s.tarifa_kwh).find(valido);
    return valido(t) ? `<p class="banner">Custos estimados com tarifa de R$ ${num(t, 2)}/kWh, sem impostos nem bandeiras tarifárias.</p>` : '';
  };
```

Uso nas telas: acrescentar `${notaTarifa(ss)}` logo depois de `${dispInfo(ss)}` no `main.innerHTML` do dashboard e da lista de salas (no detalhe da sala, `${notaTarifa([s])}`).

Card no dashboard:

```js
      ${card('Custo estimado do dia', custo.length ? 'R$ ' + num(custo.reduce((a, b) => a + b, 0), 2) : '—')}
```

(com `const custo = nums('custo_dia_reais');` junto dos outros `nums(...)`)

Coluna na tabela de salas — acrescentar `'Custo do dia'` no cabeçalho, depois de `'Consumo do dia'`, e a célula correspondente:

```js
          <td>${valido(s.custo_dia_reais) ? 'R$ ' + num(s.custo_dia_reais, 2) : '—'}</td>
```

Cards no detalhe da sala, depois do card de consumo mensal:

```js
      ${card('Custo diário', valido(s.custo_dia_reais) ? 'R$ ' + num(s.custo_dia_reais, 2) : '—')}
      ${card('Custo mensal', valido(s.custo_mes_reais) ? 'R$ ' + num(s.custo_mes_reais, 2) : '—')}
```

### Como conferir

1. **API** (requer a variável `TARIFA_KWH` no `.env` local ou no painel do Render):

   ```bash
   curl -H "Authorization: Bearer SEU_JWT" http://localhost:3000/api/salas
   ```

   Cada sala deve trazer `consumo_dia_kWh`, `custo_dia_reais`, `custo_mes_reais` e `tarifa_kwh`. Sem a variável, os campos de custo vêm `null` — e é esperado que a tela mostre `—` em vez de erro.

2. **Tela:** com tarifa configurada, aparecem a legenda, o card "Custo estimado do dia" e as colunas/cards de custo. Sem tarifa configurada, tudo continua funcionando e mostrando `—`.




## Relatórios: periodicidade e PDF

A API passou a aceitar **periodicidade** e a gerar **PDF no servidor**.

### O que mudou no `POST /api/relatorios`

| Campo | Valores | Observação |
|---|---|---|
| `periodicidade` | `DIARIO`, `SEMANAL`, `MENSAL`, `ANUAL`, `PERSONALIZADO` | padrão `PERSONALIZADO` |
| `data_referencia` | `YYYY-MM-DD` | opcional; define o dia/semana/mês/ano. Sem ela, usa hoje |
| `periodo_inicio` / `periodo_fim` | `YYYY-MM-DD` | obrigatórios **só** quando `PERSONALIZADO` |

Quando a periodicidade não é `PERSONALIZADO`, a API calcula o período e o devolve preenchido na resposta — o front **não** calcula datas.

- Semana = segunda a domingo.
- Todas as datas são tratadas em UTC (mesma convenção do restante da API).

### PDF

```http
GET /api/relatorios/:id/pdf
Authorization: Bearer JWT_DO_USUARIO
```

Resposta: `application/pdf` com `Content-Disposition: attachment`.

Como o download exige o header `Authorization`, um `<a href>` simples **não funciona**. Use `fetch` + `blob`:

```js
async function baixarPdf(id) {
  const resposta = await fetch(`${API_URL}/api/relatorios/${encodeURIComponent(id)}/pdf`, {
    headers: { Authorization: `Bearer ${Sessao.token()}` }
  });

  if (!resposta.ok) throw new Error('Não foi possível gerar o PDF.');

  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ecovolt-relatorio-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

Botões a acrescentar:
- na tabela de histórico, ao lado de "Detalhes": `<button data-a="pdf" data-id="...">PDF</button>`;
- no diálogo de detalhes, junto de "Fechar".

No handler de cliques:

```js
else if (a === 'pdf') await baixarPdf(b.dataset.id);
```

### Formulário

Acrescentar um `<select name="periodicidade">` com as cinco opções. Quando `PERSONALIZADO` estiver selecionado, mostrar os campos de data inicial/final (e marcar `required`); nas demais, mostrar apenas `data_referencia` (opcional) e esconder as duas datas.

Ao montar o corpo do POST:
- `PERSONALIZADO`: enviar `periodicidade`, `periodo_inicio`, `periodo_fim`;
- demais: enviar `periodicidade` e, se preenchida, `data_referencia`.

### Histórico

A listagem agora traz `periodicidade` e `resumo` (JSON em texto). Mostrar a periodicidade na coluna "Período" ajuda a leitura:

```js
`${PERIODICIDADES[r.periodicidade] || 'Período'}: ${dia(r.periodo_inicio)} a ${dia(r.periodo_fim)}`
```