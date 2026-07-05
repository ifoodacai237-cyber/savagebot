import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import prisma from '../database/client.js';
import { BANNERS, WALLET_BACKGROUNDS, getBanner, RING_PRESETS, getRing, FRAME_PRESETS, getFrame, buildBannerUrl } from './shopData.js';
import { renderRingPreview } from './ringPreview.js';

const SHOP_COLOR = 0x9B4FD6;
const DIVIDER    = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';
const COIN       = '<a:emoji_1:1516993823665033286>';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getEco(userId, guildId) {
  return prisma.economy.upsert({
    where:  { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

async function getAllBannersForGuild(guildId) {
  const custom = guildId ? await prisma.customBanner.findMany({ where: { guildId, active: true } }) : [];
  const customMapped = custom.map(c => ({
    key: c.key, name: c.name, description: c.description || '',
    price: c.price, imageUrl: buildBannerUrl(c.imageUrl),
    gradient: [c.gradient1, c.gradient2], emoji: c.emoji, isCustom: true,
  }));
  // Se um banner personalizado do servidor usa a mesma chave de um banner estático,
  // o personalizado "vence" — remove o estático da lista para não haver 2 opções
  // com o mesmo valor no select (o que fazia clicar em um banner equipar outro).
  const customKeys = new Set(customMapped.map(c => c.key));
  const statics     = BANNERS.filter(b => !customKeys.has(b.key));
  return [...statics, ...customMapped];
}

async function resolveBannerForGuild(key, guildId) {
  // Banners personalizados do servidor têm prioridade sobre os estáticos.
  if (guildId) {
    const custom = await prisma.customBanner.findFirst({ where: { key, guildId, active: true } });
    if (custom) {
      return {
        key: custom.key, name: custom.name, description: custom.description || '',
        price: custom.price, imageUrl: buildBannerUrl(custom.imageUrl),
        gradient: [custom.gradient1, custom.gradient2], emoji: custom.emoji, isCustom: true,
      };
    }
  }
  return getBanner(key);
}

// ─── Painel Admin ─────────────────────────────────────────────────────────────

export function buildLojaAdminPayload(cfg) {
  const color = cfg?.lojaColor ? parseInt(cfg.lojaColor, 16) : SHOP_COLOR;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('⚙️ Administração da Loja')
    .setDescription(
      '**Gerencie tudo da sua loja pelo painel abaixo.**\n\n' +
      '📦 **Cargos** — adicione, remova e veja os cargos à venda\n' +
      '🎨 **Personalizar** — altere título, banner, cor, texto e mais'
    )
    .setFooter({ text: 'Fallen Bot · Admin da Loja' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('loja_admin_cargos').setLabel('Cargos em Estoque').setEmoji('📦').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('loja_admin_personalizar').setLabel('Personalizar Painel').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

// ─── Admin: Gerenciar Cargos ──────────────────────────────────────────────────

async function handleLojaAdminCargos(interaction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });

  const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId }, orderBy: { price: 'asc' } });

  const lines = roles.length
    ? roles.map(r => `> <@&${r.roleId}> — **${r.price.toLocaleString('pt-BR')} ${COIN}**\n> ${r.description ?? '—'}\n> \`${r.id}\``).join('\n\n')
    : '*Nenhum cargo cadastrado ainda.*';

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('📦 Cargos em Estoque')
    .setDescription(lines)
    .setFooter({ text: 'Fallen Bot · Admin da Loja' });

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('loja_admin_add_cargo').setLabel('Adicionar Cargo').setEmoji('➕').setStyle(ButtonStyle.Success),
    ),
  ];

  if (roles.length) {
    const sel = new StringSelectMenuBuilder()
      .setCustomId('loja_admin_remove_sel')
      .setPlaceholder('🗑️ Selecione um cargo para remover')
      .addOptions(roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDescription(`${r.price.toLocaleString('pt-BR')} ${COIN}`)
      ));
    rows.push(new ActionRowBuilder().addComponents(sel));
  }

  const method = interaction.isButton() ? 'update' : 'reply';
  return interaction[method]({ embeds: [embed], components: rows, ...(method === 'reply' ? { ephemeral: true } : {}) });
}

async function handleLojaAdminAddCargo(interaction) {
  const modal = new ModalBuilder().setCustomId('loja_admin_modal_add_cargo').setTitle('➕ Adicionar Cargo à Loja');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('role_id').setLabel('ID do Cargo (clique-direito → Copiar ID)')
        .setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('123456789012345678')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('price').setLabel('Preço (em FallenCoins)')
        .setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('500')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('description').setLabel('Descrição (opcional)')
        .setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(200)
        .setPlaceholder('Cargo exclusivo do servidor...')
    ),
  );
  return interaction.showModal(modal);
}

async function handleLojaAdminAddCargoModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const roleId = interaction.fields.getTextInputValue('role_id').trim();
  const rawPrc = interaction.fields.getTextInputValue('price').trim().replace(/\D/g, '');
  const desc   = interaction.fields.getTextInputValue('description').trim() || null;
  const price  = parseInt(rawPrc);

  if (!roleId || isNaN(price) || price < 1)
    return interaction.editReply({ content: '❌ ID ou preço inválido. Verifique e tente novamente.' });

  const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
  if (!role)
    return interaction.editReply({ content: `❌ Cargo \`${roleId}\` não encontrado neste servidor.` });

  const existing = await prisma.shopRole.findUnique({
    where: { guildId_roleId: { guildId: interaction.guildId, roleId } },
  });
  if (existing)
    return interaction.editReply({ content: `❌ <@&${roleId}> já está na loja!` });

  await prisma.shopRole.create({
    data: { guildId: interaction.guildId, roleId, name: role.name, description: desc, price },
  });

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Cargo Adicionado!')
        .setDescription(`<@&${roleId}> agora está disponível por **${price.toLocaleString('pt-BR')} ${COIN}**!`)
        .addFields({ name: '📝 Descrição', value: desc ?? '—' }),
    ],
  });
}

async function handleLojaAdminRemoveSel(interaction) {
  const id   = interaction.values[0];
  const item = await prisma.shopRole.findUnique({ where: { id } });
  if (!item || item.guildId !== interaction.guildId)
    return interaction.reply({ content: '❌ Cargo não encontrado.', ephemeral: true });

  await prisma.shopRole.delete({ where: { id } });

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setDescription(`✅ **${item.name}** foi removido da loja.`);

  return interaction.update({ embeds: [embed], components: [] });
}

// ─── Admin: Remover Banner ────────────────────────────────────────────────────

async function handleBannerAdminRemoveSel(interaction) {
  const key    = interaction.values[0];
  const banner = await prisma.customBanner.findFirst({ where: { key, guildId: interaction.guildId, active: true } });
  if (!banner)
    return interaction.update({ content: '❌ Banner não encontrado.', embeds: [], components: [] });

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('⚠️ Confirmar Remoção')
    .setDescription(`Tem certeza que deseja remover o banner **${banner.name}** da loja?\n\nEssa ação não pode ser desfeita.`)
    .setImage(buildBannerUrl(banner.imageUrl) || null)
    .addFields({ name: '💰 Preço', value: `${banner.price.toLocaleString('pt-BR')} coins`, inline: true })
    .setFooter({ text: 'Fallen Bot · Admin da Loja' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`banner_admin_remove_confirm:${key}`).setLabel('Sim, remover').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('banner_admin_remove_cancel').setLabel('Cancelar').setEmoji('✖️').setStyle(ButtonStyle.Secondary),
  );

  return interaction.update({ embeds: [embed], components: [row] });
}

async function handleBannerAdminRemoveConfirm(interaction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });

  const key    = interaction.customId.split(':')[1];
  const banner = await prisma.customBanner.findFirst({ where: { key, guildId: interaction.guildId } });
  if (!banner)
    return interaction.update({ content: '❌ Banner não encontrado.', embeds: [], components: [] });

  await prisma.customBanner.update({ where: { id: banner.id }, data: { active: false } });

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🗑️ Banner Removido')
    .setDescription(`O banner **${banner.name}** foi removido da loja com sucesso.`)
    .setFooter({ text: 'Fallen Bot · Admin da Loja' });

  return interaction.update({ embeds: [embed], components: [] });
}

// ─── Personalização (admin) ───────────────────────────────────────────────────

const LOJA_CFG_FIELDS = {
  titulo:    { label: 'Título',           db: 'lojaTitle',     max: 100,  paragraph: false },
  texto:     { label: 'Texto do painel',  db: 'lojaText',      max: 1800, paragraph: true  },
  banner:    { label: 'URL do Banner',    db: 'lojaBanner',    max: 500,  paragraph: false },
  thumb:     { label: 'URL da Thumbnail', db: 'lojaThumb',     max: 500,  paragraph: false },
  cor:       { label: 'Cor Hex (sem #)',  db: 'lojaColor',     max: 6,    paragraph: false },
  conversao: { label: 'Texto conversão',  db: 'lojaConversao', max: 400,  paragraph: true  },
};

function fmtEmoji(val) {
  if (!val) return '*padrão*';
  return `\`${val}\``;
}

export function buildLojaConfigPayload(cfg) {
  const color    = cfg.lojaColor ? parseInt(cfg.lojaColor, 16) : SHOP_COLOR;
  const divOn    = cfg.lojaUseDivider ?? false;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🎨 Personalizar Painel da Loja')
    .setDescription('Clique em um campo para editar. As alterações aparecem no próximo `/loja painel`.')
    .addFields(
      { name: '🏷️ Título',    value: cfg.lojaTitle     ? `\`${cfg.lojaTitle}\``                  : '*padrão*',           inline: true },
      { name: '🎨 Cor',       value: cfg.lojaColor     ? `\`#${cfg.lojaColor}\``                  : '`#9B4FD6`',          inline: true },
      { name: '🖼️ Banner',   value: cfg.lojaBanner    ? `[Ver](<${cfg.lojaBanner}>)`              : '*nenhum*',           inline: true },
      { name: '🖼️ Thumbnail', value: cfg.lojaThumb     ? `[Ver](<${cfg.lojaThumb}>)`               : '*ícone do servidor*',inline: true },
      { name: '➖ Divisória',  value: divOn ? '✅ Ativada' : '❌ Desativada',                                               inline: true },
      { name: '🔄 Conversão', value: cfg.lojaConversao ? cfg.lojaConversao.slice(0, 100) + (cfg.lojaConversao.length > 100 ? '…' : '') : '*padrão*' },
      { name: '📝 Texto',     value: cfg.lojaText      ? cfg.lojaText.slice(0, 100)      + (cfg.lojaText.length      > 100 ? '…' : '') : '*padrão*' },
      {
        name: '😀 Emojis dos Botões',
        value: [
          `🛒 Comprar: ${fmtEmoji(cfg.shopEmojiComprar)}`,
          `🖼️ Vitrine: ${fmtEmoji(cfg.shopEmojiVitrine)}`,
          `🔄 Converter: ${fmtEmoji(cfg.shopEmojiConverter)}`,
          `💰 Saldo: ${fmtEmoji(cfg.shopEmojiSaldo)}`,
          `🎁 Presentear: ${fmtEmoji(cfg.shopEmojiGift)}`,
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Fallen Bot · Personalizar Loja' });

  if (cfg.lojaBanner) embed.setImage(cfg.lojaBanner);
  if (cfg.lojaThumb)  embed.setThumbnail(cfg.lojaThumb);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('loja_cfg_titulo').setLabel('Título').setEmoji('🏷️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loja_cfg_texto').setLabel('Texto').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loja_cfg_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loja_cfg_thumb').setLabel('Thumbnail').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loja_cfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('loja_cfg_conversao').setLabel('Conversão').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loja_cfg_divider').setLabel(divOn ? 'Divisória: ON' : 'Divisória: OFF').setEmoji('➖').setStyle(divOn ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loja_cfg_emojis').setLabel('Emojis dos Botões').setEmoji('😀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('loja_cfg_reset').setLabel('Resetar Tudo').setEmoji('♻️').setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row1, row2] };
}

async function handleLojaConfig(interaction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isAdmin) return interaction.reply({ content: '❌ Apenas administradores podem configurar o painel.', ephemeral: true });

  const cfg    = await getCfg(interaction.guildId);
  const method = interaction.isButton() ? 'update' : 'reply';
  return interaction[method]({ ...buildLojaConfigPayload(cfg), ...(method === 'reply' ? { ephemeral: true } : {}) });
}

async function handleLojaCfgBtn(interaction) {
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isAdmin) return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });

  const field = interaction.customId.replace('loja_cfg_', '');

  if (field === 'reset') {
    await prisma.guildConfig.upsert({
      where:  { guildId: interaction.guildId },
      create: { guildId: interaction.guildId },
      update: {
        lojaTitle: null, lojaText: null, lojaBanner: null, lojaThumb: null,
        lojaColor: null, lojaConversao: null, lojaUseDivider: false,
        shopEmojiComprar: null, shopEmojiVitrine: null, shopEmojiConverter: null,
        shopEmojiSaldo: null, shopEmojiGift: null,
      },
    });
    const cfg = await getCfg(interaction.guildId);
    return interaction.update(buildLojaConfigPayload(cfg));
  }

  if (field === 'emojis') {
    const cfg = await getCfg(interaction.guildId);
    const modal = new ModalBuilder().setCustomId('loja_cfg_modal_emojis').setTitle('😀 Emojis dos Botões da Loja');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_comprar').setLabel('Comprar (ex: 🛒 ou <:nome:id>)')
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          .setPlaceholder('🛒').setValue(cfg.shopEmojiComprar ?? ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_vitrine').setLabel('Vitrine (ex: 🖼️ ou <:nome:id>)')
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          .setPlaceholder('🖼️').setValue(cfg.shopEmojiVitrine ?? ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_converter').setLabel('Converter (ex: 🔄 ou <:nome:id>)')
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          .setPlaceholder('🔄').setValue(cfg.shopEmojiConverter ?? ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_saldo').setLabel('Meu Saldo (ex: 💰 ou <:nome:id>)')
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          .setPlaceholder('💰').setValue(cfg.shopEmojiSaldo ?? ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_gift').setLabel('Presentear (ex: 🎁 ou <:nome:id>)')
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          .setPlaceholder('🎁').setValue(cfg.shopEmojiGift ?? ''),
      ),
    );
    return interaction.showModal(modal);
  }

  if (field === 'divider') {
    const cfg = await getCfg(interaction.guildId);
    await prisma.guildConfig.update({
      where: { guildId: interaction.guildId },
      data:  { lojaUseDivider: !cfg.lojaUseDivider },
    });
    const updated = await getCfg(interaction.guildId);
    return interaction.update(buildLojaConfigPayload(updated));
  }

  const def = LOJA_CFG_FIELDS[field];
  if (!def) return;

  const cfg   = await getCfg(interaction.guildId);
  const cur   = cfg[def.db] ?? '';

  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(def.label)
    .setStyle(def.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(def.max)
    .setPlaceholder('(vazio = voltar ao padrão)');

  if (cur) input.setValue(cur);

  const modal = new ModalBuilder()
    .setCustomId(`loja_cfg_modal_${field}`)
    .setTitle(`Editar: ${def.label}`)
    .addComponents(new ActionRowBuilder().addComponents(input));

  return interaction.showModal(modal);
}

async function handleLojaConfigModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const field = interaction.customId.replace('loja_cfg_modal_', '');

  if (field === 'emojis') {
    const comprar   = interaction.fields.getTextInputValue('emoji_comprar').trim()   || null;
    const vitrine   = interaction.fields.getTextInputValue('emoji_vitrine').trim()   || null;
    const converter = interaction.fields.getTextInputValue('emoji_converter').trim() || null;
    const saldo     = interaction.fields.getTextInputValue('emoji_saldo').trim()     || null;
    const gift      = interaction.fields.getTextInputValue('emoji_gift').trim()       || null;

    await prisma.guildConfig.upsert({
      where:  { guildId: interaction.guildId },
      create: { guildId: interaction.guildId, shopEmojiComprar: comprar, shopEmojiVitrine: vitrine, shopEmojiConverter: converter, shopEmojiSaldo: saldo, shopEmojiGift: gift },
      update: { shopEmojiComprar: comprar, shopEmojiVitrine: vitrine, shopEmojiConverter: converter, shopEmojiSaldo: saldo, shopEmojiGift: gift },
    });

    const cfg = await getCfg(interaction.guildId);
    return interaction.editReply({ content: '✅ **Emojis dos botões** atualizados!', ...buildLojaConfigPayload(cfg) });
  }

  const def = LOJA_CFG_FIELDS[field];
  if (!def) return interaction.editReply({ content: '❌ Campo inválido.' });

  let value = interaction.fields.getTextInputValue('value').trim() || null;
  if (value && field === 'cor') value = value.replace(/^#/, '').toUpperCase().slice(0, 6);

  await prisma.guildConfig.upsert({
    where:  { guildId: interaction.guildId },
    create: { guildId: interaction.guildId, [def.db]: value },
    update: { [def.db]: value },
  });

  const cfg     = await getCfg(interaction.guildId);
  const payload = buildLojaConfigPayload(cfg);

  return interaction.editReply({
    content: `✅ **${def.label}** ${value ? 'atualizado!' : 'resetado para o padrão!'}`,
    ...payload,
  });
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export async function handleShopInteraction(interaction, client) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id === 'shop_comprar')                   return handleComprar(interaction);
    if (id === 'shop_vitrine')                   return handleVitrine(interaction);
    if (id === 'shop_converter')                 return handleConverter(interaction);
    if (id === 'shop_conv_msgs')                 return handleConvMsgs(interaction);
    if (id === 'shop_conv_call')                 return handleConvCall(interaction);
    if (id === 'shop_saldo')                     return handleSaldo(interaction);
    if (id === 'shop_gift')                      return handleGift(interaction);
    if (id === 'shop_cancel')                    return interaction.update({ content: '❌ Compra cancelada.', embeds: [], components: [] });
    if (id.startsWith('shop_buy_'))              return handleBuyConfirm(interaction);
    if (id.startsWith('shop_ok_'))               return handleBuyExecute(interaction, client);
    if (id.startsWith('shop_gok:'))              return handleGiftBuyExecute(interaction, client);
    if (id === 'profile_banner_btn')             return handleProfileBannerBtn(interaction);
    if (id === 'profile_ring_btn' || id === 'wallet_ring_btn')                 return handleRingBtn(interaction, ringMode(id));
    if (id === 'profile_ring_custom' || id === 'wallet_ring_custom')           return handleRingCustom(interaction, ringMode(id));
    if (id === 'profile_ring_border_custom' || id === 'wallet_ring_border_custom') return handleRingBorderCustom(interaction, ringMode(id));
    if (id === 'profile_ring_border_reset' || id === 'wallet_ring_border_reset')   return handleRingBorderReset(interaction, ringMode(id));
    if (id === 'profile_ring_remove' || id === 'wallet_ring_remove')           return handleRingRemove(interaction, ringMode(id));
    if (id.startsWith('profile_ring_preset:') || id.startsWith('wallet_ring_preset:')) return handleRingPreset(interaction, ringMode(id));
    if (id.startsWith('profile_ring_frame:') || id.startsWith('wallet_ring_frame:'))   return handleRingFrame(interaction, ringMode(id));
    if (id.startsWith('profile_ring_confirm:') || id.startsWith('wallet_ring_confirm:')) return handleRingConfirm(interaction, ringMode(id));
    if (id.startsWith('profile_ringborder_confirm:') || id.startsWith('wallet_ringborder_confirm:')) return handleRingBorderConfirm(interaction, ringMode(id));
    if (id === 'profile_ring_cancel' || id === 'wallet_ring_cancel') return handleRingCancel(interaction);
    if (id === 'profile_bg_btn')                 return handleProfileBgBtn(interaction);
    if (id === 'profile_bg_solid')               return handleProfileBgSolid(interaction);
    if (id === 'profile_bg_gradient')            return handleProfileBgGradient(interaction);
    if (id === 'profile_bg_reset')               return handleProfileBgReset(interaction);
    if (id === 'profile_panel_btn')              return handleProfilePanelBtn(interaction);
    if (id === 'profile_panel_custom')           return handleProfilePanelCustom(interaction);
    if (id === 'profile_panel_reset')            return handleProfilePanelReset(interaction);
    if (id === 'profile_pet_btn')                return handleProfilePetBtn(interaction);
    if (id === 'wallet_fundo_btn')               return handleWalletFundoBtn(interaction);
    if (id === 'wallet_fundo_preset_btn')        return handleWalletFundoPresetBtn(interaction);
    if (id === 'wallet_fundo_reset')             return handleWalletFundoReset(interaction);
    if (id.startsWith('loja_cfg_'))              return handleLojaCfgBtn(interaction);
    if (id === 'loja_admin_cargos')              return handleLojaAdminCargos(interaction);
    if (id === 'loja_admin_personalizar')        return handleLojaConfig(interaction);
    if (id === 'loja_admin_add_cargo')           return handleLojaAdminAddCargo(interaction);
    if (id.startsWith('banner_admin_remove_confirm:')) return handleBannerAdminRemoveConfirm(interaction);
    if (id === 'banner_admin_remove_cancel')     return interaction.update({ content: '❌ Remoção cancelada.', embeds: [], components: [] });
  }

  if (interaction.isStringSelectMenu()) {
    if (id === 'shop_type_sel')                  return handleTypeSel(interaction);
    if (id === 'shop_item_sel')                  return handleItemSel(interaction);
    if (id === 'shop_vitrine_sel')               return handleVitrineSel(interaction);
    if (id === 'profile_banner_sel')             return handleProfileBannerSel(interaction);
    if (id === 'wallet_fundo_preset_sel')        return handleWalletFundoPresetSel(interaction);
    if (id === 'profile_pet_sel')                return handleProfilePetSel(interaction);
    if (id.startsWith('shop_gt:'))               return handleGiftTypeSel(interaction);
    if (id.startsWith('shop_gi:'))               return handleGiftItemSel(interaction);
    if (id === 'loja_admin_remove_sel')          return handleLojaAdminRemoveSel(interaction);
    if (id === 'banner_admin_remove_sel')        return handleBannerAdminRemoveSel(interaction);
  }

  if (interaction.isModalSubmit()) {
    if (id.startsWith('loja_cfg_modal_'))        return handleLojaConfigModal(interaction);
    if (id === 'shop_gift_modal')                return handleGiftModal(interaction, client);
    if (id === 'loja_admin_modal_add_cargo')     return handleLojaAdminAddCargoModal(interaction);
    if (id === 'profile_ring_custom_modal' || id === 'wallet_ring_custom_modal') return handleRingCustomModal(interaction, ringMode(id));
    if (id === 'profile_ring_border_modal' || id === 'wallet_ring_border_modal') return handleRingBorderModal(interaction, ringMode(id));
    if (id === 'profile_bg_solid_modal')         return handleProfileBgSolidModal(interaction);
    if (id === 'profile_bg_gradient_modal')      return handleProfileBgGradientModal(interaction);
    if (id === 'profile_panel_modal')            return handleProfilePanelModal(interaction);
    if (id === 'wallet_fundo_modal')             return handleWalletFundoModal(interaction);
  }
}

// ─── 🎁 Gift: comprar e presentear ───────────────────────────────────────────

async function handleGift(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('shop_gift_modal')
    .setTitle('🎁 Presentear Alguém');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('target')
        .setLabel('Para quem? (ID ou @mencione no servidor)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Cole o ID do usuário ou copie a menção')
    ),
  );

  return interaction.showModal(modal);
}

async function handleGiftModal(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const raw      = interaction.fields.getTextInputValue('target').trim();
  const userId   = raw.replace(/[<@!>]/g, '');
  const target   = await interaction.guild.members.fetch(userId).catch(() => null);

  if (!target) {
    return interaction.editReply({ content: '❌ Usuário não encontrado neste servidor. Verifique o ID e tente novamente.' });
  }
  if (target.id === interaction.user.id) {
    return interaction.editReply({ content: '❌ Você não pode se presentear! Use a opção de compra normal.' });
  }
  if (target.user.bot) {
    return interaction.editReply({ content: '❌ Não é possível presentear bots.' });
  }

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('🎁 O que deseja presentear?')
    .setDescription(`Presenteando **${target.displayName ?? target.user.username}** — selecione a categoria abaixo:`)
    .setThumbnail(target.user.displayAvatarURL({ size: 64 }));

  const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId, active: true } });

  const sel = new StringSelectMenuBuilder()
    .setCustomId(`shop_gt:${target.id}`)
    .setPlaceholder('Selecione o tipo de item')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('👑 Cargos').setValue('roles').setDescription(`${roles.length} cargos disponíveis`),
      new StringSelectMenuOptionBuilder().setLabel('🖼️ Banners').setValue('banners').setDescription(`${BANNERS.length} banners disponíveis`),
    );

  return interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(sel)] });
}

async function handleGiftTypeSel(interaction) {
  const targetId = interaction.customId.slice('shop_gt:'.length);
  const type     = interaction.values[0];
  const target   = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) return interaction.update({ content: '❌ Destinatário não encontrado.', components: [] });

  const eco = await getEco(interaction.user.id, interaction.guildId);

  if (type === 'roles') {
    const roles  = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId, active: true } });
    const gifted = await prisma.userPurchase.findMany({
      where: { userId: targetId, itemType: 'role' },
    });
    const giftedRefs = new Set(gifted.map(g => g.itemRef));

    if (!roles.length) {
      return interaction.update({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Nenhum cargo na loja.')],
        components: [],
      });
    }

    const sel = new StringSelectMenuBuilder()
      .setCustomId(`shop_gi:${targetId}`)
      .setPlaceholder('Selecione o cargo para presentear')
      .addOptions(roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(`role:${r.id}`)
          .setDescription(`${r.price.toLocaleString('pt-BR')} SC${giftedRefs.has(r.roleId) ? ' ✅ já possui' : ''}`)
      ));

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR)
          .setTitle(`🎁 Presentear ${target.displayName}`)
          .setDescription(roles.map(r =>
            `> **${r.name}** — \`${r.price.toLocaleString('pt-BR')} ${COIN}\`\n> ${r.description ?? '—'}`
          ).join('\n\n'))
          .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true }),
      ],
      components: [new ActionRowBuilder().addComponents(sel)],
    });
  }

  if (type === 'banners') {
    const allBanners = await getAllBannersForGuild(interaction.guildId);
    const gifted = await prisma.userPurchase.findMany({
      where: { userId: targetId, itemType: 'banner' },
    });
    const giftedKeys = new Set(gifted.map(g => g.itemRef));

    const sel = new StringSelectMenuBuilder()
      .setCustomId(`shop_gi:${targetId}`)
      .setPlaceholder('Selecione o banner para presentear')
      .addOptions(allBanners.slice(0, 25).map(b => {
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(b.name.slice(0, 100))
          .setValue(`banner:${b.key}`)
          .setDescription(`${b.price.toLocaleString('pt-BR')} moedas${giftedKeys.has(b.key) ? ' ✅ já possui' : ''}`.slice(0, 100));
        const isCustomEmoji = /<a?:\w+:\d+>/.test(b.emoji ?? '');
        if (isCustomEmoji) {
          const m = b.emoji.match(/<(a?):(\w+):(\d+)>/);
          if (m) opt.setEmoji({ animated: m[1] === 'a', name: m[2], id: m[3] });
        } else if (b.emoji) {
          opt.setEmoji(b.emoji);
        }
        return opt;
      }));

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR)
          .setTitle(`🎁 Presentear ${target.displayName}`)
          .setDescription(allBanners.map(b =>
            `${giftedKeys.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} ${COIN}\``
          ).join('\n'))
          .setImage(allBanners[0].imageUrl)
          .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true }),
      ],
      components: [new ActionRowBuilder().addComponents(sel)],
    });
  }
}

async function handleGiftItemSel(interaction) {
  const targetId        = interaction.customId.slice('shop_gi:'.length);
  const [itemType, ref] = interaction.values[0].split(':');
  const eco             = await getEco(interaction.user.id, interaction.guildId);
  const target          = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) return interaction.update({ content: '❌ Destinatário não encontrado.', components: [] });

  let name, price, alreadyGifted, canAfford;

  if (itemType === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: ref } });
    if (!item) return interaction.update({ content: '❌ Item não encontrado.', components: [] });
    name = item.name; price = item.price;
    alreadyGifted = !!(await prisma.userPurchase.findUnique({
      where: { userId_itemType_itemRef: { userId: targetId, itemType: 'role', itemRef: item.roleId } },
    }));
    canAfford = eco.balance >= price;
  } else {
    const b = await resolveBannerForGuild(ref, interaction.guildId);
    if (!b) return interaction.update({ content: '❌ Banner não encontrado.', components: [] });
    name = b.name; price = b.price;
    alreadyGifted = !!(await prisma.userPurchase.findUnique({
      where: { userId_itemType_itemRef: { userId: targetId, itemType: 'banner', itemRef: b.key } },
    }));
    canAfford = eco.balance >= price;
  }

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle(`🎁 Confirmar Presente`)
    .setDescription(
      `Presentear **${target.displayName}** com **${name}**?\n\n` +
      `> 💰 Preço: **${price.toLocaleString('pt-BR')} ${COIN}**\n` +
      `> 👛 Seu saldo: **${eco.balance.toLocaleString('pt-BR')} ${COIN}**\n` +
      `> 📉 Saldo após: **${(eco.balance - price).toLocaleString('pt-BR')} ${COIN}**`
    )
    .setThumbnail(target.user.displayAvatarURL({ size: 64 }));

  if (alreadyGifted) embed.setFooter({ text: '⚠️ Destinatário já possui este item!' });
  else if (!canAfford) embed.setFooter({ text: '❌ Saldo insuficiente!' });

  const customId = `shop_gok:${targetId}:${itemType}:${ref}`;

  const btn = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(alreadyGifted ? 'Já Possui' : !canAfford ? 'Saldo Insuficiente' : '🎁 Confirmar Presente')
    .setStyle(alreadyGifted ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(alreadyGifted || !canAfford);

  return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
}

async function handleGiftBuyExecute(interaction, client) {
  await interaction.deferUpdate();

  const rest    = interaction.customId.slice('shop_gok:'.length);
  const colonAt = rest.indexOf(':');
  const targetId = rest.slice(0, colonAt);
  const itemPart = rest.slice(colonAt + 1);
  const [itemType, ...refParts] = itemPart.split(':');
  const ref      = refParts.join(':');

  const [eco, target] = await Promise.all([
    getEco(interaction.user.id, interaction.guildId),
    interaction.guild.members.fetch(targetId).catch(() => null),
  ]);

  if (!target) return interaction.editReply({ content: '❌ Destinatário não encontrado.' });

  let name, price, itemRef, roleId;

  if (itemType === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: ref } });
    if (!item) return interaction.editReply({ content: '❌ Item não encontrado.' });
    name = item.name; price = item.price; itemRef = item.roleId; roleId = item.roleId;
  } else {
    const b = await resolveBannerForGuild(ref, interaction.guildId);
    if (!b) return interaction.editReply({ content: '❌ Banner não encontrado.' });
    name = b.name; price = b.price; itemRef = b.key;
  }

  if (eco.balance < price) return interaction.editReply({ content: `❌ Saldo insuficiente! Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.` });

  const exists = await prisma.userPurchase.findUnique({
    where: { userId_itemType_itemRef: { userId: targetId, itemType, itemRef } },
  });
  if (exists) return interaction.editReply({ content: `❌ **${target.displayName}** já possui **${name}**!` });

  await prisma.economy.update({
    where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    data:  { balance: { decrement: price } },
  });

  await prisma.userPurchase.create({
    data: { userId: targetId, itemType, itemRef },
  });

  if (itemType === 'role' && roleId) {
    await target.roles.add(roleId).catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🎁 Presente Enviado!')
    .setDescription(
      `Você presenteou **${target.displayName}** com **${name}**!\n` +
      `> 💰 **${price.toLocaleString('pt-BR')} ${COIN}** debitados do seu saldo.`
    )
    .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
    .setTimestamp();

  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(SHOP_COLOR)
          .setTitle('🎁 Você recebeu um presente!')
          .setDescription(
            `**${interaction.member?.displayName ?? interaction.user.username}** te presenteou com **${name}**!\n` +
            (itemType === 'banner' ? '\n🖼️ Use `/perfil` e clique em **Mudar Banner** para equipar!' : '')
          )
          .setThumbnail(interaction.user.displayAvatarURL({ size: 64 })),
      ],
    });
  } catch {}

  return interaction.editReply({ embeds: [embed] });
}

// ─── 🛒 Comprar ───────────────────────────────────────────────────────────────

async function handleComprar(interaction) {
  const [roles, pets] = await Promise.all([
    prisma.shopRole.findMany({ where: { guildId: interaction.guildId, active: true } }),
    prisma.pet.findMany({ where: { guildId: interaction.guildId, active: true } }),
  ]);

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('🛒 O que deseja comprar?')
    .setDescription('Selecione uma categoria abaixo.')
    .addFields(
      { name: '👑 Cargos',             value: `${roles.length} disponível(is)`, inline: true },
      { name: '🖼️ Banners de Perfil',  value: `${BANNERS.length} banners`,      inline: true },
      { name: '🐾 Pets',               value: `${pets.length} pet(s)`,          inline: true },
    );

  const sel = new StringSelectMenuBuilder()
    .setCustomId('shop_type_sel')
    .setPlaceholder('Escolha a categoria')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('👑 Cargos').setValue('roles').setDescription(`${roles.length} cargos disponíveis`),
      new StringSelectMenuOptionBuilder().setLabel('🖼️ Banners').setValue('banners').setDescription(`${BANNERS.length} banners disponíveis`),
      new StringSelectMenuOptionBuilder().setLabel('🐾 Pets').setValue('pets').setDescription(`${pets.length} pets disponíveis`),
    );

  return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
}

async function handleTypeSel(interaction) {
  const type = interaction.values[0];
  const eco  = await getEco(interaction.user.id, interaction.guildId);

  if (type === 'roles') {
    const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId, active: true } });
    if (!roles.length) {
      return interaction.update({
        embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('❌ Sem cargos').setDescription('Nenhum cargo foi cadastrado ainda. Um admin pode usar `/loja config`.')],
        components: [],
      });
    }

    const owned    = await prisma.userPurchase.findMany({ where: { userId: interaction.user.id, itemType: 'role' } });
    const ownedSet = new Set(owned.map(o => o.itemRef));

    const sel = new StringSelectMenuBuilder()
      .setCustomId('shop_item_sel')
      .setPlaceholder('Selecione um cargo')
      .addOptions(roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(`role:${r.id}`)
          .setDescription(`${r.price.toLocaleString('pt-BR')} ${COIN}${ownedSet.has(r.roleId) ? ' ✅' : ''}`)
      ));

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR).setTitle('👑 Cargos à Venda')
          .setDescription(roles.map(r => `${ownedSet.has(r.roleId) ? '✅' : '▫️'} **${r.name}** — \`${r.price.toLocaleString('pt-BR')} ${COIN}\`\n> ${r.description ?? '—'}`).join('\n\n'))
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true }),
      ],
      components: [new ActionRowBuilder().addComponents(sel)],
    });
  }

  if (type === 'banners') {
    const allBanners = await getAllBannersForGuild(interaction.guildId);
    const owned    = await prisma.userPurchase.findMany({ where: { userId: interaction.user.id, itemType: 'banner' } });
    const ownedSet = new Set(owned.map(o => o.itemRef));

    const sel = new StringSelectMenuBuilder()
      .setCustomId('shop_item_sel')
      .setPlaceholder('Selecione um banner')
      .addOptions(allBanners.slice(0, 25).map(b => {
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(b.name.slice(0, 100)).setValue(`banner:${b.key}`)
          .setDescription(`${b.price.toLocaleString('pt-BR')} moedas${ownedSet.has(b.key) ? ' ✅' : ''}`.slice(0, 100));
        const isCustomEmoji = /<a?:\w+:\d+>/.test(b.emoji ?? '');
        if (isCustomEmoji) {
          const m = b.emoji.match(/<(a?):(\w+):(\d+)>/);
          if (m) opt.setEmoji({ animated: m[1] === 'a', name: m[2], id: m[3] });
        } else if (b.emoji) {
          opt.setEmoji(b.emoji);
        }
        return opt;
      }));

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🖼️ Banners de Perfil')
          .setDescription(allBanners.map(b => `${ownedSet.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} ${COIN}\``).join('\n'))
          .setImage(allBanners[0].imageUrl)
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true }),
      ],
      components: [new ActionRowBuilder().addComponents(sel)],
    });
  }

  if (type === 'pets') {
    const pets = await prisma.pet.findMany({ where: { guildId: interaction.guildId, active: true } });
    if (!pets.length) {
      return interaction.update({
        embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('❌ Sem Pets').setDescription('Nenhum pet cadastrado ainda. Um admin pode usar `/criar-pet`.')],
        components: [],
      });
    }

    const owned    = await prisma.userPurchase.findMany({ where: { userId: interaction.user.id, itemType: 'pet' } });
    const ownedSet = new Set(owned.map(o => o.itemRef));

    const options = pets.slice(0, 25).map(p =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${p.emoji} ${p.name}`)
        .setValue(`pet:${p.id}`)
        .setDescription(`${p.price.toLocaleString('pt-BR')} ${COIN}${ownedSet.has(p.id) ? ' ✅' : ''}`)
    );

    const sel = new StringSelectMenuBuilder().setCustomId('shop_item_sel').setPlaceholder('Selecione um pet').addOptions(options);

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🐾 Pets Disponíveis')
          .setDescription(pets.map(p => `${ownedSet.has(p.id) ? '✅' : '▫️'} **${p.emoji} ${p.name}** — \`${p.price.toLocaleString('pt-BR')} ${COIN}\`\n> ${p.description ?? '—'}`).join('\n\n'))
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true })
          .setFooter({ text: 'Após comprar, use /perfil → Meu Pet para equipar' }),
      ],
      components: [new ActionRowBuilder().addComponents(sel)],
    });
  }
}

async function handleItemSel(interaction) {
  const [itemType, ref] = interaction.values[0].split(':');
  const eco = await getEco(interaction.user.id, interaction.guildId);

  if (itemType === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: ref } });
    if (!item) return interaction.update({ content: '❌ Cargo não encontrado.', embeds: [], components: [] });
    const owned    = !!(await prisma.userPurchase.findUnique({ where: { userId_itemType_itemRef: { userId: interaction.user.id, itemType: 'role', itemRef: item.roleId } } }));
    const canAfford = eco.balance >= item.price;

    const embed = new EmbedBuilder().setColor(SHOP_COLOR).setTitle(`👑 ${item.name}`)
      .setDescription(item.description ?? 'Cargo exclusivo do servidor.')
      .addFields({ name: '💰 Preço', value: `**${item.price.toLocaleString('pt-BR')} ${COIN}**`, inline: true }, { name: '👛 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true });

    const btn = new ButtonBuilder().setCustomId(`shop_buy_role:${item.id}`)
      .setLabel(owned ? 'Já Possui' : canAfford ? 'Comprar' : 'Sem Saldo')
      .setEmoji(owned ? '✅' : '🛒')
      .setStyle(owned ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(owned || !canAfford);

    return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }

  if (itemType === 'banner') {
    const b = await resolveBannerForGuild(ref, interaction.guildId);
    if (!b) return interaction.update({ content: '❌ Banner não encontrado.', embeds: [], components: [] });
    const owned    = !!(await prisma.userPurchase.findUnique({ where: { userId_itemType_itemRef: { userId: interaction.user.id, itemType: 'banner', itemRef: b.key } } }));
    const canAfford = eco.balance >= b.price;

    const embed = new EmbedBuilder().setColor(SHOP_COLOR).setTitle(b.name)
      .setDescription(b.description || '\u200b').setImage(b.imageUrl || null)
      .addFields({ name: '💰 Preço', value: `**${b.price.toLocaleString('pt-BR')} ${COIN}**`, inline: true }, { name: '👛 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true });

    const btn = new ButtonBuilder().setCustomId(`shop_buy_banner:${b.key}`)
      .setLabel(owned ? 'Já Possui' : canAfford ? 'Comprar Banner' : 'Sem Saldo')
      .setEmoji(owned ? '✅' : '🛒')
      .setStyle(owned ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(owned || !canAfford);

    return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }

  if (itemType === 'pet') {
    const pet = await prisma.pet.findUnique({ where: { id: ref } });
    if (!pet) return interaction.update({ content: '❌ Pet não encontrado.', embeds: [], components: [] });
    const owned     = !!(await prisma.userPurchase.findUnique({ where: { userId_itemType_itemRef: { userId: interaction.user.id, itemType: 'pet', itemRef: pet.id } } }));
    const canAfford = eco.balance >= pet.price;

    const embed = new EmbedBuilder().setColor(SHOP_COLOR).setTitle(`${pet.emoji} ${pet.name}`)
      .setDescription(pet.description ?? 'Um pet exclusivo do servidor.')
      .addFields({ name: '💰 Preço', value: `**${pet.price.toLocaleString('pt-BR')} ${COIN}**`, inline: true }, { name: '👛 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true })
      .setFooter({ text: 'Após comprar, use /perfil → Meu Pet para equipar' });

    const btn = new ButtonBuilder().setCustomId(`shop_buy_pet:${pet.id}`)
      .setLabel(owned ? 'Já Possui' : canAfford ? 'Comprar Pet' : 'Sem Saldo')
      .setEmoji(owned ? '✅' : '🛒')
      .setStyle(owned ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(owned || !canAfford);

    return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
}

async function handleBuyConfirm(interaction) {
  const ref         = interaction.customId.slice('shop_buy_'.length);
  const [type, key] = ref.split(':');
  const eco         = await getEco(interaction.user.id, interaction.guildId);
  let name, price;

  if (type === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: key } });
    if (!item) return interaction.reply({ content: '❌ Item não encontrado.', ephemeral: true });
    name = item.name; price = item.price;
  } else if (type === 'pet') {
    const pet = await prisma.pet.findUnique({ where: { id: key } });
    if (!pet) return interaction.reply({ content: '❌ Pet não encontrado.', ephemeral: true });
    name = `${pet.emoji} ${pet.name}`; price = pet.price;
  } else {
    const b = await resolveBannerForGuild(key, interaction.guildId);
    if (!b) return interaction.reply({ content: '❌ Banner não encontrado.', ephemeral: true });
    name = b.name; price = b.price;
  }

  if (eco.balance < price) return interaction.reply({ content: `❌ Saldo insuficiente! Você tem **${eco.balance.toLocaleString('pt-BR')} ${COIN}**.`, ephemeral: true });

  const embed = new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ Confirmar Compra')
    .setDescription(
      `Comprar **${name}** por **${price.toLocaleString('pt-BR')} ${COIN}**?\n\n` +
      `> 💰 Saldo atual: **${eco.balance.toLocaleString('pt-BR')} ${COIN}**\n` +
      `> 📉 Saldo após:  **${(eco.balance - price).toLocaleString('pt-BR')} ${COIN}**`
    ).setFooter({ text: '⚠️ Esta ação não pode ser desfeita!' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`shop_ok_${ref}`).setLabel('Confirmar').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('shop_cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );

  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleBuyExecute(interaction, client) {
  const ref         = interaction.customId.slice('shop_ok_'.length);
  const [type, key] = ref.split(':');
  const eco         = await getEco(interaction.user.id, interaction.guildId);
  let name, price, itemRef, roleId;

  if (type === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: key } });
    if (!item) return interaction.update({ content: '❌ Item não encontrado.', embeds: [], components: [] });
    name = item.name; price = item.price; itemRef = item.roleId; roleId = item.roleId;
  } else if (type === 'pet') {
    const pet = await prisma.pet.findUnique({ where: { id: key } });
    if (!pet) return interaction.update({ content: '❌ Pet não encontrado.', embeds: [], components: [] });
    name = `${pet.emoji} ${pet.name}`; price = pet.price; itemRef = pet.id;
  } else {
    const b = await resolveBannerForGuild(key, interaction.guildId);
    if (!b) return interaction.update({ content: '❌ Banner não encontrado.', embeds: [], components: [] });
    name = b.name; price = b.price; itemRef = b.key;
  }

  if (eco.balance < price) return interaction.update({ content: '❌ Saldo insuficiente!', embeds: [], components: [] });

  const exists = await prisma.userPurchase.findUnique({
    where: { userId_itemType_itemRef: { userId: interaction.user.id, itemType: type, itemRef } },
  });
  if (exists) return interaction.update({ content: '✅ Você já possui este item!', embeds: [], components: [] });

  await prisma.economy.update({
    where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    data:  { balance: { decrement: price } },
  });
  await prisma.userPurchase.create({ data: { userId: interaction.user.id, itemType: type, itemRef } });

  if (type === 'role' && roleId) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (member) await member.roles.add(roleId).catch(() => {});
  }

  const tipByType = {
    banner: '\n\n🖼️ Use `/perfil` → **Mudar Banner** para equipar!',
    pet:    '\n\n🐾 Use `/perfil` → **Meu Pet** para equipar!',
  };

  const embed = new EmbedBuilder().setColor(0x57F287).setTitle('✅ Compra Realizada!')
    .setDescription(
      `Você comprou **${name}** com sucesso!\n` +
      `💰 **${price.toLocaleString('pt-BR')} ${COIN}** debitados.` +
      (tipByType[type] ?? '')
    ).setTimestamp();

  return interaction.update({ embeds: [embed], components: [] });
}

// ─── 🖼️ Vitrine ───────────────────────────────────────────────────────────────

async function handleVitrine(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const [allBanners, owned] = await Promise.all([
    getAllBannersForGuild(interaction.guildId),
    prisma.userPurchase.findMany({ where: { userId: interaction.user.id, itemType: 'banner' } }),
  ]);
  const ownedSet = new Set(owned.map(o => o.itemRef));

  const options = allBanners.slice(0, 25).map(b => {
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(b.name.slice(0, 100))
      .setValue(b.key)
      .setDescription(`${b.price.toLocaleString('pt-BR')} moedas${ownedSet.has(b.key) ? ' ✅ Você possui' : ''}`);
    const isCustomEmoji = /<a?:\w+:\d+>/.test(b.emoji ?? '');
    if (isCustomEmoji) {
      const m = b.emoji.match(/<(a?):(\w+):(\d+)>/);
      if (m) opt.setEmoji({ animated: m[1] === 'a', name: m[2], id: m[3] });
    } else if (b.emoji) {
      opt.setEmoji(b.emoji);
    }
    return opt;
  });

  const sel = new StringSelectMenuBuilder()
    .setCustomId('shop_vitrine_sel')
    .setPlaceholder('🖼️ Selecione um banner para ver a prévia')
    .addOptions(options);

  const lines = allBanners.map(b =>
    `${ownedSet.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} ${COIN}\``
  ).join('\n');

  const desc = lines.length > 3900 ? lines.slice(0, 3900) + '\n…' : lines;

  return interaction.editReply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🖼️ Vitrine de Banners')
        .setDescription(desc + '\n\n*Selecione um banner abaixo para ver a prévia e comprar.*')
        .setImage(allBanners[0].imageUrl)
        .setFooter({ text: `${allBanners.length} banner(s) disponíve${allBanners.length === 1 ? 'l' : 'is'} • ✅ = você possui` }),
    ],
    components: [new ActionRowBuilder().addComponents(sel)],
  });
}

async function handleVitrineSel(interaction) {
  const key    = interaction.values[0];
  const [banner, allBanners] = await Promise.all([
    resolveBannerForGuild(key, interaction.guildId),
    getAllBannersForGuild(interaction.guildId),
  ]);
  if (!banner) return interaction.update({ content: '❌ Banner não encontrado.', components: [] });

  const [owned, eco, allOwned] = await Promise.all([
    prisma.userPurchase.findUnique({ where: { userId_itemType_itemRef: { userId: interaction.user.id, itemType: 'banner', itemRef: key } } }),
    getEco(interaction.user.id, interaction.guildId),
    prisma.userPurchase.findMany({ where: { userId: interaction.user.id, itemType: 'banner' } }),
  ]);
  const ownedSet = new Set(allOwned.map(o => o.itemRef));
  const canAfford = eco.balance >= banner.price;

  const sel = new StringSelectMenuBuilder()
    .setCustomId('shop_vitrine_sel').setPlaceholder('Ver outro banner...')
    .addOptions(allBanners.slice(0, 25).map(b => {
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(b.name.slice(0, 100)).setValue(b.key)
        .setDescription(`${b.price.toLocaleString('pt-BR')} ${COIN}${ownedSet.has(b.key) ? ' ✅' : ''}`.slice(0, 100));
      const isCustom = /<a?:\w+:\d+>/.test(b.emoji ?? '');
      if (isCustom) {
        const m = b.emoji.match(/<(a?):(\w+):(\d+)>/);
        if (m) opt.setEmoji({ animated: m[1] === 'a', name: m[2], id: m[3] });
      } else if (b.emoji) {
        opt.setEmoji(b.emoji);
      }
      return opt;
    }));

  const btn = new ButtonBuilder().setCustomId(`shop_buy_banner:${banner.key}`)
    .setLabel(owned ? 'Já Possui' : !canAfford ? 'Sem Saldo' : 'Comprar Banner')
    .setEmoji(owned ? '✅' : '🛒')
    .setStyle(owned ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(!!owned || !canAfford);

  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle(banner.name).setDescription(banner.description || '\u200b').setImage(banner.imageUrl || null)
        .addFields({ name: '💰 Preço', value: `**${banner.price.toLocaleString('pt-BR')} ${COIN}**`, inline: true }, { name: '👛 Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true }),
    ],
    components: [new ActionRowBuilder().addComponents(sel), new ActionRowBuilder().addComponents(btn)],
  });
}

// ─── 🔄 Converter ─────────────────────────────────────────────────────────────

const MSG_PER_CONV  = 1000;
const MSG_REWARD    = 500;
const MINS_PER_CONV = 60;
const CALL_REWARD   = 500;

async function handleConverter(interaction) {
  const [eco, cfg] = await Promise.all([
    getEco(interaction.user.id, interaction.guildId),
    getCfg(interaction.guildId),
  ]);

  const msgConversions  = Math.floor(eco.messageCount / MSG_PER_CONV);
  const callConversions = Math.floor(eco.callMinutes  / MINS_PER_CONV);

  const convText = cfg?.lojaConversao ??
    `> \`1.000 msgs\` → **500 ${COIN}**\n> \`1h em call\` → **500 ${COIN}**`;

  const statsText =
    `> 💬 **${eco.messageCount.toLocaleString('pt-BR')}** mensagens acumuladas\n` +
    `> 🎙️ **${eco.callMinutes.toLocaleString('pt-BR')}** minuto(s) em call`;

  const embed = new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🔄 Conversor')
    .addFields(
      { name: '📊 Conversão',        value: convText },
      { name: '📈 Suas Estatísticas', value: statsText },
      { name: '💼 Seu Saldo',         value: `> 💰 **${eco.balance.toLocaleString('pt-BR')} ${COIN}** na carteira\n> 🏦 **${eco.bank.toLocaleString('pt-BR')} ${COIN}** no banco` },
    );

  const msgBtn = new ButtonBuilder()
    .setCustomId('shop_conv_msgs')
    .setLabel(msgConversions > 0 ? `Converter Mensagens (+${(msgConversions * MSG_REWARD).toLocaleString('pt-BR')} moedas)` : 'Converter Mensagens')
    .setEmoji('💬')
    .setStyle(msgConversions > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setDisabled(msgConversions === 0);

  const callBtn = new ButtonBuilder()
    .setCustomId('shop_conv_call')
    .setLabel(callConversions > 0 ? `Converter Call (+${(callConversions * CALL_REWARD).toLocaleString('pt-BR')} moedas)` : 'Converter Call')
    .setEmoji('🎙️')
    .setStyle(callConversions > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setDisabled(callConversions === 0);

  return interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(msgBtn, callBtn)],
    ephemeral: true,
  });
}

async function handleConvMsgs(interaction) {
  const eco = await getEco(interaction.user.id, interaction.guildId);
  const conversions = Math.floor(eco.messageCount / MSG_PER_CONV);

  if (conversions === 0) {
    return interaction.reply({
      content: `❌ Mensagens insuficientes. Você tem **${eco.messageCount.toLocaleString('pt-BR')}** mensagens e precisa de pelo menos **${MSG_PER_CONV.toLocaleString('pt-BR')}**.`,
      ephemeral: true,
    });
  }

  const coinsEarned = conversions * MSG_REWARD;
  const msgsUsed    = conversions * MSG_PER_CONV;

  await prisma.economy.update({
    where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    data:  { balance: { increment: coinsEarned }, messageCount: { decrement: msgsUsed } },
  });

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(0x57F287).setTitle('✅ Conversão Realizada!')
        .setDescription(
          `> 💬 **${msgsUsed.toLocaleString('pt-BR')} mensagens** convertidas\n` +
          `> ${COIN} Você ganhou **${coinsEarned.toLocaleString('pt-BR')}** moedas!`
        ),
    ],
    ephemeral: true,
  });
}

async function handleConvCall(interaction) {
  const eco = await getEco(interaction.user.id, interaction.guildId);
  const conversions = Math.floor(eco.callMinutes / MINS_PER_CONV);

  if (conversions === 0) {
    return interaction.reply({
      content: `❌ Tempo em call insuficiente. Você tem **${eco.callMinutes} min** acumulados e precisa de pelo menos **60 min** (1 hora).`,
      ephemeral: true,
    });
  }

  const coinsEarned = conversions * CALL_REWARD;
  const minsUsed    = conversions * MINS_PER_CONV;

  await prisma.economy.update({
    where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    data:  { balance: { increment: coinsEarned }, callMinutes: { decrement: minsUsed } },
  });

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(0x57F287).setTitle('✅ Conversão Realizada!')
        .setDescription(
          `> 🎙️ **${minsUsed} minuto(s)** em call convertidos\n` +
          `> ${COIN} Você ganhou **${coinsEarned.toLocaleString('pt-BR')}** moedas!`
        ),
    ],
    ephemeral: true,
  });
}

// ─── 💰 Meu Saldo ─────────────────────────────────────────────────────────────

async function handleSaldo(interaction) {
  const [eco, purchases, profile] = await Promise.all([
    getEco(interaction.user.id, interaction.guildId),
    prisma.userPurchase.count({ where: { userId: interaction.user.id } }),
    prisma.userProfile.findUnique({ where: { userId: interaction.user.id } }),
  ]);

  const activeBannerObj = profile?.activeBanner
    ? await resolveBannerForGuild(profile.activeBanner, interaction.guildId)
    : null;

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('💰 Meu Saldo')
        .setThumbnail(interaction.user.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: '💰 Carteira',       value: `**${eco.balance.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
          { name: '🏦 Banco',          value: `**${eco.bank.toLocaleString('pt-BR')} ${COIN}**`,   inline: true },
          { name: '📦 Itens',          value: `**${purchases}** compra(s)`,                        inline: true },
          { name: '🖼️ Banner Ativo',   value: activeBannerObj ? activeBannerObj.name : 'Nenhum',   inline: true },
        )
        .setFooter({ text: 'Use /eco saldo para mais detalhes' }),
    ],
    ephemeral: true,
  });
}

// ─── 💠 Argola do Perfil / Carteira ────────────────────────────────────────────
// As duas usam a mesma UI, mas cada uma grava em campos DIFERENTES do UserProfile
// (activeRing/ringBorderColor para perfil, walletRing/walletRingBorder para carteira)
// para que trocar a argola em /carteira NUNCA afete /perfil e vice-versa.

const RING_FIELDS = {
  profile: { ring: 'activeRing', border: 'ringBorderColor' },
  wallet:  { ring: 'walletRing',  border: 'walletRingBorder' },
};

function ringMode(id) {
  return id.startsWith('wallet_') ? 'wallet' : 'profile';
}

function ringTitle(mode) {
  return mode === 'wallet' ? '💠 Argola da Carteira' : '💠 Argola do Perfil';
}

function ringFooter(mode) {
  return mode === 'wallet' ? 'Use /carteira para ver o resultado' : 'Use /perfil para ver o resultado';
}

function describeRing(value) {
  const frame = getFrame(value);
  if (frame) return `${frame.emoji} ${frame.label} (moldura)`;
  const preset = getRing(value);
  if (preset) return `${preset.emoji} ${preset.label}`;
  if (value?.startsWith('#')) return `Personalizada \`${value}\``;
  return '🟣 Roxo (padrão)';
}

function buildRingRows(current, mode) {
  const makeBtn = (p) => new ButtonBuilder()
    .setCustomId(`${mode}_ring_preset:${p.key}`)
    .setLabel(`${p.emoji} ${p.label}`)
    .setStyle(current === p.key ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const makeFrameBtn = (f) => new ButtonBuilder()
    .setCustomId(`${mode}_ring_frame:${f.key}`)
    .setLabel(`${f.emoji} ${f.label}`)
    .setStyle(current === `frame:${f.key}` ? ButtonStyle.Primary : ButtonStyle.Secondary);

  return [
    new ActionRowBuilder().addComponents(RING_PRESETS.slice(0, 5).map(makeBtn)),
    new ActionRowBuilder().addComponents(RING_PRESETS.slice(5).map(makeBtn)),
    new ActionRowBuilder().addComponents(FRAME_PRESETS.slice(0, 3).map(makeFrameBtn)),
    new ActionRowBuilder().addComponents(FRAME_PRESETS.slice(3).map(makeFrameBtn)),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${mode}_ring_custom`).setLabel('🎨 Cor da Argola (Hex)').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${mode}_ring_border_custom`).setLabel('🔲 Cor do Contorno').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${mode}_ring_border_reset`).setLabel('↩️ Resetar Contorno').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${mode}_ring_remove`).setLabel('🚫 Remover Argola').setStyle(ButtonStyle.Danger),
    ),
  ];
}

async function handleRingBtn(interaction, mode) {
  const fields  = RING_FIELDS[mode];
  const profile = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });
  const current = profile?.[fields.ring]   ?? 'roxo';
  const border  = profile?.[fields.border] ?? null;

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle(ringTitle(mode))
        .setDescription(
          `Personalize a argola/moldura ao redor do avatar${mode === 'wallet' ? ' na carteira' : ' no perfil'}.\n\n` +
          `**🎨 Argola:** ${describeRing(current)}\n` +
          `**🔲 Contorno:** ${border ? `\`${border}\`` : '⬜ Branco (padrão)'}`
        )
        .setFooter({ text: ringFooter(mode) }),
    ],
    components: buildRingRows(current, mode),
    ephemeral: true,
  });
}

// ─── 👁️ Prévia (sem persistir) + confirmação de equipar ───────────────────────

async function sendRingPreview(interaction, mode, value, label) {
  await interaction.deferReply({ ephemeral: true });

  const fields    = RING_FIELDS[mode];
  const profile   = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });
  const border    = profile?.[fields.border] ?? null;
  const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });

  const buf        = await renderRingPreview(avatarUrl, value, border);
  const attachment = new AttachmentBuilder(buf, { name: 'preview.png' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${mode}_ring_confirm:${value}`).setLabel('Equipar').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${mode}_ring_cancel`).setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('👁️ Prévia da Argola')
    .setDescription(`Veja como vai ficar antes de equipar:\n\n**${label}**`)
    .setImage('attachment://preview.png')
    .setFooter({ text: 'Clique em Equipar para confirmar, sem afetar a atual até lá' });

  return interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
}

async function sendRingBorderPreview(interaction, mode, borderValue, currentRing) {
  await interaction.deferReply({ ephemeral: true });

  const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
  const buf        = await renderRingPreview(avatarUrl, currentRing, borderValue);
  const attachment = new AttachmentBuilder(buf, { name: 'preview.png' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${mode}_ringborder_confirm:${borderValue}`).setLabel('Equipar').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${mode}_ring_cancel`).setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Secondary),
  );

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('👁️ Prévia do Contorno')
    .setDescription(`Veja como vai ficar antes de equipar:\n\n**Contorno:** \`${borderValue}\``)
    .setImage('attachment://preview.png')
    .setFooter({ text: 'Clique em Equipar para confirmar, sem afetar o atual até lá' });

  return interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
}

async function handleRingPreset(interaction, mode) {
  const key    = interaction.customId.slice(`${mode}_ring_preset:`.length);
  const preset = getRing(key);
  if (!preset) return interaction.reply({ content: '❌ Cor inválida.', ephemeral: true });

  return sendRingPreview(interaction, mode, key, `${preset.emoji} ${preset.label}`);
}

async function handleRingFrame(interaction, mode) {
  const key   = interaction.customId.slice(`${mode}_ring_frame:`.length);
  const frame = FRAME_PRESETS.find(f => f.key === key);
  if (!frame) return interaction.reply({ content: '❌ Moldura inválida.', ephemeral: true });

  return sendRingPreview(interaction, mode, `frame:${key}`, `${frame.emoji} ${frame.label} (moldura)`);
}

async function handleRingConfirm(interaction, mode) {
  const fields = RING_FIELDS[mode];
  const value  = interaction.customId.slice(`${mode}_ring_confirm:`.length);

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, [fields.ring]: value },
    update: { [fields.ring]: value },
  });

  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(0x57F287).setTitle('✅ Argola Equipada!')
        .setDescription(
          `Sua argola foi atualizada para **${describeRing(value)}**!\n` +
          `Use \`${mode === 'wallet' ? '/carteira' : '/perfil'}\` para ver o resultado.`
        )
        .setImage('attachment://preview.png'),
    ],
    components: [],
  });
}

async function handleRingBorderConfirm(interaction, mode) {
  const fields = RING_FIELDS[mode];
  const value  = interaction.customId.slice(`${mode}_ringborder_confirm:`.length);

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, [fields.border]: value },
    update: { [fields.border]: value },
  });

  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(0x57F287).setTitle('✅ Contorno Equipado!')
        .setDescription(
          `O contorno da argola foi atualizado para \`${value}\`!\n` +
          `Use \`${mode === 'wallet' ? '/carteira' : '/perfil'}\` para ver o resultado.`
        )
        .setImage('attachment://preview.png'),
    ],
    components: [],
  });
}

async function handleRingCancel(interaction) {
  return interaction.update({
    content:    '❌ Alteração cancelada. Nada foi equipado.',
    embeds:     [],
    components: [],
  });
}

async function handleRingCustom(interaction, mode) {
  const modal = new ModalBuilder().setCustomId(`${mode}_ring_custom_modal`).setTitle('🎨 Cor da Argola (Hex)');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('hex').setLabel('Cor em Hex (ex: FF0000 para vermelho)')
        .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(6).setMaxLength(7)
        .setPlaceholder('FF0000')
    )
  );
  return interaction.showModal(modal);
}

async function handleRingBorderCustom(interaction, mode) {
  const modal = new ModalBuilder().setCustomId(`${mode}_ring_border_modal`).setTitle('🔲 Cor do Contorno da Argola');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('hex').setLabel('Cor em Hex (ex: FFFFFF para branco)')
        .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(6).setMaxLength(7)
        .setPlaceholder('FFFFFF')
    )
  );
  return interaction.showModal(modal);
}

async function handleRingBorderModal(interaction, mode) {
  const fields = RING_FIELDS[mode];
  let hex = interaction.fields.getTextInputValue('hex').trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex))
    return interaction.reply({ content: '❌ Cor inválida! Use um hex de 6 dígitos (ex: `FFFFFF`).', ephemeral: true });

  const profile     = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });
  const currentRing = profile?.[fields.ring] ?? null;

  return sendRingBorderPreview(interaction, mode, `#${hex}`, currentRing);
}

async function handleRingBorderReset(interaction, mode) {
  const fields = RING_FIELDS[mode];
  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, [fields.border]: null },
    update: { [fields.border]: null },
  });
  return interaction.reply({ content: `✅ Contorno resetado para branco (padrão). Use \`${mode === 'wallet' ? '/carteira' : '/perfil'}\` para ver.`, ephemeral: true });
}

async function handleRingCustomModal(interaction, mode) {
  let hex = interaction.fields.getTextInputValue('hex').trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex))
    return interaction.reply({ content: '❌ Cor inválida! Use um hex de 6 dígitos (ex: `FF0000`).',  ephemeral: true });

  return sendRingPreview(interaction, mode, `#${hex}`, `Personalizada \`#${hex}\``);
}

async function handleRingRemove(interaction, mode) {
  const fields = RING_FIELDS[mode];
  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, [fields.ring]: null },
    update: { [fields.ring]: null },
  });
  return interaction.reply({ content: '✅ Argola removida. A cor padrão (roxo) será usada.', ephemeral: true });
}

// ─── 🐾 Pet do Perfil ─────────────────────────────────────────────────────────

async function handleProfilePetBtn(interaction) {
  const [owned, profile] = await Promise.all([
    prisma.userPurchase.findMany({ where: { userId: interaction.user.id, itemType: 'pet' } }),
    prisma.userProfile.findUnique({ where: { userId: interaction.user.id } }),
  ]);

  if (!owned.length)
    return interaction.reply({ content: '❌ Você não possui nenhum pet!\nUse `/loja painel` → **Comprar** → **Pets** para comprar.', ephemeral: true });

  const petIds  = owned.map(o => o.itemRef);
  const pets    = await prisma.pet.findMany({ where: { id: { in: petIds } } });

  const opts = [
    new StringSelectMenuOptionBuilder().setLabel('🚫 Remover pet').setValue('none').setDescription('Não exibir nenhum pet no perfil').setEmoji('🚫'),
    ...pets.map(p => {
      const isCustomEmoji = /<a?:\w+:\d+>/.test(p.emoji ?? '');
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(p.name)
        .setValue(p.id)
        .setDescription(profile?.activePet === p.id ? '✅ Equipado' : 'Disponível');
      if (isCustomEmoji) {
        const match = p.emoji.match(/<(a?):(\w+):(\d+)>/);
        if (match) opt.setEmoji({ animated: match[1] === 'a', name: match[2], id: match[3] });
      } else if (p.emoji) {
        opt.setEmoji(p.emoji);
      }
      return opt;
    }),
  ];

  return interaction.reply({
    content: '🐾 **Selecione o pet para equipar no seu perfil:**',
    components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('profile_pet_sel').setPlaceholder('Selecione um pet').addOptions(opts))],
    ephemeral: true,
  });
}

async function handleProfilePetSel(interaction) {
  const val       = interaction.values[0];
  const activePet = val === 'none' ? null : val;

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, activePet },
    update: { activePet },
  });

  if (!activePet) {
    return interaction.update({ content: '✅ Pet removido do perfil.', components: [] });
  }

  const pet = await prisma.pet.findUnique({ where: { id: activePet } }).catch(() => null);
  return interaction.update({ content: `✅ Pet **${pet?.emoji} ${pet?.name}** equipado! Use \`/perfil\` para ver.`, components: [] });
}

// ─── 🖼️ Mudar Banner do Perfil ────────────────────────────────────────────────

async function handleProfileBannerBtn(interaction) {
  const [owned, profile] = await Promise.all([
    prisma.userPurchase.findMany({ where: { userId: interaction.user.id, itemType: 'banner' } }),
    prisma.userProfile.findUnique({ where: { userId: interaction.user.id } }),
  ]);

  if (!owned.length) return interaction.reply({ content: '❌ Você não possui nenhum banner!\nUse `/loja painel` → **Vitrine** para comprar.', ephemeral: true });

  const resolvedBanners = await Promise.all(owned.map(p => resolveBannerForGuild(p.itemRef, interaction.guildId)));

  const opts = [
    new StringSelectMenuOptionBuilder().setLabel('🚫 Sem banner (padrão)').setValue('none').setDescription('Remover banner').setEmoji('🚫'),
    ...resolvedBanners
      .filter(b => b !== null)
      .map(b => {
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(b.name.slice(0, 100)).setValue(b.key)
          .setDescription(profile?.activeBanner === b.key ? '✅ Equipado' : 'Disponível');
        const isCustomEmoji = /<a?:\w+:\d+>/.test(b.emoji ?? '');
        if (isCustomEmoji) {
          const m = b.emoji.match(/<(a?):(\w+):(\d+)>/);
          if (m) opt.setEmoji({ animated: m[1] === 'a', name: m[2], id: m[3] });
        } else if (b.emoji) {
          opt.setEmoji(b.emoji);
        } else {
          opt.setEmoji('🖼️');
        }
        return opt;
      }),
  ];

  return interaction.reply({
    content: '🖼️ **Selecione o banner para equipar:**',
    components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('profile_banner_sel').setPlaceholder('Selecione um banner').addOptions(opts))],
    ephemeral: true,
  });
}

async function handleProfileBannerSel(interaction) {
  const key          = interaction.values[0];
  const activeBanner = key === 'none' ? null : key;

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, activeBanner },
    update: { activeBanner },
  });

  const bannerName = activeBanner ? (await resolveBannerForGuild(activeBanner, interaction.guildId))?.name ?? activeBanner : null;
  return interaction.update({
    content: bannerName ? `✅ Banner **${bannerName}** equipado! Use \`/perfil\` para ver.` : '✅ Banner removido.',
    components: [],
  });
}

// ─── 🎨 Fundo do Card ─────────────────────────────────────────────────────────

function bgDescription(cardBg1, cardBg2) {
  if (cardBg1 && cardBg2) return `🌈 Gradiente: \`${cardBg1}\` → \`${cardBg2}\``;
  if (cardBg1)             return `🟦 Cor sólida: \`${cardBg1}\``;
  return '⬜ Branco (padrão)';
}

async function handleProfileBgBtn(interaction) {
  const profile = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });
  const bg1 = profile?.cardBg1 ?? null;
  const bg2 = profile?.cardBg2 ?? null;

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🎨 Fundo do Card')
        .setDescription(
          `Personalize o fundo do seu card de perfil.\n\n` +
          `**Fundo atual:** ${bgDescription(bg1, bg2)}\n\n` +
          `Escolha uma opção abaixo:`
        )
        .setFooter({ text: 'Use /perfil para ver o resultado' }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('profile_bg_solid').setLabel('Cor Sólida').setEmoji('🟦').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('profile_bg_gradient').setLabel('Gradiente').setEmoji('🌈').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('profile_bg_reset').setLabel('Resetar (Branco)').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      ),
    ],
    ephemeral: true,
  });
}

async function handleProfileBgSolid(interaction) {
  const modal = new ModalBuilder().setCustomId('profile_bg_solid_modal').setTitle('🟦 Cor Sólida do Fundo');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('hex')
        .setLabel('Cor em Hex (ex: F0E6FF para roxo claro)')
        .setStyle(TextInputStyle.Short).setRequired(true)
        .setMinLength(6).setMaxLength(7).setPlaceholder('F0E6FF')
    )
  );
  return interaction.showModal(modal);
}

async function handleProfileBgGradient(interaction) {
  const modal = new ModalBuilder().setCustomId('profile_bg_gradient_modal').setTitle('🌈 Gradiente do Fundo');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('hex1')
        .setLabel('Cor inicial (ex: 1a0533)')
        .setStyle(TextInputStyle.Short).setRequired(true)
        .setMinLength(6).setMaxLength(7).setPlaceholder('1a0533')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('hex2')
        .setLabel('Cor final (ex: 4a1a8a)')
        .setStyle(TextInputStyle.Short).setRequired(true)
        .setMinLength(6).setMaxLength(7).setPlaceholder('4a1a8a')
    )
  );
  return interaction.showModal(modal);
}

async function handleProfileBgReset(interaction) {
  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, cardBg1: null, cardBg2: null },
    update: { cardBg1: null, cardBg2: null },
  });
  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🎨 Fundo do Card')
        .setDescription('✅ Fundo resetado para **branco** (padrão).\nUse `/perfil` para ver.')
        .setFooter({ text: 'Use /perfil para ver o resultado' }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('profile_bg_solid').setLabel('Cor Sólida').setEmoji('🟦').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('profile_bg_gradient').setLabel('Gradiente').setEmoji('🌈').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('profile_bg_reset').setLabel('Resetar (Branco)').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function handleProfileBgSolidModal(interaction) {
  let hex = interaction.fields.getTextInputValue('hex').trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex))
    return interaction.reply({ content: '❌ Cor inválida! Use um hex de 6 dígitos (ex: `F0E6FF`).', ephemeral: true });

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, cardBg1: `#${hex}`, cardBg2: null },
    update: { cardBg1: `#${hex}`, cardBg2: null },
  });

  return interaction.reply({
    content: `✅ Fundo alterado para cor sólida \`#${hex}\`! Use \`/perfil\` para ver.`,
    ephemeral: true,
  });
}

async function handleProfileBgGradientModal(interaction) {
  let hex1 = interaction.fields.getTextInputValue('hex1').trim().replace(/^#/, '').toUpperCase();
  let hex2 = interaction.fields.getTextInputValue('hex2').trim().replace(/^#/, '').toUpperCase();

  if (!/^[0-9A-F]{6}$/.test(hex1) || !/^[0-9A-F]{6}$/.test(hex2))
    return interaction.reply({ content: '❌ Uma das cores é inválida! Use hex de 6 dígitos (ex: `1a0533`).', ephemeral: true });

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, cardBg1: `#${hex1}`, cardBg2: `#${hex2}` },
    update: { cardBg1: `#${hex1}`, cardBg2: `#${hex2}` },
  });

  return interaction.reply({
    content: `✅ Fundo alterado para gradiente \`#${hex1}\` → \`#${hex2}\`! Use \`/perfil\` para ver.`,
    ephemeral: true,
  });
}

// ─── 🟦 Cor do Painel de Stats ────────────────────────────────────────────────

function panelDescription(color) {
  if (color) return `🟦 Cor personalizada: \`${color}\``;
  return '⬜ Branco (padrão)';
}

async function handleProfilePanelBtn(interaction) {
  const profile = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });
  const current = profile?.cardPanelColor ?? null;

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🟦 Cor do Painel de Stats')
        .setDescription(
          `Personalize a cor dos campos de stats no seu card.\n\n` +
          `**Cor atual:** ${panelDescription(current)}\n\n` +
          `Escolha uma opção abaixo:`
        )
        .setFooter({ text: 'Use /perfil para ver o resultado' }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('profile_panel_custom').setLabel('Definir Cor').setEmoji('🎨').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('profile_panel_reset').setLabel('Resetar (Branco)').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      ),
    ],
    ephemeral: true,
  });
}

async function handleProfilePanelCustom(interaction) {
  const modal = new ModalBuilder().setCustomId('profile_panel_modal').setTitle('🟦 Cor do Painel de Stats');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('hex')
        .setLabel('Cor em Hex (ex: 1a1a2e para escuro)')
        .setStyle(TextInputStyle.Short).setRequired(true)
        .setMinLength(6).setMaxLength(7).setPlaceholder('1a1a2e')
    )
  );
  return interaction.showModal(modal);
}

async function handleProfilePanelReset(interaction) {
  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, cardPanelColor: null },
    update: { cardPanelColor: null },
  });
  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🟦 Cor do Painel de Stats')
        .setDescription('✅ Painel resetado para **branco** (padrão).\nUse `/perfil` para ver.')
        .setFooter({ text: 'Use /perfil para ver o resultado' }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('profile_panel_custom').setLabel('Definir Cor').setEmoji('🎨').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('profile_panel_reset').setLabel('Resetar (Branco)').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function handleProfilePanelModal(interaction) {
  let hex = interaction.fields.getTextInputValue('hex').trim().replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(hex))
    return interaction.reply({ content: '❌ Cor inválida! Use um hex de 6 dígitos (ex: `1a1a2e`).', ephemeral: true });

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, cardPanelColor: `#${hex}` },
    update: { cardPanelColor: `#${hex}` },
  });

  return interaction.reply({
    content: `✅ Cor do painel alterada para \`#${hex}\`! Use \`/perfil\` para ver.`,
    ephemeral: true,
  });
}

// ─── 🖼️ Fundo CDN da Carteira ─────────────────────────────────────────────────

async function handleWalletFundoPresetBtn(interaction) {
  const profile = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });
  const current = profile?.walletBg ?? null;

  const opts = [
    new StringSelectMenuOptionBuilder()
      .setLabel('🚫 Sem fundo (padrão)')
      .setValue('none')
      .setDescription('Remover fundo da carteira')
      .setEmoji('🚫'),
    ...WALLET_BACKGROUNDS.map(bg => {
      const isActive = current === bg.url;
      return new StringSelectMenuOptionBuilder()
        .setLabel(bg.name.slice(0, 100))
        .setValue(bg.key)
        .setDescription(isActive ? '✅ Equipado' : 'Toque para equipar')
        .setEmoji(bg.emoji);
    }),
  ];

  // Discord limita 25 opções por select — dividir em páginas se necessário
  const page1 = opts.slice(0, 25);

  return interaction.reply({
    content: '🖼️ **Escolha um fundo para sua carteira:**',
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('wallet_fundo_preset_sel')
          .setPlaceholder('Selecione um fundo...')
          .addOptions(page1),
      ),
    ],
    ephemeral: true,
  });
}

async function handleWalletFundoPresetSel(interaction) {
  const key = interaction.values[0];

  if (key === 'none') {
    await prisma.userProfile.upsert({
      where:  { userId: interaction.user.id },
      create: { userId: interaction.user.id, walletBg: null },
      update: { walletBg: null },
    });
    return interaction.update({ content: '✅ Fundo removido! Use `fallen pf` para ver.', components: [] });
  }

  const bg = WALLET_BACKGROUNDS.find(b => b.key === key);
  if (!bg) return interaction.update({ content: '❌ Fundo não encontrado.', components: [] });

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, walletBg: bg.url },
    update: { walletBg: bg.url },
  });

  return interaction.update({
    content: `✅ Fundo **${bg.name}** equipado! Use \`fallen pf\` para ver.`,
    components: [],
  });
}

async function handleWalletFundoBtn(interaction) {
  const profile = await prisma.userProfile.findUnique({ where: { userId: interaction.user.id } });
  const current = profile?.walletBg ?? null;

  const modal = new ModalBuilder().setCustomId('wallet_fundo_modal').setTitle('🖼️ Fundo da Carteira');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('url')
        .setLabel('URL do Discord CDN')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('https://cdn.discordapp.com/attachments/...')
    )
  );
  return interaction.showModal(modal);
}

async function handleWalletFundoReset(interaction) {
  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, walletBg: null },
    update: { walletBg: null },
  });
  return interaction.reply({
    content: '✅ Fundo da carteira removido! Use `fallen pf` para ver.',
    ephemeral: true,
  });
}

async function handleWalletFundoModal(interaction) {
  const url = interaction.fields.getTextInputValue('url').trim();

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { parsedUrl = null; }

  const isValid = parsedUrl &&
    parsedUrl.protocol === 'https:' &&
    /discordapp\.(com|net)|discord\.com/.test(parsedUrl.hostname);

  if (!isValid) {
    return interaction.reply({
      content: '❌ Use apenas links do Discord.\n\nComo pegar: envie a imagem no Discord, clique com o botão direito → **Copiar link de mídia**.',
      ephemeral: true,
    });
  }

  await prisma.userProfile.upsert({
    where:  { userId: interaction.user.id },
    create: { userId: interaction.user.id, walletBg: url },
    update: { walletBg: url },
  });

  return interaction.reply({
    content: `✅ Fundo da carteira definido!\nUse \`fallen pf\` para ver o resultado.`,
    ephemeral: true,
  });
}
