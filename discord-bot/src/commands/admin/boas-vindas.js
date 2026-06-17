import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';
import { buildWelcomeConfigPayload } from '../../utils/configPanels.js';

export default {
  data: new SlashCommandBuilder()
    .setName('boas-vindas')
    .setDescription('Configura o sistema de boas-vindas do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'boas-vindas',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }
    const cfg = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } }) ?? { guildId: interaction.guildId };
    return interaction.reply({ ...buildWelcomeConfigPayload(cfg), ephemeral: true });
  },
};
