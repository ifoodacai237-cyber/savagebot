import prisma from '../database/client.js';

// ─── Cache em memória de overrides de carta (nome/foto customizados) ─────────
// Evita bater no banco toda vez que uma carta é renderizada.
let _cache = null; // Map<playerId, { customName, customPhotoUrl }>

async function loadCache() {
  if (_cache) return _cache;
  const rows = await prisma.futPlayerOverride.findMany().catch(() => []);
  _cache = new Map(rows.map(r => [r.playerId, r]));
  return _cache;
}

export async function getOverride(playerId) {
  const cache = await loadCache();
  return cache.get(playerId) ?? null;
}

export async function getAllOverrides() {
  const cache = await loadCache();
  return [...cache.values()];
}

// Aplica um override (já carregado em cache) sobre um objeto player estático.
// Uso síncrono após garantir que o cache foi carregado (ex: no boot do bot).
export function applyOverrideSync(player) {
  if (!player || !_cache) return player;
  const ov = _cache.get(player.id);
  if (!ov) return player;
  return {
    ...player,
    name: ov.customName ?? player.name,
    customPhotoUrl: ov.customPhotoUrl ?? null,
  };
}

export async function applyOverride(player) {
  if (!player) return player;
  await loadCache();
  return applyOverrideSync(player);
}

export async function setOverride(playerId, { customName, customPhotoUrl }, updatedBy) {
  const data = {
    customName: customName ?? null,
    customPhotoUrl: customPhotoUrl ?? null,
    updatedBy,
  };
  const row = await prisma.futPlayerOverride.upsert({
    where: { playerId },
    create: { playerId, ...data },
    update: data,
  });
  const cache = await loadCache();
  cache.set(playerId, row);
  return row;
}

export async function removeOverride(playerId) {
  await prisma.futPlayerOverride.deleteMany({ where: { playerId } }).catch(() => {});
  const cache = await loadCache();
  cache.delete(playerId);
}

export async function refreshOverrideCache() {
  _cache = null;
  return loadCache();
}
