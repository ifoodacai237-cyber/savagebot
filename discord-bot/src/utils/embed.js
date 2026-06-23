import {
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from 'discord.js';

export const Colors = {
  PRIMARY:   0x5865F2,
  SUCCESS:   0x57F287,
  ERROR:     0xED4245,
  WARNING:   0xFEE75C,
  DARK:      0x2B2D31,
  INSTAGRAM: 0xE1306C,
  TELLONYM:  0x2B2D31,
  FAMILY:    0xEB459E,
};

// ─── Legacy embed builders (still used in config panels) ─────────────────────

export function baseEmbed(color = Colors.PRIMARY) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

export function successEmbed(title, description) {
  return baseEmbed(Colors.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

export function errorEmbed(description) {
  return baseEmbed(Colors.ERROR)
    .setTitle('❌ Erro')
    .setDescription(description);
}

export function replyEmbed(interaction, opts) {
  return interaction.reply({ embeds: [opts], ephemeral: opts?.ephemeral ?? false });
}

export function buildConfigEmbed({ color, banner, thumbnail, footer, title, description, fields = [] }) {
  const embed = new EmbedBuilder().setTimestamp();
  if (color) {
    const parsed = parseInt(color.replace('#', ''), 16);
    if (!isNaN(parsed)) embed.setColor(parsed);
  }
  if (title)       embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (banner)      embed.setImage(banner);
  if (thumbnail)   embed.setThumbnail(thumbnail);
  if (footer)      embed.setFooter({ text: footer });
  if (fields.length) embed.addFields(fields);
  return embed;
}

// ─── V2 Component builders ────────────────────────────────────────────────────

export function parseHexColor(hex) {
  if (!hex) return null;
  const n = parseInt(String(hex).replace('#', ''), 16);
  return isNaN(n) ? null : n;
}

export function v2Container(accentColor) {
  const c = new ContainerBuilder();
  if (accentColor != null) c.setAccentColor(accentColor);
  return c;
}

export function v2Text(content) {
  return new TextDisplayBuilder().setContent(content);
}

export function v2Sep() {
  return new SeparatorBuilder();
}

export function v2Payload(container, ...extras) {
  return { components: [container, ...extras], flags: MessageFlags.IsComponentsV2 };
}

export function v2Simple(text, accentColor = null) {
  const c = v2Container(accentColor);
  c.addTextDisplayComponents(v2Text(text));
  return v2Payload(c);
}

export function v2Success(text, accentColor = Colors.SUCCESS) {
  return v2Simple(`✅  ${text}`, accentColor);
}

export function v2Error(text, accentColor = Colors.ERROR) {
  return v2Simple(`❌  ${text}`, accentColor);
}

export function v2Rich({ text, accentColor = null, thumbnailUrl = null, imageUrl = null }) {
  const c = v2Container(accentColor);

  if (thumbnailUrl) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(v2Text(text))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
    c.addSectionComponents(section);
  } else {
    c.addTextDisplayComponents(v2Text(text));
  }

  if (imageUrl) {
    c.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imageUrl)),
    );
  }

  return c;
}
