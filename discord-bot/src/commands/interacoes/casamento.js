import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';
import { buildWeddingCardPayload, getMarriageStats } from '../../utils/weddingCard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('casamento')
    .setDescription('💍 Mostra o cartão do seu casamento'),
  name: 'casamento',

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

    const profile = await prisma.userProfile.findUnique({
      where: { userId: interaction.user.id },
    });

    if (!profile?.marriedTo) {
      return interaction.editReply({
        embeds: [errorEmbed('Você não está casado(a) com ninguém.')],
      });
    }

    const partner = await interaction.client.users.fetch(profile.marriedTo).catch(() => null);
    if (!partner) {
      return interaction.editReply({
        embeds: [errorEmbed('Não consegui encontrar a outra pessoa do casamento.')],
      });
    }

    const [member, partnerMember] = await Promise.all([
      interaction.guild.members.fetch(interaction.user.id).catch(() => null),
      interaction.guild.members.fetch(partner.id).catch(() => null),
    ]);
    const stats = await getMarriageStats(interaction.user.id, partner.id, profile.marriedAt);

    return interaction.editReply(await buildWeddingCardPayload({
      left: {
        id: interaction.user.id,
        displayName: member?.displayName ?? interaction.user.globalName ?? interaction.user.username,
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
      },
      right: {
        id: partner.id,
        displayName: partnerMember?.displayName ?? partner.globalName ?? partner.username,
        username: partner.username,
        avatarUrl: partner.displayAvatarURL({ extension: 'png', size: 256 }),
      },
      stats,
    }));
  },
};