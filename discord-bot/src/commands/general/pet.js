import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import prisma from '../../database/client.js';

const COIN = '<a:emoji_1:1516993823665033286>';

const PLAY_CD  = 4 * 60 * 60 * 1000;
const FEED_CD  = 2 * 60 * 60 * 1000;
const PET_CD   = 60 * 60 * 1000;

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

// Aplica a foto do pet na embed (grande = setImage, thumb = setThumbnail)
function applyPetImage(embed, pet) {
  if (pet.imageUrl) embed.setImage(pet.imageUrl);
  return embed;
}

// Nome de exibição sem tentar colocar emoji customizado no título
function petDisplayName(pet) {
  const isCustomEmoji = /<a?:\w+:\d+>/.test(pet.emoji ?? '');
  // Emojis unicode funcionam no título; custom emojis não renderizam em títulos no Discord
  return isCustomEmoji ? pet.name : `${pet.emoji} ${pet.name}`;
}

const NO_PET_EMBED = new EmbedBuilder().setColor(0xED4245)
  .setDescription('❌ Você não tem um pet equipado!\nCompre um em `/loja painel` → **Comprar** → **Pets** e equipe em `/perfil` → **Meu Pet**.');

async function handleBrincar(interaction) {
  await interaction.deferReply();

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply({ embeds: [NO_PET_EMBED] });

  const eco  = await getOrCreateEco(userId, guildId);
  const now  = Date.now();
  const last = eco.lastPetPlay ? new Date(eco.lastPetPlay).getTime() : 0;
  const diff = now - last;

  if (diff < PLAY_CD) {
    const embed = new EmbedBuilder().setColor(0xFEE75C)
      .setTitle(`${petDisplayName(pet)} ainda está cansado!`)
      .setDescription(`Seu pet precisa descansar depois de tanto brincar.\n\n⏳ Próxima brincadeira em **${formatMs(PLAY_CD - diff)}**.`)
      .setFooter({ text: 'Tente alimentar ou acariciar no intervalo!' });
    applyPetImage(embed, pet);
    return interaction.editReply({ embeds: [embed] });
  }

  const reward = rand(PLAY_MIN, PLAY_MAX);
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { increment: reward }, lastPetPlay: new Date() },
  });

  const acao   = pickRand(BRINCAR_MSGS);
  const reacao = pickRand(BRINCAR_REACOES);

  const embed = new EmbedBuilder().setColor(0x57F287)
    .setTitle(`🎾 Brincadeira com ${petDisplayName(pet)}!`)
    .setDescription(
      `**${interaction.user.displayName ?? interaction.user.username}** ${acao} **${pet.name}**, que ${reacao}\n\n` +
      `Seu pet ficou tão feliz que te deu **+${reward.toLocaleString('pt-BR')} ${COIN}**!`
    )
    .addFields(
      { name: '💰 Ganhou',   value: `**+${reward.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
      { name: '👛 Carteira', value: `**${(eco.balance + reward).toLocaleString('pt-BR')} ${COIN}**`, inline: true },
    )
    .setFooter({ text: `Próxima brincadeira em ${formatMs(PLAY_CD)}` })
    .setTimestamp();
  applyPetImage(embed, pet);

  return interaction.editReply({ embeds: [embed] });
}

async function handleAlimentar(interaction) {
  await interaction.deferReply();

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply({ embeds: [NO_PET_EMBED] });

  const eco  = await getOrCreateEco(userId, guildId);
  const now  = Date.now();
  const last = eco.lastPetFeed ? new Date(eco.lastPetFeed).getTime() : 0;
  const diff = now - last;

  if (diff < FEED_CD) {
    const embed = new EmbedBuilder().setColor(0xFEE75C)
      .setTitle(`${petDisplayName(pet)} ainda está satisfeito!`)
      .setDescription(`Seu pet ainda está de barriga cheia!\n\n⏳ Próxima alimentação em **${formatMs(FEED_CD - diff)}**.`)
      .setFooter({ text: 'Tente brincar ou acariciar no intervalo!' });
    applyPetImage(embed, pet);
    return interaction.editReply({ embeds: [embed] });
  }

  const reward = rand(FEED_MIN, FEED_MAX);
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { increment: reward }, lastPetFeed: new Date() },
  });

  const acao   = pickRand(ALIMENTAR_MSGS);
  const reacao = pickRand(ALIMENTAR_REACOES);

  const embed = new EmbedBuilder().setColor(0xFEA040)
    .setTitle(`🍖 Alimentando ${petDisplayName(pet)}!`)
    .setDescription(
      `**${interaction.user.displayName ?? interaction.user.username}** ${acao} **${pet.name}**, que ${reacao}\n\n` +
      `Como agradecimento, você ganhou **+${reward.toLocaleString('pt-BR')} ${COIN}**!`
    )
    .addFields(
      { name: '💰 Ganhou',   value: `**+${reward.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
      { name: '👛 Carteira', value: `**${(eco.balance + reward).toLocaleString('pt-BR')} ${COIN}**`, inline: true },
    )
    .setFooter({ text: `Próxima alimentação em ${formatMs(FEED_CD)}` })
    .setTimestamp();
  applyPetImage(embed, pet);

  return interaction.editReply({ embeds: [embed] });
}

async function handleAcariciar(interaction) {
  await interaction.deferReply();

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply({ embeds: [NO_PET_EMBED] });

  const eco  = await getOrCreateEco(userId, guildId);
  const now  = Date.now();
  const last = eco.lastPetPet ? new Date(eco.lastPetPet).getTime() : 0;
  const diff = now - last;

  if (diff < PET_CD) {
    const embed = new EmbedBuilder().setColor(0xFEE75C)
      .setTitle(`${petDisplayName(pet)} precisa de um tempo!`)
      .setDescription(`Seu pet está descansando após o último carinho.\n\n⏳ Próximo carinho em **${formatMs(PET_CD - diff)}**.`)
      .setFooter({ text: 'Tente brincar ou alimentar no intervalo!' });
    applyPetImage(embed, pet);
    return interaction.editReply({ embeds: [embed] });
  }

  const reward = rand(PET_MIN, PET_MAX);
  await prisma.economy.update({
    where: { userId_guildId: { userId, guildId } },
    data:  { balance: { increment: reward }, lastPetPet: new Date() },
  });

  const acao   = pickRand(ACARICIAR_MSGS);
  const reacao = pickRand(ACARICIAR_REACOES);

  const embed = new EmbedBuilder().setColor(0xF47FFF)
    .setTitle(`💜 Carinhoso com ${petDisplayName(pet)}!`)
    .setDescription(
      `**${interaction.user.displayName ?? interaction.user.username}** ${acao} **${pet.name}**, que ${reacao}\n\n` +
      `O carinho valeu **+${reward.toLocaleString('pt-BR')} ${COIN}**!`
    )
    .addFields(
      { name: '💰 Ganhou',   value: `**+${reward.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
      { name: '👛 Carteira', value: `**${(eco.balance + reward).toLocaleString('pt-BR')} ${COIN}**`, inline: true },
    )
    .setFooter({ text: `Próximo carinho em ${formatMs(PET_CD)}` })
    .setTimestamp();
  applyPetImage(embed, pet);

  return interaction.editReply({ embeds: [embed] });
}

async function handleStatus(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const pet = await resolveActivePet(userId, guildId);
  if (!pet) return interaction.editReply({ embeds: [NO_PET_EMBED] });

  const eco = await getOrCreateEco(userId, guildId);
  const now = Date.now();

  function cdLine(last, cd, label) {
    if (!last) return `${label}: ✅ Disponível`;
    const diff = now - new Date(last).getTime();
    if (diff >= cd) return `${label}: ✅ Disponível`;
    return `${label}: ⏳ ${formatMs(cd - diff)}`;
  }

  const embed = new EmbedBuilder().setColor(0x9B4FD6)
    .setTitle(`${petDisplayName(pet)} — Status`)
    .setDescription(
      `Cooldowns das interações com seu pet:\n\n` +
      `🎾 ${cdLine(eco.lastPetPlay, PLAY_CD, 'Brincar')} (CD: 4h — até **300 ${COIN}**)\n` +
      `🍖 ${cdLine(eco.lastPetFeed, FEED_CD, 'Alimentar')} (CD: 2h — até **160 ${COIN}**)\n` +
      `💜 ${cdLine(eco.lastPetPet, PET_CD, 'Acariciar')} (CD: 1h — até **100 ${COIN}**)`
    )
    .setFooter({ text: 'Use /pet brincar, /pet alimentar ou /pet acariciar' });
  applyPetImage(embed, pet);

  return interaction.editReply({ embeds: [embed] });
}

export default {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('🐾 Interaja com seu pet e ganhe moedas!')
    .addSubcommand(s =>
      s.setName('brincar').setDescription('🎾 Brinque com seu pet e ganhe 150–300 moedas (CD: 4h)'))
    .addSubcommand(s =>
      s.setName('alimentar').setDescription('🍖 Alimente seu pet e ganhe 80–160 moedas (CD: 2h)'))
    .addSubcommand(s =>
      s.setName('acariciar').setDescription('💜 Faça carinho no seu pet e ganhe 40–100 moedas (CD: 1h)'))
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

    return message.reply({
      embeds: [
        new EmbedBuilder().setColor(0x9B4FD6)
          .setTitle('🐾 Interações de Pet')
          .setDescription(
            '**Subcomandos disponíveis:**\n\n' +
            '`pet brincar` — 🎾 Brinque (+150–300 moedas, CD: 4h)\n' +
            '`pet alimentar` — 🍖 Alimente (+80–160 moedas, CD: 2h)\n' +
            '`pet acariciar` — 💜 Faça carinho (+40–100 moedas, CD: 1h)\n' +
            '`pet status` — 📋 Ver cooldowns'
          ),
      ],
    });
  },
};
