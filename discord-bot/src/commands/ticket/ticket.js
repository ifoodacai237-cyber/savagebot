import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from 'discord.js';
import prisma from '../../database/client.js';
import { buildConfigEmbed, errorEmbed, successEmbed } from '../../utils/embed.js';
import { buildTicketConfigPayload, DEFAULT_TICKET_TEXT } from '../../utils/configPanels.js';

const BTN_STYLE_MAP = {
  Primary:   ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success:   ButtonStyle.Success,
  Danger:    ButtonStyle.Danger,
};

async function getOrCreate(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

function buildOpenButton(cfg) {
  const label    = cfg.ticketBtnLabel || 'Abrir Ticket';
  const emojiRaw = (cfg.ticketBtnEmoji || '🎫').trim();
  const style    = BTN_STYLE_MAP[cfg.ticketBtnStyle] ?? ButtonStyle.Primary;
  const btn = new ButtonBuilder().setCustomId('ticket_open').setLabel(label).setStyle(style);
  const match = emojiRaw.match(/^<(a?):([^:>\s]+):(\d+)>$/);
  if (match) btn.setEmoji({ animated: match[1] === 'a', name: match[2], id: match[3] });
  else if (emojiRaw) btn.setEmoji(emojiRaw);
  return btn;
}

async function sendPanel(target, guildId) {
  const cfg  = await getOrCreate(guildId);
  const desc = cfg.ticketText ?? DEFAULT_TICKET_TEXT;
  const row  = new ActionRowBuilder().addComponents(buildOpenButton(cfg));
  const color = cfg.ticketColor ? (parseInt(cfg.ticketColor, 16) || 0x5865F2) : 0x5865F2;

  if (cfg.ticketUseSeparator) {
    const container = new ContainerBuilder().setAccentColor(color);
    if (cfg.ticketTitle) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${cfg.ticketTitle}**`));
    }
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(desc));
    return target.send({ components: [container, row], flags: MessageFlags.IsComponentsV2 });
  }

  const embed = buildConfigEmbed({
    color:       cfg.ticketColor,
    banner:      cfg.ticketBanner,
    thumbnail:   cfg.ticketThumb,
    footer:      cfg.ticketFooter,
    title:       cfg.ticketTitle,
    description: desc,
  });
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
    return message.reply({ embeds: [errorEmbed('Use: `fallen ticket painel` ou `/ticket config`')] });
  },
};
