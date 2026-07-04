import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
import { generateBalanceCard } from '../../utils/economyCards.js';
import { generateProfileCard }         from '../../utils/profileCard.js';
import { generateAnimatedProfileCard, isGifUrl } from '../../utils/animatedProfileCard.js';
import { resolveBanner } from '../../utils/shopData.js';

// ─── Duração VIP ─────────────────────────────────────────────────────────────

function parseDuration(str) {
  const match = str?.match(/^(\d+)(d|h|m)$/i);
  if (!match) return null;
  const val  = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'm') return val * 60 * 1000;
  return null;
}

function humanDuration(ms) {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d} dia${d > 1 ? 's' : ''}${h > 0 ? ` e ${h}h` : ''}`;
  if (h > 0) return `${h}h${m > 0 ? ` e ${m}m` : ''}`;
  return `${m} minuto${m !== 1 ? 's' : ''}`;
}

// ─── Card de carteira ─────────────────────────────────────────────────────────

async function buildWalletCard(userId, guildId, guild, avatarUrl) {
  const [eco, profile] = await Promise.all([
    prisma.economy.findFirst({ where: { userId, guildId } }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);
  const member   = await guild.members.fetch(userId).catch(() => null);
  const username = member?.displayName ?? 'Usuario';
  const buf = await generateBalanceCard({
    username,
    avatarUrl,
    balance:        eco?.balance          ?? 0,
    bank:           eco?.bank             ?? 0,
    cardBg1:        profile?.cardBg1      ?? null,
    cardBg2:        profile?.cardBg2      ?? null,
    cardPanelColor: profile?.cardPanelColor ?? null,
    ringBorderColor: profile?.ringBorderColor ?? null,
  });
  return new AttachmentBuilder(buf, { name: 'carteira.png' });
}

// ─── Card de perfil (mesma lógica do /perfil) ─────────────────────────────────

async function buildProfileCard(userId, guildId, guild, target) {
  const [eco, profile, purchases] = await Promise.all([
    prisma.economy.findUnique({ where: { userId_guildId: { userId, guildId } } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.userPurchase.count({ where: { userId } }),
  ]);
  const member = await guild.members.fetch(userId).catch(() => null);

  let activePetEmoji = null;
  if (profile?.activePet) {
    const pet = await prisma.pet.findUnique({ where: { id: profile.activePet } }).catch(() => null);
    activePetEmoji = pet?.emoji ?? null;
  }

  const cardParams = {
    username:        member?.displayName ?? target.username,
    avatarUrl:       target.displayAvatarURL({ extension: 'png', size: 256 }),
    balance:         eco?.balance          ?? 0,
    bank:            eco?.bank             ?? 0,
    xp:              eco?.xp               ?? 0,
    activeBanner:    profile?.activeBanner  ?? null,
    activeRing:      profile?.activeRing    ?? null,
    ringBorderColor: profile?.ringBorderColor ?? null,
    activePet:       activePetEmoji,
    marriedToName:   profile?.marriedToName  ?? null,
    bestFriendName:  profile?.bestFriendName ?? null,
    reps:            profile?.reps           ?? 0,
    bio:             profile?.bio            ?? null,
    cardBg1:         profile?.cardBg1        ?? null,
    cardBg2:         profile?.cardBg2        ?? null,
    cardPanelColor:  profile?.cardPanelColor ?? null,
    purchases,
    guildBadgeEmojis: {},
    guildId,
  };

  const bannerObj   = await resolveBanner(cardParams.activeBanner, guildId);
  const bannerIsGif = bannerObj?.imageUrl ? await isGifUrl(bannerObj.imageUrl) : false;

  if (bannerIsGif) {
    return { buf: await generateAnimatedProfileCard(cardParams), filename: 'perfil.gif' };
  }
  return { buf: await generateProfileCard(cardParams), filename: 'perfil.png' };
}

// ─── Botões de customização (mesmos do /perfil) ───────────────────────────────

function walletButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile_ring_btn').setLabel('Argola').setEmoji('💠').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile_bg_btn').setLabel('Fundo').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile_panel_btn').setLabel('Painel').setEmoji('🟦').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function profileButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile_banner_btn').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile_ring_btn').setLabel('Argola').setEmoji('💠').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile_bg_btn').setLabel('Fundo').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile_panel_btn').setLabel('Painel').setEmoji('🟦').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile_pet_btn').setLabel('Pet').setEmoji('🐾').setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile_conquistas_btn').setLabel('Conquistas').setEmoji('🏅').setStyle(ButtonStyle.Primary),
    ),
  ];
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default {
  name: 'pf',
  aliases: ['carteira'],

  data: new SlashCommandBuilder()
    .setName('carteira')
    .setDescription('Carteira de economia com personalização')
    .addSubcommand(s => s
      .setName('ver')
      .setDescription('Ver saldo de alguém')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario (padrão: você)')))
    .addSubcommand(s => s
      .setName('vip')
      .setDescription('Dar cargo VIP temporário a um membro')
      .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
      .addStringOption(o => o.setName('tempo').setDescription('Duração (ex: 30d, 12h, 60m)').setRequired(true))
      .addRoleOption(o => o.setName('cargo').setDescription('Cargo VIP a dar').setRequired(true))),

  // ─── Slash ─────────────────────────────────────────────────────────────────

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // /carteira ver
    if (sub === 'ver') {
      await interaction.deferReply();
      const target    = interaction.options.getUser('usuario') ?? interaction.user;
      const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
      const file = await buildWalletCard(target.id, interaction.guildId, interaction.guild, avatarUrl);
      return interaction.editReply({ files: [file], components: target.id === interaction.user.id ? walletButtons() : [] });
    }

    // /carteira vip
    if (sub === 'vip') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ content: '❌ Você precisa da permissão **Gerenciar Servidor**.', ephemeral: true });

      const target   = interaction.options.getUser('usuario');
      const tempoStr = interaction.options.getString('tempo');
      const role     = interaction.options.getRole('cargo');
      const ms       = parseDuration(tempoStr);

      if (!ms) return interaction.reply({ content: '❌ Formato inválido. Use: 30d, 12h, 60m', ephemeral: true });

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ Membro não encontrado no servidor.', ephemeral: true });

      const expiresAt = new Date(Date.now() + ms);
      await member.roles.add(role.id).catch(() => {});
      await prisma.vipGrant.upsert({
        where:  { guildId_userId_roleId: { guildId: interaction.guildId, userId: target.id, roleId: role.id } },
        create: { guildId: interaction.guildId, userId: target.id, roleId: role.id, expiresAt },
        update: { expiresAt },
      });

      const ts = Math.floor(expiresAt.getTime() / 1000);
      return interaction.reply({
        content: `✅ **${member.displayName}** recebeu o cargo **${role.name}** por **${humanDuration(ms)}**!\nExpira: <t:${ts}:F> (<t:${ts}:R>)`,
      });
    }
  },

  // ─── Prefix ────────────────────────────────────────────────────────────────

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();

    // fallen pf vip @user 30d @cargo
    if (sub === 'vip') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return message.reply('❌ Você precisa da permissão **Gerenciar Servidor** para usar esse comando.');

      const target     = message.mentions.users.first();
      const roleTarget = message.mentions.roles.first();
      const tempoStr   = args.find(a => /^\d+[dhm]$/i.test(a));

      if (!target || !roleTarget)
        return message.reply('❌ Use: `fallen pf vip @user 30d @cargo`');

      const ms = parseDuration(tempoStr ?? '');
      if (!ms) return message.reply('❌ Formato inválido. Use: 30d, 12h, 60m');

      const member = await message.guild.members.fetch(target.id).catch(() => null);
      if (!member) return message.reply('❌ Membro não encontrado.');

      const expiresAt = new Date(Date.now() + ms);
      await member.roles.add(roleTarget.id).catch(() => {});
      await prisma.vipGrant.upsert({
        where:  { guildId_userId_roleId: { guildId: message.guildId, userId: target.id, roleId: roleTarget.id } },
        create: { guildId: message.guildId, userId: target.id, roleId: roleTarget.id, expiresAt },
        update: { expiresAt },
      });

      const ts = Math.floor(expiresAt.getTime() / 1000);
      return message.reply(
        `✅ **${member.displayName}** recebeu o cargo **${roleTarget.name}** por **${humanDuration(ms)}**!\nExpira: <t:${ts}:F> (<t:${ts}:R>)`,
      );
    }

    // fallen pf [@user] → perfil completo (mesma lógica do /perfil)
    const target = message.mentions.users.first() ?? message.author;
    const { buf, filename } = await buildProfileCard(target.id, message.guildId, message.guild, target);
    const attachment = new AttachmentBuilder(buf, { name: filename });

    return message.reply({
      files: [attachment],
      components: target.id === message.author.id ? profileButtons() : [],
    });
  },
};
