import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';
import { buildConfigEmbed, errorEmbed, successEmbed } from '../../utils/embed.js';
import { buildTicketConfigPayload, DEFAULT_TICKET_TEXT } from '../../utils/configPanels.js';

async function getOrCreate(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

async function sendPanel(target, guildId) {
  const cfg   = await getOrCreate(guildId);
  const embed = buildConfigEmbed({
    color:       cfg.ticketColor,
    banner:      cfg.ticketBanner,
    thumbnail:   cfg.ticketThumb,
    footer:      cfg.ticketFooter,
    title:       cfg.ticketTitle,
    description: cfg.ticketText ?? DEFAULT_TICKET_TEXT,
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_open').setLabel('Abrir Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary),
  );
  return target.send({ embeds: [embed], components: [row] });
}

export async function sendTicketConfigPanel(interaction) {
  const cfg     = await getOrCreate(interaction.guildId);
  const payload = buildTicketConfigPayload(cfg);
  return interaction.reply({ ...payload, ephemeral: true });
}

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema de tickets de suporte')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub => sub.setName('painel').setDescription('Envia o painel de tickets neste canal'))
    .addSubcommand(sub => sub.setName('config').setDescription('[Admin] Abre o painel de configuração do ticket')),
  name: 'ticket',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'painel') {
      await sendPanel(interaction.channel, interaction.guildId);
      return interaction.reply({ embeds: [successEmbed('Painel Enviado', 'O painel de tickets foi enviado neste canal.')], ephemeral: true });
    }
    if (sub === 'config') {
      return sendTicketConfigPanel(interaction);
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'painel') {
      await sendPanel(message.channel, message.guildId);
      return message.reply({ embeds: [successEmbed('Painel Enviado', 'O painel de tickets foi enviado.')] });
    }
    return message.reply({ embeds: [errorEmbed('Use: `slow ticket painel` ou `/ticket config`')] });
  },
};
