import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { generateProfileCard } from '../../utils/profileCard.js';

async function getGuildBadgeEmojis(guildId) {
  const overrides = await prisma.guildBadgeEmoji.findMany({ where: { guildId } }).catch(() => []);
  const map = {};
  for (const o of overrides) map[o.badgeKey] = o.emoji;
  return map;
}

async function fetchProfileData(userId, guildId) {
  const [eco, profile, purchases, guildBadgeEmojis] = await Promise.all([
    prisma.economy.findUnique({ where: { userId_guildId: { userId, guildId } } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.userPurchase.count({ where: { userId } }),
    getGuildBadgeEmojis(guildId),
  ]);
  return { eco, profile, purchases, guildBadgeEmojis };
}

export default {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('🪪 Ver seu card de perfil com banner equipado'),
  name: 'perfil',
  aliases: ['profile', 'card'],

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const { eco, profile, purchases, guildBadgeEmojis } = await fetchProfileData(target.id, interaction.guildId);

    let activePetEmoji = null;
    if (profile?.activePet) {
      const pet = await prisma.pet.findUnique({ where: { id: profile.activePet } }).catch(() => null);
      activePetEmoji = pet?.emoji ?? null;
    }

    const username = member?.displayName ?? target.username;
    const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });

    const buf = await generateProfileCard({
      username,
      avatarUrl,
      balance:        eco?.balance         ?? 0,
      bank:           eco?.bank            ?? 0,
      xp:             eco?.xp              ?? 0,
      activeBanner:   profile?.activeBanner  ?? null,
      activeRing:     profile?.activeRing    ?? null,
      ringBorderColor: profile?.ringBorderColor ?? null,
      activePet:      activePetEmoji,
      marriedToName:  profile?.marriedToName  ?? null,
      bestFriendName: profile?.bestFriendName ?? null,
      reps:           profile?.reps           ?? 0,
      bio:            profile?.bio            ?? null,
      cardBg1:        profile?.cardBg1        ?? null,
      cardBg2:        profile?.cardBg2        ?? null,
      cardPanelColor: profile?.cardPanelColor ?? null,
      purchases,
      guildBadgeEmojis,
      guildId: interaction.guildId,
    });

    const attachment = new AttachmentBuilder(buf, { name: 'perfil.png' });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile_banner_btn')
        .setLabel('Banner')
        .setEmoji('🖼️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_ring_btn')
        .setLabel('Argola')
        .setEmoji('💠')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_bg_btn')
        .setLabel('Fundo')
        .setEmoji('🎨')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_panel_btn')
        .setLabel('Painel')
        .setEmoji('🟦')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_pet_btn')
        .setLabel('Pet')
        .setEmoji('🐾')
        .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile_conquistas_btn')
        .setLabel('Conquistas')
        .setEmoji('🏅')
        .setStyle(ButtonStyle.Primary),
    );

    return interaction.editReply({ files: [attachment], components: [row1, row2] });
  },

  async executePrefix(message) {
    // Se mencionar alguém, mostra o perfil dessa pessoa
    const target = message.mentions.users.first() ?? message.author;
    const member = await message.guild.members.fetch(target.id).catch(() => null);
    const { eco, profile, purchases, guildBadgeEmojis } = await fetchProfileData(target.id, message.guildId);

    let activePetEmoji = null;
    if (profile?.activePet) {
      const pet = await prisma.pet.findUnique({ where: { id: profile.activePet } }).catch(() => null);
      activePetEmoji = pet?.emoji ?? null;
    }

    const username = member?.displayName ?? target.username;
    const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });

    const buf = await generateProfileCard({
      username,
      avatarUrl,
      balance:        eco?.balance         ?? 0,
      bank:           eco?.bank            ?? 0,
      xp:             eco?.xp              ?? 0,
      activeBanner:   profile?.activeBanner  ?? null,
      activeRing:     profile?.activeRing    ?? null,
      ringBorderColor: profile?.ringBorderColor ?? null,
      activePet:      activePetEmoji,
      marriedToName:  profile?.marriedToName  ?? null,
      bestFriendName: profile?.bestFriendName ?? null,
      reps:           profile?.reps           ?? 0,
      bio:            profile?.bio            ?? null,
      cardBg1:        profile?.cardBg1        ?? null,
      cardBg2:        profile?.cardBg2        ?? null,
      cardPanelColor: profile?.cardPanelColor ?? null,
      purchases,
      guildBadgeEmojis,
      guildId: message.guildId,
    });

    return message.reply({ files: [new AttachmentBuilder(buf, { name: 'perfil.png' })] });
  },
};
