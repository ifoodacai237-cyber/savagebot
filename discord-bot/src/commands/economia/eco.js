import {
  SlashCommandBuilder,
  AttachmentBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
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
const COL_ERR  = 0xF85149;
const COL_BLUE = 0x58A6FF;

const COIN = '<a:emoji_1:1516993823665033286>';

// ─── V2 helpers ───────────────────────────────────────────────────────────────

function v2Rich({ text, color, thumbnailUrl, gifUrl }) {
  const c = new ContainerBuilder().setAccentColor(color);

  if (thumbnailUrl) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
    c.addSectionComponents(section);
  } else {
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  }

  if (gifUrl) {
    c.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(gifUrl)),
    );
  }

  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function v2Err(text) {
  const c = new ContainerBuilder().setAccentColor(COL_ERR);
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌  ${text}`));
  return { components: [c], flags: MessageFlags.IsComponentsV2, ephemeral: true };
}

// ─── Eco helpers ──────────────────────────────────────────────────────────────

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

function msToHuman(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
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
      const eco     = await getEco(interaction.user.id, interaction.guildId);
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
      const now     = Date.now();
      const last    = eco.lastDaily?.getTime() ?? 0;
      const diff    = now - last;
      if (!isAdmin && diff < DAILY_CD) {
        return interaction.reply({ ...v2Err(`Daily indisponível. Volte em **${msToHuman(DAILY_CD - diff)}**!`) });
      }
      const amount = DAILY_AMOUNT();
      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { balance: { increment: amount }, lastDaily: new Date() },
      });
      return interaction.reply(v2Rich({
        color: COL_OK,
        text: `## 💰 Daily Coletado!\nVocê recebeu **${amount.toLocaleString('pt-BR')} ${COIN}**!\n\n> ⏰ Volte em **24 horas** para coletar novamente.`,
        thumbnailUrl: interaction.user.displayAvatarURL(),
        gifUrl: pickGif('daily'),
      }));
    }

    // ── TRABALHO ───────────────────────────────────────────────────────────
    if (sub === 'trabalho') {
      const eco     = await getEco(interaction.user.id, interaction.guildId);
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
      const now     = Date.now();
      const last    = eco.lastWork?.getTime() ?? 0;
      const diff    = now - last;
      if (!isAdmin && diff < WORK_CD) {
        return interaction.reply({ ...v2Err(`Você está cansado! Descanse mais **${msToHuman(WORK_CD - diff)}** antes de trabalhar novamente.`) });
      }
      const amount = WORK_AMOUNT();
      const msg    = WORK_MSGS[Math.floor(Math.random() * WORK_MSGS.length)];
      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { balance: { increment: amount }, lastWork: new Date() },
      });
      return interaction.reply(v2Rich({
        color: COL_WARN,
        text: `## 💼 Trabalho Concluído!\n**${msg}** e ganhou **${amount.toLocaleString('pt-BR')} ${COIN}**!\n\n> 🕐 Volte em **1 hora** para trabalhar novamente.`,
        thumbnailUrl: interaction.user.displayAvatarURL(),
        gifUrl: pickGif('work'),
      }));
    }

    // ── PAGAR ──────────────────────────────────────────────────────────────
    if (sub === 'pagar') {
      const target = interaction.options.getUser('usuario');
      const valor  = interaction.options.getInteger('valor');
      if (target.id === interaction.user.id) return interaction.reply({ ...v2Err('Você não pode pagar a si mesmo.') });
      if (target.bot) return interaction.reply({ ...v2Err('Não é possível pagar bots.') });
      const eco = await getEco(interaction.user.id, interaction.guildId);
      if (eco.balance < valor) return interaction.reply({ ...v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}** na carteira.`) });
      await getEco(target.id, interaction.guildId);
      await prisma.economy.update({ where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } }, data: { balance: { decrement: valor } } });
      await prisma.economy.update({ where: { userId_guildId: { userId: target.id,            guildId: interaction.guildId } }, data: { balance: { increment: valor } } });
      return interaction.reply(v2Rich({
        color: COL_OK,
        text: `## 💸 Transferência Realizada!\n${interaction.user} enviou **${valor.toLocaleString('pt-BR')} ${COIN}** para ${target}!`,
        gifUrl: pickGif('pagar'),
      }));
    }

    // ── TOP ────────────────────────────────────────────────────────────────
    if (sub === 'top') {
      await interaction.deferReply();
      const rows = await prisma.economy.findMany({
        where:   { guildId: interaction.guildId },
        orderBy: [{ balance: 'desc' }],
        take:    10,
      });
      if (!rows.length) return interaction.editReply({ ...v2Err('Ninguém tem coins ainda!') });
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
      if (isNaN(valor) || valor <= 0) return interaction.reply({ ...v2Err('Valor inválido.') });
      if (eco.balance < valor) return interaction.reply({ ...v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}** na carteira.`) });
      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { balance: { decrement: valor }, bank: { increment: valor } },
      });
      return interaction.reply(v2Rich({
        color: COL_BLUE,
        text: `## 🏦 Depósito Realizado!\n**${valor.toLocaleString('pt-BR')} ${COIN}** depositados com segurança!\n\n> 🔒 Coins no banco estão protegidos de roubos.`,
        gifUrl: pickGif('deposit'),
      }));
    }

    // ── SACAR ──────────────────────────────────────────────────────────────
    if (sub === 'sacar') {
      const eco   = await getEco(interaction.user.id, interaction.guildId);
      const input = interaction.options.getString('valor').toLowerCase();
      const valor = input === 'tudo' ? eco.bank : parseInt(input);
      if (isNaN(valor) || valor <= 0) return interaction.reply({ ...v2Err('Valor inválido.') });
      if (eco.bank < valor) return interaction.reply({ ...v2Err(`Banco insuficiente. Você tem **${eco.bank.toLocaleString('pt-BR')} ${COIN}** no banco.`) });
      await prisma.economy.update({
        where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        data:  { bank: { decrement: valor }, balance: { increment: valor } },
      });
      return interaction.reply(v2Rich({
        color: COL_OK,
        text: `## 🏧 Saque Realizado!\n**${valor.toLocaleString('pt-BR')} ${COIN}** sacados para sua carteira!\n\n> 🪙 Pronto para apostar nos jogos.`,
        gifUrl: pickGif('sacar'),
      }));
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase() ?? 'saldo';

    const replyV2 = payload => message.reply(payload);

    // ── SALDO ──────────────────────────────────────────────────────────────
    if (sub === 'saldo' || sub === 'bal' || sub === 'carteira') {
      const target    = message.mentions.users.first() ?? message.author;
      const eco       = await getEco(target.id, message.guildId);
      const member    = await message.guild.members.fetch(target.id).catch(() => null);
      const username  = member?.displayName ?? target.username;
      const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
      const buf = await generateBalanceCard({ username, avatarUrl, balance: eco.balance, bank: eco.bank });
      return message.reply({ files: [new AttachmentBuilder(buf, { name: 'saldo.png' })] });
    }

    // ── DAILY ──────────────────────────────────────────────────────────────
    if (sub === 'daily' || sub === 'd' || sub === 'diario') {
      const eco     = await getEco(message.author.id, message.guildId);
      const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
      const now     = Date.now();
      const last    = eco.lastDaily?.getTime() ?? 0;
      const diff    = now - last;
      if (!isAdmin && diff < DAILY_CD) {
        return replyV2(v2Err(`Daily indisponível. Volte em **${msToHuman(DAILY_CD - diff)}**!`));
      }
      const amount = DAILY_AMOUNT();
      await prisma.economy.update({
        where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
        data:  { balance: { increment: amount }, lastDaily: new Date() },
      });
      return replyV2(v2Rich({
        color: COL_OK,
        text: `## 💰 Daily Coletado!\nVocê recebeu **${amount.toLocaleString('pt-BR')} ${COIN}**!\n\n> ⏰ Volte em **24 horas** para coletar novamente.`,
        thumbnailUrl: message.author.displayAvatarURL(),
        gifUrl: pickGif('daily'),
      }));
    }

    // ── TRABALHO ───────────────────────────────────────────────────────────
    if (sub === 'trabalho' || sub === 'trab' || sub === 'work') {
      const eco     = await getEco(message.author.id, message.guildId);
      const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
      const now     = Date.now();
      const last    = eco.lastWork?.getTime() ?? 0;
      const diff    = now - last;
      if (!isAdmin && diff < WORK_CD) {
        return replyV2(v2Err(`Você está cansado! Descanse mais **${msToHuman(WORK_CD - diff)}** antes de trabalhar novamente.`));
      }
      const amount = WORK_AMOUNT();
      const msg    = WORK_MSGS[Math.floor(Math.random() * WORK_MSGS.length)];
      await prisma.economy.update({
        where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
        data:  { balance: { increment: amount }, lastWork: new Date() },
      });
      return replyV2(v2Rich({
        color: COL_WARN,
        text: `## 💼 Trabalho Concluído!\n**${msg}** e ganhou **${amount.toLocaleString('pt-BR')} ${COIN}**!\n\n> 🕐 Volte em **1 hora** para trabalhar novamente.`,
        thumbnailUrl: message.author.displayAvatarURL(),
        gifUrl: pickGif('work'),
      }));
    }

    // ── PAGAR ──────────────────────────────────────────────────────────────
    if (sub === 'pagar' || sub === 'pay' || sub === 'transferir') {
      const target = message.mentions.users.first();
      const valor  = parseInt(args[2] ?? args[1]);
      if (!target) return replyV2(v2Err('Mencione o usuário. Ex: `fallen eco pagar @user 500`'));
      if (target.id === message.author.id) return replyV2(v2Err('Você não pode pagar a si mesmo.'));
      if (target.bot) return replyV2(v2Err('Não é possível pagar bots.'));
      if (isNaN(valor) || valor <= 0) return replyV2(v2Err('Informe o valor. Ex: `fallen eco pagar @user 500`'));
      const eco = await getEco(message.author.id, message.guildId);
      if (eco.balance < valor) return replyV2(v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}** na carteira.`));
      await getEco(target.id, message.guildId);
      await prisma.economy.update({ where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } }, data: { balance: { decrement: valor } } });
      await prisma.economy.update({ where: { userId_guildId: { userId: target.id,           guildId: message.guildId } }, data: { balance: { increment: valor } } });
      return replyV2(v2Rich({
        color: COL_OK,
        text: `## 💸 Transferência Realizada!\n${message.author} enviou **${valor.toLocaleString('pt-BR')} ${COIN}** para ${target}!`,
        gifUrl: pickGif('pagar'),
      }));
    }

    // ── TOP ────────────────────────────────────────────────────────────────
    if (sub === 'top' || sub === 'ranking' || sub === 'rank') {
      const rows = await prisma.economy.findMany({
        where:   { guildId: message.guildId },
        orderBy: [{ balance: 'desc' }],
        take:    10,
      });
      if (!rows.length) return replyV2(v2Err('Ninguém tem coins ainda!'));
      const entries = await Promise.all(rows.map(async (r, i) => {
        const member = await message.guild.members.fetch(r.userId).catch(() => null);
        return { rank: i + 1, username: member?.displayName ?? 'User', total: r.balance + r.bank };
      }));
      const buf = generateTopCard(entries);
      return message.reply({ files: [new AttachmentBuilder(buf, { name: 'top.png' })] });
    }

    // ── DEPOSITAR ──────────────────────────────────────────────────────────
    if (sub === 'depositar' || sub === 'dep' || sub === 'deposito') {
      const eco   = await getEco(message.author.id, message.guildId);
      const input = (args[1] ?? '').toLowerCase();
      const valor = input === 'tudo' ? eco.balance : parseInt(input);
      if (isNaN(valor) || valor <= 0) return replyV2(v2Err('Informe o valor ou "tudo". Ex: `fallen eco dep 1000`'));
      if (eco.balance < valor) return replyV2(v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}** na carteira.`));
      await prisma.economy.update({
        where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
        data:  { balance: { decrement: valor }, bank: { increment: valor } },
      });
      return replyV2(v2Rich({
        color: COL_BLUE,
        text: `## 🏦 Depósito Realizado!\n**${valor.toLocaleString('pt-BR')} ${COIN}** depositados com segurança!\n\n> 🔒 Coins no banco estão protegidos de roubos.`,
        gifUrl: pickGif('deposit'),
      }));
    }

    // ── SACAR ──────────────────────────────────────────────────────────────
    if (sub === 'sacar' || sub === 'saque' || sub === 'withdraw') {
      const eco   = await getEco(message.author.id, message.guildId);
      const input = (args[1] ?? '').toLowerCase();
      const valor = input === 'tudo' ? eco.bank : parseInt(input);
      if (isNaN(valor) || valor <= 0) return replyV2(v2Err('Informe o valor ou "tudo". Ex: `fallen eco saque 1000`'));
      if (eco.bank < valor) return replyV2(v2Err(`Banco insuficiente. Você tem **${eco.bank.toLocaleString('pt-BR')} ${COIN}** no banco.`));
      await prisma.economy.update({
        where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
        data:  { bank: { decrement: valor }, balance: { increment: valor } },
      });
      return replyV2(v2Rich({
        color: COL_OK,
        text: `## 🏧 Saque Realizado!\n**${valor.toLocaleString('pt-BR')} ${COIN}** sacados para sua carteira!\n\n> 🪙 Pronto para apostar nos jogos.`,
        gifUrl: pickGif('sacar'),
      }));
    }

    // ── AJUDA ──────────────────────────────────────────────────────────────
    return replyV2(v2Rich({
      color: COL_OK,
      text: `## 💰 Eco — Comandos de Prefixo\n\`fallen eco saldo [@user]\` — ver saldo\n\`fallen eco daily\` — recompensa diária\n\`fallen eco trabalho\` — trabalhar (1h cooldown)\n\`fallen eco pagar @user <valor>\` — transferir coins\n\`fallen eco top\` — ranking do servidor\n\`fallen eco dep <valor|tudo>\` — depositar no banco\n\`fallen eco sacar <valor|tudo>\` — sacar do banco`,
    }));
  },
};
