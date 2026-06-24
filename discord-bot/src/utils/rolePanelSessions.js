import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from 'discord.js';

// ─── Session store ─────────────────────────────────────────────────────────────

const sessions = new Map();

function key(userId, guildId) { return `${guildId}_${userId}`; }

export function createRPSession(userId, guildId) {
  const s = {
    userId,
    guildId,
    title: '',
    text: 'Escolha seu cargo abaixo para personalizar sua experiência no servidor — escolha e divirta-se!',
    useSeparator: true,
    accentColor: 0x57F287,
    roles: [],
    previewMessageId: null,
    previewChannelId: null,
  };
  sessions.set(key(userId, guildId), s);
  return s;
}

export function getRPSession(userId, guildId) {
  return sessions.get(key(userId, guildId)) ?? null;
}

export function deleteRPSession(userId, guildId) {
  sessions.delete(key(userId, guildId));
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseEmoji(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^<(a?):([^:>]+):(\d+)>$/);
  if (m) return { animated: m[1] === 'a', name: m[2], id: m[3] };
  return raw.trim() || null;
}

// ─── Payload V2 do painel publicado ───────────────────────────────────────────

export function buildRPPayload(session) {
  const container = new ContainerBuilder();

  if (session.accentColor !== null && session.accentColor !== undefined) {
    container.setAccentColor(session.accentColor);
  }

  const fullText = session.title
    ? `## ${session.title}\n\n${session.text}`
    : session.text;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText || '\u200b'));

  if (session.useSeparator) {
    container.addSeparatorComponents(new SeparatorBuilder());
  }

  const btnRows = [];
  const roles = session.roles ?? [];
  for (let i = 0; i < roles.length; i += 5) {
    const chunk = roles.slice(i, i + 5);
    const row = new ActionRowBuilder();
    for (const r of chunk) {
      const btn = new ButtonBuilder()
        .setCustomId(`rp_rb_${r.roleId}`)
        .setLabel(r.label || 'Cargo')
        .setStyle(ButtonStyle.Secondary);
      const emoji = parseEmoji(r.emoji);
      if (emoji) {
        try { btn.setEmoji(emoji); } catch {}
      }
      row.addComponents(btn);
    }
    btnRows.push(row);
  }

  if (roles.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# ℹ️ Nenhum cargo adicionado ainda.')
    );
  }

  return { components: [container, ...btnRows], flags: MessageFlags.IsComponentsV2 };
}

// ─── Controles do painel de edição (ephemeral) ────────────────────────────────

export function buildRPControls(session) {
  const roles = session.roles ?? [];
  const sepLabel = session.useSeparator ? '➖ Remover Divisória' : '➕ Adicionar Divisória';
  const borderLabel = session.accentColor !== null ? '🚫 Remover Borda' : '🎨 Adicionar Borda';

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rp_text').setLabel('✏️ Texto').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rp_sep').setLabel(sepLabel).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rp_border').setLabel(borderLabel).setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rp_add_role').setLabel('👤 Adicionar Cargo').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rp_rm_last').setLabel('🗑️ Remover Último Cargo').setStyle(ButtonStyle.Danger).setDisabled(roles.length === 0),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rp_color').setLabel('🎨 Cor da Borda').setStyle(ButtonStyle.Secondary).setDisabled(session.accentColor === null),
      new ButtonBuilder().setCustomId('rp_publish').setLabel('✅ Publicar').setStyle(ButtonStyle.Success).setDisabled(roles.length === 0),
      new ButtonBuilder().setCustomId('rp_cancel').setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger),
    ),
  ];
}

export function buildRPRoleSelector() {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('rp_role_sel')
        .setPlaceholder('Selecione os cargos para adicionar ao painel...')
        .setMinValues(1)
        .setMaxValues(10)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rp_back').setLabel('↩️ Voltar').setStyle(ButtonStyle.Danger),
    ),
  ];
}

export function buildRPColorPicker() {
  const COLORS = [
    { label: '⚫ Preto',    id: 'black'  },
    { label: '🟣 Roxo',     id: 'purple' },
    { label: '🔵 Azul',     id: 'blue'   },
    { label: '🩵 Ciano',    id: 'cyan'   },
    { label: '🟢 Verde',    id: 'green'  },
    { label: '🟡 Amarelo',  id: 'yellow' },
    { label: '🔴 Vermelho', id: 'red'    },
    { label: '🟠 Laranja',  id: 'orange' },
  ];
  return [
    new ActionRowBuilder().addComponents(
      ...COLORS.slice(0, 4).map(c =>
        new ButtonBuilder().setCustomId(`rp_color_${c.id}`).setLabel(c.label).setStyle(ButtonStyle.Secondary)
      )
    ),
    new ActionRowBuilder().addComponents(
      ...COLORS.slice(4).map(c =>
        new ButtonBuilder().setCustomId(`rp_color_${c.id}`).setLabel(c.label).setStyle(ButtonStyle.Secondary)
      )
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rp_back').setLabel('↩️ Voltar').setStyle(ButtonStyle.Danger),
    ),
  ];
}

export const RP_COLOR_MAP = {
  black:  0x23272A,
  purple: 0x9B4FD6,
  blue:   0x5865F2,
  cyan:   0x00B0F4,
  green:  0x57F287,
  yellow: 0xFEE75C,
  red:    0xED4245,
  orange: 0xE67E22,
};
