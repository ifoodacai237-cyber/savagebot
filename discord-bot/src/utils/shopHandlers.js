import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import prisma from '../database/client.js';
import { BANNERS, getBanner } from './shopData.js';

const SHOP_COLOR = 0x9B4FD6;

async function getEco(userId, guildId) {
  return prisma.economy.upsert({
    where:  { userId_guildId: { userId, guildId } },
    create: { userId, guildId },
    update: {},
  });
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export async function handleShopInteraction(interaction, client) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id === 'shop_comprar')             return handleComprar(interaction);
    if (id === 'shop_vitrine')             return handleVitrine(interaction);
    if (id === 'shop_converter')           return handleConverter(interaction);
    if (id === 'shop_saldo')               return handleSaldo(interaction);
    if (id === 'shop_cancel')              return interaction.update({ content: '❌ Compra cancelada.', embeds: [], components: [] });
    if (id.startsWith('shop_buy_'))        return handleBuyConfirm(interaction);
    if (id.startsWith('shop_ok_'))         return handleBuyExecute(interaction, client);
    if (id === 'profile_banner_btn')       return handleProfileBannerBtn(interaction);
  }

  if (interaction.isStringSelectMenu()) {
    if (id === 'shop_type_sel')            return handleTypeSel(interaction);
    if (id === 'shop_item_sel')            return handleItemSel(interaction);
    if (id === 'shop_vitrine_sel')         return handleVitrineSel(interaction);
    if (id === 'profile_banner_sel')       return handleProfileBannerSel(interaction);
  }
}

// ─── 🛒 Comprar Algo ──────────────────────────────────────────────────────────

async function handleComprar(interaction) {
  const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId, active: true } });

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('🛒 O que deseja comprar?')
    .setDescription('Selecione uma categoria abaixo para ver os itens disponíveis.')
    .addFields(
      { name: '👑 Cargos',            value: `${roles.length} cargo(s) disponível(is)`, inline: true },
      { name: '🖼️ Banners de Perfil', value: `${BANNERS.length} banners disponíveis`,  inline: true },
    )
    .setFooter({ text: 'Slow Bot · Loja' });

  const select = new StringSelectMenuBuilder()
    .setCustomId('shop_type_sel')
    .setPlaceholder('Selecione uma opção')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('👑 Cargos').setValue('roles')
        .setDescription(`${roles.length} cargos disponíveis`),
      new StringSelectMenuOptionBuilder()
        .setLabel('🖼️ Banners de Perfil').setValue('banners')
        .setDescription(`${BANNERS.length} banners disponíveis`),
    );

  return interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

// ─── Category selector ────────────────────────────────────────────────────────

async function handleTypeSel(interaction) {
  const type = interaction.values[0];

  if (type === 'roles') {
    const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId, active: true } });

    if (!roles.length) {
      return interaction.update({
        embeds: [
          new EmbedBuilder().setColor(0xED4245)
            .setTitle('❌ Nenhum cargo disponível')
            .setDescription('Nenhum cargo foi adicionado à loja ainda.\nUm admin deve usar `/loja admin cargo` para adicionar.'),
        ],
        components: [],
      });
    }

    const owned = await prisma.userPurchase.findMany({
      where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'role' },
    });
    const ownedRefs = new Set(owned.map(o => o.itemRef));

    const lines = roles.map(r => {
      const mark = ownedRefs.has(r.roleId) ? '✅ ' : '';
      return `${mark}> **${r.name}** — \`${r.price.toLocaleString('pt-BR')} SC\`\n> ${r.description ?? 'Cargo exclusivo do servidor.'}`;
    });

    const embed = new EmbedBuilder()
      .setColor(SHOP_COLOR)
      .setTitle('👑 Cargos à Venda')
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: '✅ = você já possui • Selecione para comprar' });

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_item_sel')
      .setPlaceholder('Selecione um cargo para comprar')
      .addOptions(roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(`role:${r.id}`)
          .setDescription(`${r.price.toLocaleString('pt-BR')} SC${ownedRefs.has(r.roleId) ? ' ✅ (você possui)' : ''}`)
      ));

    return interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(select)],
    });
  }

  if (type === 'banners') {
    const owned = await prisma.userPurchase.findMany({
      where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' },
    });
    const ownedKeys = new Set(owned.map(o => o.itemRef));

    const embed = new EmbedBuilder()
      .setColor(SHOP_COLOR)
      .setTitle('🖼️ Banners de Perfil')
      .setDescription(
        'Selecione um banner para ver a prévia e comprar.\nBanners equipados aparecem no seu `/perfil`!\n\n' +
        BANNERS.map(b => `${ownedKeys.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} SC\``).join('\n')
      )
      .setImage(BANNERS[0].imageUrl)
      .setFooter({ text: '✅ = você já possui • Selecione para ver a prévia' });

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_item_sel')
      .setPlaceholder('Selecione um banner para ver')
      .addOptions(BANNERS.map(b =>
        new StringSelectMenuOptionBuilder()
          .setLabel(b.name)
          .setValue(`banner:${b.key}`)
          .setDescription(`${b.price.toLocaleString('pt-BR')} SC${ownedKeys.has(b.key) ? ' ✅' : ''}`)
          .setEmoji(b.emoji ?? '🖼️')
      ));

    return interaction.update({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(select)],
    });
  }
}

// ─── Item detail ──────────────────────────────────────────────────────────────

async function handleItemSel(interaction) {
  const [type, ref] = interaction.values[0].split(':');
  const eco = await getEco(interaction.user.id, interaction.guildId);

  if (type === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: ref } });
    if (!item) return interaction.update({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Cargo não encontrado.')], components: [] });

    const alreadyOwned = await prisma.userPurchase.findUnique({
      where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'role', itemRef: item.roleId } },
    });
    const canAfford = eco.balance >= item.price;

    const embed = new EmbedBuilder()
      .setColor(SHOP_COLOR)
      .setTitle(`👑 ${item.name}`)
      .setDescription(item.description ?? 'Cargo exclusivo do servidor.')
      .addFields(
        { name: '💰 Preço',      value: `**${item.price.toLocaleString('pt-BR')} SC**`,   inline: true },
        { name: '👛 Seu Saldo',  value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true },
      )
      .setFooter({ text: alreadyOwned ? '✅ Você já possui este cargo' : canAfford ? 'Clique em Comprar para confirmar' : '❌ Saldo insuficiente' });

    const buyBtn = new ButtonBuilder()
      .setCustomId(`shop_buy_role:${item.id}`)
      .setLabel(alreadyOwned ? 'Já Possui' : canAfford ? 'Comprar' : 'Sem Saldo')
      .setEmoji(alreadyOwned ? '✅' : '🛒')
      .setStyle(alreadyOwned ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(!!alreadyOwned || !canAfford);

    return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(buyBtn)] });
  }

  if (type === 'banner') {
    const banner = getBanner(ref);
    if (!banner) return interaction.update({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Banner não encontrado.')], components: [] });

    const alreadyOwned = await prisma.userPurchase.findUnique({
      where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner', itemRef: banner.key } },
    });
    const canAfford = eco.balance >= banner.price;

    const embed = new EmbedBuilder()
      .setColor(SHOP_COLOR)
      .setTitle(`${banner.name}`)
      .setDescription(banner.description)
      .setImage(banner.imageUrl)
      .addFields(
        { name: '💰 Preço',     value: `**${banner.price.toLocaleString('pt-BR')} SC**`,  inline: true },
        { name: '👛 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true },
      )
      .setFooter({ text: alreadyOwned ? '✅ Você já possui este banner' : canAfford ? 'Clique em Comprar para confirmar' : '❌ Saldo insuficiente' });

    const buyBtn = new ButtonBuilder()
      .setCustomId(`shop_buy_banner:${banner.key}`)
      .setLabel(alreadyOwned ? 'Já Possui' : canAfford ? 'Comprar Banner' : 'Sem Saldo')
      .setEmoji(alreadyOwned ? '✅' : '🛒')
      .setStyle(alreadyOwned ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(!!alreadyOwned || !canAfford);

    return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(buyBtn)] });
  }
}

// ─── Confirm purchase ─────────────────────────────────────────────────────────

async function handleBuyConfirm(interaction) {
  const ref         = interaction.customId.slice('shop_buy_'.length);
  const [type, key] = ref.split(':');

  const eco = await getEco(interaction.user.id, interaction.guildId);
  let name, price;

  if (type === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: key } });
    if (!item) return interaction.reply({ content: '❌ Item não encontrado.', ephemeral: true });
    name = item.name; price = item.price;
  } else {
    const b = getBanner(key);
    if (!b) return interaction.reply({ content: '❌ Banner não encontrado.', ephemeral: true });
    name = b.name; price = b.price;
  }

  if (eco.balance < price) {
    return interaction.reply({
      content: `❌ **Saldo insuficiente!**\n💰 Você tem **${eco.balance.toLocaleString('pt-BR')} SC** e precisa de **${price.toLocaleString('pt-BR')} SC**.`,
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle('⚠️ Confirmar Compra')
    .setDescription(
      `Você deseja comprar **${name}** por **${price.toLocaleString('pt-BR')} SC**?\n\n` +
      `💰 Saldo atual: **${eco.balance.toLocaleString('pt-BR')} SC**\n` +
      `📉 Saldo após:  **${(eco.balance - price).toLocaleString('pt-BR')} SC**`
    )
    .setFooter({ text: '⚠️ Esta ação não pode ser desfeita!' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`shop_ok_${ref}`).setLabel('Confirmar Compra').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('shop_cancel').setLabel('Cancelar').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );

  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ─── Execute purchase ─────────────────────────────────────────────────────────

async function handleBuyExecute(interaction, client) {
  const ref         = interaction.customId.slice('shop_ok_'.length);
  const [type, key] = ref.split(':');

  const eco = await getEco(interaction.user.id, interaction.guildId);
  let name, price, itemRef, roleId;

  if (type === 'role') {
    const item = await prisma.shopRole.findUnique({ where: { id: key } });
    if (!item) return interaction.update({ content: '❌ Item não encontrado.', embeds: [], components: [] });
    name = item.name; price = item.price; itemRef = item.roleId; roleId = item.roleId;
  } else {
    const b = getBanner(key);
    if (!b) return interaction.update({ content: '❌ Banner não encontrado.', embeds: [], components: [] });
    name = b.name; price = b.price; itemRef = b.key;
  }

  if (eco.balance < price) {
    return interaction.update({ content: '❌ **Saldo insuficiente!**', embeds: [], components: [] });
  }

  const existing = await prisma.userPurchase.findUnique({
    where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: type, itemRef } },
  });
  if (existing) {
    return interaction.update({ content: '✅ Você já possui este item!', embeds: [], components: [] });
  }

  await prisma.economy.update({
    where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    data:  { balance: { decrement: price } },
  });

  await prisma.userPurchase.create({
    data: { userId: interaction.user.id, guildId: interaction.guildId, itemType: type, itemRef },
  });

  if (type === 'role' && roleId) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.add(roleId);
    } catch (e) {
      console.error('[SHOP ROLE ADD]', e.message);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✅ Compra Realizada!')
    .setDescription(
      `Você comprou **${name}** com sucesso!\n` +
      `💰 **${price.toLocaleString('pt-BR')} SC** debitados do seu saldo.` +
      (type === 'banner' ? '\n\n🖼️ Use `/perfil` e clique em **Mudar Banner** para equipar!' : '')
    )
    .setFooter({ text: 'Slow Bot · Loja' })
    .setTimestamp();

  return interaction.update({ embeds: [embed], components: [] });
}

// ─── 🖼️ Vitrine ───────────────────────────────────────────────────────────────

async function handleVitrine(interaction) {
  const owned = await prisma.userPurchase.findMany({
    where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' },
  });
  const ownedKeys = new Set(owned.map(o => o.itemRef));

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('🖼️ Vitrine de Banners')
    .setDescription(
      'Aqui estão todos os banners disponíveis!\nSelecione um para ver a prévia e comprar.\n\n' +
      BANNERS.map(b =>
        `${ownedKeys.has(b.key) ? '✅' : '▫️'} **${b.name}** — \`${b.price.toLocaleString('pt-BR')} SC\`\n> ${b.description}`
      ).join('\n\n')
    )
    .setImage(BANNERS[0].imageUrl)
    .setFooter({ text: `${BANNERS.length} banners • ✅ = você possui • Selecione para ver a prévia` });

  const select = new StringSelectMenuBuilder()
    .setCustomId('shop_vitrine_sel')
    .setPlaceholder('🖼️ Selecione um banner para ver a prévia')
    .addOptions(BANNERS.map(b =>
      new StringSelectMenuOptionBuilder()
        .setLabel(b.name)
        .setValue(b.key)
        .setDescription(`${b.price.toLocaleString('pt-BR')} SC${ownedKeys.has(b.key) ? ' ✅' : ''}`)
        .setEmoji(b.emoji ?? '🖼️')
    ));

  return interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

async function handleVitrineSel(interaction) {
  const key    = interaction.values[0];
  const banner = getBanner(key);
  if (!banner) return interaction.update({ content: '❌ Banner não encontrado.', components: [] });

  const [owned, eco] = await Promise.all([
    prisma.userPurchase.findUnique({
      where: { userId_guildId_itemType_itemRef: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner', itemRef: key } },
    }),
    getEco(interaction.user.id, interaction.guildId),
  ]);

  const ownedKeys = new Set(
    (await prisma.userPurchase.findMany({ where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' } }))
      .map(o => o.itemRef)
  );

  const canAfford = eco.balance >= banner.price;

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle(banner.name)
    .setDescription(banner.description)
    .setImage(banner.imageUrl)
    .addFields(
      { name: '💰 Preço',     value: `**${banner.price.toLocaleString('pt-BR')} SC**`,   inline: true },
      { name: '👛 Seu Saldo', value: `**${eco.balance.toLocaleString('pt-BR')} SC**`,   inline: true },
      { name: '📦 Status',    value: owned ? '✅ Você já possui' : canAfford ? '🟢 Pode comprar' : '🔴 Saldo insuficiente', inline: true },
    )
    .setFooter({ text: '🖼️ Vitrine de Banners • Slow Bot' });

  const rows = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_vitrine_sel')
        .setPlaceholder('Ver outro banner...')
        .addOptions(BANNERS.map(b =>
          new StringSelectMenuOptionBuilder()
            .setLabel(b.name)
            .setValue(b.key)
            .setDescription(`${b.price.toLocaleString('pt-BR')} SC${ownedKeys.has(b.key) ? ' ✅' : ''}`)
            .setEmoji(b.emoji ?? '🖼️')
        ))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_buy_banner:${banner.key}`)
        .setLabel(owned ? 'Já Possui' : !canAfford ? 'Saldo Insuficiente' : 'Comprar Banner')
        .setEmoji(owned ? '✅' : '🛒')
        .setStyle(owned ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(!!owned || !canAfford),
    ),
  ];

  return interaction.update({ embeds: [embed], components: rows });
}

// ─── 🔄 Converter ─────────────────────────────────────────────────────────────

async function handleConverter(interaction) {
  const eco = await getEco(interaction.user.id, interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('🔄 Conversor de SlowCoins')
    .setDescription('Converta suas mensagens e tempo em call para **SlowCoins** e gaste na loja!')
    .addFields(
      {
        name: '📊 Tabela de Conversão',
        value: '> `1.000 mensagens` → **500 SC**\n> `1 hora em call` → **500 SC**',
      },
      {
        name: '💼 Suas Informações',
        value: `> 💰 Saldo: **${eco.balance.toLocaleString('pt-BR')} SC**\n> 🏦 Banco: **${eco.bank.toLocaleString('pt-BR')} SC**`,
      },
    )
    .setFooter({ text: 'Sistema de conversão integrado ao contador de mensagens' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── 💰 Meu Saldo ─────────────────────────────────────────────────────────────

async function handleSaldo(interaction) {
  const [eco, purchases, profile] = await Promise.all([
    getEco(interaction.user.id, interaction.guildId),
    prisma.userPurchase.count({ where: { userId: interaction.user.id, guildId: interaction.guildId } }),
    prisma.userProfile.findUnique({ where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } } }),
  ]);

  const activeBanner = profile?.activeBanner ? getBanner(profile.activeBanner) : null;

  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle('💰 Meu Saldo')
    .setThumbnail(interaction.user.displayAvatarURL({ size: 64 }))
    .addFields(
      { name: '💰 Carteira',        value: `**${eco.balance.toLocaleString('pt-BR')} SC**`, inline: true },
      { name: '🏦 Banco',           value: `**${eco.bank.toLocaleString('pt-BR')} SC**`,   inline: true },
      { name: '📦 Itens na Loja',   value: `**${purchases}** compra(s)`,                   inline: true },
      { name: '🖼️ Banner Ativo',    value: activeBanner ? activeBanner.name : 'Nenhum',   inline: true },
    )
    .setFooter({ text: 'Use /eco saldo para mais detalhes • Use /perfil para ver seu card' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── 🖼️ Mudar Banner (botão no /perfil) ──────────────────────────────────────

async function handleProfileBannerBtn(interaction) {
  const [owned, profile] = await Promise.all([
    prisma.userPurchase.findMany({ where: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner' } }),
    prisma.userProfile.findUnique({ where: { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } } }),
  ]);

  if (!owned.length) {
    return interaction.reply({
      content: '❌ Você não possui nenhum banner!\nUse `/loja painel` e clique em **Vitrine** para ver os banners disponíveis.',
      ephemeral: true,
    });
  }

  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel('🚫 Sem banner (padrão)')
      .setValue('none')
      .setDescription('Remover banner do perfil')
      .setEmoji('🚫'),
    ...owned.map(p => {
      const b = getBanner(p.itemRef);
      if (!b) return null;
      const isActive = profile?.activeBanner === b.key;
      return new StringSelectMenuOptionBuilder()
        .setLabel(b.name)
        .setValue(b.key)
        .setDescription(`${b.price.toLocaleString('pt-BR')} SC${isActive ? ' ✅ Equipado' : ''}`)
        .setEmoji(b.emoji ?? '🖼️');
    }).filter(Boolean),
  ];

  const select = new StringSelectMenuBuilder()
    .setCustomId('profile_banner_sel')
    .setPlaceholder('Selecione um banner para equipar')
    .addOptions(options);

  return interaction.reply({
    content: '🖼️ **Selecione o banner para equipar no seu perfil:**',
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

async function handleProfileBannerSel(interaction) {
  const key          = interaction.values[0];
  const activeBanner = key === 'none' ? null : key;

  await prisma.userProfile.upsert({
    where:  { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
    create: { userId: interaction.user.id, guildId: interaction.guildId, activeBanner },
    update: { activeBanner },
  });

  const msg = activeBanner
    ? `✅ Banner **${getBanner(activeBanner)?.name}** equipado! Use \`/perfil\` para ver o resultado.`
    : '✅ Banner removido do seu perfil.';

  return interaction.update({ content: msg, components: [] });
}
