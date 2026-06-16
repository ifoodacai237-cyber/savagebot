import { EmbedBuilder } from 'discord.js';

export const Colors = {
  PRIMARY:  0x5865F2,
  SUCCESS:  0x57F287,
  ERROR:    0xED4245,
  WARNING:  0xFEE75C,
  DARK:     0x2B2D31,
  INSTAGRAM:0xE1306C,
  TELLONYM: 0x2B2D31,
  FAMILY:   0xEB459E,
};

export function baseEmbed(color = Colors.PRIMARY) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp();
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
