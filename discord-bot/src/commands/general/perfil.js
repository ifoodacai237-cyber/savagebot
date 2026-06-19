import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { generateProfileCard } from '../../utils/profileCard.js';

async function getGuildBadgeEmojis(guildId) {
  const overrides = await prisma.guildBadgeEmoji.findMany({ where: { guildId } }).catch(() => []);
  const map = {};
  for (const o of overrides) map[o.badgeKey] = o.emoji;
  return map;
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

    const [eco, profile, purchases, guildBadgeEmojis] = await Promise.all([
      prisma.economy.findUnique({ where: { userId_guildId: { userId: target.id, guildId: interaction.guildId } } }),
      prisma.userProfile.findUnique({ where: { userId: target.id } }),
      prisma.userPurchase.count({ where: { userId: target.id } }),
      getGuildBadgeEmojis(interaction.guildId),
    ]);

    let activePetEmoji = null;
    if (profile?.activePet) {
      const pet = await prisma.pet.findUnique({ where: { id: profile.activePet } }).catch(() => null);
      activePetEmoji = pet?.emoji ?? null;
    }

    const username     = member?.displayName ?? target.username;
    const avatarUrl    = target.displayAvatarURL({ extension: 'png', size: 256 });
    const balance      = eco?.balance ?? 0;
    const bank         = eco?.bank ?? 0;
    const activeBanner = profile?.activeBanner ?? null;
    const activeRing   = profile?.activeRing ?? null;

    const buf        = await generateProfileCard({ username, avatarUrl, balance, bank, activeBanner, purchases, activeRing, activePet: activePetEmoji, guildBadgeEmojis });
    const attachment = new AttachmentBuilder(buf, { name: 'perfil.png' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile_banner_btn')
        .setLabel('Mudar Banner')
        .setEmoji('🖼️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_ring_btn')
        .setLabel('Mudar Argola')
        .setEmoji('💠')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_pet_btn')
        .setLabel('Meu Pet')
        .setEmoji('🐾')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_conquistas_btn')
        .setLabel('Conquistas')
        .setEmoji('🏅')
        .setStyle(ButtonStyle.Primary),
    );

    return interaction.editReply({ files: [attachment], components: [row] });
  },

  async executePrefix(message) {
    const target = message.author;
    const member = await message.guild.members.fetch(target.id).catch(() => null);

    const [eco, profile, purchases, guildBadgeEmojis] = await Promise.all([
      prisma.economy.findUnique({ where: { userId_guildId: { userId: target.id, guildId: message.guildId } } }),
      prisma.userProfile.findUnique({ where: { userId: target.id } }),
      prisma.userPurchase.count({ where: { userId: target.id } }),
      getGuildBadgeEmojis(message.guildId),
    ]);

    let activePetEmoji = null;
    if (profile?.activePet) {
      const pet = await prisma.pet.findUnique({ where: { id: profile.activePet } }).catch(() => null);
      activePetEmoji = pet?.emoji ?? null;
    }

    const username = member?.displayName ?? target.username;
    const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
    const buf = await generateProfileCard({
      username, avatarUrl,
      balance:  eco?.balance ?? 0,
      bank:     eco?.bank    ?? 0,
      activeBanner: profile?.activeBanner ?? null,
      activeRing:   profile?.activeRing   ?? null,
      activePet:    activePetEmoji,
      purchases,
      guildBadgeEmojis,
    });

    return message.reply({ files: [new AttachmentBuilder(buf, { name: 'perfil.png' })] });
  },
};
