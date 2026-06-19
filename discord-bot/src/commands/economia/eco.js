import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';
import { generateBalanceCard, generateTopCard } from '../../utils/economyCards.js';

const GIFS = {
  daily: [
    'https://media.giphy.com/media/3ohs4lOkMMmbPoGMSk/giphy.gif',
    'https://media.giphy.com/media/26FPokl39a7lHMpTq/giphy.gif',
    'https://media.giphy.com/media/l46CfHGzXFSMGhXpC/giphy.gif',
    'https://media.giphy.com/media/kFgzrTt798d2w/giphy.gif',
    'https://media.giphy.com/media/7JvlHfd7C2GDr7zfZF/giphy.gif',
    'https://media.giphy.com/media/Vccpm1O9gV1g4/giphy.gif',
    'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
    'https://media.giphy.com/media/5z0cCCGooBQUtejM4v/giphy.gif',
    'https://media.giphy.com/media/iD2HZaTqfhcAo/giphy.gif',
  ],
  work: [
    'https://media.giphy.com/media/LHZyixOnHwDDy/giphy.gif',
    'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif',
    'https://media.giphy.com/media/3o7TKDLFRkSAkpCyZG/giphy.gif',
    'https://media.giphy.com/media/VGwTq3G6a39cI/giphy.gif',
    'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
    'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
    'https://media.giphy.com/media/xT9KVmZwJl7fnigeAg/giphy.gif',
    'https://media.giphy.com/media/4HnRQfgHm9bXK/giphy.gif',
    'https://media.giphy.com/media/RkYNmkVuQFaP6/giphy.gif',
  ],
  deposit: [
    'https://media.giphy.com/media/26BRsF5TJuqGCcME0/giphy.gif',
    'https://media.giphy.com/media/3o7TKSOvfaCO9b3MlO/giphy.gif',
    'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif',
    'https://media.giphy.com/media/h2OCIFJlSHNACtU7TA/giphy.gif',
    'https://media.giphy.com/media/9EvzNG9HAVc64/giphy.gif',
    'https://media.giphy.com/media/xUPJPpHORMLhHvwb9i/giphy.gif',
    'https://media.giphy.com/media/26FPokl39a7lHMpTq/giphy.gif',
  ],
  sacar: [
    'https://media.giphy.com/media/3ohs4lOkMMmbPoGMSk/giphy.gif',
    'https://media.giphy.com/media/26FPCXdkvDbKBbgOI/giphy.gif',
    'https://media.giphy.com/media/l46CfHGzXFSMGhXpC/giphy.gif',
    'https://media.giphy.com/media/5z0cCCGooBQUtejM4v/giphy.gif',
    'https://media.giphy.com/media/l0MYECaWkjSReVQMo/giphy.gif',
    'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
    'https://media.giphy.com/media/kFgzrTt798d2w/giphy.gif',
  ],
  pagar: [
    'https://media.giphy.com/media/26FPokl39a7lHMpTq/giphy.gif',
    'https://media.giphy.com/media/d2Z4rTi11c9LRita/giphy.gif',
    'https://media.giphy.com/media/xUPJPqpB6FiG01Cjh6/giphy.gif',
    'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    'https://media.giphy.com/media/TdfyKrN7HGTIY/giphy.gif',
    'https://media.giphy.com/media/Vccpm1O9gV1g4/giphy.gif',
  ],
};

function pickGif(key) {
  const list = GIFS[key];
  return list[Math.floor(Math.random() * list.length)];
}

const COL_OK   = 0x9B4FD6;
const COL_WARN = 0xF5C518;

const COIN = '<a:emoji_1:1516993823665033286>';

function makeEmbed(color, title, description) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
}

const DAILY_AMOUNT  = () => Math.floor(Math.random() * 501) + 500;
const WORK_AMOUNT   = () => Math.floor(Math.random() * 401) + 100;
const DAILY_CD      = 24 * 60 * 60 * 1000;
const WORK_CD       = 60 * 60 * 1000;

const WORK_MSGS = [
  'Você programou um bot de Discord',
  'Você fez uma entrega de pizza',
  'Você vendeu itens no marketplace',
  'Você deu aulas particulares online',
  'Você fez design para um cliente',
  'Você trabalhou no mercado',
  'Você fez transmissão ao vivo',
  'Você vendeu fotos de stock',
  'Você fez um freela de edição de vídeo',
  'Você dirigiu para o aplicativo',
  'Você fez suporte técnico remoto',
  'Você vendeu doces na escola',
  'Você fez traduções de texto',
  'Você editou fotos para um cliente',
  'Você gravou um podcast patrocinado',
];

async function getEco(userId, guildId) {
  return prisma.economy.upsert({
    where:  { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}

function msToHuman(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Sistema de economia do servidor')
    .addSubcommand(s => s.setName('daily').setDescription('💰 Colete sua recompensa diária'))
    .addSubcommand(s => s.setName('trabalho').setDescription('💼 Trabalhe para ganhar coins (1h cooldown)'))
    .addSubcommand(s => s.setName('pagar').setDescription('💸 Transfira coins para alguém')
      .addUserOption(o => o.setName('usuario').setDescription('Quem vai receber').setRequired(true))
      .addIntegerOption(o => o.setName('valor').setDescription('Quantidade').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('top').setDescription('🏆 Ranking de economia do servidor'))
    .addSubcommand(s => s.setName('depositar').setDescription('🏦 Depositar coins no banco')
      .addStringOption(o => o.setName('valor').setDescription('Valor ou "tudo"').setRequired(true)))
    .addSubcommand(s => s.setName('sacar').setDescription('🏧 Sacar coins do banco')
      .addStringOption(o => o.setName('valor').setDescription('Valor ou "tudo"').setRequired(true))),
  name: 'eco',
  aliases: ['economia', 'dinheiro', 'saldo'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── DAILY ──────────────────────────────────────────────────────────────
    if (sub === 'daily') {
      const eco   = await getEco(interaction.user.id, interaction.guildId);
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
      const now   = Date.now();
      const last  = eco.lastDaily?.getTime() ?? 0;
      const diff  = now - last;
      if (!isAdmin && diff < DAILY_CD) {
        return interaction.reply({ embeds: [makeEmbed(0xF85149, '⏳ Daily Indisponível', `Volte em **${msToHuman(DAILY_CD - diff)}** para coletar!`)], ephemeral: true });
      }
      const amount = DAILY_AMOUNT();
      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { balance: { increment: amount }, lastDaily: new Date() },
      });
      const embed = makeEmbed(COL_OK, '💰 Daily Coletado!',
        `Você recebeu **${amount.toLocaleString('pt-BR')} ${COIN}**!\n\n> ⏰ Volte em **24 horas** para coletar novamente.`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setImage(pickGif('daily'));
      return interaction.reply({ embeds: [embed] });
    }

    // ── TRABALHO ───────────────────────────────────────────────────────────
    if (sub === 'trabalho') {
      const eco     = await getEco(interaction.user.id, interaction.guildId);
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
      const now     = Date.now();
      const last    = eco.lastWork?.getTime() ?? 0;
      const diff    = now - last;
      if (!isAdmin && diff < WORK_CD) {
        return interaction.reply({ embeds: [makeEmbed(0xF85149, '😴 Você está cansado!', `Descanse mais **${msToHuman(WORK_CD - diff)}** antes de trabalhar novamente.`)], ephemeral: true });
      }
      const amount = WORK_AMOUNT();
      const msg    = WORK_MSGS[Math.floor(Math.random() * WORK_MSGS.length)];
      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { balance: { increment: amount }, lastWork: new Date() },
      });
      const embed = makeEmbed(COL_WARN, '💼 Trabalho Concluído!',
        `**${msg}** e ganhou **${amount.toLocaleString('pt-BR')} ${COIN}**!\n\n> 🕐 Volte em **1 hora** para trabalhar novamente.`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setImage(pickGif('work'));
      return interaction.reply({ embeds: [embed] });
    }

    // ── PAGAR ──────────────────────────────────────────────────────────────
    if (sub === 'pagar') {
      const target = interaction.options.getUser('usuario');
      const valor  = interaction.options.getInteger('valor');
      if (target.id === interaction.user.id) return interaction.reply({ embeds: [makeEmbed(0xF85149, '❌ Erro', 'Você não pode pagar a si mesmo.')], ephemeral: true });
      if (target.bot) return interaction.reply({ embeds: [makeEmbed(0xF85149, '❌ Erro', 'Não é possível pagar bots.')], ephemeral: true });

      const eco = await getEco(interaction.user.id, interaction.guildId);
      if (eco.balance < valor) return interaction.reply({ embeds: [makeEmbed(0xF85149, '❌ Saldo Insuficiente', `Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}** na carteira.`)], ephemeral: true });

      await getEco(target.id, interaction.guildId);
      await prisma.economy.update({ where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } }, data: { balance: { decrement: valor } } });
      await prisma.economy.update({ where: { userId_guildId: { userId: target.id,            guildId: interaction.guildId } }, data: { balance: { increment: valor } } });

      const embed = makeEmbed(COL_OK, '💸 Transferência Realizada!',
        `${interaction.user} enviou **${valor.toLocaleString('pt-BR')} ${COIN}** para ${target}!`)
        .setImage(pickGif('pagar'));
      return interaction.reply({ embeds: [embed] });
    }

    // ── TOP ────────────────────────────────────────────────────────────────
    if (sub === 'top') {
      await interaction.deferReply();
      const rows = await prisma.economy.findMany({
        where:   { guildId: interaction.guildId },
        orderBy: [{ balance: 'desc' }],
        take:    10,
      });
      if (!rows.length) return interaction.editReply({ embeds: [makeEmbed(0xF85149, '❌ Vazio', 'Ninguém tem coins ainda!')] });

      const entries = await Promise.all(rows.map(async (r, i) => {
        const member = await interaction.guild.members.fetch(r.userId).catch(() => null);
        return { rank: i + 1, username: member?.displayName ?? 'User', total: r.balance + r.bank };
      }));

      const buf = generateTopCard(entries);
      return interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'top.png' })] });
    }

    // ── DEPOSITAR ──────────────────────────────────────────────────────────
    if (sub === 'depositar') {
      const eco   = await getEco(interaction.user.id, interaction.guildId);
      const input = interaction.options.getString('valor').toLowerCase();
      const valor = input === 'tudo' ? eco.balance : parseInt(input);
      if (isNaN(valor) || valor <= 0) return interaction.reply({ embeds: [makeEmbed(0xF85149, '❌ Erro', 'Valor inválido.')], ephemeral: true });
      if (eco.balance < valor) return interaction.reply({ embeds: [makeEmbed(0xF85149, '❌ Saldo Insuficiente', `Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}** na carteira.`)], ephemeral: true });

      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { balance: { decrement: valor }, bank: { increment: valor } },
      });
      const embed = makeEmbed(0x58A6FF, '🏦 Depósito Realizado!',
        `**${valor.toLocaleString('pt-BR')} ${COIN}** depositados com segurança!\n\n> 🔒 Coins no banco estão protegidos de roubos.`)
        .setImage(pickGif('deposit'));
      return interaction.reply({ embeds: [embed] });
    }

    // ── SACAR ──────────────────────────────────────────────────────────────
    if (sub === 'sacar') {
      const eco   = await getEco(interaction.user.id, interaction.guildId);
      const input = interaction.options.getString('valor').toLowerCase();
      const valor = input === 'tudo' ? eco.bank : parseInt(input);
      if (isNaN(valor) || valor <= 0) return interaction.reply({ embeds: [makeEmbed(0xF85149, '❌ Erro', 'Valor inválido.')], ephemeral: true });
      if (eco.bank < valor) return interaction.reply({ embeds: [makeEmbed(0xF85149, '❌ Banco Insuficiente', `Você tem **${eco.bank.toLocaleString('pt-BR')} ${COIN}** no banco.`)], ephemeral: true });

      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { bank: { decrement: valor }, balance: { increment: valor } },
      });
      const embed = makeEmbed(COL_OK, '🏧 Saque Realizado!',
        `**${valor.toLocaleString('pt-BR')} ${COIN}** sacados para sua carteira!\n\n> 🪙 Pronto para apostar nos jogos.`)
        .setImage(pickGif('sacar'));
      return interaction.reply({ embeds: [embed] });
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase() ?? 'saldo';
    if (sub === 'saldo' || sub === 'bal') {
      const target    = message.mentions.users.first() ?? message.author;
      const eco       = await getEco(target.id, message.guildId);
      const member    = await message.guild.members.fetch(target.id).catch(() => null);
      const username  = member?.displayName ?? target.username;
      const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
      const buf = await generateBalanceCard({ username, avatarUrl, balance: eco.balance, bank: eco.bank });
      return message.reply({ files: [new AttachmentBuilder(buf, { name: 'saldo.png' })] });
    }
  },
};
