import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ActionRowBuilder,
} from 'discord.js';

// ─── Session store ────────────────────────────────────────────────────────────

const sessions = new Map();

function key(userId, guildId) { return `${guildId}_${userId}`; }

export function createSession(userId, guildId) {
  const s = { userId, guildId, accentColor: 0x9B4FD6, items: [], previewMessageId: null, previewChannelId: null };
  sessions.set(key(userId, guildId), s);
  return s;
}

export function getSession(userId, guildId) {
  return sessions.get(key(userId, guildId)) ?? null;
}

export function deleteSession(userId, guildId) {
  sessions.delete(key(userId, guildId));
}

// ─── Container builder ────────────────────────────────────────────────────────

export function buildContainerPayload(session) {
  const container = new ContainerBuilder().setAccentColor(session.accentColor);

  if (session.items.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# 📦 Container vazio — use os botões abaixo para adicionar itens.')
    );
  }

  for (const item of session.items) {
    if (item.type === 'text') {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(item.content));

    } else if (item.type === 'separator') {
      container.addSeparatorComponents(new SeparatorBuilder());

    } else if (item.type === 'gallery') {
      const gallery = new MediaGalleryBuilder();
      for (const url of item.urls) {
        gallery.addItems(new MediaGalleryItemBuilder().setURL(url));
      }
      container.addMediaGalleryComponents(gallery);

    } else if (item.type === 'button') {
      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(item.text || '\u200b'))
        .setButtonAccessory(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL(item.url)
            .setLabel(item.label)
        );
      container.addSectionComponents(section);
    }
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Editor control rows ──────────────────────────────────────────────────────

export function buildMainControls() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cont_add').setLabel('Adicionar Item').setStyle(ButtonStyle.Primary).setEmoji('➕'),
      new ButtonBuilder().setCustomId('cont_edit_menu').setLabel('Editar Item').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
      new ButtonBuilder().setCustomId('cont_color').setLabel('Selecionar Cor').setStyle(ButtonStyle.Secondary).setEmoji('🎨'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cont_pub').setLabel('Publicar').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('cont_clear').setLabel('Apagar Container').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    ),
  ];
}

export function buildTypeSelector() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cont_add_text').setLabel('Texto').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('cont_add_img').setLabel('Galeria de Imagem').setStyle(ButtonStyle.Primary).setEmoji('🖼️'),
      new ButtonBuilder().setCustomId('cont_add_sep').setLabel('Separador').setStyle(ButtonStyle.Secondary).setEmoji('➖'),
      new ButtonBuilder().setCustomId('cont_add_btn').setLabel('Botão de Link').setStyle(ButtonStyle.Secondary).setEmoji('🔗'),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cont_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
    ),
  ];
}

export function buildColorPicker() {
  const COLORS = [
    { label: '🟣 Roxo',     id: 'purple',  hex: 0x9B4FD6 },
    { label: '🔵 Azul',     id: 'blue',    hex: 0x5865F2 },
    { label: '🩵 Ciano',    id: 'cyan',    hex: 0x00B0F4 },
    { label: '🟢 Verde',    id: 'green',   hex: 0x57F287 },
    { label: '🟡 Amarelo',  id: 'yellow',  hex: 0xFEE75C },
    { label: '🔴 Vermelho', id: 'red',     hex: 0xED4245 },
    { label: '🟠 Laranja',  id: 'orange',  hex: 0xE67E22 },
    { label: '⚫ Preto',    id: 'black',   hex: 0x23272A },
  ];
  return [
    new ActionRowBuilder().addComponents(
      ...COLORS.slice(0, 4).map(c => new ButtonBuilder().setCustomId(`cont_color_${c.id}`).setLabel(c.label).setStyle(ButtonStyle.Secondary))
    ),
    new ActionRowBuilder().addComponents(
      ...COLORS.slice(4).map(c => new ButtonBuilder().setCustomId(`cont_color_${c.id}`).setLabel(c.label).setStyle(ButtonStyle.Secondary))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cont_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
    ),
  ];
}

export const COLOR_MAP = {
  purple: 0x9B4FD6,
  blue:   0x5865F2,
  cyan:   0x00B0F4,
  green:  0x57F287,
  yellow: 0xFEE75C,
  red:    0xED4245,
  orange: 0xE67E22,
  black:  0x23272A,
};

export function buildEditMenu(session) {
  if (session.items.length === 0) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cont_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
      ),
    ];
  }
  const rows = [];
  const chunks = [];
  for (let i = 0; i < session.items.length; i += 4) chunks.push(session.items.slice(i, i + 4).map((_, j) => i + j));

  for (const chunk of chunks.slice(0, 4)) {
    rows.push(new ActionRowBuilder().addComponents(
      ...chunk.map(idx => {
        const item = session.items[idx];
        const label = item.type === 'text' ? `📝 #${idx + 1}` : item.type === 'separator' ? `➖ #${idx + 1}` : item.type === 'gallery' ? `🖼️ #${idx + 1}` : `🔗 #${idx + 1}`;
        return new ButtonBuilder().setCustomId(`cont_del_item_${idx}`).setLabel(label).setStyle(ButtonStyle.Danger);
      })
    ));
  }

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cont_back').setLabel('Voltar').setStyle(ButtonStyle.Danger).setEmoji('↩️'),
  ));
  return rows;
}
