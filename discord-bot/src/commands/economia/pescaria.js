import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SlashCommandBuilder,
  SectionBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
import { getEmoji } from '../../utils/emojiManager.js';
import { composeFishingArtwork } from '../../utils/fishingArtwork.js';

const COIN = () => getEmoji('futecoins');
const FISH_COMMON = () => getEmoji('fish_common');
const FISH_SEAL = () => getEmoji('fish_seal');
const FISH_LEGENDARY = () => getEmoji('fish_legendary');
const FISH_ROD = () => getEmoji('fish_rod');
const FISH_SHARK = () => getEmoji('fish_shark');
const FISH_CD = 45 * 60 * 1000;
const SHARK_BATTLE_START_HP = 12;
const SHARK_REWARD_MIN = 8000;
const SHARK_REWARD_MAX = 12000;
const LEGENDARY_ROUNDS = 2;
const LEGENDARY_BATTLE_MS = 10 * 60 * 1000;
const LEGENDARY_CHOICES = ['left', 'center', 'right'];

function fishEmoji(fish) {
  return fish?.emoji?.() ?? fish?.emoji ?? FISH_COMMON();
}

function rodEmoji(rod) {
  return rod?.emoji?.() ?? rod?.emoji ?? FISH_ROD();
}

export const FISH = Object.freeze([
  { key: 'peixe_comum', name: 'Peixe comum', emoji: FISH_COMMON, value: 80, chance: 70, rarity: 0, artwork: 'common', description: 'O peixe mais comum e fácil de conseguir.' },
  { key: 'tubarao_comum', name: 'Tubarão comum', emoji: FISH_SHARK, value: 650, chance: 20, rarity: 1, artwork: 'shark', description: 'Um tubarão que vale muitas coins.' },
  { key: 'carpa_lendaria', name: 'Carpa lendária', emoji: FISH_LEGENDARY, value: 2400, chance: 0, rarity: 0, artwork: 'legendary', description: 'Uma carpa lendária, extremamente valiosa.' },
  { key: 'escama_lendaria', name: 'Escama lendária', emoji: FISH_LEGENDARY, value: 0, chance: 0, rarity: 0, sellable: false, description: 'Uma escama obtida ao derrotar o tubarão raivoso.' },
  // Mantém capturas antigas vendáveis e visíveis após a evolução do sistema.
  { key: 'sardinha', name: 'Sardinha', emoji: FISH_COMMON, value: 80, chance: 0, rarity: 0, artwork: 'common', legacy: true, description: 'Captura antiga.' },
  { key: 'carpa', name: 'Carpa', emoji: FISH_COMMON, value: 140, chance: 0, rarity: 0, artwork: 'common', legacy: true, description: 'Captura antiga.' },
  { key: 'salmao', name: 'Salmão', emoji: FISH_COMMON, value: 240, chance: 0, rarity: 0, artwork: 'common', legacy: true, description: 'Captura antiga.' },
  { key: 'atum', name: 'Atum', emoji: FISH_COMMON, value: 390, chance: 0, rarity: 0, artwork: 'common', legacy: true, description: 'Captura antiga.' },
  { key: 'dourado', name: 'Dourado', emoji: FISH_COMMON, value: 700, chance: 0, rarity: 0, artwork: 'common', legacy: true, description: 'Captura antiga.' },
  { key: 'lendario', name: 'Peixe lendário', emoji: FISH_LEGENDARY, value: 1800, chance: 0, rarity: 0, artwork: 'legendary', legacy: true, description: 'Captura antiga.' },
]);

export const RODS = Object.freeze([
  { key: 'bambu', name: 'Vara de bambu', emoji: FISH_ROD, price: 0, luck: 0, description: 'A vara inicial. Faz o trabalho.' },
  { key: 'fibra', name: 'Vara de fibra', emoji: FISH_ROD, price: 2500, luck: 0.12, description: '+12% de chance de peixes raros.' },
  { key: 'carbono', name: 'Vara de carbono', emoji: FISH_ROD, price: 7500, luck: 0.28, description: '+28% de chance de peixes raros.' },
  { key: 'dourada', name: 'Vara dourada', emoji: FISH_ROD, price: 18000, luck: 0.5, description: '+50% de chance de peixes raros.' },
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
  if (fish.key === 'escama_lendaria') {
    return `${fishEmoji(fish)} **${fish.name}**${amount} — troféu do tubarão raivoso`;
  }
  return `${fishEmoji(fish)} **${fish.name}**${amount} — ${fish.value.toLocaleString('pt-BR')} ${COIN()} cada`;
}

function chooseOutcome(luck = 0, sealBlessing = false) {
  if (sealBlessing) {
    return {
      type: 'legendary',
      fish: FISH_BY_KEY.get('carpa_lendaria'),
      blessed: true,
      choice: LEGENDARY_CHOICES[Math.floor(Math.random() * LEGENDARY_CHOICES.length)],
    };
  }

  const weighted = [
    ...FISH.filter(fish => fish.chance > 0).map(fish => ({
      type: 'catch',
      fish,
      weight: fish.chance * (1 + fish.rarity * luck),
    })),
    { type: 'seal', artwork: 'seal', weight: 3 * (1 + luck * 0.4) },
    { type: 'angry_shark', artwork: 'angryShark', weight: 1 * (1 + luck * 0.8) },
  ];
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return weighted[0];
}

async function catchFish(userId, guildId, isAdmin = false) {
  return prisma.$transaction(async tx => {
    const profile = await getFishingProfile(userId, guildId, tx);
    const now = Date.now();
    if (profile.sharkBattleHp > 0) {
      const error = new Error('shark_battle');
      throw error;
    }
    if (profile.legendaryBattleUserId) {
      if (profile.legendaryBattleExpiresAt?.getTime() > now) {
        const error = new Error('legendary_battle');
        throw error;
      }
      await tx.fishingProfile.update({
        where: { userId_guildId: { userId, guildId } },
        data: {
          legendaryBattleUserId: null,
          legendaryBattleRound: 0,
          legendaryBattleChoice: null,
          legendaryBattleExpiresAt: null,
        },
      });
    }
    const elapsed = now - (profile.lastFishing?.getTime() ?? 0);
    if (!isAdmin && elapsed < FISH_CD) {
      const error = new Error('cooldown');
      error.remaining = FISH_CD - elapsed;
      throw error;
    }

    const rod = ROD_BY_KEY.get(profile.rodKey) ?? RODS[0];
    const outcome = chooseOutcome(rod.luck, profile.sealBlessing);
    const updateData = {
      lastFishing: new Date(now),
      sealBlessing: false,
    };

    if (outcome.type === 'seal') {
      updateData.sealBlessing = true;
    }
    if (outcome.type === 'angry_shark') {
      updateData.sharkBattleHp = SHARK_BATTLE_START_HP;
      updateData.sharkBattleReward = Math.floor(
        SHARK_REWARD_MIN + Math.random() * (SHARK_REWARD_MAX - SHARK_REWARD_MIN + 1),
      );
    }
    if (outcome.type === 'catch' && outcome.fish.key !== 'carpa_lendaria') {
      updateData.totalCaught = { increment: 1 };
    }
    if (outcome.type === 'legendary') {
      updateData.legendaryBattleUserId = userId;
      updateData.legendaryBattleRound = 1;
      updateData.legendaryBattleChoice = outcome.choice;
      updateData.legendaryBattleExpiresAt = new Date(now + LEGENDARY_BATTLE_MS);
    }

    await tx.fishingProfile.update({
      where: { userId_guildId: { userId, guildId } },
      data: updateData,
    });

    if (outcome.type === 'catch') {
      if (outcome.fish.key === 'tubarao_comum') {
        await tx.economy.upsert({
          where: { userId_guildId: { userId, guildId } },
          create: { userId, guildId, balance: outcome.fish.value },
          update: { balance: { increment: outcome.fish.value } },
        });
      } else {
        await tx.fishingCatch.upsert({
          where: { userId_guildId_fishKey: { userId, guildId, fishKey: outcome.fish.key } },
          create: { userId, guildId, fishKey: outcome.fish.key, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });
      }
    }

    return {
      outcome,
      rod,
      battleReward: updateData.sharkBattleReward ?? 0,
      coinReward: outcome.type === 'catch' && outcome.fish.key === 'tubarao_comum'
        ? outcome.fish.value
        : 0,
    };
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
    return sum + (fish?.sellable === false ? 0 : fish?.value ?? 0) * row.quantity;
  }, 0);

  return (
    `## 🎣 Inventário de pesca\n` +
    `${rodEmoji(rod)} Vara equipada: **${rod.name}**\n` +
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
    new ButtonBuilder().setCustomId('fish_buy').setLabel('Comprar vara').setEmoji(FISH_ROD()).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('fish_sell').setLabel('Vender peixes').setEmoji(FISH_COMMON()).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('fish_inventory').setLabel('Meu inventário').setEmoji(FISH_COMMON()).setStyle(ButtonStyle.Secondary),
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
        .setEmoji(rodEmoji(rod));
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
      if (!fish || fish.sellable === false) return null;
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${fish.name} × ${row.quantity}`)
        .setValue(`sellfish:${fish.key}`)
        .setDescription(`Vender tudo por ${(fish.value * row.quantity).toLocaleString('pt-BR')} coins`)
        .setEmoji(fishEmoji(fish));
    })
    .filter(Boolean);
  if (options.length) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel('Vender tudo')
        .setValue('sellfish:all')
        .setDescription('Vende todos os peixes vendáveis do seu balde'),
    );
  }
  if (!options.length) return fishingError('Você só possui escamas lendárias. Elas são troféus e não podem ser vendidas.');
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
      if (!fish || fish.sellable === false) continue;
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
    if (!catches.some(row => FISH_BY_KEY.get(row.fishKey)?.sellable !== false)) {
      return interaction.reply(fishingError('Você não possui peixes vendáveis. As escamas lendárias ficam como troféu.'));
    }
    return interaction.reply(buildFishSellSelectPayload(catches));
  }

  if (customId === 'fish_shark_attack') {
    return handleSharkAttack(interaction);
  }

  if (customId.startsWith('fish_legendary_choice:')) {
    return handleLegendaryChoice(interaction, customId.split(':')[1]);
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
      return interaction.update(v2(`## ✅ Vara comprada\n${rodEmoji(rod)} Você equipou a **${rod.name}**!\n\n${rod.description}`, { ephemeral: true }));
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

function sharkBattlePayload({ hp, reward, defeated = false }) {
  const attackButton = new ButtonBuilder()
    .setCustomId('fish_shark_attack')
    .setLabel('Atacar o tubarão')
    .setEmoji('⚔️')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(defeated);

  if (defeated) {
    return {
      text:
        `## 🦈 Tubarão raivoso derrotado!\n` +
        `Você recebeu **${reward.toLocaleString('pt-BR')}** ${COIN()} e uma **Escama lendária**.\n` +
        `A escama foi guardada no seu inventário como troféu.`,
      artwork: 'angryShark',
      components: [new ActionRowBuilder().addComponents(attackButton)],
    };
  }

  return {
    text:
      `## 🦈 Tubarão raivoso!\n` +
      `Ele apareceu na sua linha. Ataque até reduzir a vida dele a zero para ganhar uma bolada de coins e uma escama lendária.\n\n` +
      `❤️ Vida do tubarão: **${hp}/${SHARK_BATTLE_START_HP}**\n` +
      `💰 Recompensa: até **${reward.toLocaleString('pt-BR')}** ${COIN()} + escama lendária`,
    artwork: 'angryShark',
    components: [new ActionRowBuilder().addComponents(attackButton)],
  };
}

function legendaryBattlePayload(round) {
  const roundText = round > LEGENDARY_ROUNDS
    ? 'A carpa foi fisgada!'
    : `**Rodada ${round}/${LEGENDARY_ROUNDS}** — escolha onde a carpa vai morder:`;
  const choices = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('fish_legendary_choice:left')
      .setLabel('Esquerda')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(round > LEGENDARY_ROUNDS),
    new ButtonBuilder()
      .setCustomId('fish_legendary_choice:center')
      .setLabel('Centro')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(round > LEGENDARY_ROUNDS),
    new ButtonBuilder()
      .setCustomId('fish_legendary_choice:right')
      .setLabel('Direita')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(round > LEGENDARY_ROUNDS),
  );
  return {
    text:
      `## ${FISH_LEGENDARY()} Carpa lendária apareceu!\n` +
      `A bênção da foca trouxe uma oportunidade única. Acerte as duas rodadas para fisgá-la — se errar, ela escapa.\n\n` +
      `${roundText}`,
    artwork: 'legendary',
    components: [choices],
  };
}

async function fishingArtworkPayload(text, artwork, components = [], { large = false } = {}) {
  const file = new AttachmentBuilder(await composeFishingArtwork(artwork), {
    name: 'fishing-result.png',
  });
  const container = new ContainerBuilder();
  if (large) {
    container
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://fishing-result.png'),
        ),
      );
  } else {
    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL('attachment://fishing-result.png'));
    container.addSectionComponents(section);
  }
  return {
    components: [container, ...components],
    files: [file],
    flags: MessageFlags.IsComponentsV2,
  };
}

async function handleLegendaryChoice(interaction, choice) {
  if (!LEGENDARY_CHOICES.includes(choice)) {
    return interaction.reply(fishingError('Essa escolha de posição não existe.'));
  }

  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const result = await prisma.$transaction(async tx => {
    const profile = await getFishingProfile(userId, guildId, tx);
    const now = Date.now();

    if (!profile.legendaryBattleUserId) return { status: 'missing' };
    if (profile.legendaryBattleExpiresAt?.getTime() <= now) {
      await tx.fishingProfile.update({
        where: { userId_guildId: { userId, guildId } },
        data: {
          legendaryBattleUserId: null,
          legendaryBattleRound: 0,
          legendaryBattleChoice: null,
          legendaryBattleExpiresAt: null,
        },
      });
      return { status: 'expired' };
    }
    if (profile.legendaryBattleUserId !== userId) return { status: 'owner' };

    const target = profile.legendaryBattleChoice ?? LEGENDARY_CHOICES[Math.floor(Math.random() * LEGENDARY_CHOICES.length)];
    if (choice !== target) {
      await tx.fishingProfile.update({
        where: { userId_guildId: { userId, guildId } },
        data: {
          legendaryBattleUserId: null,
          legendaryBattleRound: 0,
          legendaryBattleChoice: null,
          legendaryBattleExpiresAt: null,
        },
      });
      return { status: 'failed', choice, target };
    }

    if (profile.legendaryBattleRound < LEGENDARY_ROUNDS) {
      await tx.fishingProfile.update({
        where: { userId_guildId: { userId, guildId } },
        data: {
          legendaryBattleRound: { increment: 1 },
          legendaryBattleChoice: LEGENDARY_CHOICES[Math.floor(Math.random() * LEGENDARY_CHOICES.length)],
        },
      });
      return { status: 'round', round: profile.legendaryBattleRound + 1 };
    }

    await tx.fishingProfile.update({
      where: { userId_guildId: { userId, guildId } },
      data: {
        legendaryBattleUserId: null,
        legendaryBattleRound: 0,
        legendaryBattleChoice: null,
        legendaryBattleExpiresAt: null,
        totalCaught: { increment: 1 },
      },
    });
    await tx.fishingCatch.upsert({
      where: { userId_guildId_fishKey: { userId, guildId, fishKey: 'carpa_lendaria' } },
      create: { userId, guildId, fishKey: 'carpa_lendaria', quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
    return { status: 'caught' };
  });

  if (result.status === 'missing') {
    return interaction.update(fishingUpdateError('A carpa lendária não está mais na sua linha.'));
  }
  if (result.status === 'owner') {
    return interaction.reply(fishingError('Somente o membro que encontrou a carpa pode jogar esta tentativa.'));
  }
  if (result.status === 'expired') {
    return interaction.update(fishingUpdateError('A carpa lendária escapou porque a tentativa expirou.'));
  }
  if (result.status === 'failed') {
    return interaction.update(await fishingArtworkPayload(
      `## ${FISH_LEGENDARY()} A carpa lendária escapou!\n` +
      `Você escolheu uma posição errada e perdeu esta oportunidade. A bênção da foca foi consumida.\n\n` +
      `⏱️ Você poderá pescar novamente em **45 minutos**.`,
      'legendary',
      [],
      { large: true },
    ));
  }
  if (result.status === 'round') {
    const battle = legendaryBattlePayload(result.round);
    return interaction.update(await fishingArtworkPayload(
      `${battle.text}\n\n✅ Boa! A carpa mordeu a isca. Tente a próxima rodada.`,
      battle.artwork,
      battle.components,
      { large: true },
    ));
  }

  return interaction.update(await fishingArtworkPayload(
    `## ${FISH_LEGENDARY()} Carpa lendária fisgada!\n` +
    `Você venceu a tentativa especial e guardou a captura no seu inventário.\n\n` +
    `💰 Valor de venda: **2.400** ${COIN()}\n` +
    `⏱️ Próxima pescaria em **45 minutos**.`,
    'legendary',
    [],
    { large: true },
  ));
}

async function handleSharkAttack(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const result = await prisma.$transaction(async tx => {
    const profile = await getFishingProfile(userId, guildId, tx);
    if (profile.sharkBattleHp <= 0) return { status: 'missing' };

    const damage = Math.floor(Math.random() * 3) + 2;
    const nextHp = Math.max(0, profile.sharkBattleHp - damage);
    if (nextHp > 0) {
      await tx.fishingProfile.update({
        where: { userId_guildId: { userId, guildId } },
        data: { sharkBattleHp: nextHp },
      });
      return { status: 'ongoing', hp: nextHp, reward: profile.sharkBattleReward, damage };
    }

    const reward = profile.sharkBattleReward;
    await tx.fishingProfile.update({
      where: { userId_guildId: { userId, guildId } },
      data: { sharkBattleHp: 0, sharkBattleReward: 0 },
    });
    await tx.economy.upsert({
      where: { userId_guildId: { userId, guildId } },
      create: { userId, guildId, balance: reward },
      update: { balance: { increment: reward } },
    });
    await tx.fishingCatch.upsert({
      where: { userId_guildId_fishKey: { userId, guildId, fishKey: 'escama_lendaria' } },
      create: { userId, guildId, fishKey: 'escama_lendaria', quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
    return { status: 'defeated', reward, damage };
  });

  if (result.status === 'missing') {
    return interaction.update(fishingUpdateError('Esse tubarão já foi derrotado ou não está mais na sua linha.'));
  }
  const battle = result.status === 'defeated'
    ? sharkBattlePayload({ defeated: true, reward: result.reward })
    : sharkBattlePayload({ hp: result.hp, reward: result.reward });
  return interaction.update(await fishingArtworkPayload(
    `${battle.text}\n\n⚔️ Você causou **${result.damage}** de dano.`,
    battle.artwork,
    battle.components,
  ));
}

async function executeFishing(userId, guildId, isAdmin, reply) {
  try {
    const result = await catchFish(userId, guildId, isAdmin);
    const { outcome, rod } = result;
    if (outcome.type === 'seal') {
      return reply(await fishingArtworkPayload(
        `## ${FISH_SEAL()} Uma foca apareceu!\n` +
        `Ela encontrou você no mar e avisou que um **peixe lendário virá na sua próxima pescaria**.\n\n` +
        `🪝 Vara usada: **${rod.name}**\n` +
        `⏱️ A bênção da foca está guardada. Próxima pescaria em **45 minutos**.`,
        'seal',
      ));
    }
    if (outcome.type === 'legendary') {
      const battle = legendaryBattlePayload(1);
      return reply(await fishingArtworkPayload(battle.text, battle.artwork, battle.components, { large: true }));
    }
    if (outcome.type === 'angry_shark') {
      const battle = sharkBattlePayload({
        hp: SHARK_BATTLE_START_HP,
        reward: result.battleReward,
      });
      return reply(await fishingArtworkPayload(battle.text, battle.artwork, battle.components));
    }

    const fish = outcome.fish;
    const sharkCoins = result.coinReward
      ? `\n💰 O tubarão trouxe **${result.coinReward.toLocaleString('pt-BR')}** ${COIN()} direto para sua carteira!`
      : `\n💰 Valor de venda: **${fish.value.toLocaleString('pt-BR')}** ${COIN()}`;
    return reply(await fishingArtworkPayload(
      `## 🎣 Pescaria concluída!\n` +
      `${fishEmoji(fish)} Você pescou um **${fish.name}**!\n` +
      `🪝 Vara usada: **${rod.name}**\n` +
      sharkCoins + `\n\n` +
      `Use **/pesca vender** quando quiser trocar seus peixes por coins.\n` +
      `⏱️ Próxima pescaria em **45 minutos**.`,
      fish.artwork,
    ));
  } catch (error) {
    if (error?.message === 'cooldown') return reply(fishingError(`A maré ainda não virou. Aguarde **${msToHuman(error.remaining)}** para pescar novamente.`));
    if (error?.message === 'shark_battle') {
      return reply(fishingError('O tubarão raivoso ainda está na sua linha. Use o botão de ataque para derrotá-lo antes de pescar novamente.'));
    }
    if (error?.message === 'legendary_battle') {
      return reply(fishingError('A carpa lendária ainda está na sua linha. Use os botões da tentativa especial antes de pescar novamente.'));
    }
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