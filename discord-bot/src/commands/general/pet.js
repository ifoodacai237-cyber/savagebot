import { SlashCommandBuilder } from 'discord.js';
import prisma from '../../database/client.js';

import { getEmoji } from '../../utils/emojiManager.js';
import { buildPetPanel, petDisplayName, petInteractionEmojis } from '../../utils/petComponents.js';
const COIN = () => getEmoji('futecoins');
const PET_HEART = () => petInteractionEmojis.heart();
const PET_TIME  = () => petInteractionEmojis.time();
const PET_FOOD  = () => petInteractionEmojis.food();
const PET_BALL  = () => petInteractionEmojis.ball();

const PET_INTERACTION_CD = 20 * 60 * 1000;
const PLAY_CD  = PET_INTERACTION_CD;
const FEED_CD  = PET_INTERACTION_CD;
const PET_CD   = PET_INTERACTION_CD;

const PLAY_MIN = 150, PLAY_MAX = 300;
const FEED_MIN = 80,  FEED_MAX = 160;
const PET_MIN  = 40,  PET_MAX  = 100;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatMs(ms) {
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const BRINCAR_MSGS = [
  'você jogou bolinha com',
  'você fez corrida com',
  'você brincou de esconde-esconde com',
  'você jogou cabo de guerra com',
  'você dançou com',
  'você fez malabarismo com',
  'você treinou acrobacias com',
];

const ALIMENTAR_MSGS = [
  'você preparou uma refeição especial para',
  'você deu um petisco favorito para',
  'você cozinhou um prato gourmet para',
  'você trouxe fruta fresca para',
  'você serviu um banquete para',
  'você assou biscoitos e deu para',
];

const ACARICIAR_MSGS = [
  'você passou a mão na cabeça de',
  'você deu um abraço apertado em',
  'você coçou a barriga de',
  'você fez carinho na orelha de',
  'você deu um selinho em',
  'você cantarolou uma música para acalmar',
];

const BRINCAR_REACOES = [
  'ficou animadíssimo!',
  'correu em círculos de felicidade!',
  'deu um salto enorme de alegria!',
  'se rolou de tanto rir!',
  'deu uma volta de honra!',
];

const ALIMENTAR_REACOES = [
  'comeu com muito entusiasmo!',
  'lambeu o prato todo!',
  'ficou de barriga cheia e feliz!',
  'pediu mais um pouco!',
  'agradeceu com um olhar carinhoso!',
];

const ACARICIAR_REACOES = [
  'ronronou de satisfação!',
  'fechou os olhos de prazer!',
  'encostou a cabeça em você!',
  'ficou com a cauda balançando!',
  'deu uma lambida carinhosa!',
];

function pickRand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function getOrCreateEco(userId, guildId) {
  return prisma.economy.upsert({
    where:  { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}

async function resolveActivePet(userId, guildId) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile?.activePet) return null;
  const pet = await prisma.pet.findUnique({ where: { id: profile.activePet } }).catch(() => null);
  if (!pet) return null;
  const purchased = await prisma.userPurchase.findUnique({
    where: { userId_itemType_itemRef: { userId, itemType: 'pet', itemRef: pet.id } },
  });
  if (!purchased) return null;
  return pet;
}

function noPetPayload() {
  return buildPetPanel({
    title: 'Nenhum pet equipado',
    body: 'Você ainda não tem um pet equipado.\n\nCompre um em `/loja painel` → **Comprar** → **Pets** e depois equipe em `/perfil` → **Meu Pet**.',
  });
}

async function deferPetInteraction(interaction, options = {}) {
  if (typeof interaction.isButton === 'function' && interaction.isButton()) {
    return interaction.deferUpdate();
  }
  return interaction.deferReply(options);
}

async function handleBrincar(interaction) {
  await deferPetInteraction(interaction);

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply(noPetPayload());

  const eco  = await getOrCreateEco(userId, guildId);
  const now  = Date.now();
  const last = eco.lastPetPlay ? new Date(eco.lastPetPlay).getTime() : 0;
  const diff = now - last;

  if (diff < PLAY_CD) {
    return interaction.editReply(buildPetPanel({
      title: `${petDisplayName(pet, interaction.guild)} está descansando`,
      body: `Seu pet precisa descansar depois de tanto brincar.\n\n${PET_TIME()} Próxima brincadeira em **${formatMs(PLAY_CD - diff)}**.\n\nTente alimentar ou acariciar enquanto isso.`,
      pet,
    }));
  }

  const reward = rand(PLAY_MIN, PLAY_MAX);
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { increment: reward }, lastPetPlay: new Date() },
  });

  const acao   = pickRand(BRINCAR_MSGS);
  const reacao = pickRand(BRINCAR_REACOES);

  return interaction.editReply(buildPetPanel({
    title: `${PET_BALL()} Brincadeira com ${petDisplayName(pet, interaction.guild)}`,
    body:
      `**${interaction.user.displayName ?? interaction.user.username}** ${acao} **${pet.name}**, que ${reacao}\n\n` +
      `Seu pet ficou tão feliz que te deu **+${reward.toLocaleString('pt-BR')} ${COIN()}**!\n\n` +
      `💰 **Ganhou:** +${reward.toLocaleString('pt-BR')} ${COIN()}\n` +
      `👛 **Carteira:** ${(eco.balance + reward).toLocaleString('pt-BR')} ${COIN()}\n\n` +
      `${PET_TIME()} Próxima brincadeira em ${formatMs(PLAY_CD)}.`,
    pet,
  }));
}

async function handleAlimentar(interaction) {
  await deferPetInteraction(interaction);

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply(noPetPayload());

  const eco  = await getOrCreateEco(userId, guildId);
  const now  = Date.now();
  const last = eco.lastPetFeed ? new Date(eco.lastPetFeed).getTime() : 0;
  const diff = now - last;

  if (diff < FEED_CD) {
    return interaction.editReply(buildPetPanel({
      title: `${petDisplayName(pet, interaction.guild)} está satisfeito`,
      body: `Seu pet ainda está de barriga cheia!\n\n${PET_TIME()} Próxima alimentação em **${formatMs(FEED_CD - diff)}**.\n\nTente brincar ou acariciar enquanto isso.`,
      pet,
    }));
  }

  const reward = rand(FEED_MIN, FEED_MAX);
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { increment: reward }, lastPetFeed: new Date() },
  });

  const acao   = pickRand(ALIMENTAR_MSGS);
  const reacao = pickRand(ALIMENTAR_REACOES);

  return interaction.editReply(buildPetPanel({
    title: `${PET_FOOD()} Alimentando ${petDisplayName(pet, interaction.guild)}`,
    body:
      `**${interaction.user.displayName ?? interaction.user.username}** ${acao} **${pet.name}**, que ${reacao}\n\n` +
      `Como agradecimento, você ganhou **+${reward.toLocaleString('pt-BR')} ${COIN()}**!\n\n` +
      `💰 **Ganhou:** +${reward.toLocaleString('pt-BR')} ${COIN()}\n` +
      `👛 **Carteira:** ${(eco.balance + reward).toLocaleString('pt-BR')} ${COIN()}\n\n` +
      `${PET_TIME()} Próxima alimentação em ${formatMs(FEED_CD)}.`,
    pet,
  }));
}

async function handleAcariciar(interaction) {
  await deferPetInteraction(interaction);

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply(noPetPayload());

  const eco  = await getOrCreateEco(userId, guildId);
  const now  = Date.now();
  const last = eco.lastPetPet ? new Date(eco.lastPetPet).getTime() : 0;
  const diff = now - last;

  if (diff < PET_CD) {
    return interaction.editReply(buildPetPanel({
      title: `${petDisplayName(pet, interaction.guild)} precisa de um tempo`,
      body: `Seu pet está descansando após o último carinho.\n\n${PET_TIME()} Próximo carinho em **${formatMs(PET_CD - diff)}**.\n\nTente brincar ou alimentar enquanto isso.`,
      pet,
    }));
  }

  const reward = rand(PET_MIN, PET_MAX);
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { increment: reward }, lastPetPet: new Date() },
  });

  const acao   = pickRand(ACARICIAR_MSGS);
  const reacao = pickRand(ACARICIAR_REACOES);

  return interaction.editReply(buildPetPanel({
    title: `${PET_HEART()} Carinho em ${petDisplayName(pet, interaction.guild)}`,
    body:
      `**${interaction.user.displayName ?? interaction.user.username}** ${acao} **${pet.name}**, que ${reacao}\n\n` +
      `O carinho valeu **+${reward.toLocaleString('pt-BR')} ${COIN()}**!\n\n` +
      `💰 **Ganhou:** +${reward.toLocaleString('pt-BR')} ${COIN()}\n` +
      `👛 **Carteira:** ${(eco.balance + reward).toLocaleString('pt-BR')} ${COIN()}\n\n` +
      `${PET_TIME()} Próximo carinho em ${formatMs(PET_CD)}.`,
    pet,
  }));
}

async function handleStatus(interaction) {
  await deferPetInteraction(interaction, { ephemeral: true });

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply(noPetPayload());

  const eco = await getOrCreateEco(userId, guildId);
  const now = Date.now();

  function cdLine(last, cd, label) {
    if (!last) return `${label}: ✅ Disponível`;
    const diff = now - new Date(last).getTime();
    if (diff >= cd) return `${label}: ✅ Disponível`;
    return `${label}: ⏳ ${formatMs(cd - diff)}`;
  }

  return interaction.editReply(buildPetPanel({
    title: `${petDisplayName(pet, interaction.guild)} — Status`,
    body:
      `Cooldowns das interações com seu pet:\n\n` +
      `${PET_BALL()} ${cdLine(eco.lastPetPlay, PLAY_CD, 'Brincar')} (até **300 ${COIN()}**)\n` +
      `${PET_FOOD()} ${cdLine(eco.lastPetFeed, FEED_CD, 'Alimentar')} (até **160 ${COIN()}**)\n` +
      `${PET_HEART()} ${cdLine(eco.lastPetPet, PET_CD, 'Acariciar')} (até **100 ${COIN()}**)\n\n` +
      `Use os botões abaixo para interagir sem precisar digitar outro comando.`,
    pet,
  }));
}

export async function handlePetButton(interaction) {
  const action = interaction.customId.slice('pet_action:'.length);
  if (action === 'brincar') return handleBrincar(interaction);
  if (action === 'alimentar') return handleAlimentar(interaction);
  if (action === 'acariciar') return handleAcariciar(interaction);
  if (action === 'status') return handleStatus(interaction);
  return interaction.reply({ content: '❌ Ação de pet inválida.', ephemeral: true });
}

export default {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('🐾 Interaja com seu pet e ganhe moedas!')
    .addSubcommand(s =>
     s.setName('brincar').setDescription('🎾 Brinque com seu pet e ganhe 150–300 moedas (CD: 20 min)'))
    .addSubcommand(s =>
     s.setName('alimentar').setDescription('🍖 Alimente seu pet e ganhe 80–160 moedas (CD: 20 min)'))
    .addSubcommand(s =>
     s.setName('acariciar').setDescription('💜 Faça carinho no seu pet e ganhe 40–100 moedas (CD: 20 min)'))
    .addSubcommand(s =>
      s.setName('status').setDescription('📋 Veja os cooldowns das interações do seu pet')),

  name: 'pet',
  aliases: ['meu-pet', 'meupet'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'brincar')   return handleBrincar(interaction);
    if (sub === 'alimentar') return handleAlimentar(interaction);
    if (sub === 'acariciar') return handleAcariciar(interaction);
    if (sub === 'status')    return handleStatus(interaction);
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    const mockInteraction = {
      user:    message.author,
      guildId: message.guildId,
      guild:   message.guild,
      deferReply: async () => { await message.channel.sendTyping().catch(() => {}); },
      editReply:  async (payload) => message.reply(payload),
    };

    if (sub === 'brincar'   || sub === 'b') return handleBrincar(mockInteraction);
    if (sub === 'alimentar' || sub === 'a') return handleAlimentar(mockInteraction);
    if (sub === 'acariciar' || sub === 'c') return handleAcariciar(mockInteraction);
    if (sub === 'status'    || sub === 's') return handleStatus(mockInteraction);

    return message.reply(buildPetPanel({
      title: '🐾 Interações de Pet',
      body:
        '**Subcomandos disponíveis:**\n\n' +
         '`pet brincar` — ' + PET_BALL() + ' Brinque (+150–300 moedas, CD: 20 min)\n' +
         '`pet alimentar` — ' + PET_FOOD() + ' Alimente (+80–160 moedas, CD: 20 min)\n' +
         '`pet acariciar` — ' + PET_HEART() + ' Faça carinho (+40–100 moedas, CD: 20 min)\n' +
        '`pet status` — ' + PET_TIME() + ' Ver cooldowns\n\n' +
        'Você também pode usar os botões abaixo.',
    }));
  },
};
