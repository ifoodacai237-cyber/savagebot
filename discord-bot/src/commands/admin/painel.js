import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';
import { buildPainelMain } from '../../utils/painelHandlers.js';

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

export default {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('⚙️ Painel central — configure todos os módulos do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'painel',

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }
    const cfg = await getCfg(interaction.guildId);
    return interaction.reply({ ...buildPainelMain(interaction.guild, cfg), ephemeral: true });
  },
};
