import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';
import { buildLojaAdminPayload } from '../../utils/shopHandlers.js';

const DEFAULT_COLOR = 0x9B4FD6;
const COIN          = '<a:emoji_1:1516993823665033286>';
const DEFAULT_CONV  = `> \`1000 mensagens\` → **500 ${COIN}**\n> \`1 hora em call\` → **500 ${COIN}**`;
const DEFAULT_TEXT  =
  `Deseja adquirir **cargos** e **banners de perfil** exclusivos?\n` +
  `Aqui você pode comprar tudo com as suas **${COIN}**!`;
const DIVIDER = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

function parseEmoji(str) {
  if (!str) return null;
  const match = str.match(/^<(a?):(\w+):(\d+)>$/);
  if (match) return { animated: !!match[1], name: match[2], id: match[3] };
  return str;
}

export function buildShopMain(guild, cfg = {}) {
  const color    = cfg.lojaColor  ? parseInt(cfg.lojaColor, 16) : DEFAULT_COLOR;
  const title    = cfg.lojaTitle  ?? `🛒 Loja do ${guild.name}`;
  const conv     = cfg.lojaConversao ?? DEFAULT_CONV;
  const bodyText = cfg.lojaText   ?? DEFAULT_TEXT;
  const useDivider = cfg.lojaUseDivider ?? false;

  const sep  = useDivider ? `\n${DIVIDER}\n` : '\n\n';
  const desc = bodyText + sep + '**Conversão 🪙**\n' + conv;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setFooter({ text: 'Fallen Bot · Loja' })
    .setTimestamp();

  if (cfg.lojaBanner) embed.setImage(cfg.lojaBanner);
  if (cfg.lojaThumb)  embed.setThumbnail(cfg.lojaThumb);
  else                embed.setThumbnail(guild.iconURL({ size: 128 }) ?? null);

  if (useDivider) {
    embed.addFields({ name: DIVIDER, value: '*Clique em um botão abaixo para começar.*' });
  }

  const eComprar   = parseEmoji(cfg.shopEmojiComprar)   ?? '🛒';
  const eVitrine   = parseEmoji(cfg.shopEmojiVitrine)   ?? '🖼️';
  const eConverter = parseEmoji(cfg.shopEmojiConverter) ?? '🔄';
  const eSaldo     = parseEmoji(cfg.shopEmojiSaldo)     ?? '💰';
  const eGift      = parseEmoji(cfg.shopEmojiGift)      ?? '🎁';

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop_comprar').setLabel('Comprar').setEmoji(eComprar).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('shop_vitrine').setLabel('Vitrine').setEmoji(eVitrine).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_converter').setLabel('Converter').setEmoji(eConverter).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_saldo').setLabel('Meu Saldo').setEmoji(eSaldo).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_gift').setLabel('Presentear').setEmoji(eGift).setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

export default {
  name:    'loja',
  aliases: ['shop', 'store'],
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('🛒 Sistema de loja do servidor')
    .addSubcommand(s =>
      s.setName('painel').setDescription('📢 Envia o painel da loja no canal atual'))
    .addSubcommand(s =>
      s.setName('config').setDescription('⚙️ Abre o painel de administração da loja (apenas admins)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'painel') {
      const cfg     = await getCfg(interaction.guildId);
      const payload = buildShopMain(interaction.guild, cfg);
      return interaction.reply(payload);
    }

    if (sub === 'config') {
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) {
        return interaction.reply({ content: '❌ Apenas administradores podem acessar as configurações da loja.', ephemeral: true });
      }
      const cfg = await getCfg(interaction.guildId);
      return interaction.reply({ ...buildLojaAdminPayload(cfg), ephemeral: true });
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase() ?? 'painel';

    if (sub === 'painel' || sub === 'p' || sub === 'panel') {
      const cfg = await getCfg(message.guildId);
      return message.reply(buildShopMain(message.guild, cfg));
    }

    if (sub === 'config' || sub === 'c' || sub === 'cfg') {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) return message.reply({ content: '❌ Apenas administradores podem acessar as configurações da loja.' });
      const cfg = await getCfg(message.guildId);
      return message.reply({ ...buildLojaAdminPayload(cfg) });
    }

    // Padrão: mostra painel
    const cfg = await getCfg(message.guildId);
    return message.reply(buildShopMain(message.guild, cfg));
  },
};
