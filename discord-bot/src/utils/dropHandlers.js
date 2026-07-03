import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { getDrop, claimDrop } from './dropSessions.js';
import prisma from '../database/client.js';

export async function handleDropClaim(interaction) {
  const dropId = interaction.customId.slice('drop_claim_'.length);
  const drop   = getDrop(dropId);

  if (!drop) {
    return interaction.reply({
      content: '❌ Este drop não existe ou já expirou.',
      ephemeral: true,
    });
  }

  // Tenta ser o primeiro — operação atômica na memória
  const ganhou = claimDrop(dropId, interaction.user.id);

  if (!ganhou) {
    return interaction.reply({
      content: '😢 Alguém foi mais rápido! Este drop já foi resgatado.',
      ephemeral: true,
    });
  }

  // ── Dar o prêmio ─────────────────────────────────────────────────────────
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
      if (member && drop.roleId) {
        await member.roles.add(drop.roleId).catch(err => console.error('[DROP] Erro ao dar cargo:', err));
      }
      premioTexto = `👤 **${drop.roleName}**`;

    } else {
      premioTexto = `🎀 ${drop.descricao}`;
    }
  } catch (err) {
    console.error('[DROP] Erro ao entregar prêmio:', err);
    premioTexto = drop.descricao ?? '(prêmio)';
  }

  // ── Atualizar a mensagem do drop (botão desativado + quem ganhou) ─────────
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

  await interaction.update({
    components: [updatedContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  // ── Anúncio público no canal ─────────────────────────────────────────────
  await interaction.channel.send({
    content: `🎉 ${interaction.user} foi o primeiro a resgatar o drop e ganhou ${premioTexto}!`,
  }).catch(() => {});
}
