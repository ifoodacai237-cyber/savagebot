import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
import { getEmoji } from '../../utils/emojiManager.js';

const COIN = () => getEmoji('futecoins');
const FISH_CD = 45 * 60 * 1000;

export const FISH = Object.freeze([
  { key: 'sardinha', name: 'Sardinha', emoji: '🐟', value: 80, chance: 44, description: 'Peixe comum e fácil de encontrar.' },
  { key: 'carpa', name: 'Carpa', emoji: '🐠', value: 140, chance: 28, description: 'Uma captura um pouco mais valiosa.' },
  { key: 'salmao', name: 'Salmão', emoji: '🍣', value: 240, chance: 16, description: 'Um peixe cobiçado pelos pescadores.' },
  { key: 'atum', name: 'Atum', emoji: '🐟', value: 390, chance: 8, description: 'Grande, forte e bem valorizado.' },
  { key: 'dourado', name: 'Dourado', emoji: '✨', value: 700, chance: 3, description: 'Uma captura rara e brilhante.' },
  { key: 'lendario', name: 'Peixe lendário', emoji: '🌟', value: 1800, chance: 1, description: 'A lenda que todos querem contar.' },
]);

export const RODS = Object.freeze([
  { key: 'bambu', name: 'Vara de bambu', emoji: '🎋', price: 0, luck: 0, description: 'A vara inicial. Faz o trabalho.' },
  { key: 'fibra', name: 'Vara de fibra', emoji: '🪵', price: 2500, luck: 0.12, description: '+12% de chance de peixes raros.' },
  { key: 'carbono', name: 'Vara de carbono', emoji: '🎣', price: 7500, luck: 0.28, description: '+28% de chance de peixes raros.' },
  { key: 'dourada', name: 'Vara dourada', emoji: '💫', price: 18000, luck: 0.5, description: '+50% de chance de peixes raros.' },
]);

const FISH_BY_KEY = new Map(FISH.map(fish => [fish.key, fish]));
const ROD_BY_KEY = new Map(RODS.map(rod => [rod.key, rod]));

function v2(text, { ephemeral = false, components = [] } = {}) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return {
    components: [container, ...components],
    flags: MessageFlags.IsComponentsV2,
    ...(ephemeral ? { ephemeral: true } : {}),
  };
}

export function fishingError(text) {
  return v2(`❌  ${text}`, { ephemeral: true });
}

function fishingUpdateError(text) {
  return v2(`❌  ${text}`);
}

async function getFishingProfile(userId, guildId, db = prisma) {
  return db.fishingProfile.upsert({
    where: { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}

function msToHuman(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m ${seconds}s`;
}

function formatFish(fish, quantity = null) {
  const amount = quantity === null ? '' : ` × **${quantity}**`;
  return `${fish.emoji} **${fish.name}**${amount} — ${fish.value.toLocaleString('pt-BR')} ${COIN()} cada`;
}

function chooseFish(luck = 0) {
  const weighted = FISH.map((fish, index) => {
    const rarityBoost = index * luck;
    return { fish, weight: fish.chance * (1 + rarityBoost) };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.fish;
  }
  return FISH[0];
}

async function catchFish(userId, guildId, isAdmin = false) {
  return prisma.$transaction(async tx => {
    const profile = await getFishingProfile(userId, guildId, tx);
    const now = Date.now();
    const elapsed = now - (profile.lastFishing?.getTime() ?? 0);
    if (!isAdmin && elapsed < FISH_CD) {
      const error = new Error('cooldown');
      error.remaining = FISH_CD - elapsed;
      throw error;
    }

    const rod = ROD_BY_KEY.get(profile.rodKey) ?? RODS[0];
    const fish = chooseFish(rod.luck);

    await tx.fishingProfile.update({
      where: { userId_guildId: { userId, guildId } },
      data: { lastFishing: new Date(now), totalCaught: { increment: 1 } },
    });
    await tx.fishingCatch.upsert({
      where: { userId_guildId_fishKey: { userId, guildId, fishKey: fish.key } },
      create: { userId, guildId, fishKey: fish.key, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });

    return { fish, rod };
  });
}

async function getInventory(userId, guildId) {
  const [profile, catches] = await Promise.all([
    getFishingProfile(userId, guildId),
    prisma.fishingCatch.findMany({ where: { userId, guildId, quantity: { gt: 0 } } }),
  ]);
  return { profile, catches };
}

function buildInventoryText(userId, guildId, { profile, catches }) {
  const rod = ROD_BY_KEY.get(profile.rodKey) ?? RODS[0];
  const lines = catches
    .map(row => {
      const fish = FISH_BY_KEY.get(row.fishKey);
      return fish ? formatFish(fish, row.quantity) : null;
    })
    .filter(Boolean);
  const estimated = catches.reduce((sum, row) => {
    const fish = FISH_BY_KEY.get(row.fishKey);
    return sum + (fish?.value ?? 0) * row.quantity;
  }, 0);

  return (
    `## 🎣 Inventário de pesca\n` +
    `${rod.emoji} Vara equipada: **${rod.name}**\n` +
    `🐟 Capturas totais: **${profile.totalCaught.toLocaleString('pt-BR')}**\n\n` +
    (lines.length ? lines.join('\n') : '*Seu balde está vazio. Vá pescar para começar.*') +
    `\n\n💰 Valor estimado para venda: **${estimated.toLocaleString('pt-BR')}** ${COIN()}`
  );
}

export function buildFishingShopPayload() {
  const container = new ContainerBuilder()
    .setAccentColor(0x147d92)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## 🎣 Loja de pesca\n\n` +
      `Compre uma vara melhor para aumentar suas chances de capturar peixes raros.\n` +
      `Os peixes ficam no seu balde até você decidir vender.\n\n` +
      `**Como funciona**\n` +
      `\`/pescar\` → uma pescaria a cada 45 minutos\n` +
      `\`/pesca inventario\` → veja suas capturas\n` +
      `\`/pesca vender\` → transforme peixes em ${COIN()}`
    ));

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fish_buy').setLabel('Comprar vara').setEmoji('🎣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('fish_sell').setLabel('Vender peixes').setEmoji('💰').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('fish_inventory').setLabel('Meu inventário').setEmoji('🎒').setStyle(ButtonStyle.Secondary),
  );
  return { components: [container, buttons], flags: MessageFlags.IsComponentsV2 };
}

export function buildRodSelectPayload(currentRodKey) {
  const options = RODS
    .filter(rod => RODS.findIndex(item => item.key === rod.key) >= RODS.findIndex(item => item.key === currentRodKey))
    .map(rod => {
      const owned = rod.key === currentRodKey;
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(`${rod.name}${owned ? ' (equipada)' : ''}`)
        .setValue(`buyrod:${rod.key}`)
        .setDescription(owned ? 'Você já possui esta vara.' : `${rod.price.toLocaleString('pt-BR')} coins · ${rod.description}`)
        .setEmoji(rod.emoji);
      if (owned) option.setDefault(true);
      return option;
    });
  const menu = new StringSelectMenuBuilder()
    .setCustomId('fish_rod_select')
    .setPlaceholder('Escolha uma vara para comprar')
    .addOptions(options);
  return v2('## 🎣 Escolha sua vara\nVaras melhores aumentam as chances de peixes raros.', {
    ephemeral: true,
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

export function buildFishSellSelectPayload(catches) {
  const options = catches
    .map(row => {
      const fish = FISH_BY_KEY.get(row.fishKey);
      if (!fish) return null;
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${fish.name} × ${row.quantity}`)
        .setValue(`sellfish:${fish.key}`)
        .setDescription(`Vender tudo por ${(fish.value * row.quantity).toLocaleString('pt-BR')} coins`)
        .setEmoji(fish.emoji);
    })
    .filter(Boolean);
  options.push(
    new StringSelectMenuOptionBuilder()
      .setLabel('Vender tudo')
      .setValue('sellfish:all')
      .setDescription('Vende todos os peixes do seu balde'),
  );
  const menu = new StringSelectMenuBuilder()
    .setCustomId('fish_sell_select')
    .setPlaceholder('Escolha o que deseja vender')
    .addOptions(options);
  return v2('## 💰 Venda de peixes\nEscolha uma espécie ou venda todo o conteúdo do seu balde.', {
    ephemeral: true,
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

async function sellFish(userId, guildId, fishKey = 'all') {
  return prisma.$transaction(async tx => {
    const rows = await tx.fishingCatch.findMany({
      where: { userId, guildId, quantity: { gt: 0 }, ...(fishKey === 'all' ? {} : { fishKey }) },
    });
    if (!rows.length) return { amount: 0, count: 0 };

    let amount = 0;
    let count = 0;
    for (const row of rows) {
      const fish = FISH_BY_KEY.get(row.fishKey);
      if (!fish) continue;
      amount += fish.value * row.quantity;
      count += row.quantity;
      await tx.fishingCatch.update({
        where: { userId_guildId_fishKey: { userId, guildId, fishKey: row.fishKey } },
        data: { quantity: 0 },
      });
    }
    await tx.economy.upsert({
      where: { userId_guildId: { userId, guildId } },
      create: { userId, guildId, balance: amount },
      update: { balance: { increment: amount } },
    });
    return { amount, count };
  });
}

export async function handleFishingInteraction(interaction) {
  const { customId } = interaction;
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  if (customId === 'fish_shop') {
    return interaction.reply(buildFishingShopPayload());
  }

  if (customId === 'fish_inventory') {
    const inventory = await getInventory(userId, guildId);
    return interaction.reply(v2(buildInventoryText(userId, guildId, inventory), { ephemeral: true }));
  }

  if (customId === 'fish_buy') {
    const profile = await getFishingProfile(userId, guildId);
    return interaction.reply(buildRodSelectPayload(profile.rodKey));
  }

  if (customId === 'fish_sell') {
    const { catches } = await getInventory(userId, guildId);
    if (!catches.length) return interaction.reply(fishingError('Seu balde está vazio. Pesque algo antes de vender.'));
    return interaction.reply(buildFishSellSelectPayload(catches));
  }

  if (customId === 'fish_rod_select' || customId === 'fish_sell_select') {
    const value = interaction.values[0];
    if (customId === 'fish_rod_select') {
      const rodKey = value.replace('buyrod:', '');
      const rod = ROD_BY_KEY.get(rodKey);
      if (!rod) return interaction.update(fishingUpdateError('Essa vara não existe.'));

      const result = await prisma.$transaction(async tx => {
        const profile = await getFishingProfile(userId, guildId, tx);
        if (profile.rodKey === rod.key) return { status: 'owned' };
        const previousIndex = RODS.findIndex(item => item.key === profile.rodKey);
        const nextIndex = RODS.findIndex(item => item.key === rod.key);
        if (nextIndex <= previousIndex) return { status: 'owned' };
        const economy = await tx.economy.upsert({
          where: { userId_guildId: { userId, guildId } },
          create: { userId, guildId },
          update: {},
        });
        if (economy.balance < rod.price) return { status: 'funds', balance: economy.balance };
        await tx.economy.update({
          where: { userId_guildId: { userId, guildId } },
          data: { balance: { decrement: rod.price } },
        });
        await tx.fishingProfile.update({
          where: { userId_guildId: { userId, guildId } },
          data: { rodKey: rod.key },
        });
        return { status: 'bought' };
      });

      if (result.status === 'owned') return interaction.update(fishingUpdateError('Você já possui essa vara ou uma melhor.'));
      if (result.status === 'funds') return interaction.update(fishingUpdateError(`Saldo insuficiente. Você tem **${result.balance.toLocaleString('pt-BR')}** ${COIN()}.`));
      return interaction.update(v2(`## ✅ Vara comprada\n${rod.emoji} Você equipou a **${rod.name}**!\n\n${rod.description}`, { ephemeral: true }));
    }

    const fishKey = value.replace('sellfish:', '');
    const result = await sellFish(userId, guildId, fishKey);
    if (!result.count) return interaction.update(fishingUpdateError('Você não possui esses peixes para vender.'));
    return interaction.update(v2(
      `## 💰 Venda concluída\n🐟 **${result.count}** peixe(s) vendido(s)\n${COIN()} **+${result.amount.toLocaleString('pt-BR')}** adicionados à sua carteira.`,
      { ephemeral: true },
    ));
  }
}

async function executeFishing(userId, guildId, isAdmin, reply) {
  try {
    const result = await catchFish(userId, guildId, isAdmin);
    return reply(v2(
      `## 🎣 Pescaria concluída!\n` +
      `${result.fish.emoji} Você pescou um **${result.fish.name}**!\n` +
      `🪝 Vara usada: **${result.rod.name}**\n` +
      `💰 Valor de venda: **${result.fish.value.toLocaleString('pt-BR')}** ${COIN()}\n\n` +
      `Use **/pesca vender** quando quiser trocar seus peixes por coins.\n` +
      `⏱️ Próxima pescaria em **45 minutos**.`
    ));
  } catch (error) {
    if (error?.message === 'cooldown') return reply(fishingError(`A maré ainda não virou. Aguarde **${msToHuman(error.remaining)}** para pescar novamente.`));
    console.error('[PESCA]', error);
    return reply(fishingError('A linha arrebentou. Tente novamente em instantes.'));
  }
}

const cmdPescar = {
  data: new SlashCommandBuilder()
    .setName('pescar')
    .setDescription('🎣 Pesque peixes para vender por coins (45 min cooldown)'),
  name: 'pescar',
  aliases: ['pesca', 'pescaria', 'fishing'],

  async execute(interaction) {
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
    return executeFishing(interaction.user.id, interaction.guildId, isAdmin, payload => interaction.reply(payload));
  },

  async executePrefix(message) {
    const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
    return executeFishing(message.author.id, message.guildId, isAdmin, payload => message.reply(payload));
  },
};

const cmdPesca = {
  data: new SlashCommandBuilder()
    .setName('pesca')
    .setDescription('🎣 Loja e inventário do sistema de pesca')
    .addSubcommand(s => s.setName('loja').setDescription('Abre a loja de varas'))
    .addSubcommand(s => s.setName('inventario').setDescription('Veja seus peixes e sua vara'))
    .addSubcommand(s => s.setName('vender').setDescription('Venda seus peixes por coins')),
  name: 'pesca',
  aliases: ['lojapesca', 'loja-pesca'],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'loja') return interaction.reply(buildFishingShopPayload());
    if (sub === 'inventario') {
      const inventory = await getInventory(interaction.user.id, interaction.guildId);
      return interaction.reply(v2(buildInventoryText(interaction.user.id, interaction.guildId, inventory), { ephemeral: true }));
    }
    const { catches } = await getInventory(interaction.user.id, interaction.guildId);
    if (!catches.length) return interaction.reply(fishingError('Seu balde está vazio. Pesque algo antes de vender.'));
    return interaction.reply(buildFishSellSelectPayload(catches));
  },

  async executePrefix(message, args) {
    const sub = args[1]?.toLowerCase() ?? args[0]?.toLowerCase();
    if (sub === 'vender' || sub === 'venda') {
      const { catches } = await getInventory(message.author.id, message.guildId);
      if (!catches.length) return message.reply(fishingError('Seu balde está vazio. Pesque algo antes de vender.'));
      return message.reply(buildFishSellSelectPayload(catches));
    }
    if (sub === 'inventario' || sub === 'inventário' || sub === 'inv') {
      const inventory = await getInventory(message.author.id, message.guildId);
      return message.reply(v2(buildInventoryText(message.author.id, message.guildId, inventory)));
    }
    return message.reply(buildFishingShopPayload());
  },
};

export default [cmdPescar, cmdPesca];