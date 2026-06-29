import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';

const FRIEND_GIFS = [
  'https://media.tenor.com/m89OM8t4w5EAAAAC/anime-friends.gif',
  'https://media.tenor.com/8kMMqAIMvpMAAAAC/anime-hug.gif',
  'https://media.tenor.com/VBtR9CDABOAAAAAC/anime-friendship.gif',
];

function randomGif() {
  return FRIEND_GIFS[Math.floor(Math.random() * FRIEND_GIFS.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('amigo')
    .setDescription('💝 Gerencia seu/sua melhor amigo(a)')
    .addSubcommand(sub =>
      sub.setName('definir')
        .setDescription('💝 Pede para alguém ser seu melhor amigo(a)')
        .addUserOption(o =>
          o.setName('pessoa')
            .setDescription('A pessoa que você quer como melhor amigo(a)')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('remover')
        .setDescription('💔 Remove seu/sua melhor amigo(a)'),
    ),
  name: 'amigo',
  aliases: ['melhoramigo', 'bff'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── /amigo remover ────────────────────────────────────────────────────────
    if (sub === 'remover') {
      const profile = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });

      if (!profile?.bestFriendId)
        return interaction.reply({ embeds: [errorEmbed('Você não tem um melhor amigo(a) definido.')], ephemeral: true });

      const friendId = profile.bestFriendId;

      await Promise.all([
        prisma.userProfile.update({
          where: { userId: interaction.user.id },
          data:  { bestFriendId: null, bestFriendName: null },
        }),
        prisma.userProfile.update({
          where: { userId: friendId },
          data:  { bestFriendId: null, bestFriendName: null },
        }).catch(() => {}),
      ]);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xAA88CC)
          .setDescription('💔 Você removeu seu(sua) melhor amigo(a). Ambos os perfis foram atualizados.')],
      });
    }

    // ── /amigo definir ────────────────────────────────────────────────────────
    const requester = interaction.user;
    const target    = interaction.options.getUser('pessoa');

    if (target.id === requester.id)
      return interaction.reply({ embeds: [errorEmbed('Você não pode se adicionar como melhor amigo(a)! 😅')], ephemeral: true });

    if (target.bot)
      return interaction.reply({ embeds: [errorEmbed('Bots não podem ser melhores amigos! 🤖')], ephemeral: true });

    const [requesterProfile, targetProfile] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: requester.id } }),
      prisma.userProfile.findUnique({ where: { userId: target.id } }),
    ]);

    if (requesterProfile?.bestFriendId)
      return interaction.reply({
        embeds: [errorEmbed(`Você já tem um melhor amigo(a)! Use \`/amigo remover\` primeiro.`)],
        ephemeral: true,
      });

    if (targetProfile?.bestFriendId)
      return interaction.reply({
        embeds: [errorEmbed(`${target.username} já tem um melhor amigo(a)!`)],
        ephemeral: true,
      });

    const requesterName = interaction.member?.displayName ?? requester.username;
    const targetName    = (await interaction.guild.members.fetch(target.id).catch(() => null))?.displayName ?? target.username;

    const embed = new EmbedBuilder()
      .setColor(0xCE93D8)
      .setTitle('💝 Pedido de Amizade')
      .setDescription(
        `**${requesterName}** quer ser melhor amigo(a) de **${targetName}**! 🌸\n\n` +
        `<@${target.id}>, você aceita este pedido de amizade?`,
      )
      .setImage(randomGif())
      .setFooter({ text: 'Apenas a pessoa marcada pode aceitar ou recusar.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`amigo_accept_${requester.id}_${target.id}`)
        .setLabel('Aceitar 💝')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`amigo_reject_${requester.id}_${target.id}`)
        .setLabel('Recusar 💔')
        .setStyle(ButtonStyle.Danger),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  },
};
