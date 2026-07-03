// ─── FUT Card Cache ──────────────────────────────────────────────────────────
//
// REGRA FUNDAMENTAL: cada carta é um objeto único, autocontido, com TODOS os
// dados vindos do mesmo registro. Nome, imagem, overall e posição SEMPRE
// vêm do MESMO objeto armazenado.
//
// CHAVE PRIMÁRIA: internalId (player.id, 1-136, garantidamente único no dataset).
//   • O DB armazena `futUserCard.playerId = internalId`.
//   • `getCardByInternalId(id)` é o caminho padrão de busca a partir do DB.
//
// futggId: atributo de fonte de foto (CDN FUT.GG) — NÃO é chave primária.
//   • Pode ser compartilhado entre variantes do mesmo jogador (Base, Copa, etc.).
//   • Usar futggId como chave de lookup causaria colisões → proibido.
//
// PROIBIDO: associar informações por índice de array, posição na lista,
// comparação de nomes ou qualquer método que não seja o internalId.
//
// Estrutura obrigatória de cada carta:
// {
//   cardId:    42,              ← internalId — chave primária única
//   name:      "Marquinhos",   ← do mesmo registro
//   imageUrl:  "https://...",  ← do mesmo registro (CDN por futggId)
//   rating:    89,             ← do mesmo registro
//   position:  "CB",           ← do mesmo registro
//   nation:    "Brazil",       ← do mesmo registro
//   club:      "PSG",          ← do mesmo registro
// }

import { FUT_PLAYERS } from './futPlayers.js';

// ─── Campos obrigatórios para validação antes de renderizar ───────────────────
const REQUIRED = ['cardId', 'name', 'rating', 'position', 'nation', 'club'];

// ─── URL do CDN FUT.GG (por futggId) ─────────────────────────────────────────
// futggId é usado APENAS para URL de foto — nunca como chave de lookup.
function buildCdnUrl(futggId) {
  if (!futggId) return null;
  return `https://cdn.futgg.com/images/players/${futggId}.png`;
}

// ─── URLs de fallback (SoFIFA) para quando o CDN do FUT.GG falha ─────────────
function buildSofifaUrl(sofascoreId, year) {
  if (!sofascoreId) return null;
  const s = String(sofascoreId).padStart(6, '0');
  return `https://cdn.sofifa.net/players/${s.slice(0, 3)}/${s.slice(3)}/${year}_120.png`;
}

// ─── Constrói o objeto de carta a partir de um registro do futPlayers.js ──────
// TODOS os dados vêm de um único registro. Nenhum campo é buscado de outra fonte.
function buildCard(player) {
  if (!player || !player.id) return null;

  // internalId é a chave primária — única no dataset (1-136)
  const internalId = player.id;

  // futggId: atributo para URL de foto (pode ser null ou duplicado — não é chave)
  const futggId = player.futggId ?? null;

  return {
    // ── Chave primária: internalId (única, compatível com DB) ─────────────────
    cardId:     internalId,   // cardId = internalId para garantir unicidade
    internalId,
    id: internalId,           // alias para código legado

    // ── Atributo de foto: futggId (não é chave — pode ser duplicado) ──────────
    futggId,

    // ── Dados do jogador — TODOS do mesmo registro ────────────────────────────
    name:     player.name,
    imageUrl: buildCdnUrl(futggId),         // CDN FUT.GG; null se sem futggId
    rating:   player.ovr,
    position: player.pos,
    nation:   player.nat,
    club:     player.club,

    // ── Aliases de retrocompatibilidade (canvas usa esses nomes) ─────────────
    ovr:     player.ovr,
    pos:     player.pos,
    nat:     player.nat,

    // ── Estatísticas ─────────────────────────────────────────────────────────
    pac: player.pac,
    fin: player.fin,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    fis: player.fis,

    // ── Metadados ─────────────────────────────────────────────────────────────
    rarity:      player.rarity,
    series:      player.series,
    sofascoreId: player.sofascoreId ?? null,

    // ── Override do painel admin (apenas nome/foto) ────────────────────────────
    // cardId, rating, position, nation, club NUNCA são alterados por overrides.
    customName:     null,
    customPhotoUrl: null,

    // ── URLs de fallback (SoFIFA por sofascoreId, do mesmo registro) ──────────
    fallbackUrl1: buildSofifaUrl(player.sofascoreId, 25),
    fallbackUrl2: buildSofifaUrl(player.sofascoreId, 24),
  };
}

// ─── Cache principal ──────────────────────────────────────────────────────────
// internalId → CardObject (chave primária única)
const _byInternalId = new Map();

// futggId → primeiro CardObject com esse futggId (para exibição em loja/pacotes)
// NÃO usar para associação de dados — apenas para conveniência de exibição.
const _byFutggId = new Map();

let _initialized = false;

function ensureInit() {
  if (_initialized) return;
  _initialized = true;

  const duplicateFutggIds = new Map(); // futggId → count, para auditoria
  let loaded  = 0;
  let noFutgg = 0;

  for (const player of FUT_PLAYERS) {
    const card = buildCard(player);
    if (!card) {
      console.warn(`[FUT CACHE] ⚠️  Jogador inválido ignorado: id=${player?.id}`);
      continue;
    }

    // Registra por internalId (sempre único — nenhuma colisão possível)
    _byInternalId.set(card.internalId, card);
    loaded++;

    if (!card.futggId) {
      // Jogadores sem futggId ficam no cache com imageUrl=null
      // Serão renderizados via drawAvatar (iniciais) — nunca carta vazia
      noFutgg++;
    } else {
      // Registra por futggId apenas se ainda não existe (primeiro match ganha)
      // Colisões são esperadas e registradas para auditoria
      if (_byFutggId.has(card.futggId)) {
        duplicateFutggIds.set(
          card.futggId,
          (duplicateFutggIds.get(card.futggId) ?? 1) + 1
        );
      } else {
        _byFutggId.set(card.futggId, card);
      }
    }
  }

  console.log(
    `[FUT CACHE] ✅ Inicializado: ${loaded} cartas no cache ` +
    `| ${noFutgg} sem futggId (usarão drawAvatar) ` +
    `| ${duplicateFutggIds.size} futggIds duplicados (esperado para variantes)`
  );

  if (duplicateFutggIds.size > 0) {
    for (const [futggId, count] of duplicateFutggIds) {
      console.log(`[FUT CACHE]   futggId ${futggId} aparece ${count + 1} vezes (variantes diferentes — OK)`);
    }
  }
}

// ─── Validação obrigatória antes de renderizar ────────────────────────────────
// Retorna { valid: true } ou { valid: false, errors: [...] }
// imageUrl é opcional (player pode ter só sofascoreId ou customPhotoUrl).
export function validateCard(card) {
  if (!card) return { valid: false, errors: ['card é null/undefined'] };

  const errors = [];

  if (!card.cardId || typeof card.cardId !== 'number') {
    errors.push(`cardId inválido: ${JSON.stringify(card.cardId)}`);
  }

  if (!card.name || typeof card.name !== 'string' || !card.name.trim()) {
    errors.push(`name inválido: ${JSON.stringify(card.name)}`);
  }

  if (!card.rating || typeof card.rating !== 'number' || card.rating < 1 || card.rating > 99) {
    errors.push(`rating inválido: ${card.rating}`);
  }

  if (!card.position || typeof card.position !== 'string' || !card.position.trim()) {
    errors.push(`position inválida: ${JSON.stringify(card.position)}`);
  }

  if (!card.nation || typeof card.nation !== 'string') {
    errors.push(`nation ausente (cardId=${card.cardId})`);
  }

  if (!card.club || typeof card.club !== 'string') {
    errors.push(`club ausente (cardId=${card.cardId})`);
  }

  // Foto: pelo menos uma fonte disponível (imageUrl OU fallback OU customPhotoUrl)
  const hasPhoto = card.customPhotoUrl || card.imageUrl || card.fallbackUrl1 || card.fallbackUrl2;
  if (!hasPhoto) {
    // Não é erro fatal — drawAvatar renderiza iniciais como fallback visual
    console.warn(`[FUT CARD] ⚠️  Carta sem fonte de foto (cardId=${card.cardId}, name=${card.name}) — usará drawAvatar`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Log completo de uma carta (auditoria da cadeia de dados) ─────────────────
export function logCard(prefix, card) {
  if (!card) {
    console.warn(`[FUT CARD] ${prefix} — carta null/undefined`);
    return;
  }
  console.log(
    `[FUT CARD] ${prefix} ` +
    `| cardId: ${card.cardId} ` +
    `| name: ${card.customName ?? card.name ?? 'N/A'} ` +
    `| image: ${card.customPhotoUrl ?? card.imageUrl ?? '(drawAvatar)'} ` +
    `| rating: ${card.rating ?? 'N/A'} ` +
    `| position: ${card.position ?? 'N/A'} ` +
    `| nation: ${card.nation ?? 'N/A'} ` +
    `| club: ${card.club ?? 'N/A'}`
  );
}

// ─── Busca carta pelo internalId (caminho padrão a partir do DB) ──────────────
// REGRA: todos os dados retornados vêm do MESMO objeto no cache, identificado
// exclusivamente pelo internalId. Nunca mistura dados de objetos diferentes.
export function getCardByInternalId(internalId) {
  ensureInit();
  if (!internalId && internalId !== 0) return null;
  return _byInternalId.get(internalId) ?? null;
}

// ─── Busca carta por futggId (uso restrito: loja/pacotes, exibição) ───────────
// AVISO: futggId pode não ser único (múltiplas variantes do mesmo jogador).
// Esta função retorna o PRIMEIRO match. Usar APENAS para exibição decorativa
// em telas de loja ou pacotes — nunca para associar dados de uma carta específica.
export function getCardByFutggId(futggId) {
  ensureInit();
  if (!futggId) return null;
  return _byFutggId.get(futggId) ?? null;
}

// ─── Todas as cartas ──────────────────────────────────────────────────────────
export function getAllCards() {
  ensureInit();
  return [..._byInternalId.values()];
}

// ─── Filtra por raridade ──────────────────────────────────────────────────────
export function getCardsByRarity(rarity) {
  ensureInit();
  return [..._byInternalId.values()].filter(c => c.rarity === rarity);
}

// ─── Filtra por série ─────────────────────────────────────────────────────────
export function getCardsBySeries(series) {
  ensureInit();
  return [..._byInternalId.values()].filter(c => c.series === series);
}

// ─── Filtra por posição ───────────────────────────────────────────────────────
export function getCardsByPosition(positions) {
  ensureInit();
  const posArr = Array.isArray(positions) ? positions : [positions];
  return [..._byInternalId.values()].filter(c => posArr.includes(c.position));
}

// ─── Aplica override do painel admin ─────────────────────────────────────────
// Retorna NOVO objeto de carta com nome/foto customizados.
// REGRA: apenas name e customPhotoUrl podem ser alterados.
// cardId, rating, position, nation, club NUNCA são modificados por overrides.
export function applyCardOverride(card, override) {
  if (!card) return null;
  if (!override) return card;
  return {
    ...card,
    customName:     override.customName     ?? null,
    customPhotoUrl: override.customPhotoUrl ?? null,
  };
}

// ─── Nome de exibição (override > original, remove sufixos de série) ──────────
export function getDisplayName(card) {
  const raw = card?.customName ?? card?.name ?? '';
  return raw.replace(/\s+(Copa|Base|Europeu|BRL|UCL)\s*$/i, '').trim();
}

// ─── Inicialização automática no primeiro import ──────────────────────────────
ensureInit();
