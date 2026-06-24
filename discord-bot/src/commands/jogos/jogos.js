import { SlashCommandBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';
import { startBlackjack, startMines } from '../../utils/gameHandlers.js';

const COIN = '<a:emoji_1:1516993823665033286>';

function parseBet(input, balance) {
  const s = String(input).toLowerCase().trim();
  if (s === 'tudo' || s === 'all') return balance;
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

async function getEco(userId, guildId) {
  return prisma.economy.upsert({
    where:  { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('jogo')
    .setDescription('Apostas e jogos de cassino')
    .addSubcommand(s => s.setName('blackjack')
      .setDescription('🃏 Blackjack — chegue mais perto de 21 sem estourar')
      .addStringOption(o => o.setName('aposta').setDescription('Valor (ex: 500 ou "tudo")').setRequired(true)))
    .addSubcommand(s => s.setName('mines')
      .setDescription('💣 Mines — revele gemas sem explodir!')
      .addStringOption(o => o.setName('aposta').setDescription('Valor (ex: 500 ou "tudo")').setRequired(true))
      .addIntegerOption(o => o.setName('bombas').setDescription('Número de bombas (padrão: 3)').setMinValue(1).setMaxValue(13))),
  name: 'jogo',
  aliases: ['apostar', 'jog'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    const eco = await getEco(interaction.user.id, interaction.guildId);

    if (sub === 'blackjack') {
      const bet = parseBet(interaction.options.getString('aposta'), eco.balance);
      if (!bet || bet <= 0) return interaction.editReply({ embeds: [errorEmbed('Aposta inválida.')] });
      return startBlackjack(interaction, bet, opts => interaction.editReply(opts));
    }

    if (sub === 'mines') {
      const bet   = parseBet(interaction.options.getString('aposta'), eco.balance);
      const bombs = interaction.options.getInteger('bombas') ?? 3;
      if (!bet || bet <= 0) return interaction.editReply({ embeds: [errorEmbed('Aposta inválida.')] });
      return startMines(interaction, bet, bombs, opts => interaction.editReply(opts));
    }
  },

  async executePrefix(message, args) {
    const sub    = args[0]?.toLowerCase();
    const userId  = message.author.id;
    const guildId = message.guildId;

    const help = () => message.reply({
      embeds: [errorEmbed('**Uso:** `fallen jogo <subcomando> <aposta> [extra]`\n**Subcomandos:** `blackjack <aposta>`, `mines <aposta> [bombas]`')],
    });

    if (!sub) return help();

    const eco = await getEco(userId, guildId).catch(() => null);
    if (!eco) return message.reply({ embeds: [errorEmbed('Erro ao acessar seu saldo.')] });

    const send = opts => message.reply(opts);

    if (sub === 'blackjack' || sub === 'bj') {
      const bet = parseBet(args[1], eco.balance);
      if (!bet || bet <= 0) return send({ embeds: [errorEmbed('Aposta inválida. Ex: `fallen jogo blackjack 500`')] });
      return startBlackjack(message, bet, opts => message.reply(opts));
    }

    if (sub === 'mines' || sub === 'm') {
      const bet   = parseBet(args[1], eco.balance);
      const bombs = parseInt(args[2]) || 3;
      if (!bet || bet <= 0) return send({ embeds: [errorEmbed('Aposta inválida. Ex: `fallen jogo mines 500 3`')] });
      return startMines(message, bet, bombs, opts => message.reply(opts));
    }

    return help();
  },
};
