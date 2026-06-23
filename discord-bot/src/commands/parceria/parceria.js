import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
import { buildPartnerConfigPayload } from '../../utils/partnershipPanels.js';
import { errorEmbed } from '../../utils/embed.js';

async function getOrCreate(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

export default {
  data: new SlashCommandBuilder()
    .setName('parceria')
    .setDescription('Sistema de parcerias do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('config').setDescription('[Admin] Abre o painel de configuração de parcerias'),
    ),
  name: 'parceria',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'config') {
      const cfg = await getOrCreate(interaction.guildId);
      return interaction.reply({ ...buildPartnerConfigPayload(cfg), ephemeral: true });
    }
  },

  async executePrefix(message) {
    return message.reply({ embeds: [errorEmbed('Use `/parceria config` para configurar o sistema de parcerias.')] });
  },
};
