import {
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

// ─── Session store ─────────────────────────────────────────────────────────────

const sessions = new Map();

// Guarda config dos menus publicados (messageId → selectMenu config)
// Permite que o bot processe interações mesmo após publicar
export const publishedMenus = new Map();

function key(userId, guildId) { return `${guildId}_${userId}`; }

export function createMsgSession(userId, guildId) {
  const s = {
    userId,
    guildId,
    accentColor: 0x5865F2,
    blocks: [],
    thumbnail:   null,
    banner:      null,
    msgButtons:  [],
    selectMenu:  null,  // { placeholder, options: [{emoji, label, description, roleId?}] }
    previewMessageId: null,
    previewChannelId: null,
  };
  sessions.set(key(userId, guildId), s);
  return s;
}

export function getMsgSession(userId, guildId) {
  return sessions.get(key(userId, guildId)) ?? null;
}

export function deleteMsgSession(userId, guildId) {
  sessions.delete(key(userId, guildId));
}

export function msgTotalCount(session) {
  return (
    session.blocks.length +
    session.msgButtons.length +
    (session.banner    ? 1 : 0) +
    (session.thumbnail ? 1 : 0) +
    (session.selectMenu?.options?.length > 0 ? 1 : 0)
  );
}

// ─── Builders internos ─────────────────────────────────────────────────────────

function buildSection(blocks, color, headerText) {
  let desc = headerText ? `${headerText}\n\n` : '';
  for (const block of blocks) {
    if (block.type === 'roles') {
      for (const roleId of block.roleIds) desc += `• <@&${roleId}>\n`;
      desc += '\n';
    } else if (block.type === 'text') {
      desc += `${block.content}\n\n`;
    }
  }
  const embed = new EmbedBuilder().setDescription(desc.trim() || '\u200b');
  if (color !== null) embed.setColor(color);
  return embed;
}

function buildPublishedButtonRow(msgButtons) {
  if (!msgButtons?.length) return null;
  const row = new ActionRowBuilder();
  for (const btn of msgButtons.slice(0, 5)) {
    if (btn.type === 'role') {
      row.addComponents(
        new ButtonBuilder().setCustomId(`msg_rb_${btn.roleId}`).setLabel(btn.label).setStyle(ButtonStyle.Primary)
      );
    } else if (btn.type === 'link') {
      row.addComponents(
        new ButtonBuilder().setURL(btn.url).setLabel(btn.label).setStyle(ButtonStyle.Link)
      );
    }
  }
  return row;
}

function buildPublishedSelectMenu(selectMenu) {
  if (!selectMenu?.options?.length) return null;
  const menu = new StringSelectMenuBuilder()
    .setCustomId('msg_ms')
    .setPlaceholder(selectMenu.placeholder || 'Selecione uma opção...')
    .addOptions(
      selectMenu.options.map((opt, i) => {
        const o = new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setValue(opt.roleId ? `r:${opt.roleId}` : `t:${i}`);
        if (opt.emoji) {
          try { o.setEmoji(opt.emoji); } catch {}
        }
        if (opt.description) o.setDescription(opt.description.slice(0, 100));
        return o;
      })
    );
  return new ActionRowBuilder().addComponents(menu);
}

// ─── buildMsgPayloadV2 (sem lateral — múltiplos containers p/ gap visual) ──────

function buildMsgPayloadV2(session) {
  const containers = [];
  let current = new ContainerBuilder();
  let pendingText = '';
  let currentHasContent = false;

  const flushText = () => {
    const t = pendingText.trimEnd();
    if (t) {
      current.addTextDisplayComponents(new TextDisplayBuilder().setContent(t));
      pendingText = '';
      currentHasContent = true;
    }
  };

  // Finaliza container atual e começa um novo (cria o "pulo" visual)
  const newSection = () => {
    flushText();
    if (currentHasContent) {
      containers.push(current);
      current = new ContainerBuilder();
      currentHasContent = false;
    }
  };

  if (session.blocks.length === 0) {
    current.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# 💬 Mensagem vazia — use os botões abaixo para adicionar blocos.')
    );
    containers.push(current);
  } else {
    for (const block of session.blocks) {
      if (block.type === 'text') {
        pendingText += block.content + '\n\n';
      } else if (block.type === 'roles') {
        for (const roleId of block.roleIds) pendingText += `• <@&${roleId}>\n`;
        pendingText += '\n';
      } else if (block.type === 'separator') {
        newSection();
        if (block.content) {
          current.addTextDisplayComponents(new TextDisplayBuilder().setContent(block.content));
          currentHasContent = true;
        }
      } else if (block.type === 'separator_img') {
        newSection();
        const gallery = new MediaGalleryBuilder();
        gallery.addItems(new MediaGalleryItemBuilder().setURL(block.url));
        current.addMediaGalleryComponents(gallery);
        currentHasContent = true;
        // imagem isolada → fecha container imediatamente para criar o gap depois
        containers.push(current);
        current = new ContainerBuilder();
        currentHasContent = false;
      }
    }
    flushText();
    if (currentHasContent) containers.push(current);
  }

  if (session.banner) {
    const bannerCont = new ContainerBuilder();
    const gallery = new MediaGalleryBuilder();
    gallery.addItems(new MediaGalleryItemBuilder().setURL(session.banner));
    bannerCont.addMediaGalleryComponents(gallery);
    containers.push(bannerCont);
  }

  const components = [
    ...containers,
    buildPublishedButtonRow(session.msgButtons),
    buildPublishedSelectMenu(session.selectMenu),
  ].filter(Boolean);

  return { components, flags: MessageFlags.IsComponentsV2 };
}

// ─── buildMsgPayload ───────────────────────────────────────────────────────────

export function buildMsgPayload(session) {
  if (session.accentColor === null) return buildMsgPayloadV2(session);

  let embeds;

  if (session.blocks.length === 0) {
    const empty = new EmbedBuilder()
      .setDescription('-# 💬 Mensagem vazia — use os botões abaixo para adicionar blocos.')
      .setColor(session.accentColor);
    embeds = [empty];
  } else {
    // Lógica original: cada separator inicia um novo embed (gap visual)
    const sections = [];
    let currentHeader = null;
    let currentBlocks = [];

    for (const block of session.blocks) {
      if (block.type === 'separator') {
        sections.push({ header: currentHeader, blocks: currentBlocks, img: null });
        currentHeader = block.content;
        currentBlocks = [];
      } else if (block.type === 'separator_img') {
        sections.push({ header: currentHeader, blocks: currentBlocks, img: null });
        currentHeader = null;
        currentBlocks = [];
        sections.push({ header: null, blocks: [], img: block.url }); // embed isolado com imagem
      } else {
        currentBlocks.push(block);
      }
    }
    sections.push({ header: currentHeader, blocks: currentBlocks, img: null });

    embeds = sections
      .filter(s => s.img !== null || s.header !== null || s.blocks.length > 0)
      .slice(0, 10)
      .map(s => {
        if (s.img !== null) {
          return new EmbedBuilder().setImage(s.img).setColor(session.accentColor);
        }
        return buildSection(s.blocks, session.accentColor, s.header);
      });
  }

  if (session.thumbnail && embeds.length > 0) embeds[0].setThumbnail(session.thumbnail);
  if (session.banner    && embeds.length > 0) embeds[embeds.length - 1].setImage(session.banner);

  const components = [
    buildPublishedButtonRow(session.msgButtons),
    buildPublishedSelectMenu(session.selectMenu),
  ].filter(Boolean);

  return { embeds, components };
}

// ─── Painéis de controle ───────────────────────────────────────────────────────

export function buildMsgMainControls(session) {
  const total = msgTotalCount(session);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_add_role').setLabel('Cargo').setStyle(ButtonStyle.Primary).setEmoji('👤'),
      new ButtonBuilder().setCustomId('msg_add_text').setLabel('Texto').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('msg_add_sep').setLabel('Texto 2').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
      new ButtonBuilder().setCustomId('msg_color').setLabel('Cor').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
      new ButtonBuilder().setCustomId('msg_add_cargos').setLabel('Adicionar Cargos').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_banner').setLabel('Banner').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
      new ButtonBuilder().setCustomId('msg_thumb').setLabel('Miniatura').setStyle(ButtonStyle.Secondary).setEmoji('🔷'),
      new ButtonBuilder().setCustomId('msg_sep_img').setLabel('Imagem').setStyle(ButtonStyle.Secondary).setEmoji('🌄'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_remove_last').setLabel('Remover Último').setStyle(ButtonStyle.Danger).setEmoji('🗑️').setDisabled(total === 0),
      new ButtonBuilder().setCustomId('msg_publish').setLabel('Publicar').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(total === 0),
      new ButtonBuilder().setCustomId('msg_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    ),
  ];
}

export function buildCargoRoleSelector() {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('msg_cargo_sel')
        .setPlaceholder('Selecione os cargos para o menu dropdown...')
        .setMinValues(1)
        .setMaxValues(25)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
    ),
  ];
}

export function buildMsgMenuEditor(session) {
  const opts = session.selectMenu?.options ?? [];
  const hasMenu = !!session.selectMenu;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_menu_add_opt').setLabel('Adicionar Opção').setStyle(ButtonStyle.Primary).setEmoji('➕').setDisabled(opts.length >= 25),
      new ButtonBuilder().setCustomId('msg_menu_rm_opt').setLabel('Remover Última').setStyle(ButtonStyle.Danger).setEmoji('🗑️').setDisabled(opts.length === 0),
      new ButtonBuilder().setCustomId('msg_menu_save').setLabel('Salvar Menu').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(opts.length === 0),
      new ButtonBuilder().setCustomId('msg_menu_clear').setLabel('Limpar Tudo').setStyle(ButtonStyle.Danger).setEmoji('🔄').setDisabled(!hasMenu),
      new ButtonBuilder().setCustomId('msg_back').setLabel('Voltar').setStyle(ButtonStyle.Secondary).setEmoji('↩️'),
    ),
  ];
}

export function buildMsgColorPicker() {
  const COLORS = [
    { label: '🚫 Sem Lateral', id: 'none'   },
    { label: '🟣 Roxo',      id: 'purple' },
    { label: '🔵 Azul',      id: 'blue'   },
    { label: '🩵 Ciano',     id: 'cyan'   },
    { label: '🟢 Verde',     id: 'green'  },
    { label: '🟡 Amarelo',   id: 'yellow' },
    { label: '🔴 Vermelho',  id: 'red'    },
    { label: '🟠 Laranja',   id: 'orange' },
  ];
  return [
    new ActionRowBuilder().addComponents(
      ...COLORS.slice(0, 4).map(c =>
        new ButtonBuilder().setCustomId(`msg_color_${c.id}`).setLabel(c.label).setStyle(ButtonStyle.Secondary)
      )
    ),
    new ActionRowBuilder().addComponents(
      ...COLORS.slice(4).map(c =>
        new ButtonBuilder().setCustomId(`msg_color_${c.id}`).setLabel(c.label).setStyle(ButtonStyle.Secondary)
      )
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
    ),
  ];
}

export function buildRoleSelector() {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('msg_role_sel')
        .setPlaceholder('Selecione um ou mais cargos...')
        .setMinValues(1)
        .setMaxValues(10)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
    ),
  ];
}

export const MSG_COLOR_MAP = {
  none:   null,
  purple: 0x9B4FD6,
  blue:   0x5865F2,
  cyan:   0x00B0F4,
  green:  0x57F287,
  yellow: 0xFEE75C,
  red:    0xED4245,
  orange: 0xE67E22,
};

export function buildSepTypeSelector() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_sep_text').setLabel('Texto').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('msg_sep_img').setLabel('Imagem').setStyle(ButtonStyle.Primary).setEmoji('🖼️'),
      new ButtonBuilder().setCustomId('msg_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
    ),
  ];
}
