// sql.js — executor de SQL generico do EcoVolt (TiDB na nuvem ou MySQL local)
// COMO USAR (rodando dentro da pasta ecovolt-api):
//   node sql.js                       -> modo interativo (digite o SQL, termine com ;)
//   node sql.js "SELECT * FROM sala"  -> roda e sai
//   node sql.js -f consulta.sql       -> roda o conteudo de um arquivo .sql
//   node sql.js --env .env            -> usa o banco LOCAL em vez do TiDB
//
// Por padrao le as credenciais de .env.producao (o TiDB).

const fs = require('fs');
const readline = require('readline');
const mysql = require('mysql2/promise');

const argv = process.argv.slice(2);
let arquivoEnv = '.env.producao';
let arquivoSql = null;
const sqlSolto = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--env' || a === '-e') arquivoEnv = argv[++i];
  else if (a === '--file' || a === '-f') arquivoSql = argv[++i];
  else sqlSolto.push(a);
}

if (!fs.existsSync(arquivoEnv)) {
  console.error(`Nao achei o arquivo ${arquivoEnv} nesta pasta.`);
  console.error('Rode dentro de ecovolt-api (onde ficam .env.producao e .env).');
  process.exit(1);
}

require('dotenv').config({ path: arquivoEnv });

function dividir(sql) {
  const partes = [];
  let atual = '';
  let aspas = null;

  for (const c of sql) {
    atual += c;

    if (aspas) {
      if (c === aspas) aspas = null;
    } else if (c === "'" || c === '"' || c === '`') {
      aspas = c;
    } else if (c === ';') {
      partes.push(atual);
      atual = '';
    }
  }

  if (atual.trim()) partes.push(atual);

  return partes
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== ';');
}

let conn;

async function executar(texto) {
  const instrucoes = dividir(texto);

  if (instrucoes.length === 0) return;

  for (const instrucao of instrucoes) {
    const t0 = Date.now();

    try {
      const [resultado] = await conn.query(instrucao);
      const ms = Date.now() - t0;

      if (Array.isArray(resultado)) {
        if (resultado.length === 0) {
          console.log(`  (${ms} ms) 0 linhas`);
        } else {
          console.table(resultado);
          console.log(`  (${ms} ms) ${resultado.length} linha(s)`);
        }
      } else {
        console.log(
          `  (${ms} ms) OK - linhas afetadas: ${resultado.affectedRows ?? 0}` +
            (resultado.insertId ? `, id inserido: ${resultado.insertId}` : '')
        );
      }
    } catch (erro) {
      console.log('  ERRO:', erro.sqlMessage || erro.message);
    }
  }
}

async function conectar() {
  conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.DB_SSL === 'true'
        ? { minVersion: 'TLSv1.2' }
        : undefined
  });

  console.log(
    `Conectado em ${process.env.DB_HOST} / banco ${process.env.DB_NAME} ` +
      `(credenciais de ${arquivoEnv})`
  );

  const [tabelas] = await conn.query('SHOW TABLES');
  const nomes = tabelas.map((t) => Object.values(t)[0]).sort();

  console.log(
    `Tabelas (${nomes.length}): ${nomes.join(', ') || '(nenhuma)'}\n`
  );
}

async function principal() {
  await conectar();

  const direto = arquivoSql
    ? fs.readFileSync(arquivoSql, 'utf8')
    : sqlSolto.join(' ');

  if (direto.trim()) {
    await executar(direto);
    await conn.end();
    return;
  }

  console.log('Digite o SQL (pode ser em varias linhas; termine com ;).');
  console.log('Para encerrar: sair\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sql> '
  });

  let buffer = '';
  let fila = Promise.resolve();

  const processar = async (linha) => {
    const texto = linha.trim();

    if (
      !buffer &&
      ['sair', 'exit', 'quit', '.exit'].includes(texto.toLowerCase())
    ) {
      console.log('Tchau!');
      rl.close();
      await conn.end().catch(() => {});
      process.exit(0);
    }

    buffer += (buffer ? '\n' : '') + linha;

    if (buffer.includes(';')) {
      const paraRodar = buffer;
      buffer = '';
      await executar(paraRodar);
    }

    rl.prompt();
  };

  rl.on('line', (linha) => {
    fila = fila.then(() => processar(linha));
  });

  rl.on('close', async () => {
    await fila;
    await conn.end().catch(() => {});
    process.exit(0);
  });

  rl.prompt();
}

principal().catch(async (erro) => {
  console.error('Falha na conexao:', erro.sqlMessage || erro.message);
  if (conn) await conn.end().catch(() => {});
  process.exit(1);
});