import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
} from 'discord.js';

// ─── Session store ─────────────────────────────────────────────────────────────

const sessions = new Map();

function key(userId, guildId) { return `${guildId}_${userId}`; }

export function createMsgSession(userId, guildId) {
  const s = {
    userId,
    guildId,
    accentColor: 0x5865F2,
    blocks: [],
    thumbnail: null,   // URL da miniatura (canto superior direito)
    banner: null,      // URL do banner (imagem grande no final)
    msgButtons: [],    // [{ type:'role'|'link', label, roleId?, url? }]
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

// Conta todos os itens da sessão (usado para habilitar/desabilitar botões)
export function msgTotalCount(session) {
  return (
    session.blocks.length +
    session.msgButtons.length +
    (session.banner ? 1 : 0) +
    (session.thumbnail ? 1 : 0)
  );
}

// ─── Build embeds ──────────────────────────────────────────────────────────────

function buildSection(blocks, color, headerText) {
  let desc = headerText ? `${headerText}\n\n` : '';

  for (const block of blocks) {
    if (block.type === 'roles') {
      for (const roleId of block.roleIds) {
        desc += `• <@&${roleId}>\n`;
      }
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
  if (!msgButtons || msgButtons.length === 0) return null;
  const row = new ActionRowBuilder();
  for (const btn of msgButtons.slice(0, 5)) {
    if (btn.type === 'role') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`msg_rb_${btn.roleId}`)
          .setLabel(btn.label)
          .setStyle(ButtonStyle.Primary)
      );
    } else if (btn.type === 'link') {
      row.addComponents(
        new ButtonBuilder()
          .setURL(btn.url)
          .setLabel(btn.label)
          .setStyle(ButtonStyle.Link)
      );
    }
  }
  return row;
}

export function buildMsgPayload(session) {
  let embeds;

  if (session.blocks.length === 0) {
    const empty = new EmbedBuilder()
      .setDescription('-# 💬 Mensagem vazia — use os botões abaixo para adicionar blocos.');
    if (session.accentColor !== null) empty.setColor(session.accentColor);
    embeds = [empty];
  } else {
    // Divide blocos em seções — cada "separator" inicia um novo embed
    const sections = [];
    let currentHeader = null;
    let currentBlocks = [];

    for (const block of session.blocks) {
      if (block.type === 'separator') {
        sections.push({ header: currentHeader, blocks: currentBlocks });
        currentHeader = block.content;
        currentBlocks = [];
      } else {
        currentBlocks.push(block);
      }
    }
    sections.push({ header: currentHeader, blocks: currentBlocks });

    embeds = sections
      .filter(s => s.header !== null || s.blocks.length > 0)
      .slice(0, 10)
      .map(s => buildSection(s.blocks, session.accentColor, s.header));
  }

  // Miniatura → primeiro embed
  if (session.thumbnail && embeds.length > 0) {
    embeds[0].setThumbnail(session.thumbnail);
  }

  // Banner → último embed
  if (session.banner && embeds.length > 0) {
    embeds[embeds.length - 1].setImage(session.banner);
  }

  // Botões publicados
  const btnRow = buildPublishedButtonRow(session.msgButtons);
  return { embeds, components: btnRow ? [btnRow] : [] };
}

// ─── Control rows ──────────────────────────────────────────────────────────────

export function buildMsgMainControls(session) {
  const total = msgTotalCount(session);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_add_role').setLabel('Adicionar Cargo').setStyle(ButtonStyle.Primary).setEmoji('👤'),
      new ButtonBuilder().setCustomId('msg_add_text').setLabel('Texto').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('msg_add_sep').setLabel('Texto 2').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
      new ButtonBuilder().setCustomId('msg_color').setLabel('Cor').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_banner').setLabel('Banner').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
      new ButtonBuilder().setCustomId('msg_thumb').setLabel('Miniatura').setStyle(ButtonStyle.Secondary).setEmoji('🔷'),
      new ButtonBuilder().setCustomId('msg_btn_role').setLabel('Botão Cargo').setStyle(ButtonStyle.Secondary).setEmoji('🔘'),
      new ButtonBuilder().setCustomId('msg_btn_link').setLabel('Botão Link').setStyle(ButtonStyle.Secondary).setEmoji('🔗'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_remove_last').setLabel('Remover Último').setStyle(ButtonStyle.Danger).setEmoji('🗑️').setDisabled(total === 0),
      new ButtonBuilder().setCustomId('msg_publish').setLabel('Publicar').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(total === 0),
      new ButtonBuilder().setCustomId('msg_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    ),
  ];
}

export function buildMsgColorPicker() {
  const COLORS = [
    { label: '⚫ Ocultar',   id: 'none'   },
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
