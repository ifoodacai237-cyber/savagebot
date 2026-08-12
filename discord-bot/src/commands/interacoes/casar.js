import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';
import { buildWeddingCardPayload, getMarriageStats } from '../../utils/weddingCard.js';

const WEDDING_GIFS = [
  'https://cdn.otakugifs.xyz/gifs/love/adc831819611cd4f.gif',
  'https://cdn.otakugifs.xyz/gifs/happy/2870bb4a1b4dbf7a.gif',
  'https://cdn.otakugifs.xyz/gifs/hug/408915119268a454.gif',
];

function randomGif() {
  return WEDDING_GIFS[Math.floor(Math.random() * WEDDING_GIFS.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('casar')
    .setDescription('💍 Pede alguém em casamento')
    .addUserOption(o =>
      o.setName('pessoa')
        .setDescription('A pessoa que você quer pedir em casamento')
        .setRequired(false),
    ),
  name: 'casar',

  async execute(interaction) {
    const proposer = interaction.user;
    const target   = interaction.options.getUser('pessoa');

    if (!target) {
      await interaction.deferReply();
      const profile = await prisma.userProfile.findUnique({ where: { userId: proposer.id } });
      if (!profile?.marriedTo) {
        return interaction.editReply({
          embeds: [errorEmbed('Mencione alguém para pedir em casamento ou use `/casar` depois de se casar para ver o cartão do casal.')],
        });
      }

      const partner = await interaction.client.users.fetch(profile.marriedTo).catch(() => null);
      if (!partner) {
        return interaction.editReply({ embeds: [errorEmbed('Não consegui encontrar a outra pessoa do casamento.')] });
      }

      const [member, partnerMember] = await Promise.all([
        interaction.guild.members.fetch(proposer.id).catch(() => null),
        interaction.guild.members.fetch(partner.id).catch(() => null),
      ]);
      const stats = await getMarriageStats(proposer.id, partner.id, profile.marriedAt);
      return interaction.editReply(await buildWeddingCardPayload({
        left: {
          id: proposer.id,
          displayName: member?.displayName ?? proposer.globalName ?? proposer.username,
          username: proposer.username,
          avatarUrl: proposer.displayAvatarURL({ extension: 'png', size: 256 }),
        },
        right: {
          id: partner.id,
          displayName: partnerMember?.displayName ?? partner.globalName ?? partner.username,
          username: partner.username,
          avatarUrl: partner.displayAvatarURL({ extension: 'png', size: 256 }),
        },
        stats,
      }));
    }

    if (target.id === proposer.id)
      return interaction.reply({ embeds: [errorEmbed('Você não pode se casar consigo mesmo! 😅')], ephemeral: true });

    if (target.bot)
      return interaction.reply({ embeds: [errorEmbed('Você não pode se casar com um bot! 🤖')], ephemeral: true });

    const [proposerProfile, targetProfile] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: proposer.id } }),
      prisma.userProfile.findUnique({ where: { userId: target.id } }),
    ]);

    if (proposerProfile?.marriedTo)
      return interaction.reply({ embeds: [errorEmbed(`Você já está casado(a) com <@${proposerProfile.marriedTo}>! Divorce-se primeiro.`)], ephemeral: true });

    if (targetProfile?.marriedTo)
      return interaction.reply({ embeds: [errorEmbed(`${target.username} já está casado(a) com alguém!`)], ephemeral: true });

    const proposerName = interaction.member?.displayName ?? proposer.username;
    const targetName   = (await interaction.guild.members.fetch(target.id).catch(() => null))?.displayName ?? target.username;

    const embed = new EmbedBuilder()
      .setColor(0xFF6B9D)
      .setTitle('💍 Pedido de Casamento')
      .setDescription(
        `**${proposerName}** quer se casar com **${targetName}**! 💕\n\n` +
        `<@${target.id}>, você aceita esse pedido de casamento? 🌸`,
      )
      .setImage(randomGif())
      .setFooter({ text: 'Apenas a pessoa marcada pode aceitar ou recusar.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`casar_accept_${proposer.id}_${target.id}`)
        .setLabel('Aceitar 💍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`casar_reject_${proposer.id}_${target.id}`)
        .setLabel('Recusar 💔')
        .setStyle(ButtonStyle.Danger),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  },
};
