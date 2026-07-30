import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from 'discord.js';
import prisma from '../../database/client.js';
import { getEmoji } from '../../utils/emojiManager.js';
import { buildLojaAdminPayload } from '../../utils/shopHandlers.js';

const COIN          = () => getEmoji('futecoins');
const DEFAULT_CONV  = () => `> \`1000 mensagens\` → **500 ${COIN()}**\n> \`1 hora em call\` → **500 ${COIN()}**`;
const DEFAULT_TEXT  = () =>
  `Deseja adquirir **cargos** e **banners de perfil** exclusivos?\n` +
  `Aqui você pode comprar tudo com as suas **${COIN()}**!`;
const DIVIDER = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

function parseEmoji(str) {
  if (!str) return null;
  const match = str.match(/^<(a?):(\w+):(\d+)>$/);
  if (match) return { animated: !!match[1], name: match[2], id: match[3] };
  return str;
}

// ─── Painel público em Components V2 (sem barra lateral por padrão) ──────────
export function buildShopMain(guild, cfg = {}) {
  const title    = cfg.lojaTitle  ?? `🛒 Loja do ${guild.name}`;
  const conv     = cfg.lojaConversao ?? DEFAULT_CONV();
  const bodyText = cfg.lojaText   ?? DEFAULT_TEXT();
  const useDivider = cfg.lojaUseDivider ?? false;

  const sep  = useDivider ? `\n${DIVIDER}\n\n` : '\n\n';
  const fullText = `## ${title}\n\n${bodyText}${sep}**Conversão 🪙**\n${conv}`;

  const container = new ContainerBuilder();

  // Só define accentColor se o admin configurou uma cor — sem cor = sem barra lateral
  if (cfg.lojaColor) {
    const parsed = parseInt(cfg.lojaColor, 16);
    if (!isNaN(parsed)) container.setAccentColor(parsed);
  }

  // Banner no topo
  if (cfg.lojaBanner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(cfg.lojaBanner)),
    );
  }

  const thumbUrl = cfg.lojaThumb || guild.iconURL({ size: 128 }) || null;
  if (thumbUrl) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl));
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText));
  }

  if (useDivider) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Clique em um botão abaixo para começar.'));
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

  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
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
      s.setName('config').setDescription('⚙️ Abre o painel de administração da loja (apenas admins)'))
    .addSubcommand(s =>
      s.setName('banner')
        .setDescription('🖼️ Cria um banner para a loja enviando o arquivo diretamente (apenas admins)')
        .addStringOption(o =>
          o.setName('nome').setDescription('Nome do banner').setRequired(true).setMaxLength(50))
        .addIntegerOption(o =>
          o.setName('preco').setDescription('Preço em coins').setRequired(true).setMinValue(1))
        .addAttachmentOption(o =>
          o.setName('imagem').setDescription('Imagem do banner (jpg/png/gif/webp)').setRequired(true))
        .addStringOption(o =>
          o.setName('descricao').setDescription('Descrição opcional').setRequired(false).setMaxLength(100))),

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

    if (sub === 'banner') {
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) {
        return interaction.reply({ content: '❌ Apenas administradores podem criar banners.', ephemeral: true });
      }

      await interaction.deferReply();

      const nome      = interaction.options.getString('nome').trim();
      const preco     = interaction.options.getInteger('preco');
      const desc      = interaction.options.getString('descricao')?.trim() || '';
      const anexo     = interaction.options.getAttachment('imagem');

      // Valida tipo de arquivo
      const tiposOk = ['image/png','image/jpeg','image/jpg','image/gif','image/webp'];
      const contentType = anexo.contentType?.split(';')[0].trim();
      if (!tiposOk.includes(contentType)) {
        return interaction.editReply({ content: '❌ Arquivo inválido. Envie uma imagem (png, jpg, gif, webp).' });
      }

      // Baixa o arquivo e re-envia para obter URL permanente no CDN do Discord
      const res = await fetch(anexo.url);
      if (!res.ok) return interaction.editReply({ content: '❌ Não foi possível baixar a imagem. Tente novamente.' });
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext    = (contentType.split('/')[1] || 'png').replace('jpeg','jpg');

      // Gera chave única
      const slug = nome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
      const chaveBase = `c_${slug}`;
      const existing  = await prisma.customBanner.findUnique({
        where: { guildId_key: { guildId: interaction.guildId, key: chaveBase } },
      });
      const finalKey = existing ? `${chaveBase}_${Date.now().toString(36)}` : chaveBase;

      // Envia mensagem com a imagem para obter URL permanente
      const msg = await interaction.editReply({
        content: `## 🖼️ Banner **${nome}** sendo processado...`,
        files: [{ attachment: buffer, name: `banner_${finalKey}.${ext}` }],
      });

      // Pega a URL permanente do CDN
      const imagemUrl = msg.attachments.first()?.url;
      if (!imagemUrl) return interaction.editReply({ content: '❌ Erro ao obter URL da imagem. Tente novamente.' });

      // Salva no banco
      await prisma.customBanner.create({
        data: {
          guildId:     interaction.guildId,
          key:         finalKey,
          name:        nome,
          description: desc,
          price:       preco,
          imageUrl:    imagemUrl,
          gradient1:   '#1a0533',
          gradient2:   '#4a1a8a',
          emoji:       '🖼️',
          active:      true,
        },
      });

      // Edita a mensagem com o resultado final
      const { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags: MF } = await import('discord.js');
      const c = new ContainerBuilder();
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## ✅ Banner Criado!\n\n**${nome}** foi adicionado à loja!\n\n💰 **Preço:** ${preco.toLocaleString('pt-BR')} coins\n🔑 **Chave:** \`${finalKey}\``,
      ));
      c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imagemUrl)),
      );

      return interaction.editReply({ content: '', components: [c], flags: MF.IsComponentsV2, files: [] });
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
