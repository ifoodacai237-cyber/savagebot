import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';
import prisma from '../database/client.js';
import { generateBlackjackCard, generateMinesCard } from './economyCards.js';

const COIN = '<a:emoji_1:1516993823665033286>';

// ─── In-memory game states ────────────────────────────────────────────────────
export const blackjackGames = new Map();
export const minesGames     = new Map();

// ─── Shared helpers ───────────────────────────────────────────────────────────
async function getEco(userId, guildId) {
  return prisma.economy.upsert({
    where:  { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}
async function deductBet(userId, guildId, bet) {
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { decrement: bet } },
  });
}
async function addWin(userId, guildId, amount) {
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { increment: amount } },
  });
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K';
  return n.toLocaleString('pt-BR');
}

function memberInfo(interaction) {
  return {
    name:   interaction.member?.displayName ?? interaction.user?.username ?? interaction.author?.username ?? 'Jogador',
    avatar: interaction.member?.displayAvatarURL({ size: 64 })
      ?? interaction.user?.displayAvatarURL({ size: 64 })
      ?? interaction.author?.displayAvatarURL({ size: 64 })
      ?? null,
  };
}

// ─── Image attachment helpers ─────────────────────────────────────────────────

function bjAttachment(state, hideDealer = false) {
  try {
    const pTotal = handTotal(state.player);
    const dTotal = handTotal(state.dealer);
    const payout = state.won ? state.bet * 2 : state.tie ? state.bet : 0;
    const buf = generateBlackjackCard({
      playerCards: state.player,
      dealerCards: state.dealer,
      pTotal,
      dTotal,
      won:  state.won,
      tie:  state.tie,
      bust: state.bust,
      bet:  state.bet,
      payout,
      userBalance: 0,
      hideDealer,
    });
    return new AttachmentBuilder(buf, { name: 'blackjack.png' });
  } catch { return null; }
}

function minesAttachment(state, memberName) {
  try {
    const mult   = calcMult(state.gems, state.bombs);
    const payout = Math.floor(state.bet * mult);
    const buf = generateMinesCard({
      grid:       state.grid,
      revealed:   state.revealed,
      bombs:      state.bombs,
      bet:        state.bet,
      payout,
      memberName,
      status:     state.status,
    });
    return new AttachmentBuilder(buf, { name: 'mines.png' });
  } catch { return null; }
}

function withFiles(payload, ...attachments) {
  const files = attachments.filter(Boolean);
  if (files.length === 0) return payload;
  return { ...payload, files, attachments: [] };
}

// ══════════════════════════════════════════════════════════════════════════════
// BLACKJACK
// ══════════════════════════════════════════════════════════════════════════════

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function newDeck()  { return SUITS.flatMap(s => RANKS.map(r => ({ rank: r, suit: s }))); }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}
function handTotal(cards) {
  let total = cards.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces  = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function fmtCard(c) { return `\`${c.rank}${c.suit}\``; }
function fmtHand(cards) { return cards.map(fmtCard).join(' '); }

function buildBJEmbed(state, name, avatar) {
  const pTotal     = handTotal(state.player);
  const isPlaying  = state.status === 'playing';

  const dealerShow = isPlaying
    ? [state.dealer[0], { rank: '?', suit: '' }]
    : state.dealer;
  const dealerVal  = isPlaying
    ? `${cardValue(state.dealer[0].rank)} + ?`
    : `${handTotal(state.dealer)}`;

  const color = state.status === 'playing' ? 0x8B5CF6
    : state.won ? 0x22C55E
    : state.tie ? 0xF59E0B
    : 0xEF4444;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `Blackjack | ${name}`, iconURL: avatar })
    .setImage('attachment://blackjack.png')
    .setDescription(
      `> 🤑 **Aposta:** ${fmtNum(state.bet)} ${COIN}\n` +
      `> 💸 **Possível ganho:** ${fmtNum(state.bet * 2)} ${COIN}`,
    )
    .addFields(
      {
        name:  `Mão do Dealer — Valor: ${dealerVal}`,
        value: dealerShow.map(c => c.rank === '?' ? '`🂠`' : fmtCard(c)).join(' '),
      },
      {
        name:  `Sua Mão — Valor: ${pTotal}`,
        value: fmtHand(state.player),
      },
    )
    .setFooter({ text: `Apostador: ${name}` });

  if (!isPlaying) {
    const payout = state.won ? state.bet * 2 : state.tie ? state.bet : 0;
    let line = '';
    if (state.bust)     line = `❌ **Estourou!** Você perdeu **${fmtNum(state.bet)} ${COIN}**`;
    else if (state.won) line = `✅ **Ganhou!** +**${fmtNum(payout)} ${COIN}**`;
    else if (state.tie) line = `🔁 **Empate!** Aposta devolvida`;
    else                line = `❌ **Dealer ganhou** com ${handTotal(state.dealer)}`;
    embed.addFields({ name: '\u200b', value: line });
  }

  return embed;
}

function buildBJComponents(state) {
  if (state.status !== 'playing') return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bj_hit_${state.userId}`)
        .setLabel('Pedir Carta')
        .setEmoji('🎴')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`bj_stand_${state.userId}`)
        .setLabel('Parar')
        .setEmoji('👋')
        .setStyle(ButtonStyle.Success),
    ),
  ];
}

async function finalizeBJ(state, interaction, name, avatar) {
  while (handTotal(state.dealer) < 17) state.dealer.push(state.deck.pop());

  const pTotal = handTotal(state.player);
  const dTotal = handTotal(state.dealer);
  const won    = dTotal > 21 || pTotal > dTotal;
  const tie    = !won && pTotal === dTotal;

  state.status = 'done';
  state.won = won;
  state.tie = tie;

  const payout = won ? state.bet * 2 : tie ? state.bet : 0;
  if (payout > 0) await addWin(state.userId, state.guildId, payout);
  blackjackGames.delete(state.userId);

  const file = bjAttachment(state, false);
  return interaction.update(withFiles(
    { embeds: [buildBJEmbed(state, name, avatar)], components: [] },
    file,
  ));
}

export async function startBlackjack(ctx, bet, sendFn) {
  const userId  = ctx.user?.id ?? ctx.author?.id;
  const guildId = ctx.guildId;
  const { name, avatar } = memberInfo(ctx);

  if (blackjackGames.has(userId))
    return sendFn({ content: '❌ Você já tem um jogo de blackjack em andamento!' });

  const eco = await getEco(userId, guildId);
  if (bet > eco.balance)
    return sendFn({ content: `❌ Saldo insuficiente. Você tem **${fmtNum(eco.balance)} ${COIN}**.` });

  await deductBet(userId, guildId, bet);

  const deck   = shuffle(newDeck());
  const player = [deck.pop(), deck.pop()];
  const dealer = [deck.pop(), deck.pop()];

  const state = { userId, guildId, bet, player, dealer, deck, status: 'playing', won: false, tie: false, bust: false };
  blackjackGames.set(userId, state);

  // Natural blackjack check
  if (handTotal(player) === 21) {
    const dTotal = handTotal(dealer);
    const won = dTotal !== 21;
    state.status = 'done';
    state.won = won;
    state.tie = !won;
    const payout = won ? Math.floor(bet * 2.5) : bet;
    await addWin(userId, guildId, payout);
    blackjackGames.delete(userId);
    const file = bjAttachment(state, false);
    return sendFn(withFiles({ embeds: [buildBJEmbed(state, name, avatar)], components: [] }, file));
  }

  // Auto-timeout 2 min
  setTimeout(async () => {
    const s = blackjackGames.get(userId);
    if (s?.status === 'playing') {
      blackjackGames.delete(userId);
      await addWin(userId, guildId, bet).catch(() => {});
    }
  }, 120_000);

  const file = bjAttachment(state, true);
  return sendFn(withFiles(
    { embeds: [buildBJEmbed(state, name, avatar)], components: buildBJComponents(state) },
    file,
  ));
}

export async function handleBJHit(interaction, targetId) {
  if (interaction.user.id !== targetId)
    return interaction.reply({ content: '❌ Este não é o seu jogo!', ephemeral: true });

  const state = blackjackGames.get(targetId);
  if (!state?.status === 'playing') return interaction.update({ components: [] });

  const { name, avatar } = memberInfo(interaction);
  state.player.push(state.deck.pop());
  const total = handTotal(state.player);

  if (total > 21) {
    state.status = 'done';
    state.bust = true;
    blackjackGames.delete(targetId);
    const file = bjAttachment(state, false);
    return interaction.update(withFiles(
      { embeds: [buildBJEmbed(state, name, avatar)], components: [] },
      file,
    ));
  }
  if (total === 21) return finalizeBJ(state, interaction, name, avatar);

  const file = bjAttachment(state, true);
  return interaction.update(withFiles(
    { embeds: [buildBJEmbed(state, name, avatar)], components: buildBJComponents(state) },
    file,
  ));
}

export async function handleBJStand(interaction, targetId) {
  if (interaction.user.id !== targetId)
    return interaction.reply({ content: '❌ Este não é o seu jogo!', ephemeral: true });

  const state = blackjackGames.get(targetId);
  if (!state) return interaction.update({ components: [] });

  const { name, avatar } = memberInfo(interaction);
  return finalizeBJ(state, interaction, name, avatar);
}

// ══════════════════════════════════════════════════════════════════════════════
// MINES
// ══════════════════════════════════════════════════════════════════════════════

const GRID = 4;

function calcMult(gems, bombs) {
  if (gems === 0) return 1;
  const total = GRID * GRID;
  const safe  = total - bombs;
  let m = 1;
  for (let i = 0; i < gems; i++) m *= (total - i) / (safe - i);
  return Math.round(m * 0.97 * 100) / 100;
}

function buildMinesEmbed(state, name, avatar, isEndImage = false) {
  const mult   = calcMult(state.gems, state.bombs);
  const payout = Math.floor(state.bet * mult);

  const color = state.status === 'lost'   ? 0xEF4444
    : state.status === 'cashed'           ? 0x22C55E
    : 0x22C55E;

  const title = state.status === 'lost'   ? '❌ Fim de jogo!'
    : state.status === 'cashed'           ? '✅ Fim de jogo!'
    : '💎 Mines';

  const gainLine = state.status === 'lost'
    ? `> 💸 **Ganhos:** 0 ${COIN}`
    : `> 💸 **Ganhos:** ${fmtNum(payout)} ${COIN}`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${title} | ${name}`, iconURL: avatar })
    .setDescription(
      `> 🤑 **Aposta:** ${fmtNum(state.bet)} ${COIN}\n${gainLine}\n` +
      (state.status === 'playing' ? `> 💣 **Minas:** ${state.bombs} | 💎 **Reveladas:** ${state.gems}` : ''),
    )
    .setFooter({ text: `Apostador: ${name}` });

  if (isEndImage) embed.setImage('attachment://mines.png');

  return embed;
}

function buildMinesComponents(state) {
  const rows = [];
  const done = state.status !== 'playing';

  for (let r = 0; r < GRID; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < GRID; c++) {
      const idx        = r * GRID + c;
      const isRevealed = state.revealed[idx];
      const isBomb     = state.grid[idx];

      let emoji    = '⬜';
      let style    = ButtonStyle.Secondary;
      let disabled = done;

      if (isRevealed) {
        emoji    = isBomb ? '💣' : '💎';
        style    = isBomb ? ButtonStyle.Danger : ButtonStyle.Success;
        disabled = true;
      } else if (done && isBomb) {
        emoji    = '💣';
        style    = ButtonStyle.Danger;
        disabled = true;
      } else if (done) {
        disabled = true;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mines_cell_${idx}_${state.userId}`)
          .setEmoji(emoji)
          .setStyle(style)
          .setDisabled(disabled),
      );
    }
    rows.push(row);
  }

  if (!done) {
    const canCash = state.gems > 0;
    const mult    = calcMult(state.gems, state.bombs);
    const payout  = Math.floor(state.bet * mult);
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`mines_cashout_${state.userId}`)
          .setLabel(canCash ? `Sacar — ${fmtNum(payout)}` : 'Sacar (revele uma gema primeiro)')
          .setEmoji('💰')
          .setStyle(ButtonStyle.Success)
          .setDisabled(!canCash),
      ),
    );
  }

  return rows;
}

export async function startMines(ctx, bet, bombs, sendFn) {
  const userId  = ctx.user?.id ?? ctx.author?.id;
  const guildId = ctx.guildId;
  const { name, avatar } = memberInfo(ctx);
  const total = GRID * GRID;

  if (minesGames.has(userId))
    return sendFn({ content: '❌ Você já tem um jogo de mines em andamento!' });
  if (bombs < 1 || bombs >= total)
    return sendFn({ content: `❌ Número de bombas inválido (1–${total - 1}).` });

  const eco = await getEco(userId, guildId);
  if (bet > eco.balance)
    return sendFn({ content: `❌ Saldo insuficiente. Você tem **${fmtNum(eco.balance)} ${COIN}**.` });

  await deductBet(userId, guildId, bet);

  const bombSet = new Set();
  while (bombSet.size < bombs) bombSet.add(Math.floor(Math.random() * total));
  const grid = Array.from({ length: total }, (_, i) => bombSet.has(i));

  const state = {
    userId, guildId, bet, bombs,
    grid,
    revealed: Array(total).fill(false),
    gems: 0,
    status: 'playing',
  };

  minesGames.set(userId, state);

  // Auto-cashout after 5 min
  setTimeout(async () => {
    const s = minesGames.get(userId);
    if (s?.status === 'playing') {
      minesGames.delete(userId);
      const p = s.gems > 0 ? Math.floor(s.bet * calcMult(s.gems, s.bombs)) : s.bet;
      await addWin(userId, guildId, p).catch(() => {});
    }
  }, 300_000);

  return sendFn({ embeds: [buildMinesEmbed(state, name, avatar)], components: buildMinesComponents(state) });
}

export async function handleMinesCell(interaction, idx, targetId) {
  if (interaction.user.id !== targetId)
    return interaction.reply({ content: '❌ Este não é o seu jogo!', ephemeral: true });

  const state = minesGames.get(targetId);
  if (!state || state.status !== 'playing') return interaction.update({ components: [] });

  const { name, avatar } = memberInfo(interaction);
  state.revealed[idx] = true;

  if (state.grid[idx]) {
    // Bomba — revela tudo e gera imagem PNG
    state.revealed = state.revealed.map(() => true);
    state.status = 'lost';
    minesGames.delete(targetId);
    const file = minesAttachment(state, name);
    return interaction.update(withFiles(
      { embeds: [buildMinesEmbed(state, name, avatar, true)], components: buildMinesComponents(state) },
      file,
    ));
  }

  state.gems++;
  const totalSafe = GRID * GRID - state.bombs;

  if (state.gems >= totalSafe) {
    // Revelou tudo — auto win
    const payout = Math.floor(state.bet * calcMult(state.gems, state.bombs));
    state.status   = 'cashed';
    state.revealed = state.revealed.map(() => true);
    minesGames.delete(targetId);
    await addWin(targetId, state.guildId, payout);
    const file = minesAttachment(state, name);
    return interaction.update(withFiles(
      { embeds: [buildMinesEmbed(state, name, avatar, true)], components: buildMinesComponents(state) },
      file,
    ));
  }

  return interaction.update({
    embeds: [buildMinesEmbed(state, name, avatar)],
    components: buildMinesComponents(state),
  });
}

export async function handleMinesCashout(interaction, targetId) {
  if (interaction.user.id !== targetId)
    return interaction.reply({ content: '❌ Este não é o seu jogo!', ephemeral: true });

  const state = minesGames.get(targetId);
  if (!state || state.status !== 'playing') return interaction.update({ components: [] });
  if (state.gems === 0)
    return interaction.reply({ content: '❌ Revele pelo menos uma gema antes de sacar.', ephemeral: true });

  const { name, avatar } = memberInfo(interaction);
  const payout = Math.floor(state.bet * calcMult(state.gems, state.bombs));
  state.status   = 'cashed';
  state.revealed = state.revealed.map(() => true);
  minesGames.delete(targetId);
  await addWin(targetId, state.guildId, payout);

  const file = minesAttachment(state, name);
  return interaction.update(withFiles(
    { embeds: [buildMinesEmbed(state, name, avatar, true)], components: buildMinesComponents(state) },
    file,
  ));
}
