import prisma from '../database/client.js';
import { FUT_PLAYERS, getPlayerById as getRawPlayerById, getPlayersBySeries, getPlayersByPosition, POSITION_COMPAT } from './futPlayers.js';
import { applyOverride } from './futOverrides.js';

// Retorna o jogador já com nome/foto customizados (override de painel admin) aplicados.
export async function getPlayerById(id) {
  return applyOverride(getRawPlayerById(id));
}

// ─── Definição dos Pacotes ────────────────────────────────────────────────────
export const PACKS = {
  padrao: {
    name: 'Pacote Padrão',
    emoji: '📦',
    price: 500,
    cards: 4,
    description: '4 cartas aleatórias com pelo menos 1 Prata garantida',
    guaranteed: 'silver',
    series: null,
    positions: null,
  },
  ouro: {
    name: 'Pacote Ouro',
    emoji: '📀',
    price: 2000,
    cards: 4,
    description: '4 cartas com pelo menos 1 Ouro garantida',
    guaranteed: 'gold',
    series: null,
    positions: null,
  },
  premium: {
    name: 'Pacote Premium',
    emoji: '💎',
    price: 5000,
    cards: 4,
    description: '4 cartas com pelo menos 1 Mítica garantida',
    guaranteed: 'black',
    series: null,
    positions: null,
  },
  copa2026: {
    name: 'Pacote Copa 2026',
    emoji: '🏆',
    price: 3000,
    cards: 4,
    description: '4 cartas da Copa do Mundo 2026 com 1 Ouro garantida',
    guaranteed: 'gold',
    series: 'copa2026',
    positions: null,
  },
  bundle_copa: {
    name: 'Bundle Copa 2026',
    emoji: '🎁',
    price: 30000,
    cards: 60,
    description: '15 Pacotes da Copa do Mundo 2026',
    guaranteed: 'gold',
    series: 'copa2026',
    positions: null,
  },
  europeu: {
    name: 'Pacote Clubes Europeus 25/26',
    emoji: '🌍',
    price: 2800,
    cards: 4,
    description: '4 cartas de Clubes Europeus 25/26 com 1 Ouro garantida',
    guaranteed: 'gold',
    series: 'europe2526',
    positions: null,
  },
  bundle_europeu: {
    name: 'Bundle Clubes Europeus 25/26',
    emoji: '🎁',
    price: 28000,
    cards: 60,
    description: '15 Pacotes dos Clubes Europeus 25/26',
    guaranteed: 'gold',
    series: 'europe2526',
    positions: null,
  },
  defesa: {
    name: 'Pacote Defesa',
    emoji: '🛡️',
    price: 2500,
    cards: 4,
    description: '4 defensores do Brasileirão com pelo menos 1 Ouro garantida',
    guaranteed: 'gold',
    series: null,
    positions: ['GOL', 'ZAG', 'LD', 'LE'],
  },
  meiocampo: {
    name: 'Pacote Meio-Campo',
    emoji: '⚽',
    price: 2500,
    cards: 4,
    description: '4 meio-campistas com pelo menos 1 Ouro garantida',
    guaranteed: 'gold',
    series: null,
    positions: ['MC', 'MEI'],
  },
  ataque: {
    name: 'Pacote Ataque',
    emoji: '🔥',
    price: 2500,
    cards: 4,
    description: '4 atacantes com pelo menos 1 Ouro garantida',
    guaranteed: 'gold',
    series: null,
    positions: ['PE', 'PD', 'CA'],
  },
  goleiro: {
    name: 'Pacote Goleiro',
    emoji: '🧤',
    price: 2000,
    cards: 4,
    description: '4 goleiros com pelo menos 1 Ouro garantida',
    guaranteed: 'gold',
    series: null,
    positions: ['GOL'],
  },
};

// ─── Formações disponíveis ────────────────────────────────────────────────────
export const FORMATION_POSITIONS = {
  '4-3-3': ['GOL','LE','ZAG','ZAG','LD','MC','MC','MC','PE','CA','PD'],
  '4-4-2': ['GOL','LE','ZAG','ZAG','LD','PE','MC','MC','PD','CA','CA'],
  '4-2-4': ['GOL','LE','ZAG','ZAG','LD','MC','MC','PE','CA','CA','PD'],
  '3-3-4': ['GOL','ZAG','ZAG','ZAG','MC','MC','MC','PE','CA','CA','PD'],
  '5-3-2': ['GOL','LE','ZAG','ZAG','ZAG','LD','MC','MC','MC','CA','CA'],
  '4-5-1': ['GOL','LE','ZAG','ZAG','LD','PE','MC','MC','MC','PD','CA'],
  '3-4-3': ['GOL','ZAG','ZAG','ZAG','LE','MC','MC','LD','PE','CA','PD'],
};

// ─── Helpers internos ────────────────────────────────────────────────────────
function rarityWeight(guaranteed) {
  const weights = {
    bronze:  [60, 30,  8,  2],
    silver:  [0,  60, 35,  5],
    gold:    [0,   0, 70, 30],
    black:   [0,   0,  0,100],
  };
  return weights[guaranteed] ?? [40, 35, 20, 5];
}

function pickRarity(weights) {
  const [wB, wS, wG, wBl] = weights;
  const roll = Math.random() * 100;
  if (roll < wB)          return 'bronze';
  if (roll < wB + wS)     return 'silver';
  if (roll < wB + wS + wG) return 'gold';
  return 'black';
}

function pickRandomPlayer(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function drawCards(count, guaranteed, series, positions) {
  const drawn = [];
  let guaranteedUsed = false;

  for (let i = 0; i < count; i++) {
    let rarity;
    if (!guaranteedUsed && i === 0) {
      rarity = guaranteed;
      guaranteedUsed = true;
    } else {
      rarity = pickRarity(rarityWeight(guaranteed));
    }

    let pool = FUT_PLAYERS.filter(p => p.rarity === rarity);
    if (series) pool = pool.filter(p => p.series === series);
    if (positions?.length) pool = pool.filter(p => positions.includes(p.pos));

    // fallback — se pool vazio, abre de qualquer série/posição com a raridade
    if (!pool.length) {
      pool = FUT_PLAYERS.filter(p => p.rarity === rarity);
    }
    // fallback máximo
    if (!pool.length) {
      pool = FUT_PLAYERS.filter(p => p.rarity === 'bronze');
    }

    drawn.push(pickRandomPlayer(pool));
  }
  return drawn;
}

// ─── API Pública ──────────────────────────────────────────────────────────────

export async function getOrCreateTeam(userId, guildId) {
  return prisma.futUserTeam.upsert({
    where:  { userId_guildId: { userId, guildId } },
    update: {},
    create: { userId, guildId },
  });
}

export async function getUserBalance(userId, guildId) {
  const eco = await prisma.economy.findUnique({ where: { userId_guildId: { userId, guildId } } });
  return eco?.balance ?? 0;
}

export async function deductBalance(userId, guildId, amount) {
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { decrement: amount } },
  });
}

export async function openPack(packKey, userId, guildId) {
  const pack = PACKS[packKey];
  if (!pack) throw new Error('Pacote inválido');

  const balance = await getUserBalance(userId, guildId);
  if (balance < pack.price) {
    return { success: false, reason: 'saldo', needed: pack.price, have: balance };
  }

  const team = await getOrCreateTeam(userId, guildId);
  await deductBalance(userId, guildId, pack.price);

  const players = drawCards(pack.cards, pack.guaranteed, pack.series, pack.positions);

  await prisma.futUserCard.createMany({
    data: players.map(p => ({ teamId: team.id, playerId: p.id })),
  });

  // Rebuild auto-lineup após novos cards
  await autoLineup(team.id, team.formation);

  return { success: true, players, spent: pack.price };
}

export async function autoLineup(teamId, formation) {
  // Carrega formação do time se não passada
  if (!formation) {
    const t = await prisma.futUserTeam.findUnique({ where: { id: teamId } });
    formation = t?.formation ?? '4-3-3';
  }

  const slots = FORMATION_POSITIONS[formation] ?? FORMATION_POSITIONS['4-3-3'];

  // Busca todas as cartas do time
  const cards = await prisma.futUserCard.findMany({ where: { teamId } });

  // Mapa de playerId → player info
  const cardsFull = (await Promise.all(cards.map(async c => ({ ...c, player: await getPlayerById(c.playerId) }))))
    .filter(c => c.player !== null)
    .sort((a, b) => (b.player?.ovr ?? 0) - (a.player?.ovr ?? 0));

  const usedCardIds = new Set();
  const newLineup = [];

  for (let i = 0; i < slots.length; i++) {
    const slotPos = slots[i];
    const compat = POSITION_COMPAT[slotPos] ?? [slotPos];

    const best = cardsFull.find(c => !usedCardIds.has(c.id) && compat.includes(c.player?.pos));
    if (best) {
      usedCardIds.add(best.id);
      newLineup.push({ teamId, cardId: best.id, slot: i + 1 });
    }
  }

  // Apaga lineup atual e recria
  await prisma.futLineup.deleteMany({ where: { teamId } });
  if (newLineup.length > 0) {
    await prisma.futLineup.createMany({ data: newLineup });
  }

  return newLineup;
}

export async function getTeamLineup(teamId) {
  const lineup = await prisma.futLineup.findMany({
    where:   { teamId },
    include: { card: true },
    orderBy: { slot: 'asc' },
  });

  return Promise.all(lineup.map(async l => ({
    slot:   l.slot,
    cardId: l.cardId,
    player: await getPlayerById(l.card.playerId),
  })));
}

export async function getTeamOvr(teamId) {
  const lineup = await getTeamLineup(teamId);
  if (!lineup.length) return 0;
  const total = lineup.reduce((sum, l) => sum + (l.player?.ovr ?? 0), 0);
  return Math.round((total / lineup.length) * 100) / 100;
}

export async function getCollection(teamId, page = 1, perPage = 10) {
  const total = await prisma.futUserCard.count({ where: { teamId } });
  const cards = await prisma.futUserCard.findMany({
    where:   { teamId },
    orderBy: { obtainedAt: 'desc' },
    skip:    (page - 1) * perPage,
    take:    perPage,
  });

  const withPlayers = await Promise.all(cards.map(async c => ({ ...c, player: await getPlayerById(c.playerId) })));
  return { cards: withPlayers, total, pages: Math.ceil(total / perPage), page };
}

export async function changeFormation(teamId, formation) {
  if (!FORMATION_POSITIONS[formation]) throw new Error('Formação inválida');
  await prisma.futUserTeam.update({ where: { id: teamId }, data: { formation } });
  await autoLineup(teamId, formation);
}

export async function changeTeamName(teamId, name) {
  await prisma.futUserTeam.update({ where: { id: teamId }, data: { teamName: name.slice(0, 32) } });
}

// ─── Cálculo ELO ──────────────────────────────────────────────────────────────
function eloExpected(myElo, oppElo) {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}

function eloChange(myElo, oppElo, result) {
  const K = 32;
  const expected = eloExpected(myElo, oppElo);
  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(K * (actual - expected));
}

function generateScore(diffOvr) {
  const avgGoals = 2.5;
  const advantage = diffOvr / 10;

  let myGoals = Math.max(0, Math.round(avgGoals * (1 + advantage * 0.3) * (0.5 + Math.random())));
  let oppGoals = Math.max(0, Math.round(avgGoals * (1 - advantage * 0.3) * (0.5 + Math.random())));

  myGoals = Math.min(myGoals, 9);
  oppGoals = Math.min(oppGoals, 9);
  return [myGoals, oppGoals];
}

const AI_NAMES = [
  'Estrelas FC', 'Dragões United', 'Águias SC', 'Leões FC', 'Tubarões CF',
  'Guerreiros EC', 'Fênix Sport', 'Cangaceiros FC', 'Trovões AC', 'Lobos FC',
  'Templários SC', 'Titãs United', 'Corsários EC', 'Vulcões CF', 'Panteras FC',
];

export async function simulateMatch(userId, guildId) {
  const team = await getOrCreateTeam(userId, guildId);
  const myOvr = await getTeamOvr(team.id);

  if (myOvr < 55) {
    return { success: false, reason: 'no_lineup', message: 'Monte seu time primeiro! Abra pacotes e configure sua escalação.' };
  }

  const oppOvr = Math.max(50, Math.round(myOvr + (Math.random() * 14 - 7)));
  const oppName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
  const diffOvr = myOvr - oppOvr;

  const [myScore, oppScore] = generateScore(diffOvr);
  const result = myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw';
  const change = eloChange(team.elo, oppOvr * 10, result);

  await prisma.futUserTeam.update({
    where: { id: team.id },
    data: {
      elo:    { increment: change },
      wins:   result === 'win'  ? { increment: 1 } : undefined,
      losses: result === 'loss' ? { increment: 1 } : undefined,
      draws:  result === 'draw' ? { increment: 1 } : undefined,
    },
  });

  await prisma.futMatch.create({
    data: {
      teamId: team.id,
      myScore, opponentScore: oppScore,
      myOvr, opponentOvr: oppOvr,
      opponentName: oppName,
      eloChange: change,
      result,
    },
  });

  const updatedTeam = await prisma.futUserTeam.findUnique({ where: { id: team.id } });

  return {
    success: true,
    result, myScore, oppScore, myOvr, oppOvr,
    oppName, eloChange: change,
    newElo: updatedTeam.elo,
    wins: updatedTeam.wins,
    losses: updatedTeam.losses,
    draws: updatedTeam.draws,
  };
}

export async function getMatchHistory(teamId, limit = 5) {
  return prisma.futMatch.findMany({
    where:   { teamId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  });
}
