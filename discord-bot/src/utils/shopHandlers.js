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
} from 'discord.js';
import prisma from '../database/client.js';
import { BANNERS, getBanner } from './shopData.js';

const SHOP_COLOR = 0x9B4FD6;
const DIVIDER    = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

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
    .setFooter({ text: 'Slow Bot · Admin da Loja' });

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
    ? roles.map(r => `> <@&${r.roleId}> — **${r.price.toLocaleString('pt-BR')} SC**\n> ${r.description ?? '—'}\n> \`${r.id}\``).join('\n\n')
    : '*Nenhum cargo cadastrado ainda.*';

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('📦 Cargos em Estoque')
    .setDescription(lines)
    .setFooter({ text: 'Slow Bot · Admin da Loja' });

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
          .setDescription(`${r.price.toLocaleString('pt-BR')} SC`)
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
      new TextInputBuilder().setCustomId('price').setLabel('Preço (em SlowCoins)')
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
        .setDescription(`<@&${roleId}> agora está disponível por **${price.toLocaleString('pt-BR')} SC**!`)
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

// ─── Personalização (admin) ───────────────────────────────────────────────────

const LOJA_CFG_FIELDS = {
  titulo:    { label: 'Título',           db: 'lojaTitle',     max: 100,  paragraph: false },
  texto:     { label: 'Texto do painel',  db: 'lojaText',      max: 1800, paragraph: true  },
  banner:    { label: 'URL do Banner',    db: 'lojaBanner',    max: 500,  paragraph: false },
  thumb:     { label: 'URL da Thumbnail', db: 'lojaThumb',     max: 500,  paragraph: false },
  cor:       { label: 'Cor Hex (sem #)',  db: 'lojaColor',     max: 6,    paragraph: false },
  conversao: { label: 'Texto conversão',  db: 'lojaConversao', max: 400,  paragraph: true  },
};

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
    )
    .setFooter({ text: 'Slow Bot · Personalizar Loja' });

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
      update: { lojaTitle: null, lojaText: null, lojaBanner: null, lojaThumb: null, lojaColor: null, lojaConversao: null, lojaUseDivider: false },
    });
    const cfg = await getCfg(interaction.guildId);
    return interaction.update(buildLojaConfigPayload(cfg));
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
  const def   = LOJA_CFG_FIELDS[field];
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
    if (id === 'shop_saldo')                     return handleSaldo(interaction);
    if (id === 'shop_gift')                      return handleGift(interaction);
    if (id === 'shop_cancel')                    return interaction.update({ content: '❌ Compra cancelada.', embeds: [], components: [] });
    if (id.startsWith('shop_buy_'))              return handleBuyConfirm(interaction);
    if (id.startsWith('shop_ok_'))               return handleBuyExecute(interaction, client);
    if (id.startsWith('shop_gok:'))              return handleGiftBuyExecute(interaction, client);
    if (id === 'profile_banner_btn')             return handleProfileBannerBtn(interaction);
    if (id.startsWith('loja_cfg_'))              return handleLojaCfgBtn(interaction);
    if (id === 'loja_admin_cargos')              return handleLojaAdminCargos(interaction);
    if (id === 'loja_admin_personalizar')        return handleLojaConfig(interaction);
    if (id === 'loja_admin_add_cargo')           return handleLojaAdminAddCargo(interaction);
  }

  if (interaction.isStringSelectMenu()) {
    if (id === 'shop_type_sel')                  return handleTypeSel(interaction);
    if (id === 'shop_item_sel')                  return handleItemSel(interaction);
    if (id === 'shop_vitrine_sel')               return handleVitrineSel(interaction);
    if (id === 'profile_banner_sel')             return handleProfileBannerSel(interaction);
    if (id.startsWith('shop_gt:'))               return handleGiftTypeSel(interaction);
    if (id.startsWith('shop_gi:'))               return handleGiftItemSel(interaction);
    if (id === 'loja_admin_remove_sel')          return handleLojaAdminRemoveSel(interaction);
  }

  if (interaction.isModalSubmit()) {
    if (id.startsWith('loja_cfg_modal_'))        return handleLojaConfigModal(interaction);
    if (id === 'shop_gift_modal')                return handleGiftModal(interaction, client);
    if (id === 'loja_admin_modal_add_cargo')     return handleLojaAdminAddCargoModal(interaction);
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
      where: { userId: targetId, guildId: interaction.guildId, itemType: 'role' },
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
            `> **${r.name}** — \`${r.price.toLocaleString('pt-BR')} SC\`\n> ${r.description ?? '—'}`
          ).join('\n\n'))
          .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true }),
      ],
      components: [new ActionRowBuilder().addComponents(sel)],
    });
  }

  if (type === 'banners') {
    const gifted = await prisma.userPurchase.findMany({
      where: { userId: targetId, guildId: interaction.guildId, itemType: 'banner' },
    });
    const giftedKeys = new Set(gifted.map(g => g.itemRef));

    const sel = new StringSelectMenuBuilder()
      .setCustomId(`shop_gi:${targetId}`)
      .setPlaceholder('Selecione o banner para presentear')
      .addOptions(BANNERS.map(b =>
        new StringSelectMenuOptionBuilder()
          .setLabel(b.name)
          .setValue(`banner:${b.key}`)
          .setDescription(`${b.price.toLocaleString('pt-BR')} SC${giftedKeys.has(b.key) ? ' ✅ já possui' : ''}`)
          .setEmoji(b.emoji ?? '🖼️')
      ));

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR)
          .setTitle(`🎁 Presentear ${target.displayName}`)
          .setDescription(BANNERS.map(b =>
            `${giftedKeys.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} SC\``
          ).join('\n'))
          .setImage(BANNERS[0].imageUrl)
          .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true }),
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
      where: { userId_guildId_itemType_itemRef: { userId: targetId, guildId: interaction.guildId, itemType: 'role', itemRef: item.roleId } },
    }));
    canAfford = eco.balance >= price;
  } else {
    const b = getBanner(ref);
    if (!b) return interaction.update({ content: '❌ Banner não encontrado.', components: [] });
    name = b.name; price = b.price;
    alreadyGifted = !!(await prisma.userPurchase.findUnique({
      where: { userId_guildId_itemType_itemRef: { userId: targetId, guildId: interaction.guildId, itemType: 'banner', itemRef: b.key } },
    }));
    canAfford = eco.balance >= price;
  }

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle(`🎁 Confirmar Presente`)
    .setDescription(
      `Presentear **${target.displayName}** com **${name}**?\n\n` +
      `> 💰 Preço: **${price.toLocaleString('pt-BR')} SC**\n` +
      `> 👛 Seu saldo: **${eco.balance.toLocaleString('pt-BR')} SC**\n` +
      `> 📉 Saldo após: **${(eco.balance - price).toLocaleString('pt-BR')} SC**`
    )
    .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
    .setFooter({ text: alreadyGifted ? '⚠️ Destinatário já possui este item!' : canAfford ? '' : '❌ Saldo insuficiente!' });

  const customId = `shop_gok:${targetId}:${itemType}:${ref}`;

  const btn = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(alreadyGifted ? 'Já Possui' : !canAfford ? 'Saldo Insuficiente' : '🎁 Confirmar Presente')
    .setStyle(alreadyGifted ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(alreadyGifted || !canAfford);

  return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
}

async function handleGiftBuyExecute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

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
    const b = getBanner(ref);
    if (!b) return interaction.editReply({ content: '❌ Banner não encontrado.' });
    name = b.name; price = b.price; itemRef = b.key;
  }

  if (eco.balance < price) return interaction.editReply({ content: `❌ Saldo insuficiente! Você tem **${eco.balance.toLocaleString('pt-BR')} SC**.` });

  const exists = await prisma.userPurchase.findUnique({
    where: { userId_guildId_itemType_itemRef: { userId: targetId, guildId: interaction.guildId, itemType, itemRef } },
  });
  if (exists) return interaction.editReply({ content: `❌ **${target.displayName}** já possui **${name}**!` });

  await prisma.economy.update({
    where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    data:  { balance: { decrement: price } },
  });

  await prisma.userPurchase.create({
    data: { userId: targetId, guildId: interaction.guildId, itemType, itemRef },
  });

  if (itemType === 'role' && roleId) {
    await target.roles.add(roleId).catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🎁 Presente Enviado!')
    .setDescription(
      `Você presenteou **${target.displayName}** com **${name}**!\n` +
      `> 💰 **${price.toLocaleString('pt-BR')} SC** debitados do seu saldo.`
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
  const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId, active: true } });

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('🛒 O que deseja comprar?')
    .setDescription('Selecione uma categoria abaixo.')
    .addFields(
      { name: '👑 Cargos',             value: `${roles.length} disponível(is)`, inline: true },
      { name: '🖼️ Banners de Perfil',  value: `${BANNERS.length} banners`,      inline: true },
    );

  const sel = new StringSelectMenuBuilder()
    .setCustomId('shop_type_sel')
    .setPlaceholder('Escolha a categoria')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('👑 Cargos').setValue('roles').setDescription(`${roles.length} cargos disponíveis`),
      new StringSelectMenuOptionBuilder().setLabel('🖼️ Banners').setValue('banners').setDescription(`${BANNERS.length} banners disponíveis`),
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

    const owned    = await prisma.userPurchase.findMany({ where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'role' } });
    const ownedSet = new Set(owned.map(o => o.itemRef));

    const sel = new StringSelectMenuBuilder()
      .setCustomId('shop_item_sel')
      .setPlaceholder('Selecione um cargo')
      .addOptions(roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(`role:${r.id}`)
          .setDescription(`${r.price.toLocaleString('pt-BR')} SC${ownedSet.has(r.roleId) ? ' ✅' : ''}`)
      ));

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR).setTitle('👑 Cargos à Venda')
          .setDescription(roles.map(r => `${ownedSet.has(r.roleId) ? '✅' : '▫️'} **${r.name}** — \`${r.price.toLocaleString('pt-BR')} SC\`\n> ${r.description ?? '—'}`).join('\n\n'))
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true }),
      ],
      components: [new ActionRowBuilder().addComponents(sel)],
    });
  }

  if (type === 'banners') {
    const owned    = await prisma.userPurchase.findMany({ where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' } });
    const ownedSet = new Set(owned.map(o => o.itemRef));

    const sel = new StringSelectMenuBuilder()
      .setCustomId('shop_item_sel')
      .setPlaceholder('Selecione um banner')
      .addOptions(BANNERS.map(b =>
        new StringSelectMenuOptionBuilder()
          .setLabel(b.name).setValue(`banner:${b.key}`)
          .setDescription(`${b.price.toLocaleString('pt-BR')} SC${ownedSet.has(b.key) ? ' ✅' : ''}`)
          .setEmoji(b.emoji ?? '🖼️')
      ));

    return interaction.update({
      embeds: [
        new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🖼️ Banners de Perfil')
          .setDescription(BANNERS.map(b => `${ownedSet.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} SC\``).join('\n'))
          .setImage(BANNERS[0].imageUrl)
          .addFields({ name: '💰 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true }),
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
    const owned    = !!(await prisma.userPurchase.findUnique({ where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'role', itemRef: item.roleId } } }));
    const canAfford = eco.balance >= item.price;

    const embed = new EmbedBuilder().setColor(SHOP_COLOR).setTitle(`👑 ${item.name}`)
      .setDescription(item.description ?? 'Cargo exclusivo do servidor.')
      .addFields({ name: '💰 Preço', value: `**${item.price.toLocaleString('pt-BR')} SC**`, inline: true }, { name: '👛 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true });

    const btn = new ButtonBuilder().setCustomId(`shop_buy_role:${item.id}`)
      .setLabel(owned ? 'Já Possui' : canAfford ? 'Comprar' : 'Sem Saldo')
      .setEmoji(owned ? '✅' : '🛒')
      .setStyle(owned ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(owned || !canAfford);

    return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }

  if (itemType === 'banner') {
    const b = getBanner(ref);
    if (!b) return interaction.update({ content: '❌ Banner não encontrado.', embeds: [], components: [] });
    const owned    = !!(await prisma.userPurchase.findUnique({ where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner', itemRef: b.key } } }));
    const canAfford = eco.balance >= b.price;

    const embed = new EmbedBuilder().setColor(SHOP_COLOR).setTitle(b.name)
      .setDescription(b.description).setImage(b.imageUrl)
      .addFields({ name: '💰 Preço', value: `**${b.price.toLocaleString('pt-BR')} SC**`, inline: true }, { name: '👛 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true });

    const btn = new ButtonBuilder().setCustomId(`shop_buy_banner:${b.key}`)
      .setLabel(owned ? 'Já Possui' : canAfford ? 'Comprar Banner' : 'Sem Saldo')
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
  } else {
    const b = getBanner(key);
    if (!b) return interaction.reply({ content: '❌ Banner não encontrado.', ephemeral: true });
    name = b.name; price = b.price;
  }

  if (eco.balance < price) return interaction.reply({ content: `❌ Saldo insuficiente! Você tem **${eco.balance.toLocaleString('pt-BR')} SC**.`, ephemeral: true });

  const embed = new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ Confirmar Compra')
    .setDescription(
      `Comprar **${name}** por **${price.toLocaleString('pt-BR')} SC**?\n\n` +
      `> 💰 Saldo atual: **${eco.balance.toLocaleString('pt-BR')} SC**\n` +
      `> 📉 Saldo após:  **${(eco.balance - price).toLocaleString('pt-BR')} SC**`
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
  } else {
    const b = getBanner(key);
    if (!b) return interaction.update({ content: '❌ Banner não encontrado.', embeds: [], components: [] });
    name = b.name; price = b.price; itemRef = b.key;
  }

  if (eco.balance < price) return interaction.update({ content: '❌ Saldo insuficiente!', embeds: [], components: [] });

  const exists = await prisma.userPurchase.findUnique({
    where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: type, itemRef } },
  });
  if (exists) return interaction.update({ content: '✅ Você já possui este item!', embeds: [], components: [] });

  await prisma.economy.update({
    where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    data:  { balance: { decrement: price } },
  });
  await prisma.userPurchase.create({ data: { userId: interaction.user.id, guildId: interaction.guildId, itemType: type, itemRef } });

  if (type === 'role' && roleId) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (member) await member.roles.add(roleId).catch(() => {});
  }

  const embed = new EmbedBuilder().setColor(0x57F287).setTitle('✅ Compra Realizada!')
    .setDescription(
      `Você comprou **${name}** com sucesso!\n` +
      `💰 **${price.toLocaleString('pt-BR')} SC** debitados.` +
      (type === 'banner' ? '\n\n🖼️ Use `/perfil` → **Mudar Banner** para equipar!' : '')
    ).setTimestamp();

  return interaction.update({ embeds: [embed], components: [] });
}

// ─── 🖼️ Vitrine ───────────────────────────────────────────────────────────────

async function handleVitrine(interaction) {
  const owned    = await prisma.userPurchase.findMany({ where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' } });
  const ownedSet = new Set(owned.map(o => o.itemRef));

  const sel = new StringSelectMenuBuilder()
    .setCustomId('shop_vitrine_sel')
    .setPlaceholder('🖼️ Selecione um banner para ver a prévia')
    .addOptions(BANNERS.map(b =>
      new StringSelectMenuOptionBuilder().setLabel(b.name).setValue(b.key)
        .setDescription(`${b.price.toLocaleString('pt-BR')} SC${ownedSet.has(b.key) ? ' ✅' : ''}`)
        .setEmoji(b.emoji ?? '🖼️')
    ));

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🖼️ Vitrine de Banners')
        .setDescription(BANNERS.map(b => `${ownedSet.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} SC\`\n> ${b.description}`).join('\n\n'))
        .setImage(BANNERS[0].imageUrl)
        .setFooter({ text: `${BANNERS.length} banners • ✅ = você possui` }),
    ],
    components: [new ActionRowBuilder().addComponents(sel)],
    ephemeral: true,
  });
}

async function handleVitrineSel(interaction) {
  const key    = interaction.values[0];
  const banner = getBanner(key);
  if (!banner) return interaction.update({ content: '❌ Banner não encontrado.', components: [] });

  const [owned, eco, allOwned] = await Promise.all([
    prisma.userPurchase.findUnique({ where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner', itemRef: key } } }),
    getEco(interaction.user.id, interaction.guildId),
    prisma.userPurchase.findMany({ where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' } }),
  ]);
  const ownedSet = new Set(allOwned.map(o => o.itemRef));
  const canAfford = eco.balance >= banner.price;

  const sel = new StringSelectMenuBuilder()
    .setCustomId('shop_vitrine_sel').setPlaceholder('Ver outro banner...')
    .addOptions(BANNERS.map(b =>
      new StringSelectMenuOptionBuilder().setLabel(b.name).setValue(b.key)
        .setDescription(`${b.price.toLocaleString('pt-BR')} SC${ownedSet.has(b.key) ? ' ✅' : ''}`)
        .setEmoji(b.emoji ?? '🖼️')
    ));

  const btn = new ButtonBuilder().setCustomId(`shop_buy_banner:${banner.key}`)
    .setLabel(owned ? 'Já Possui' : !canAfford ? 'Sem Saldo' : 'Comprar Banner')
    .setEmoji(owned ? '✅' : '🛒')
    .setStyle(owned ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(!!owned || !canAfford);

  return interaction.update({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle(banner.name).setDescription(banner.description).setImage(banner.imageUrl)
        .addFields({ name: '💰 Preço', value: `**${banner.price.toLocaleString('pt-BR')} SC**`, inline: true }, { name: '👛 Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true }),
    ],
    components: [new ActionRowBuilder().addComponents(sel), new ActionRowBuilder().addComponents(btn)],
  });
}

// ─── 🔄 Converter ─────────────────────────────────────────────────────────────

async function handleConverter(interaction) {
  const eco = await getEco(interaction.user.id, interaction.guildId);
  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('🔄 Conversor de SlowCoins')
        .addFields(
          { name: '📊 Conversão', value: '> `1.000 msgs` → **500 SC**\n> `1h em call` → **500 SC**' },
          { name: '💼 Seu Saldo', value: `> 💰 **${eco.balance.toLocaleString('pt-BR')} SC** na carteira\n> 🏦 **${eco.bank.toLocaleString('pt-BR')} SC** no banco` },
        ),
    ],
    ephemeral: true,
  });
}

// ─── 💰 Meu Saldo ─────────────────────────────────────────────────────────────

async function handleSaldo(interaction) {
  const [eco, purchases, profile] = await Promise.all([
    getEco(interaction.user.id, interaction.guildId),
    prisma.userPurchase.count({ where: { userId: interaction.user.id, guildId: interaction.guildId } }),
    prisma.userProfile.findUnique({ where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } } }),
  ]);

  const activeBanner = profile?.activeBanner ? getBanner(profile.activeBanner) : null;

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(SHOP_COLOR).setTitle('💰 Meu Saldo')
        .setThumbnail(interaction.user.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: '💰 Carteira',       value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true },
          { name: '🏦 Banco',          value: `**${eco.bank.toLocaleString('pt-BR')} SC**`,   inline: true },
          { name: '📦 Itens',          value: `**${purchases}** compra(s)`,                   inline: true },
          { name: '🖼️ Banner Ativo',   value: activeBanner ? activeBanner.name : 'Nenhum',   inline: true },
        )
        .setFooter({ text: 'Use /eco saldo para mais detalhes' }),
    ],
    ephemeral: true,
  });
}

// ─── 🖼️ Mudar Banner do Perfil ────────────────────────────────────────────────

async function handleProfileBannerBtn(interaction) {
  const [owned, profile] = await Promise.all([
    prisma.userPurchase.findMany({ where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' } }),
    prisma.userProfile.findUnique({ where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } } }),
  ]);

  if (!owned.length) return interaction.reply({ content: '❌ Você não possui nenhum banner!\nUse `/loja painel` → **Vitrine** para comprar.', ephemeral: true });

  const opts = [
    new StringSelectMenuOptionBuilder().setLabel('🚫 Sem banner (padrão)').setValue('none').setDescription('Remover banner').setEmoji('🚫'),
    ...owned.map(p => {
      const b = getBanner(p.itemRef);
      if (!b) return null;
      return new StringSelectMenuOptionBuilder()
        .setLabel(b.name).setValue(b.key)
        .setDescription(`${profile?.activeBanner === b.key ? '✅ Equipado' : 'Disponível'}`)
        .setEmoji(b.emoji ?? '🖼️');
    }).filter(Boolean),
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
    where:  { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    create: { userId: interaction.user.id, guildId: interaction.guildId, activeBanner },
    update: { activeBanner },
  });

  return interaction.update({
    content: activeBanner ? `✅ Banner **${getBanner(activeBanner)?.name}** equipado! Use \`/perfil\` para ver.` : '✅ Banner removido.',
    components: [],
  });
}
