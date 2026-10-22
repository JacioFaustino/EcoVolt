const OFFSET_MS = -3 * 60 * 60 * 1000;

const paraBrasilia = (data) => new Date(new Date(data).getTime() + OFFSET_MS);

const deBrasilia = (data) => new Date(new Date(data).getTime() - OFFSET_MS);

const meiaNoiteBrasilia = (ano, mes, dia) =>
  new Date(Date.UTC(ano, mes, dia, 3, 0, 0, 0));

function hojeBrasilia() {
  const local = paraBrasilia(new Date());

  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  );
}

module.exports = {
  OFFSET_MS,
  paraBrasilia,
  deBrasilia,
  meiaNoiteBrasilia,
  hojeBrasilia
};