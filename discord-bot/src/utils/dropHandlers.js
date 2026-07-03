import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import prisma from '../database/client.js';
import { createDrop, getDrop, claimDrop, popPending } from './dropSessions.js';

// ─── Monta o payload V2 do drop (sem barra lateral de cor) ───────────────────

export function buildDropEmbed({ tipo, quantidade, roleId, roleName, descricao, titulo, imagem, dropId }) {
  let premioLinha;
  if (tipo === 'coins')         premioLinha = `🪙 **Prêmio:** 💰 ${Number(quantidade).toLocaleString('pt-BR')} moedas`;
  else if (tipo === 'cargo')    premioLinha = `🪙 **Prêmio:** 👤 ${roleName}`;
  else if (tipo === 'banner')   premioLinha = `🪙 **Prêmio:** 🖼️ ${roleName}`; // roleName reutilizado como bannerName
  else                          premioLinha = `🎀 **Prêmio:** ${descricao}`;

  const tituloFinal = titulo ? `## 🎁 ${titulo}` : '## 🎁 DROP!';

  const lines = [tituloFinal, '', premioLinha];
  if (descricao && tipo !== 'personalizado') lines.push('', `> ${descricao}`);
  lines.push('', '-# Seja o primeiro a clicar no botão para resgatar!');

  const container = new ContainerBuilder();

  if (imagem) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imagem)),
    );
  }

  container
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`drop_claim_${dropId}`)
          .setLabel('Resgatar')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎁'),
      ),
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Gavetinha: admin escolheu o item ────────────────────────────────────────

export async function handleDropItemSelect(interaction) {
  const pending = popPending(interaction.guildId, interaction.user.id);
  if (!pending) {
    return interaction.update({ content: '❌ Sessão expirada. Use `/drop` novamente.', components: [] });
  }

  const value = interaction.values[0]; // formato: "cargo:roleId:nome" ou "banner:key:nome"
  const [tipoItem, ref, ...nameParts] = value.split(':');
  const itemName = nameParts.join(':');

  const { tipo: tipoPendente, titulo, descricao, imagem, channelId } = pending;

  let dropData;
  if (tipoItem === 'cargo') {
    dropData = { guildId: interaction.guildId, tipo: 'cargo', roleId: ref, roleName: itemName, descricao, titulo, imagem };
  } else {
    dropData = { guildId: interaction.guildId, tipo: 'banner', bannerKey: ref, roleName: itemName, descricao, titulo, imagem };
  }

  const dropId = createDrop(dropData);
  const payload = buildDropEmbed({ ...dropData, dropId });

  // Fecha a gavetinha ephemeral
  await interaction.update({ content: '✅ Drop lançado!', components: [] });

  // Envia no canal correto
  const channel = interaction.guild.channels.cache.get(channelId) ?? interaction.channel;
  await channel.send(payload);
}

// ─── Botão: usuário clicou em Resgatar ───────────────────────────────────────

export async function handleDropClaim(interaction) {
  const dropId = interaction.customId.slice('drop_claim_'.length);
  const drop   = getDrop(dropId);

  if (!drop) {
    return interaction.reply({ content: '❌ Este drop não existe ou já expirou.', ephemeral: true });
  }

  const ganhou = claimDrop(dropId, interaction.user.id);
  if (!ganhou) {
    return interaction.reply({ content: '😢 Alguém foi mais rápido! Este drop já foi resgatado.', ephemeral: true });
  }

  // ── Entregar prêmio ─────────────────────────────────────────────────────────
  let premioTexto;
  try {
    if (drop.tipo === 'coins') {
      await prisma.economy.upsert({
        where:  { userId_guildId: { userId: interaction.user.id, guildId: interaction.guildId } },
        create: { userId: interaction.user.id, guildId: interaction.guildId, balance: drop.quantidade },
        update: { balance: { increment: drop.quantidade } },
      });
      premioTexto = `💰 **${Number(drop.quantidade).toLocaleString('pt-BR')} moedas**`;

    } else if (drop.tipo === 'cargo') {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (member && drop.roleId) await member.roles.add(drop.roleId).catch(() => {});
      premioTexto = `👤 **${drop.roleName}**`;

    } else if (drop.tipo === 'banner') {
      // Registra a posse do banner (mesmo fluxo da loja)
      await prisma.userPurchase.upsert({
        where:  { userId_itemType_itemRef: { userId: interaction.user.id, itemType: 'banner', itemRef: drop.bannerKey } },
        create: { userId: interaction.user.id, guildId: interaction.guildId, itemType: 'banner', itemRef: drop.bannerKey },
        update: {},
      }).catch(() => {});
      premioTexto = `🖼️ **${drop.roleName}**`;

    } else {
      premioTexto = `🎀 ${drop.descricao}`;
    }
  } catch (err) {
    console.error('[DROP] Erro ao entregar prêmio:', err);
    premioTexto = drop.descricao ?? '(prêmio)';
  }

  // ── Atualiza embed — botão desativado + quem ganhou ─────────────────────────
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const updatedContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `## ✅ Drop Resgatado!`,
          '',
          `🏆 **${interaction.user.displayName}** foi o mais rápido e ganhou ${premioTexto}`,
          '',
          `-# Resgatado às ${hora}`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`drop_done_${dropId}`)
          .setLabel('Resgatado!')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    );

  await interaction.update({ components: [updatedContainer], flags: MessageFlags.IsComponentsV2 });

  // ── Anúncio público ──────────────────────────────────────────────────────────
  await interaction.channel.send({
    content: `🎉 ${interaction.user} foi o primeiro a resgatar o drop e ganhou ${premioTexto}!`,
  }).catch(() => {});
}
