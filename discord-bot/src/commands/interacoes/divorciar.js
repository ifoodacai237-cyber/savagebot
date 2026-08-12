import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';

function buildDivorceConfirmation(userId, partnerId, partnerName) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`divorciar_confirm_${userId}_${partnerId}`)
      .setLabel('Confirmar divórcio')
      .setEmoji('💔')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`divorciar_cancel_${userId}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('💔 Divorciar')
        .setDescription(
          `Você realmente quer se divorciar de **${partnerName}**?\n\n` +
          'Essa ação remove o vínculo dos dois perfis e não pode ser desfeita automaticamente.',
        ),
    ],
    components: [row],
    ephemeral: true,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('divorciar')
    .setDescription('💔 Encerra seu casamento atual'),
  name: 'divorciar',
  aliases: ['divorcio'],

  async execute(interaction) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: interaction.user.id },
    });

    if (!profile?.marriedTo) {
      return interaction.reply({
        embeds: [errorEmbed('Você não está casado(a) com ninguém.')],
        ephemeral: true,
      });
    }

    const partner = await interaction.client.users.fetch(profile.marriedTo).catch(() => null);
    const partnerName = profile.marriedToName ?? partner?.globalName ?? partner?.username ?? 'essa pessoa';

    return interaction.reply(
      buildDivorceConfirmation(interaction.user.id, profile.marriedTo, partnerName),
    );
  },
};