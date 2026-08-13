import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import { getEmoji } from './emojiManager.js';

const PET_HEART = () => getEmoji('pet_heart');
const PET_TIME  = () => getEmoji('pet_time');
const PET_FOOD  = () => getEmoji('pet_food');
const PET_BALL  = () => getEmoji('pet_ball');

export const petInteractionEmojis = {
  heart: PET_HEART,
  time: PET_TIME,
  food: PET_FOOD,
  ball: PET_BALL,
};

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

function petThumbnailUrl(pet) {
  return pet?.imageUrl || getPetEmojiUrl(pet?.emoji);
}

export function buildPetActionRows({ includeShop = true } = {}) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pet_action:brincar').setLabel('Brincar').setEmoji(PET_BALL()).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pet_action:alimentar').setLabel('Alimentar').setEmoji(PET_FOOD()).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('pet_action:acariciar').setLabel('Acariciar').setEmoji(PET_HEART()).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pet_action:status').setLabel('Status').setEmoji(PET_TIME()).setStyle(ButtonStyle.Secondary),
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
  const text = new TextDisplayBuilder().setContent(`## ${title}\n\n${body}`);
  const thumbnailUrl = petThumbnailUrl(pet);

  if (thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(text)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl)),
    );
  } else {
    container.addTextDisplayComponents(text);
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