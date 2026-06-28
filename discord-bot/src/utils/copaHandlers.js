import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../database/client.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flagRow(...btns) {
  return new ActionRowBuilder().addComponents(...btns);
}

function parseDate(str) {
  // Accepts "DD/MM/YYYY HH:MM" or "DD/MM/YYYY"
  const m = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, d, mo, y, h = '00', mi = '00'] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:00-03:00`);
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcPoints(prediction, scoreA, scoreB) {
  if (prediction.scoreA == null || prediction.scoreB == null) return 0;
  const pA = prediction.scoreA, pB = prediction.scoreB;
  if (pA === scoreA && pB === scoreB) return 3;
  const realWinner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'E';
  const predWinner = pA  > pB  ? 'A' : pB  > pA  ? 'B' : 'E';
  return realWinner === predWinner ? 1 : 0;
}

// ─── UI Builders ──────────────────────────────────────────────────────────────

export async function buildCopaMainPayload(guildId, memberId, isAdmin) {
  const [matches, cfg] = await Promise.all([
    prisma.copaMatch.findMany({
      where: { guildId },
      orderBy: { matchDate: 'asc' },
    }),
    prisma.copaConfig.findUnique({ where: { guildId } }),
  ]);

  const open    = matches.filter(m => m.status === 'open');
  const pending = matches.filter(m => m.status === 'pending');
  const done    = matches.filter(m => m.status === 'done').slice(-3);

  const container = new ContainerBuilder();
  container.setAccentColor(0x009B3A); // Verde Brasil

  // Header
  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL('https://i.imgur.com/1234567.png') // placeholder
    ),
  );

  let headerText = '## 🏆 Copa do Mundo 2026 — Palpites\n\n';
  if (open.length > 0) {
    headerText += `**${open.length}** partida(s) abertas para palpite!\n`;
  } else if (pending.length > 0) {
    headerText += `Próxima partida: **${pending[0].teamA}** × **${pending[0].teamB}** (${formatDate(pending[0].matchDate)})\n`;
  } else {
    headerText += 'Nenhuma partida aberta no momento.\n';
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText.trim()));

  // Open matches
  if (open.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('### 🎯 Abertas para Palpite')
    );
    for (const m of open) {
      const myPred = memberId
        ? await prisma.copaPrediction.findUnique({ where: { matchId_discordUserId: { matchId: m.id, discordUserId: memberId } } })
        : null;
      const predInfo = myPred ? ` ✅ **Seu palpite:** ${myPred.scoreA}×${myPred.scoreB}` : ' *(sem palpite)*';
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🏴 **${m.teamA}** × **${m.teamB}**\n📅 ${formatDate(m.matchDate)}${m.phase ? `  •  ${m.phase}` : ''}${predInfo}`
        )
      );
    }
  }

  // Recent results
  if (done.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('### 📋 Resultados Recentes')
    );
    for (const m of done) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `✅ **${m.teamA}** ${m.scoreA ?? '?'}×${m.scoreB ?? '?'} **${m.teamB}**  •  ${formatDate(m.matchDate)}`
        )
      );
    }
  }

  const components = [container];

  // Buttons — predict (one per open match, max 5)
  if (open.length > 0) {
    const row = new ActionRowBuilder();
    for (const m of open.slice(0, 4)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`copa_predict_${m.id}`)
          .setLabel(`🎯 ${m.teamA} × ${m.teamB}`)
          .setStyle(ButtonStyle.Primary)
      );
    }
    components.push(row);
  }

  // Ranking + admin buttons
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('copa_ranking').setLabel('📊 Ranking').setStyle(ButtonStyle.Secondary)
  );
  if (isAdmin) {
    row2.addComponents(
      new ButtonBuilder().setCustomId('copa_admin_add').setLabel('➕ Nova Partida').setStyle(ButtonStyle.Success)
    );
    if (open.length > 0 || pending.length > 0) {
      row2.addComponents(
        new ButtonBuilder().setCustomId('copa_admin_manage').setLabel('⚙️ Gerenciar').setStyle(ButtonStyle.Danger)
      );
    }
  }
  components.push(row2);

  return { components, flags: MessageFlags.IsComponentsV2 };
}

export async function buildRankingPayload(guildId, guild) {
  const predictions = await prisma.copaPrediction.findMany({
    where: { match: { guildId }, points: { not: null } },
    select: { discordUserId: true, discordUsername: true, points: true },
  });

  const totals = {};
  for (const p of predictions) {
    if (!totals[p.discordUserId]) totals[p.discordUserId] = { name: p.discordUsername, pts: 0 };
    totals[p.discordUserId].pts += p.points ?? 0;
  }

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1].pts - a[1].pts)
    .slice(0, 10);

  const container = new ContainerBuilder();
  container.setAccentColor(0xFFD700);

  if (sorted.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## 📊 Ranking\n\nNenhum palpite pontuado ainda.')
    );
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = sorted.map(([uid, d], i) =>
      `${medals[i] ?? `**${i + 1}.**`} ${d.name || `<@${uid}>`} — **${d.pts}** ponto(s)`
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 📊 Ranking — Copa 2026\n\n${lines.join('\n')}`)
    );
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('copa_back').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
  );

  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}

export async function buildManagePayload(guildId) {
  const matches = await prisma.copaMatch.findMany({
    where: { guildId, status: { in: ['open', 'pending'] } },
    orderBy: { matchDate: 'asc' },
    take: 10,
  });

  const container = new ContainerBuilder();
  container.setAccentColor(0xFF4444);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## ⚙️ Gerenciar Partidas\n\nSelecione uma ação para cada partida:')
  );

  const components = [container];

  for (const m of matches.slice(0, 4)) {
    const statusEmoji = m.status === 'open' ? '🟢' : '🟡';
    const info = `${statusEmoji} **${m.teamA}** × **${m.teamB}** (${formatDate(m.matchDate)})`;
    const infoContainer = new ContainerBuilder();
    infoContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(info));
    components.push(infoContainer);

    const row = new ActionRowBuilder();
    if (m.status === 'pending') {
      row.addComponents(
        new ButtonBuilder().setCustomId(`copa_admin_open_${m.id}`).setLabel('🟢 Abrir Palpites').setStyle(ButtonStyle.Success)
      );
    }
    if (m.status === 'open') {
      row.addComponents(
        new ButtonBuilder().setCustomId(`copa_admin_close_${m.id}`).setLabel('🔴 Fechar Palpites').setStyle(ButtonStyle.Danger)
      );
    }
    row.addComponents(
      new ButtonBuilder().setCustomId(`copa_admin_result_${m.id}`).setLabel('✅ Definir Resultado').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`copa_admin_delete_${m.id}`).setLabel('🗑️ Deletar').setStyle(ButtonStyle.Danger)
    );
    components.push(row);
  }

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('copa_back').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
  );
  components.push(backRow);

  return { components, flags: MessageFlags.IsComponentsV2 };
}

export async function buildPredictPayload(matchId, memberId) {
  const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
  if (!match) return null;

  const myPred = memberId
    ? await prisma.copaPrediction.findUnique({ where: { matchId_discordUserId: { matchId, discordUserId: memberId } } })
    : null;

  const container = new ContainerBuilder();
  container.setAccentColor(0x009B3A);

  const predText = myPred
    ? `\n\n✅ **Seu palpite atual:** ${myPred.scoreA}×${myPred.scoreB}`
    : '\n\n*(você ainda não fez palpite)*';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🎯 Palpitar — ${match.teamA} × ${match.teamB}\n\n📅 ${formatDate(match.matchDate)}${match.phase ? `  •  ${match.phase}` : ''}${predText}`
    )
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`copa_open_modal_${matchId}`)
      .setLabel('✏️ Fazer Palpite')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('copa_back').setLabel('⬅️ Voltar').setStyle(ButtonStyle.Secondary)
  );

  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}

// ─── Interaction Handler ──────────────────────────────────────────────────────

export async function handleCopaInteraction(interaction, client) {
  const { customId } = interaction;
  const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
  const guildId = interaction.guildId;

  // ── Back to main panel ────────────────────────────────────────────────────
  if (customId === 'copa_back') {
    await interaction.deferUpdate();
    const payload = await buildCopaMainPayload(guildId, interaction.user.id, isAdmin);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Ranking ───────────────────────────────────────────────────────────────
  if (customId === 'copa_ranking') {
    await interaction.deferUpdate();
    const payload = await buildRankingPayload(guildId, interaction.guild);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Predict button (show match + predict button) ──────────────────────────
  if (customId.startsWith('copa_predict_')) {
    const matchId = parseInt(customId.replace('copa_predict_', ''), 10);
    await interaction.deferUpdate();
    const payload = await buildPredictPayload(matchId, interaction.user.id);
    if (!payload) return interaction.editReply({ content: '❌ Partida não encontrada.', components: [], embeds: [] });
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Open prediction modal ─────────────────────────────────────────────────
  if (customId.startsWith('copa_open_modal_')) {
    const matchId = parseInt(customId.replace('copa_open_modal_', ''), 10);
    const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== 'open') {
      return interaction.reply({ content: '❌ Esta partida não está aberta para palpites.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`copa_modal_${matchId}`)
      .setTitle(`🎯 Palpite — ${match.teamA} × ${match.teamB}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('score_a')
          .setLabel(`Gols de ${match.teamA}`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 2')
          .setMaxLength(2)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('score_b')
          .setLabel(`Gols de ${match.teamB}`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 1')
          .setMaxLength(2)
          .setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Prediction modal submit ───────────────────────────────────────────────
  if (interaction.isModalSubmit() && customId.startsWith('copa_modal_') && !customId.startsWith('copa_modal_admin')) {
    const matchId = parseInt(customId.replace('copa_modal_', ''), 10);
    await interaction.deferUpdate();

    const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== 'open') {
      return interaction.followUp({ content: '❌ Esta partida não está mais aberta.', ephemeral: true });
    }

    const sA = parseInt(interaction.fields.getTextInputValue('score_a'), 10);
    const sB = parseInt(interaction.fields.getTextInputValue('score_b'), 10);

    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0) {
      return interaction.followUp({ content: '❌ Placar inválido. Use números inteiros positivos.', ephemeral: true });
    }

    await prisma.copaPrediction.upsert({
      where: { matchId_discordUserId: { matchId, discordUserId: interaction.user.id } },
      create: {
        matchId,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        prediction: `${sA}x${sB}`,
        scoreA: sA,
        scoreB: sB,
      },
      update: {
        discordUsername: interaction.user.username,
        prediction: `${sA}x${sB}`,
        scoreA: sA,
        scoreB: sB,
        points: null,
      },
    });

    const payload = await buildPredictPayload(matchId, interaction.user.id);
    if (payload) return interaction.editReply({ ...payload, content: null, embeds: [] });
    return interaction.followUp({ content: `✅ Palpite **${sA}×${sB}** salvo!`, ephemeral: true });
  }

  // ── Admin: Add match ──────────────────────────────────────────────────────
  if (customId === 'copa_admin_add') {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const modal = new ModalBuilder()
      .setCustomId('copa_modal_admin_add')
      .setTitle('➕ Nova Partida');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('team_a').setLabel('Time A').setStyle(TextInputStyle.Short).setPlaceholder('Brasil').setRequired(true).setMaxLength(50)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('team_b').setLabel('Time B').setStyle(TextInputStyle.Short).setPlaceholder('Argentina').setRequired(true).setMaxLength(50)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('match_date').setLabel('Data e Hora (DD/MM/AAAA HH:MM)').setStyle(TextInputStyle.Short).setPlaceholder('14/06/2026 18:00').setRequired(true).setMaxLength(20)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('phase').setLabel('Fase (opcional)').setStyle(TextInputStyle.Short).setPlaceholder('Fase de Grupos — Grupo A').setRequired(false).setMaxLength(80)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Admin: Add match modal submit ─────────────────────────────────────────
  if (interaction.isModalSubmit() && customId === 'copa_modal_admin_add') {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    await interaction.deferUpdate();

    const teamA = interaction.fields.getTextInputValue('team_a').trim();
    const teamB = interaction.fields.getTextInputValue('team_b').trim();
    const dateStr = interaction.fields.getTextInputValue('match_date').trim();
    const phase = interaction.fields.getTextInputValue('phase').trim() || 'Fase de Grupos';
    const matchDate = parseDate(dateStr);

    if (!matchDate) {
      return interaction.followUp({ content: '❌ Data inválida. Use o formato DD/MM/AAAA HH:MM (ex: 14/06/2026 18:00).', ephemeral: true });
    }

    await prisma.copaMatch.create({
      data: { guildId, teamA, teamB, matchDate, phase, status: 'pending' },
    });

    const payload = await buildCopaMainPayload(guildId, interaction.user.id, isAdmin);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Admin: Manage panel ───────────────────────────────────────────────────
  if (customId === 'copa_admin_manage') {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    await interaction.deferUpdate();
    const payload = await buildManagePayload(guildId);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Admin: Open predictions ───────────────────────────────────────────────
  if (customId.startsWith('copa_admin_open_')) {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const matchId = parseInt(customId.replace('copa_admin_open_', ''), 10);
    await interaction.deferUpdate();
    await prisma.copaMatch.update({ where: { id: matchId }, data: { status: 'open' } });
    const payload = await buildManagePayload(guildId);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Admin: Close predictions ──────────────────────────────────────────────
  if (customId.startsWith('copa_admin_close_')) {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const matchId = parseInt(customId.replace('copa_admin_close_', ''), 10);
    await interaction.deferUpdate();
    await prisma.copaMatch.update({ where: { id: matchId }, data: { status: 'closed' } });
    const payload = await buildManagePayload(guildId);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Admin: Delete match ───────────────────────────────────────────────────
  if (customId.startsWith('copa_admin_delete_')) {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const matchId = parseInt(customId.replace('copa_admin_delete_', ''), 10);
    await interaction.deferUpdate();
    await prisma.copaMatch.delete({ where: { id: matchId } }).catch(() => {});
    const payload = await buildManagePayload(guildId);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }

  // ── Admin: Set result (open modal) ────────────────────────────────────────
  if (customId.startsWith('copa_admin_result_')) {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const matchId = parseInt(customId.replace('copa_admin_result_', ''), 10);
    const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
    if (!match) return interaction.reply({ content: '❌ Partida não encontrada.', ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId(`copa_modal_admin_result_${matchId}`)
      .setTitle(`✅ Resultado — ${match.teamA} × ${match.teamB}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('score_a').setLabel(`Gols de ${match.teamA}`).setStyle(TextInputStyle.Short).setPlaceholder('2').setRequired(true).setMaxLength(2)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('score_b').setLabel(`Gols de ${match.teamB}`).setStyle(TextInputStyle.Short).setPlaceholder('1').setRequired(true).setMaxLength(2)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Admin: Set result modal submit ────────────────────────────────────────
  if (interaction.isModalSubmit() && customId.startsWith('copa_modal_admin_result_')) {
    if (!isAdmin) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const matchId = parseInt(customId.replace('copa_modal_admin_result_', ''), 10);
    await interaction.deferUpdate();

    const sA = parseInt(interaction.fields.getTextInputValue('score_a'), 10);
    const sB = parseInt(interaction.fields.getTextInputValue('score_b'), 10);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0) {
      return interaction.followUp({ content: '❌ Placar inválido.', ephemeral: true });
    }

    // Update match result
    const match = await prisma.copaMatch.update({
      where: { id: matchId },
      data: { scoreA: sA, scoreB: sB, status: 'done' },
      include: { predictions: true },
    });

    // Calculate points for all predictions
    for (const pred of match.predictions) {
      const pts = calcPoints(pred, sA, sB);
      await prisma.copaPrediction.update({ where: { id: pred.id }, data: { points: pts } });
    }

    // Announce result in configured channel if any
    const cfg = await prisma.copaConfig.findUnique({ where: { guildId } });
    if (cfg?.resultChannelId) {
      const ch = interaction.guild.channels.cache.get(cfg.resultChannelId)
        ?? await interaction.guild.channels.fetch(cfg.resultChannelId).catch(() => null);
      if (ch) {
        const winners = match.predictions.filter(p => calcPoints(p, sA, sB) === 3);
        const halfRight = match.predictions.filter(p => calcPoints(p, sA, sB) === 1);
        let txt = `## ✅ Resultado: ${match.teamA} **${sA}**×**${sB}** ${match.teamB}\n\n`;
        if (winners.length > 0) txt += `🥇 **Placar exato (3 pts):** ${winners.map(p => p.discordUsername || `<@${p.discordUserId}>`).join(', ')}\n`;
        if (halfRight.length > 0) txt += `✔️ **Vencedor certo (1 pt):** ${halfRight.map(p => p.discordUsername || `<@${p.discordUserId}>`).join(', ')}\n`;
        const resultContainer = new ContainerBuilder();
        resultContainer.setAccentColor(0x00AA00);
        resultContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(txt.trim()));
        await ch.send({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    }

    const payload = await buildManagePayload(guildId);
    return interaction.editReply({ ...payload, content: null, embeds: [] });
  }
}

// ─── Slash Command Handler ────────────────────────────────────────────────────

export async function handleCopaCommand(interaction) {
  const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
  const payload = await buildCopaMainPayload(interaction.guildId, interaction.user.id, isAdmin);
  return interaction.reply({ ...payload, ephemeral: true });
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startCopaScheduler(client) {
  // Auto-close matches 5 minutes before kick-off
  setInterval(async () => {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 5 * 60 * 1000); // 5 min from now
      await prisma.copaMatch.updateMany({
        where: { status: 'open', matchDate: { lte: soon } },
        data: { status: 'closed' },
      });
    } catch {}
  }, 60_000); // check every minute
}
