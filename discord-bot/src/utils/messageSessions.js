import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

// ─── Session store ─────────────────────────────────────────────────────────────

const sessions = new Map();

function key(userId, guildId) { return `${guildId}_${userId}`; }

export function createMsgSession(userId, guildId) {
  const s = {
    userId,
    guildId,
    accentColor: 0x4f545c,
    blocks: [],
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

// ─── Build embed preview ───────────────────────────────────────────────────────

export function buildMsgEmbed(session) {
  let desc = '';

  for (const block of session.blocks) {
    if (block.type === 'roles') {
      for (const roleId of block.roleIds) {
        desc += `• <@&${roleId}>\n`;
      }
      desc += '\n';
    } else if (block.type === 'text') {
      desc += `${block.content}\n\n`;
    } else if (block.type === 'separator') {
      desc += `${block.content}\n\n`;
    }
  }

  const finalDesc = desc.trim() || '-# 💬 Mensagem vazia — use os botões abaixo para adicionar blocos.';

  return new EmbedBuilder()
    .setColor(session.accentColor)
    .setDescription(finalDesc);
}

export function buildMsgPayload(session) {
  return { embeds: [buildMsgEmbed(session)] };
}

// ─── Control rows ──────────────────────────────────────────────────────────────

export function buildMsgMainControls(blockCount) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_add_role').setLabel('Adicionar Cargo').setStyle(ButtonStyle.Primary).setEmoji('👤'),
      new ButtonBuilder().setCustomId('msg_add_text').setLabel('Adicionar Texto').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('msg_add_sep').setLabel('Separador').setStyle(ButtonStyle.Secondary).setEmoji('➖'),
      new ButtonBuilder().setCustomId('msg_color').setLabel('Cor da Borda').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('msg_remove_last').setLabel('Remover Último').setStyle(ButtonStyle.Danger).setEmoji('🗑️').setDisabled(blockCount === 0),
      new ButtonBuilder().setCustomId('msg_publish').setLabel('Publicar').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(blockCount === 0),
      new ButtonBuilder().setCustomId('msg_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    ),
  ];
}

export function buildMsgColorPicker() {
  const COLORS = [
    { label: '⚫ Sem cor',   id: 'none',   hex: 0x4f545c },
    { label: '🟣 Roxo',     id: 'purple', hex: 0x9B4FD6 },
    { label: '🔵 Azul',     id: 'blue',   hex: 0x5865F2 },
    { label: '🩵 Ciano',    id: 'cyan',   hex: 0x00B0F4 },
    { label: '🟢 Verde',    id: 'green',  hex: 0x57F287 },
    { label: '🟡 Amarelo',  id: 'yellow', hex: 0xFEE75C },
    { label: '🔴 Vermelho', id: 'red',    hex: 0xED4245 },
    { label: '🟠 Laranja',  id: 'orange', hex: 0xE67E22 },
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
  none:   0x4f545c,
  purple: 0x9B4FD6,
  blue:   0x5865F2,
  cyan:   0x00B0F4,
  green:  0x57F287,
  yellow: 0xFEE75C,
  red:    0xED4245,
  orange: 0xE67E22,
};
