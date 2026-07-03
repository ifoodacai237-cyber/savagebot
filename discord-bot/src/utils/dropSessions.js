// Drops ativos em memória — limpos automaticamente após resgate ou expiração

const drops = new Map();
let _counter = 0;

/**
 * Cria um drop e retorna seu ID único.
 * @param {{ guildId, tipo, quantidade?, roleId?, roleName?, descricao, titulo? }} opts
 */
export function createDrop({ guildId, tipo, quantidade, roleId, roleName, descricao, titulo }) {
  const id = `${Date.now()}_${++_counter}`;
  drops.set(id, {
    guildId,
    tipo,               // 'coins' | 'cargo' | 'personalizado'
    quantidade: quantidade ?? null,
    roleId:     roleId  ?? null,
    roleName:   roleName ?? null,
    descricao:  descricao ?? null,
    titulo:     titulo  ?? null,
    claimed:    false,
    claimedBy:  null,
    claimedAt:  null,
  });

  // Auto-expiração após 24 h para evitar memory leak
  setTimeout(() => drops.delete(id), 24 * 60 * 60 * 1000);

  return id;
}

export function getDrop(id) {
  return drops.get(id) ?? null;
}

/**
 * Tenta marcar o drop como resgatado. Retorna true se foi o primeiro a resgatar.
 */
export function claimDrop(id, userId) {
  const drop = drops.get(id);
  if (!drop || drop.claimed) return false;
  drop.claimed   = true;
  drop.claimedBy = userId;
  drop.claimedAt = new Date();
  return true;
}
