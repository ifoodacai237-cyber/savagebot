import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  TextDisplayBuilder,
} from 'discord.js';

export function getPetEmojiUrl(emojiStr) {
  const animated = emojiStr?.match(/<a:(\w+):(\d+)>/);
  if (animated) return `https://cdn.discordapp.com/emojis/${animated[2]}.gif?size=256&quality=lossless`;

  const staticEmoji = emojiStr?.match(/<:(\w+):(\d+)>/);
  if (staticEmoji) return `https://cdn.discordapp.com/emojis/${staticEmoji[2]}.png?size=256`;

  return null;
}

export function isCustomPetEmoji(emojiStr) {
  return /<a?:\w+:\d+>/.test(emojiStr ?? '');
}

export function petDisplayName(pet) {
  if (!pet) return 'seu pet';
  return isCustomPetEmoji(pet.emoji) ? pet.name : `${pet.emoji} ${pet.name}`;
}

function petMedia(pet) {
  if (!pet) return [];

  const urls = [pet.imageUrl, getPetEmojiUrl(pet.emoji)].filter(Boolean);
  return [...new Set(urls)].slice(0, 2);
}

export function buildPetActionRows({ includeShop = true } = {}) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pet_action:brincar').setLabel('Brincar').setEmoji('🎾').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pet_action:alimentar').setLabel('Alimentar').setEmoji('🍖').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('pet_action:acariciar').setLabel('Acariciar').setEmoji('💜').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pet_action:status').setLabel('Status').setEmoji('📋').setStyle(ButtonStyle.Secondary),
  );

  if (!includeShop) return [row];

  return [
    row,
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_comprar').setLabel('Abrir loja de pets').setEmoji('🛍️').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildPetPanel({
  title,
  body,
  pet = null,
  includeActions = true,
  includeShop = true,
  extraRows = [],
} = {}) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${title}\n\n${body}`),
  );

  const media = petMedia(pet);
  if (media.length) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        ...media.map(url => new MediaGalleryItemBuilder().setURL(url)),
      ),
    );
  }

  return {
    components: [
      container,
      ...(includeActions ? buildPetActionRows({ includeShop }) : []),
      ...extraRows,
    ],
    flags: MessageFlags.IsComponentsV2,
  };
}