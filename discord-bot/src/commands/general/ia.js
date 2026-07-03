import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';
import { isAIConfigured } from '../../utils/aiManager.js';
import { invalidateGuildCfgCache } from '../../events/messageCreate.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ia')
    .setDescription('🤖 Ativa ou desativa a IA neste canal (basta marcar o bot para conversar)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'ia',

  async execute(interaction) {
    if (!isAIConfigured()) {
      return interaction.reply({ embeds: [errorEmbed('A IA ainda não está configurada neste bot. Peça a um administrador para configurar a chave da OpenAI.')], ephemeral: true });
    }

    const cfg = await prisma.guildConfig.upsert({
      where: { guildId: interaction.guildId },
      create: { guildId: interaction.guildId },
      update: {},
    });

    const channelId = interaction.channelId;

    if (cfg.aiChannelId === channelId) {
      await prisma.guildConfig.update({
        where: { guildId: interaction.guildId },
        data: { aiChannelId: null },
      });
      invalidateGuildCfgCache(interaction.guildId);
      return interaction.reply({
        embeds: [successEmbed('IA desativada!', `A IA foi desativada em <#${channelId}>.`)],
        ephemeral: true,
      });
    }

    await prisma.guildConfig.update({
      where: { guildId: interaction.guildId },
      data: { aiChannelId: channelId },
    });
    invalidateGuildCfgCache(interaction.guildId);

    const trocouDeCanal = cfg.aiChannelId && cfg.aiChannelId !== channelId;

    return interaction.reply({
      embeds: [successEmbed(
        'IA ativada!',
        `A partir de agora, sempre que **marcarem o bot** neste canal (<#${channelId}>) e disserem o que querem, ele vai responder automaticamente.` +
        (trocouDeCanal ? `\n\n*(A IA foi desativada no canal anterior <#${cfg.aiChannelId}>.)*` : ''),
      )],
      ephemeral: true,
    });
  },

  async executePrefix(message) {
    return message.reply('🤖 Use `/ia` no canal desejado para ativar ou desativar a IA nele. Depois é só marcar o bot e pedir algo!');
  },
};
