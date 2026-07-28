import {
  SlashCommandBuilder,
  AttachmentBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
import { getEmoji } from '../../utils/emojiManager.js';
import { generateBalanceCard, generateTopCard } from '../../utils/economyCards.js';

// ─── Emojis — resolvidos como application emojis (sem dependência de boost) ──
const COIN = () => getEmoji('futecoins');
const CAL  = () => getEmoji('calendario');
const STAR = () => getEmoji('4branco_estrela');
const CLK  = () => getEmoji('relogio');

// ─── V2 helpers ───────────────────────────────────────────────────────────────

function v2Rich(text) {
  const c = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function v2Err(text) {
  const c = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌  ${text}`));
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

// ─── /saldo ───────────────────────────────────────────────────────────────────
const cmdSaldo = {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('💰 Veja seu saldo de coins (ou de outro membro)')
    .addUserOption(o => o.setName('usuario').setDescription('Membro alvo (opcional)')),
  name: 'saldo',
  aliases: ['eco', 'economia', 'dinheiro', 'bal', 'carteira'],

  async execute(interaction) {
    const target    = interaction.options.getUser('usuario') ?? interaction.user;
    const eco       = await getEco(target.id, interaction.guildId);
    const member    = await interaction.guild.members.fetch(target.id).catch(() => null);
    const username  = member?.displayName ?? target.username;
    const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
    const buf = await generateBalanceCard({ username, avatarUrl, balance: eco.balance, bank: eco.bank });
    return interaction.reply({ files: [new AttachmentBuilder(buf, { name: 'saldo.png' })] });
  },

  async executePrefix(message, args) {
    const target    = message.mentions.users.first() ?? message.author;
    const eco       = await getEco(target.id, message.guildId);
    const member    = await message.guild.members.fetch(target.id).catch(() => null);
    const username  = member?.displayName ?? target.username;
    const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
    const buf = await generateBalanceCard({ username, avatarUrl, balance: eco.balance, bank: eco.bank });
    return message.reply({ files: [new AttachmentBuilder(buf, { name: 'saldo.png' })] });
  },
};

// ─── /daily ───────────────────────────────────────────────────────────────────
const cmdDaily = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('💰 Colete sua recompensa diária'),
  name: 'daily',
  aliases: ['diario', 'd'],

  async execute(interaction) {
    const eco     = await getEco(interaction.user.id, interaction.guildId);
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
    const now     = Date.now();
    const last    = eco.lastDaily?.getTime() ?? 0;
    const diff    = now - last;
    if (!isAdmin && diff < DAILY_CD)
      return interaction.reply({ ...v2Err(`Daily indisponível. Volte em **${msToHuman(DAILY_CD - diff)}**!`) });
    const streak = diff < 48 * 60 * 60 * 1000 ? (eco.dailyStreak ?? 0) + 1 : 1;
    const bonus  = Math.min(streak, 30) * 0.02;
    const base   = DAILY_AMOUNT();
    const amount = Math.floor(base * (1 + bonus));
    await prisma.economy.update({
      where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
      data:  { balance: { increment: amount }, lastDaily: new Date(), dailyStreak: streak },
    });
    return interaction.reply(v2Rich(
      `## ✨ ${CAL()} Daily resgatado\n` +
      `${COIN()} **+${amount.toLocaleString('pt-BR')}**\n` +
      `${STAR()} Streak: **${streak}d** (+${Math.round(bonus * 100)}%)\n\n` +
      `${CLK()} Próximo em **24h base**`
    ));
  },

  async executePrefix(message) {
    const eco     = await getEco(message.author.id, message.guildId);
    const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
    const now     = Date.now();
    const last    = eco.lastDaily?.getTime() ?? 0;
    const diff    = now - last;
    if (!isAdmin && diff < DAILY_CD)
      return message.reply(v2Err(`Daily indisponível. Volte em **${msToHuman(DAILY_CD - diff)}**!`));
    const streak = diff < 48 * 60 * 60 * 1000 ? (eco.dailyStreak ?? 0) + 1 : 1;
    const bonus  = Math.min(streak, 30) * 0.02;
    const base   = DAILY_AMOUNT();
    const amount = Math.floor(base * (1 + bonus));
    await prisma.economy.update({
      where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
      data:  { balance: { increment: amount }, lastDaily: new Date(), dailyStreak: streak },
    });
    return message.reply(v2Rich(
      `## ✨ ${CAL()} Daily resgatado\n` +
      `${COIN()} **+${amount.toLocaleString('pt-BR')}**\n` +
      `${STAR()} Streak: **${streak}d** (+${Math.round(bonus * 100)}%)\n\n` +
      `${CLK()} Próximo em **24h base**`
    ));
  },
};

// ─── /trabalho ────────────────────────────────────────────────────────────────
const cmdTrabalho = {
  data: new SlashCommandBuilder()
    .setName('trabalho')
    .setDescription('💼 Trabalhe para ganhar coins (1h cooldown)'),
  name: 'trabalho',
  aliases: ['trab', 'work'],

  async execute(interaction) {
    const eco     = await getEco(interaction.user.id, interaction.guildId);
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
    const now     = Date.now();
    const last    = eco.lastWork?.getTime() ?? 0;
    const diff    = now - last;
    if (!isAdmin && diff < WORK_CD)
      return interaction.reply({ ...v2Err(`Você está cansado! Descanse mais **${msToHuman(WORK_CD - diff)}** antes de trabalhar novamente.`) });
    const amount = WORK_AMOUNT();
    const msg    = WORK_MSGS[Math.floor(Math.random() * WORK_MSGS.length)];
    await prisma.economy.update({
      where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
      data:  { balance: { increment: amount }, lastWork: new Date() },
    });
    return interaction.reply(v2Rich(
      `## 💼 Trabalho Concluído!\n` +
      `**${msg}** e ganhou ${COIN()} **${amount.toLocaleString('pt-BR')}**!\n\n` +
      `${CLK()} Volte em **1 hora** para trabalhar novamente.`
    ));
  },

  async executePrefix(message) {
    const eco     = await getEco(message.author.id, message.guildId);
    const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
    const now     = Date.now();
    const last    = eco.lastWork?.getTime() ?? 0;
    const diff    = now - last;
    if (!isAdmin && diff < WORK_CD)
      return message.reply(v2Err(`Você está cansado! Descanse mais **${msToHuman(WORK_CD - diff)}** antes de trabalhar novamente.`));
    const amount = WORK_AMOUNT();
    const msg    = WORK_MSGS[Math.floor(Math.random() * WORK_MSGS.length)];
    await prisma.economy.update({
      where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
      data:  { balance: { increment: amount }, lastWork: new Date() },
    });
    return message.reply(v2Rich(
      `## 💼 Trabalho Concluído!\n` +
      `**${msg}** e ganhou ${COIN()} **${amount.toLocaleString('pt-BR')}**!\n\n` +
      `${CLK()} Volte em **1 hora** para trabalhar novamente.`
    ));
  },
};

// ─── /pagar ───────────────────────────────────────────────────────────────────
const cmdPagar = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('💸 Transfira coins para alguém')
    .addUserOption(o => o.setName('usuario').setDescription('Quem vai receber').setRequired(true))
    .addIntegerOption(o => o.setName('valor').setDescription('Quantidade').setRequired(true).setMinValue(1)),
  name: 'pagar',
  aliases: ['pay', 'transferir'],

  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const valor  = interaction.options.getInteger('valor');
    if (target.id === interaction.user.id) return interaction.reply(v2Err('Você não pode pagar a si mesmo.'));
    if (target.bot) return interaction.reply(v2Err('Não é possível pagar bots.'));
    const eco = await getEco(interaction.user.id, interaction.guildId);
    if (eco.balance < valor) return interaction.reply(v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')}** ${COIN()} na carteira.`));
    const taxa   = Math.floor(valor * 0.03);
    const recebe = valor - taxa;
    await getEco(target.id, interaction.guildId);
    await prisma.economy.update({ where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } }, data: { balance: { decrement: valor } } });
    await prisma.economy.update({ where: { userId_guildId: { userId: target.id,            guildId: interaction.guildId } }, data: { balance: { increment: recebe } } });
    return interaction.reply(v2Rich(
      `## ✅ Transferência concluída\n` +
      `${interaction.user} enviou ${COIN()} **${valor.toLocaleString('pt-BR')}** para ${target}.\n` +
      `${COIN()} Taxa de 3%: **${taxa.toLocaleString('pt-BR')}**\n` +
      `${COIN()} ${target.username} recebeu: **${recebe.toLocaleString('pt-BR')}**`
    ));
  },

  async executePrefix(message, args) {
    const target = message.mentions.users.first();
    const valor  = parseInt(args[2] ?? args[1]);
    if (!target) return message.reply(v2Err('Mencione o usuário. Ex: `savage pagar @user 500`'));
    if (target.id === message.author.id) return message.reply(v2Err('Você não pode pagar a si mesmo.'));
    if (target.bot) return message.reply(v2Err('Não é possível pagar bots.'));
    if (isNaN(valor) || valor <= 0) return message.reply(v2Err('Informe o valor. Ex: `savage pagar @user 500`'));
    const eco = await getEco(message.author.id, message.guildId);
    if (eco.balance < valor) return message.reply(v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')}** ${COIN()} na carteira.`));
    const taxa   = Math.floor(valor * 0.03);
    const recebe = valor - taxa;
    await getEco(target.id, message.guildId);
    await prisma.economy.update({ where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } }, data: { balance: { decrement: valor } } });
    await prisma.economy.update({ where: { userId_guildId: { userId: target.id,           guildId: message.guildId } }, data: { balance: { increment: recebe } } });
    return message.reply(v2Rich(
      `## ✅ Transferência concluída\n` +
      `${message.author} enviou ${COIN()} **${valor.toLocaleString('pt-BR')}** para ${target}.\n` +
      `${COIN()} Taxa de 3%: **${taxa.toLocaleString('pt-BR')}**\n` +
      `${COIN()} ${target.username} recebeu: **${recebe.toLocaleString('pt-BR')}**`
    ));
  },
};

// ─── /top ─────────────────────────────────────────────────────────────────────
const cmdTop = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('🏆 Ranking de economia do servidor'),
  name: 'top',
  aliases: ['ranking', 'rank'],

  async execute(interaction) {
    await interaction.deferReply();
    const allRows = await prisma.economy.findMany({ where: { guildId: interaction.guildId } });
    const rows = allRows.sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank)).slice(0, 10);
    if (!rows.length) return interaction.editReply(v2Err('Ninguém tem coins ainda!'));
    const entries = await Promise.all(rows.map(async (r, i) => {
      const member = await interaction.guild.members.fetch(r.userId).catch(() => null);
      return { rank: i + 1, username: member?.displayName ?? 'User', total: r.balance + r.bank, avatarUrl: member?.displayAvatarURL({ extension: 'png', size: 256 }) ?? null };
    }));
    const buf = await generateTopCard(entries);
    return interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'top.png' })] });
  },

  async executePrefix(message) {
    const allRows = await prisma.economy.findMany({ where: { guildId: message.guildId } });
    const rows = allRows.sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank)).slice(0, 10);
    if (!rows.length) return message.reply(v2Err('Ninguém tem coins ainda!'));
    const entries = await Promise.all(rows.map(async (r, i) => {
      const member = await message.guild.members.fetch(r.userId).catch(() => null);
      return { rank: i + 1, username: member?.displayName ?? 'User', total: r.balance + r.bank, avatarUrl: member?.displayAvatarURL({ extension: 'png', size: 256 }) ?? null };
    }));
    const buf = await generateTopCard(entries);
    return message.reply({ files: [new AttachmentBuilder(buf, { name: 'top.png' })] });
  },
};

// ─── /depositar ───────────────────────────────────────────────────────────────
const cmdDepositar = {
  data: new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('🏦 Depositar coins no banco')
    .addStringOption(o => o.setName('valor').setDescription('Valor ou "tudo"').setRequired(true)),
  name: 'depositar',
  aliases: ['dep', 'deposito'],

  async execute(interaction) {
    const eco   = await getEco(interaction.user.id, interaction.guildId);
    const input = interaction.options.getString('valor').toLowerCase();
    const valor = input === 'tudo' ? eco.balance : parseInt(input);
    if (isNaN(valor) || valor <= 0) return interaction.reply(v2Err('Valor inválido.'));
    if (eco.balance < valor) return interaction.reply(v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')}** ${COIN()} na carteira.`));
    await prisma.economy.update({
      where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
      data:  { balance: { decrement: valor }, bank: { increment: valor } },
    });
    return interaction.reply(v2Rich(
      `## 🏦 Depósito Realizado!\n` +
      `${COIN()} **${valor.toLocaleString('pt-BR')}** depositados com segurança!\n\n` +
      `🔒 Coins no banco estão protegidos de roubos.`
    ));
  },

  async executePrefix(message, args) {
    const eco   = await getEco(message.author.id, message.guildId);
    const input = (args[0] ?? '').toLowerCase();
    const valor = input === 'tudo' ? eco.balance : parseInt(input);
    if (isNaN(valor) || valor <= 0) return message.reply(v2Err('Informe o valor ou "tudo". Ex: `savage depositar 1000`'));
    if (eco.balance < valor) return message.reply(v2Err(`Saldo insuficiente. Você tem **${eco.balance.toLocaleString('pt-BR')}** ${COIN()} na carteira.`));
    await prisma.economy.update({
      where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
      data:  { balance: { decrement: valor }, bank: { increment: valor } },
    });
    return message.reply(v2Rich(
      `## 🏦 Depósito Realizado!\n` +
      `${COIN()} **${valor.toLocaleString('pt-BR')}** depositados com segurança!\n\n` +
      `🔒 Coins no banco estão protegidos de roubos.`
    ));
  },
};

// ─── /sacar ───────────────────────────────────────────────────────────────────
const cmdSacar = {
  data: new SlashCommandBuilder()
    .setName('sacar')
    .setDescription('🏧 Sacar coins do banco')
    .addStringOption(o => o.setName('valor').setDescription('Valor ou "tudo"').setRequired(true)),
  name: 'sacar',
  aliases: ['saque', 'withdraw'],

  async execute(interaction) {
    const eco   = await getEco(interaction.user.id, interaction.guildId);
    const input = interaction.options.getString('valor').toLowerCase();
    const valor = input === 'tudo' ? eco.bank : parseInt(input);
    if (isNaN(valor) || valor <= 0) return interaction.reply(v2Err('Valor inválido.'));
    if (eco.bank < valor) return interaction.reply(v2Err(`Banco insuficiente. Você tem **${eco.bank.toLocaleString('pt-BR')}** ${COIN()} no banco.`));
    await prisma.economy.update({
      where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
      data:  { bank: { decrement: valor }, balance: { increment: valor } },
    });
    return interaction.reply(v2Rich(
      `## 🏧 Saque Realizado!\n` +
      `${COIN()} **${valor.toLocaleString('pt-BR')}** sacados para sua carteira!\n\n` +
      `🎰 Pronto para apostar nos jogos.`
    ));
  },

  async executePrefix(message, args) {
    const eco   = await getEco(message.author.id, message.guildId);
    const input = (args[0] ?? '').toLowerCase();
    const valor = input === 'tudo' ? eco.bank : parseInt(input);
    if (isNaN(valor) || valor <= 0) return message.reply(v2Err('Informe o valor ou "tudo". Ex: `savage sacar 1000`'));
    if (eco.bank < valor) return message.reply(v2Err(`Banco insuficiente. Você tem **${eco.bank.toLocaleString('pt-BR')}** ${COIN()} no banco.`));
    await prisma.economy.update({
      where: { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
      data:  { bank: { decrement: valor }, balance: { increment: valor } },
    });
    return message.reply(v2Rich(
      `## 🏧 Saque Realizado!\n` +
      `${COIN()} **${valor.toLocaleString('pt-BR')}** sacados para sua carteira!\n\n` +
      `🎰 Pronto para apostar nos jogos.`
    ));
  },
};

export default [cmdSaldo, cmdDaily, cmdTrabalho, cmdPagar, cmdTop, cmdDepositar, cmdSacar];
