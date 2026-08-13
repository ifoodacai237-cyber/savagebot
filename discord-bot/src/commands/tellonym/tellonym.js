import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed, successEmbed } from '../../utils/embed.js';
import {
  buildTellonymConfigPayload,
  buildTellonymPanelV2,
} from '../../utils/configPanels.js';

async function getOrCreate(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

async function sendPanel(channel, guildId) {
  const cfg = await getOrCreate(guildId);
  return channel.send(buildTellonymPanelV2(cfg));
}

export async function sendTellonymConfigPanel(interaction) {
  const cfg     = await getOrCreate(interaction.guildId);
  const payload = buildTellonymConfigPayload(cfg);
  return interaction.reply({ ...payload, ephemeral: true });
}

export default {
  data: new SlashCommandBuilder()
    .setName('tellonym')
    .setDescription('Gerencia o módulo Tellonym')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('config').setDescription('[Admin] Abre o painel de configuração do Tellonym')),
  name: 'tellonym',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'config') {
      return sendTellonymConfigPanel(interaction);
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'painel') {
      await sendPanel(message.channel, message.guildId);
      return message.reply({ embeds: [successEmbed('Painel Criado', 'Painel Tellonym enviado.')] });
    }
    return message.reply({ embeds: [errorEmbed('Use: `savage tellonym painel` ou `/tellonym config`')] });
  },
};
