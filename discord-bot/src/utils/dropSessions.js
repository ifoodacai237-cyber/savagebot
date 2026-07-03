// ─── Drops ativos ────────────────────────────────────────────────────────────

const drops    = new Map();
const pending  = new Map(); // aguardando seleção de item na gavetinha
let _counter   = 0;

// ── Drop ativo (já publicado no canal) ─────────────────────────────────────

export function createDrop(data) {
  const id = `${Date.now()}_${++_counter}`;
  drops.set(id, { ...data, claimed: false, claimedBy: null, claimedAt: null });
  setTimeout(() => drops.delete(id), 24 * 60 * 60 * 1000); // expira em 24h
  return id;
}

export function getDrop(id)  { return drops.get(id) ?? null; }

export function claimDrop(id, userId) {
  const drop = drops.get(id);
  if (!drop || drop.claimed) return false;
  drop.claimed   = true;
  drop.claimedBy = userId;
  drop.claimedAt = new Date();
  return true;
}

// ── Drop pendente (admin ainda escolhendo na gavetinha) ───────────────────

/** Chave: `${guildId}:${userId}` */
function pendingKey(guildId, userId) { return `${guildId}:${userId}`; }

export function setPending(guildId, userId, data) {
  const key = pendingKey(guildId, userId);
  pending.set(key, data);
  setTimeout(() => pending.delete(key), 5 * 60 * 1000); // expira em 5 min
}

export function popPending(guildId, userId) {
  const key = pendingKey(guildId, userId);
  const data = pending.get(key) ?? null;
  pending.delete(key);
  return data;
}
