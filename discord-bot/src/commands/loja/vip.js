import {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import prisma from '../../database/client.js';

// ─── Emojis ───────────────────────────────────────────────────────────────────
const COIN    = '<a:emoji_1:1516993823665033286>';
const VIP_TAG = '<:vip:1526994000000000000>'; // substitua pelo ID real do emoji VIP

// ─── Defaults ─────────────────────────────────────────────────────────────────
const VIP_COLOR = 0x5865F2;
const DEFAULT_VIP_TITLE = `${VIP_TAG} Painel VIP`;
const DEFAULT_VIP_INTRO = 'Compre VIP com carrinho publico e libere bonus reais na economia.';
const DEFAULT_VIP_TEXT  = [
  `${COIN} +35% em recompensas`,
  `🕒 Cooldowns reduzidos`,
  `🛡️ Mais proteção contra roubos`,
  `🌿 Bonus extra na mineração`,
  `🎣 Bonus na pesca`,
  `🏹 Bonus na caça`,
  `🌾 Bonus na fazenda`,
  `🏛️ Banco 2.5x maior`,
  `💵 Juros 50% maiores`,
].join('\n');
const DEFAULT_VIP_PRICE_LABEL = 'R$ 20/mes';
const DEFAULT_VIP_BTN_ESCOLHER  = 'Escolher VIP';
const DEFAULT_VIP_BTN_CARRINHO  = 'Meu carrinho';

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

// ─── Build do painel VIP em Components V2 (sem barra lateral por padrão) ─────
export function buildVipPanel(cfg = {}) {
  const container = new ContainerBuilder();

  // Só define accentColor se o admin configurou uma cor — sem cor = sem barra lateral
  if (cfg.vipColor) {
    const parsed = parseInt(cfg.vipColor, 16);
    if (!isNaN(parsed)) container.setAccentColor(parsed);
  }

  const title = cfg.vipTitle || DEFAULT_VIP_TITLE;
  const introText = `## ${title}\n${DEFAULT_VIP_INTRO}`;

  // Banner no topo
  if (cfg.vipBanner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(cfg.vipBanner)),
    );
  }

  if (cfg.vipThumb) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(introText))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(cfg.vipThumb));
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(introText));
  }

  // Separador
  container.addSeparatorComponents(new SeparatorBuilder());

  // Benefícios
  const beneficios = cfg.vipText || DEFAULT_VIP_TEXT;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### ⭐ Beneficios VIP\n${beneficios}`),
  );

  // Separador
  container.addSeparatorComponents(new SeparatorBuilder());

  // Plano
  const priceLabel = cfg.vipPriceLabel || DEFAULT_VIP_PRICE_LABEL;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${COIN} Plano principal\n${VIP_TAG} **${priceLabel}**`,
    ),
  );

  // Botões
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('vip_escolher')
      .setLabel(cfg.vipBtnEscolherLabel || DEFAULT_VIP_BTN_ESCOLHER)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('vip_carrinho')
      .setLabel(cfg.vipBtnCarrinhoLabel || DEFAULT_VIP_BTN_CARRINHO)
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    components: [container, row],
    flags: MessageFlags.IsComponentsV2,
  };
}

// ─── Configuração (admin) ─────────────────────────────────────────────────────

const VIP_CFG_FIELDS = {
  titulo:   { label: 'Título',                     db: 'vipTitle',           max: 100,  paragraph: false },
  texto:    { label: 'Texto de Benefícios',         db: 'vipText',            max: 1000, paragraph: true  },
  banner:   { label: 'URL do Banner',               db: 'vipBanner',          max: 500,  paragraph: false },
  thumb:    { label: 'URL da Thumbnail',            db: 'vipThumb',           max: 500,  paragraph: false },
  cor:      { label: 'Cor Hex (sem #)',             db: 'vipColor',           max: 6,    paragraph: false },
  preco:    { label: 'Rótulo do Preço',             db: 'vipPriceLabel',      max: 60,   paragraph: false },
  escolher: { label: 'Rótulo botão "Escolher VIP"', db: 'vipBtnEscolherLabel', max: 40,  paragraph: false },
  carrinho: { label: 'Rótulo botão "Meu carrinho"', db: 'vipBtnCarrinhoLabel', max: 40,  paragraph: false },
};

export function buildVipConfigPayload(cfg) {
  const color = cfg.vipColor ? parseInt(cfg.vipColor, 16) : VIP_COLOR;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('⚙️ Configuração — Painel VIP')
    .setDescription('Clique em um campo para editar. As alterações aparecem no próximo `/vip painel`.\n\n*Sem cor definida = sem barra lateral no painel.*')
    .addFields(
      { name: '🏷️ Título',   value: cfg.vipTitle          ? `\`${cfg.vipTitle}\``          : '*padrão*', inline: true },
      { name: '🎨 Cor',      value: cfg.vipColor          ? `\`#${cfg.vipColor}\``          : '*sem lateral*', inline: true },
      { name: '💰 Preço',    value: cfg.vipPriceLabel     ? `\`${cfg.vipPriceLabel}\``      : `\`${DEFAULT_VIP_PRICE_LABEL}\``, inline: true },
      { name: '🖼️ Banner',  value: cfg.vipBanner         ? `[Ver](<${cfg.vipBanner}>)`     : '*nenhum*', inline: true },
      { name: '🖼️ Thumbnail', value: cfg.vipThumb        ? `[Ver](<${cfg.vipThumb}>)`      : '*nenhuma*', inline: true },
      { name: '🔘 Botão Escolher', value: cfg.vipBtnEscolherLabel ? `\`${cfg.vipBtnEscolherLabel}\`` : `\`${DEFAULT_VIP_BTN_ESCOLHER}\``, inline: true },
      { name: '🔘 Botão Carrinho', value: cfg.vipBtnCarrinhoLabel ? `\`${cfg.vipBtnCarrinhoLabel}\`` : `\`${DEFAULT_VIP_BTN_CARRINHO}\``, inline: true },
      { name: '⭐ Benefícios', value: (cfg.vipText || DEFAULT_VIP_TEXT).slice(0, 200) + ((cfg.vipText || DEFAULT_VIP_TEXT).length > 200 ? '…' : '') },
    )
    .setFooter({ text: 'Fallen Bot · Configuração VIP' });

  if (cfg.vipBanner) embed.setImage(cfg.vipBanner);
  if (cfg.vipThumb)  embed.setThumbnail(cfg.vipThumb);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vip_cfg_titulo').setLabel('Título').setEmoji('🏷️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vip_cfg_texto').setLabel('Benefícios').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vip_cfg_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vip_cfg_thumb').setLabel('Thumbnail').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vip_cfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vip_cfg_preco').setLabel('Preço').setEmoji('💰').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vip_cfg_escolher').setLabel('Botão Escolher').setEmoji('🔘').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vip_cfg_carrinho').setLabel('Botão Carrinho').setEmoji('🔘').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vip_cfg_reset').setLabel('Resetar Tudo').setEmoji('♻️').setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row1, row2] };
}

async function handleVipConfig(interaction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isAdmin) return interaction.reply({ content: '❌ Apenas administradores podem configurar o painel VIP.', ephemeral: true });

  const cfg    = await getCfg(interaction.guildId);
  const method = interaction.isButton() ? 'update' : 'reply';
  return interaction[method]({ ...buildVipConfigPayload(cfg), ...(method === 'reply' ? { ephemeral: true } : {}) });
}

async function handleVipCfgBtn(interaction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isAdmin) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });

  const field = interaction.customId.replace('vip_cfg_', '');

  if (field === 'reset') {
    await prisma.guildConfig.upsert({
      where:  { guildId: interaction.guildId },
      create: { guildId: interaction.guildId },
      update: {
        vipTitle: null, vipText: null, vipBanner: null, vipThumb: null,
        vipColor: null, vipPriceLabel: null, vipBtnEscolherLabel: null, vipBtnCarrinhoLabel: null,
      },
    });
    const cfg = await getCfg(interaction.guildId);
    return interaction.update(buildVipConfigPayload(cfg));
  }

  const def = VIP_CFG_FIELDS[field];
  if (!def) return;

  const cfg = await getCfg(interaction.guildId);
  const cur = cfg[def.db] ?? '';

  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(def.label)
    .setStyle(def.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(def.max)
    .setPlaceholder('(vazio = voltar ao padrão)');

  if (cur) input.setValue(cur);

  const modal = new ModalBuilder()
    .setCustomId(`vip_cfg_modal_${field}`)
    .setTitle(`Editar: ${def.label}`)
    .addComponents(new ActionRowBuilder().addComponents(input));

  return interaction.showModal(modal);
}

export async function handleVipConfigModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const field = interaction.customId.replace('vip_cfg_modal_', '');
  const def   = VIP_CFG_FIELDS[field];
  if (!def) return interaction.editReply({ content: '❌ Campo inválido.' });

  let value = interaction.fields.getTextInputValue('value').trim() || null;
  if (value && field === 'cor') value = value.replace(/^#/, '').toUpperCase().slice(0, 6);

  await prisma.guildConfig.upsert({
    where:  { guildId: interaction.guildId },
    create: { guildId: interaction.guildId, [def.db]: value },
    update: { [def.db]: value },
  });

  const cfg     = await getCfg(interaction.guildId);
  const payload = buildVipConfigPayload(cfg);

  return interaction.editReply({
    content: `✅ **${def.label}** ${value ? 'atualizado!' : 'resetado para o padrão!'}`,
    ...payload,
  });
}

// ─── Handler dos botões VIP ───────────────────────────────────────────────────
export async function handleVipButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith('vip_cfg_')) return handleVipCfgBtn(interaction);
  if (id === 'vip_admin_config')  return handleVipConfig(interaction);

  if (id === 'vip_escolher') {
    const cfg = await getCfg(interaction.guildId);
    const priceLabel = cfg.vipPriceLabel || DEFAULT_VIP_PRICE_LABEL;
    const c = new ContainerBuilder();
    if (cfg.vipColor) {
      const parsed = parseInt(cfg.vipColor, 16);
      if (!isNaN(parsed)) c.setAccentColor(parsed);
    }
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${VIP_TAG} Adquirir VIP\n` +
        `Para comprar o VIP, entre em contato com a equipe do servidor.\n\n` +
        `**Plano:** ${VIP_TAG} ${priceLabel}\n` +
        `${COIN} Após ativação, seus bônus são aplicados automaticamente.`,
      ),
    );
    return interaction.reply({
      components: [c],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  if (id === 'vip_carrinho') {
    // Verifica se o usuário tem algum VipGrant ativo
    const [cfg, grants] = await Promise.all([
      getCfg(interaction.guildId),
      prisma.vipGrant.findMany({
        where: {
          guildId: interaction.guildId,
          userId:  interaction.user.id,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    const c = new ContainerBuilder();
    if (cfg.vipColor) {
      const parsed = parseInt(cfg.vipColor, 16);
      if (!isNaN(parsed)) c.setAccentColor(parsed);
    }
    if (grants.length === 0) {
      c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🛒 Meu Carrinho\nVocê não possui VIP ativo no momento.\n\n` +
          `Clique em **Escolher VIP** para adquirir.`,
        ),
      );
    } else {
      const linhas = grants.map(g => {
        const ts = Math.floor(g.expiresAt.getTime() / 1000);
        return `${VIP_TAG} Cargo <@&${g.roleId}> — expira <t:${ts}:R>`;
      });
      c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🛒 Meu Carrinho\n${linhas.join('\n')}`,
        ),
      );
    }
    return interaction.reply({
      components: [c],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }
}

// ─── Comando ──────────────────────────────────────────────────────────────────
export default {
  name: 'vip',

  data: new SlashCommandBuilder()
    .setName('vip')
    .setDescription('🏷️ Sistema VIP do servidor')
    .addSubcommand(s =>
      s.setName('painel').setDescription('📢 Envia o painel VIP no canal atual'),
    )
    .addSubcommand(s =>
      s.setName('config').setDescription('⚙️ Abre o painel de configuração do VIP (apenas admins)'),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'painel') {
      const cfg = await getCfg(interaction.guildId);
      return interaction.reply(buildVipPanel(cfg));
    }

    if (sub === 'config') {
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) {
        return interaction.reply({ content: '❌ Apenas administradores podem acessar as configurações do VIP.', ephemeral: true });
      }
      const cfg = await getCfg(interaction.guildId);
      return interaction.reply({ ...buildVipConfigPayload(cfg), ephemeral: true });
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase() ?? 'painel';

    if (sub === 'config' || sub === 'c' || sub === 'cfg') {
      const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) return message.reply({ content: '❌ Apenas administradores podem acessar as configurações do VIP.' });
      const cfg = await getCfg(message.guildId);
      return message.reply({ ...buildVipConfigPayload(cfg) });
    }

    const cfg = await getCfg(message.guildId);
    return message.reply(buildVipPanel(cfg));
  },
};
