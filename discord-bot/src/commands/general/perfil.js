import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { generateProfileCard } from '../../utils/profileCard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('🪪 Ver seu perfil ou o de alguém')
    .addUserOption(o => o.setName('usuario').setDescription('Usuário para ver o perfil (padrão: você)')),
  name: 'perfil',
  aliases: ['profile', 'card'],

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('usuario') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const isSelf = target.id === interaction.user.id;

    const [eco, profile, purchases] = await Promise.all([
      prisma.economy.findUnique({ where: { userId_guildId: { userId: target.id, guildId: interaction.guildId } } }),
      prisma.userProfile.findUnique({ where: { userId_guildId: { userId: target.id, guildId: interaction.guildId } } }),
      prisma.userPurchase.count({ where: { userId: target.id, guildId: interaction.guildId } }),
    ]);

    const username     = member?.displayName ?? target.username;
    const avatarUrl    = target.displayAvatarURL({ extension: 'png', size: 256 });
    const balance      = eco?.balance ?? 0;
    const bank         = eco?.bank ?? 0;
    const activeBanner = profile?.activeBanner ?? null;

    const buf        = await generateProfileCard({ username, avatarUrl, balance, bank, activeBanner, purchases });
    const attachment = new AttachmentBuilder(buf, { name: 'perfil.png' });

    const components = [];
    if (isSelf) {
      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('profile_banner_btn')
            .setLabel('Mudar Banner')
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Secondary),
        )
      );
    }

    return interaction.editReply({ files: [attachment], components });
  },

  async executePrefix(message, args) {
    const target = message.mentions.users.first() ?? message.author;
    const member = await message.guild.members.fetch(target.id).catch(() => null);

    const [eco, profile, purchases] = await Promise.all([
      prisma.economy.findUnique({ where: { userId_guildId: { userId: target.id, guildId: message.guildId } } }),
      prisma.userProfile.findUnique({ where: { userId_guildId: { userId: target.id, guildId: message.guildId } } }),
      prisma.userPurchase.count({ where: { userId: target.id, guildId: message.guildId } }),
    ]);

    const username     = member?.displayName ?? target.username;
    const avatarUrl    = target.displayAvatarURL({ extension: 'png', size: 256 });
    const buf          = await generateProfileCard({
      username, avatarUrl,
      balance:  eco?.balance ?? 0,
      bank:     eco?.bank    ?? 0,
      activeBanner: profile?.activeBanner ?? null,
      purchases,
    });

    return message.reply({ files: [new AttachmentBuilder(buf, { name: 'perfil.png' })] });
  },
};
