import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { BADGE_DEFS } from '../../utils/profileCard.js';
import { errorEmbed, successEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('conquista')
    .setDescription('🏅 Gerenciar conquistas do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('listar')
        .setDescription('Ver todas as conquistas e emojis configurados')
    )
    .addSubcommand(sub =>
      sub.setName('emoji')
        .setDescription('Personalizar o emoji de uma conquista neste servidor')
        .addStringOption(o =>
          o.setName('conquista')
            .setDescription('Qual conquista personalizar')
            .setRequired(true)
            .addChoices(...BADGE_DEFS.map(b => ({ name: `${b.defaultEmoji} ${b.name}`, value: b.key })))
        )
        .addStringOption(o =>
          o.setName('emoji')
            .setDescription('Novo emoji (unicode ou emoji customizado do servidor, ex: ❤️ ou <:nome:id>)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('resetar')
        .setDescription('Resetar o emoji de uma conquista para o padrão')
        .addStringOption(o =>
          o.setName('conquista')
            .setDescription('Qual conquista resetar')
            .setRequired(true)
            .addChoices(...BADGE_DEFS.map(b => ({ name: `${b.defaultEmoji} ${b.name}`, value: b.key })))
        )
    ),
  name: 'conquista',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'listar') {
      const overrides = await prisma.guildBadgeEmoji.findMany({ where: { guildId: interaction.guildId } });
      const overrideMap = {};
      for (const o of overrides) overrideMap[o.badgeKey] = o.emoji;

      const desc = BADGE_DEFS.map(b => {
        const emoji = overrideMap[b.key] ?? b.defaultEmoji;
        const custom = overrideMap[b.key] ? ' *(personalizado)*' : '';
        return `${emoji} **${b.name}**${custom}\n> ${b.description}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x9B4FD6)
        .setTitle('🏅 Conquistas do Servidor')
        .setDescription(desc)
        .setFooter({ text: 'Use /conquista emoji para personalizar qualquer emoji' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'emoji') {
      const key   = interaction.options.getString('conquista');
      const emoji = interaction.options.getString('emoji').trim();
      const def   = BADGE_DEFS.find(b => b.key === key);
      if (!def) return interaction.reply({ embeds: [errorEmbed('Conquista não encontrada.')], ephemeral: true });

      await prisma.guildBadgeEmoji.upsert({
        where:  { guildId_badgeKey: { guildId: interaction.guildId, badgeKey: key } },
        create: { guildId: interaction.guildId, badgeKey: key, emoji },
        update: { emoji },
      });

      return interaction.reply({
        embeds: [successEmbed('Emoji Atualizado', `O emoji da conquista **${def.name}** foi alterado para **${emoji}** neste servidor.`)],
        ephemeral: true,
      });
    }

    if (sub === 'resetar') {
      const key = interaction.options.getString('conquista');
      const def = BADGE_DEFS.find(b => b.key === key);
      if (!def) return interaction.reply({ embeds: [errorEmbed('Conquista não encontrada.')], ephemeral: true });

      await prisma.guildBadgeEmoji.deleteMany({
        where: { guildId: interaction.guildId, badgeKey: key },
      });

      return interaction.reply({
        embeds: [successEmbed('Emoji Resetado', `O emoji da conquista **${def.name}** voltou ao padrão: **${def.defaultEmoji}**`)],
        ephemeral: true,
      });
    }
  },
};
