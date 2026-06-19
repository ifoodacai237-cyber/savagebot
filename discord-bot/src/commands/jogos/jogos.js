import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';
import {
  generateBlackjackCard,
  generateCoinflipCard,
  generateDiceCard,
  generateSlotsCard,
  generateRouletteCard,
} from '../../utils/economyCards.js';

// ─── Slot symbols ─────────────────────────────────────────────────────────────
const SLOT_SYMBOLS = [
  { sym: '🍒', mult: 2,   weight: 30 },
  { sym: '🍋', mult: 2.5, weight: 25 },
  { sym: '🍊', mult: 3,   weight: 20 },
  { sym: '🍇', mult: 4,   weight: 13 },
  { sym: '⭐', mult: 5,   weight: 8  },
  { sym: '💎', mult: 8,   weight: 3  },
  { sym: '7️⃣', mult: 15,  weight: 1  },
];

function weightedRandom() {
  const total = SLOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SLOT_SYMBOLS) { r -= s.weight; if (r <= 0) return s; }
  return SLOT_SYMBOLS[0];
}

// ─── Blackjack helpers ────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function newDeck()   { return SUITS.flatMap(s => RANKS.map(r => ({ rank: r, suit: s }))); }
function shuffle(a)  { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

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

const COIN = '<a:emoji_1:1516993823665033286>';

// ─── Economy helpers ──────────────────────────────────────────────────────────
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

function parseBet(input, balance) {
  const s = String(input).toLowerCase().trim();
  if (s === 'tudo' || s === 'all') return balance;
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

// ─── Command ──────────────────────────────────────────────────────────────────

export default {
  data: new SlashCommandBuilder()
    .setName('jogo')
    .setDescription('Apostas e jogos de cassino')
    .addSubcommand(s => s.setName('coinflip')
      .setDescription('🪙 Cara ou coroa — 50/50, ganhe 2x')
      .addStringOption(o => o.setName('lado').setDescription('cara ou coroa').setRequired(true)
        .addChoices({ name: '🪙 Cara', value: 'cara' }, { name: '🔵 Coroa', value: 'coroa' }))
      .addStringOption(o => o.setName('aposta').setDescription('Valor (ex: 500 ou "tudo")').setRequired(true)))
    .addSubcommand(s => s.setName('slots')
      .setDescription('🎰 Caça-níquel — junte 3 iguais para ganhar')
      .addStringOption(o => o.setName('aposta').setDescription('Valor (ex: 500 ou "tudo")').setRequired(true)))
    .addSubcommand(s => s.setName('dados')
      .setDescription('🎲 Jogo de dados — quem tirar mais alto ganha')
      .addStringOption(o => o.setName('aposta').setDescription('Valor (ex: 500 ou "tudo")').setRequired(true)))
    .addSubcommand(s => s.setName('blackjack')
      .setDescription('🃏 Blackjack — chegue mais perto de 21 sem estourar')
      .addStringOption(o => o.setName('aposta').setDescription('Valor (ex: 500 ou "tudo")').setRequired(true)))
    .addSubcommand(s => s.setName('roulette')
      .setDescription('🎡 Roleta — aposte em cor ou número')
      .addStringOption(o => o.setName('aposta').setDescription('Valor (ex: 500 ou "tudo")').setRequired(true))
      .addStringOption(o => o.setName('escolha').setDescription('vermelho, preto, verde ou número 0-36').setRequired(true))),
  name: 'jogo',
  aliases: ['apostar', 'jog'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    const eco = await getEco(interaction.user.id, interaction.guildId);

    // ── COINFLIP ────────────────────────────────────────────────────────────
    if (sub === 'coinflip') {
      const lado  = interaction.options.getString('lado');
      const bet   = parseBet(interaction.options.getString('aposta'), eco.balance);
      if (!bet || bet <= 0) return interaction.editReply({ embeds: [errorEmbed('Aposta inválida.')] });
      if (bet > eco.balance) return interaction.editReply({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const resultado = Math.random() < 0.5 ? 'cara' : 'coroa';
      const won       = resultado === lado;

      await deductBet(interaction.user.id, interaction.guildId, bet);
      if (won) await addWin(interaction.user.id, interaction.guildId, bet * 2);

      const newBal = eco.balance - bet + (won ? bet * 2 : 0);
      const buf = generateCoinflipCard({ side: lado, resultado, won, bet, userBalance: newBal });
      return interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'coinflip.png' })] });
    }

    // ── SLOTS ───────────────────────────────────────────────────────────────
    if (sub === 'slots') {
      const bet = parseBet(interaction.options.getString('aposta'), eco.balance);
      if (!bet || bet <= 0) return interaction.editReply({ embeds: [errorEmbed('Aposta inválida.')] });
      if (bet > eco.balance) return interaction.editReply({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const reelObjs = [weightedRandom(), weightedRandom(), weightedRandom()];
      const reels    = reelObjs.map(r => r.sym);
      const won      = reels[0] === reels[1] && reels[1] === reels[2];
      const mult     = won ? reelObjs[0].mult : 0;
      const winAmt   = won ? Math.floor(bet * mult) : 0;

      await deductBet(interaction.user.id, interaction.guildId, bet);
      if (won) await addWin(interaction.user.id, interaction.guildId, winAmt);

      const newBal = eco.balance - bet + winAmt;
      const buf = generateSlotsCard({
        reels,
        won,
        betAmount:    bet,
        changeAmount: won ? winAmt - bet : bet,
        userBalance:  newBal,
        multiplier:   mult,
      });
      return interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'slots.png' })] });
    }

    // ── DADOS ───────────────────────────────────────────────────────────────
    if (sub === 'dados') {
      const bet = parseBet(interaction.options.getString('aposta'), eco.balance);
      if (!bet || bet <= 0) return interaction.editReply({ embeds: [errorEmbed('Aposta inválida.')] });
      if (bet > eco.balance) return interaction.editReply({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const playerDie = Math.floor(Math.random() * 6) + 1;
      const botDie    = Math.floor(Math.random() * 6) + 1;
      const won       = playerDie > botDie;
      const tie       = playerDie === botDie;

      await deductBet(interaction.user.id, interaction.guildId, bet);
      let payout = 0;
      if (won)      { payout = bet * 2; await addWin(interaction.user.id, interaction.guildId, payout); }
      else if (tie) { payout = bet;     await addWin(interaction.user.id, interaction.guildId, payout); }

      const newBal = eco.balance - bet + payout;
      const buf = generateDiceCard({ playerDie, botDie, won, tie, bet, payout, userBalance: newBal });
      return interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'dados.png' })] });
    }

    // ── BLACKJACK ───────────────────────────────────────────────────────────
    if (sub === 'blackjack') {
      const bet = parseBet(interaction.options.getString('aposta'), eco.balance);
      if (!bet || bet <= 0) return interaction.editReply({ embeds: [errorEmbed('Aposta inválida.')] });
      if (bet > eco.balance) return interaction.editReply({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const deck   = shuffle(newDeck());
      let player   = [deck.pop(), deck.pop()];
      let dealer   = [deck.pop(), deck.pop()];

      while (handTotal(player) < 17) player.push(deck.pop());
      while (handTotal(dealer) < 17) dealer.push(deck.pop());

      const pTotal = handTotal(player);
      const dTotal = handTotal(dealer);
      const bust   = pTotal > 21;
      const won    = !bust && (dTotal > 21 || pTotal > dTotal);
      const tie    = !bust && !won && pTotal === dTotal;

      await deductBet(interaction.user.id, interaction.guildId, bet);
      let payout = 0;
      if (won)      { payout = bet * 2; await addWin(interaction.user.id, interaction.guildId, payout); }
      else if (tie) { payout = bet;     await addWin(interaction.user.id, interaction.guildId, payout); }

      const newBal = eco.balance - bet + payout;
      const buf = generateBlackjackCard({
        playerCards: player,
        dealerCards: dealer,
        pTotal,
        dTotal,
        won,
        tie,
        bust,
        bet,
        payout,
        userBalance: newBal,
      });
      return interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'blackjack.png' })] });
    }

    // ── ROULETTE ────────────────────────────────────────────────────────────
    if (sub === 'roulette') {
      const bet     = parseBet(interaction.options.getString('aposta'), eco.balance);
      const escolha = interaction.options.getString('escolha').toLowerCase().trim();
      if (!bet || bet <= 0) return interaction.editReply({ embeds: [errorEmbed('Aposta inválida.')] });
      if (bet > eco.balance) return interaction.editReply({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
      const spin    = Math.floor(Math.random() * 37);
      const isRed   = RED_SET.has(spin);
      const isBlack = !isRed && spin !== 0;
      const isGreen = spin === 0;

      let won = false, mult = 0;
      if (escolha === 'vermelho' && isRed)                              { won = true; mult = 2;  }
      if (escolha === 'preto'    && isBlack)                            { won = true; mult = 2;  }
      if (escolha === 'verde'    && isGreen)                            { won = true; mult = 14; }
      if (!isNaN(parseInt(escolha)) && parseInt(escolha) === spin)     { won = true; mult = 36; }

      const winAmt = won ? Math.floor(bet * mult) : 0;
      await deductBet(interaction.user.id, interaction.guildId, bet);
      if (won) await addWin(interaction.user.id, interaction.guildId, winAmt);

      const newBal = eco.balance - bet + winAmt;
      const buf = generateRouletteCard({ spin, escolha, won, bet, winAmt, userBalance: newBal, mult });
      return interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'roleta.png' })] });
    }
  },

  async executePrefix(message, args) {
    const sub     = args[0]?.toLowerCase();
    const userId  = message.author.id;
    const guildId = message.guildId;

    const help = () => message.reply({
      embeds: [errorEmbed('**Uso:** `fallen jogo <subcomando> <aposta> [extra]`\n**Subcomandos:** `coinflip <cara|coroa> <aposta>`, `slots <aposta>`, `dados <aposta>`, `blackjack <aposta>`, `roulette <aposta> <vermelho|preto|verde|0-36>`')],
    });

    if (!sub) return help();

    const eco = await getEco(userId, guildId).catch(() => null);
    if (!eco) return message.reply({ embeds: [errorEmbed('Erro ao acessar seu saldo.')] });

    // helper to send
    const send = opts => message.reply(opts);

    if (sub === 'coinflip' || sub === 'cf') {
      const lado   = args[1]?.toLowerCase();
      const betStr = args[2];
      if (!['cara', 'coroa'].includes(lado))
        return send({ embeds: [errorEmbed('Escolha `cara` ou `coroa`. Ex: `fallen jogo coinflip cara 500`')] });
      const bet = parseBet(betStr, eco.balance);
      if (!bet || bet <= 0) return send({ embeds: [errorEmbed('Aposta inválida.')] });
      if (bet > eco.balance) return send({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const resultado = Math.random() < 0.5 ? 'cara' : 'coroa';
      const won       = resultado === lado;
      await deductBet(userId, guildId, bet);
      if (won) await addWin(userId, guildId, bet * 2);
      const newBal = eco.balance - bet + (won ? bet * 2 : 0);
      const buf = generateCoinflipCard({ side: lado, resultado, won, bet, userBalance: newBal });
      return send({ files: [new AttachmentBuilder(buf, { name: 'coinflip.png' })] });
    }

    if (sub === 'slots') {
      const bet = parseBet(args[1], eco.balance);
      if (!bet || bet <= 0) return send({ embeds: [errorEmbed('Aposta inválida. Ex: `fallen jogo slots 500`')] });
      if (bet > eco.balance) return send({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const reelObjs = [weightedRandom(), weightedRandom(), weightedRandom()];
      const reels    = reelObjs.map(r => r.sym);
      const won      = reels[0] === reels[1] && reels[1] === reels[2];
      const mult     = won ? reelObjs[0].mult : 0;
      const winAmt   = won ? Math.floor(bet * mult) : 0;
      await deductBet(userId, guildId, bet);
      if (won) await addWin(userId, guildId, winAmt);
      const newBal = eco.balance - bet + winAmt;
      const buf = generateSlotsCard({ reels, won, betAmount: bet, changeAmount: won ? winAmt - bet : bet, userBalance: newBal, multiplier: mult });
      return send({ files: [new AttachmentBuilder(buf, { name: 'slots.png' })] });
    }

    if (sub === 'dados') {
      const bet = parseBet(args[1], eco.balance);
      if (!bet || bet <= 0) return send({ embeds: [errorEmbed('Aposta inválida. Ex: `fallen jogo dados 500`')] });
      if (bet > eco.balance) return send({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const playerDie = Math.floor(Math.random() * 6) + 1;
      const botDie    = Math.floor(Math.random() * 6) + 1;
      const won       = playerDie > botDie;
      const tie       = playerDie === botDie;
      await deductBet(userId, guildId, bet);
      let payout = 0;
      if (won)      { payout = bet * 2; await addWin(userId, guildId, payout); }
      else if (tie) { payout = bet;     await addWin(userId, guildId, payout); }
      const newBal = eco.balance - bet + payout;
      const buf = generateDiceCard({ playerDie, botDie, won, tie, bet, payout, userBalance: newBal });
      return send({ files: [new AttachmentBuilder(buf, { name: 'dados.png' })] });
    }

    if (sub === 'blackjack' || sub === 'bj') {
      const bet = parseBet(args[1], eco.balance);
      if (!bet || bet <= 0) return send({ embeds: [errorEmbed('Aposta inválida. Ex: `fallen jogo blackjack 500`')] });
      if (bet > eco.balance) return send({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const deck   = shuffle(newDeck());
      let player   = [deck.pop(), deck.pop()];
      let dealer   = [deck.pop(), deck.pop()];
      while (handTotal(player) < 17) player.push(deck.pop());
      while (handTotal(dealer) < 17) dealer.push(deck.pop());
      const pTotal = handTotal(player);
      const dTotal = handTotal(dealer);
      const bust   = pTotal > 21;
      const won    = !bust && (dTotal > 21 || pTotal > dTotal);
      const tie    = !bust && !won && pTotal === dTotal;
      await deductBet(userId, guildId, bet);
      let payout = 0;
      if (won)      { payout = bet * 2; await addWin(userId, guildId, payout); }
      else if (tie) { payout = bet;     await addWin(userId, guildId, payout); }
      const newBal = eco.balance - bet + payout;
      const buf = generateBlackjackCard({ playerCards: player, dealerCards: dealer, pTotal, dTotal, won, tie, bust, bet, payout, userBalance: newBal });
      return send({ files: [new AttachmentBuilder(buf, { name: 'blackjack.png' })] });
    }

    if (sub === 'roulette' || sub === 'roleta') {
      const bet     = parseBet(args[1], eco.balance);
      const escolha = args[2]?.toLowerCase().trim();
      if (!bet || bet <= 0) return send({ embeds: [errorEmbed('Aposta inválida. Ex: `fallen jogo roulette 500 vermelho`')] });
      if (!escolha)         return send({ embeds: [errorEmbed('Informe a escolha: `vermelho`, `preto`, `verde` ou número 0-36.')] });
      if (bet > eco.balance) return send({ embeds: [errorEmbed(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`)] });

      const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
      const spin    = Math.floor(Math.random() * 37);
      const isRed   = RED_SET.has(spin);
      const isBlack = !isRed && spin !== 0;
      const isGreen = spin === 0;
      let won = false, mult = 0;
      if (escolha === 'vermelho' && isRed)                          { won = true; mult = 2;  }
      if (escolha === 'preto'    && isBlack)                        { won = true; mult = 2;  }
      if (escolha === 'verde'    && isGreen)                        { won = true; mult = 14; }
      if (!isNaN(parseInt(escolha)) && parseInt(escolha) === spin)  { won = true; mult = 36; }
      const winAmt = won ? Math.floor(bet * mult) : 0;
      await deductBet(userId, guildId, bet);
      if (won) await addWin(userId, guildId, winAmt);
      const newBal = eco.balance - bet + winAmt;
      const buf = generateRouletteCard({ spin, escolha, won, bet, winAmt, userBalance: newBal, mult });
      return send({ files: [new AttachmentBuilder(buf, { name: 'roleta.png' })] });
    }

    return help();
  },
};
