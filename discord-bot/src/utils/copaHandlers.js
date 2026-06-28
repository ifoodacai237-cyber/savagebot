import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../database/client.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getCopaConfig() {
  return prisma.copaConfig.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

function formatDate(date) {
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

export function buildCopaConfigPayload(cfg) {
  const status = cfg.enabled ? '✅ **Ativo**' : '❌ **Inativo**';
  const channel = cfg.announcementChannelId ? `<#${cfg.announcementChannelId}>` : '`Não configurado`';

  const embed = new EmbedBuilder()
    .setColor(0xF5C518)
    .setTitle('🏆 Copa do Mundo — Painel de Configuração')
    .setDescription(
      `Configure o sistema de apostas da Copa do Mundo.\n` +
      `Membros fazem palpites nos confrontos e ganham pontos!\n\n` +
      `📡 **Sistema:** ${status}\n` +
      `📢 **Canal de Partidas:** ${channel}\n\n` +
      `**🏅 Pontuação:**\n` +
      `> 🏆 Vencedor correto: **${cfg.pointsWin} pts**\n` +
      `> 🤝 Empate correto: **${cfg.pointsDraw} pts**\n` +
      `> 🎯 Placar exato: **${cfg.pointsExact} pts**\n\n` +
      `**🎮 Emojis de Palpite:**\n` +
      `> ${cfg.emojiHomeWin} Vitória do time da casa\n` +
      `> ${cfg.emojiDraw} Empate\n` +
      `> ${cfg.emojiAwayWin} Vitória do visitante`
    )
    .setFooter({ text: 'Fallen Bot · Sistema de Copa' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('copa_cfg_toggle')
      .setLabel(cfg.enabled ? 'Desativar Sistema' : 'Ativar Sistema')
      .setEmoji(cfg.enabled ? '❌' : '✅')
      .setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('copa_cfg_channel')
      .setLabel('Canal de Partidas')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('copa_cfg_pontos')
      .setLabel('Pontuação')
      .setEmoji('🏅')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('copa_cfg_emojis')
      .setLabel('Emojis')
      .setEmoji('🎮')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('copa_partida_nova')
      .setLabel('Nova Partida')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('copa_partida_listar')
      .setLabel('Gerenciar Partidas')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('copa_ranking_admin')
      .setLabel('Ver Ranking')
      .setEmoji('🏆')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2] };
}

// ─── Match Announcement Embed ─────────────────────────────────────────────────

export function buildMatchEmbed(match, cfg, opts = {}) {
  const flagA = match.teamAFlag || '';
  const flagB = match.teamBFlag || '';
  const dateStr = formatDate(match.matchDate);

  const statusMap = {
    pending: '⏳ Aguardando abertura',
    open: '🟢 Apostas abertas',
    closed: '🔴 Apostas encerradas',
    finished: '🏁 Finalizada',
  };

  const embed = new EmbedBuilder()
    .setColor(0xF5C518)
    .setTitle(`🏆 ${flagA} ${match.teamA.toUpperCase()} vs ${match.teamB.toUpperCase()} ${flagB}`)
    .setDescription(
      (opts.showVoting
        ? `## Faça seu palpite!\nClique no botão do seu palpite para participar.\n> ⚠️ Você pode mudar seu palpite a qualquer momento antes do encerramento.\n\n`
        : '') +
      `📅 **Data:** ${dateStr}\n` +
      `🏟️ **Fase:** ${match.phase}${match.group ? ` — Grupo ${match.group}` : ''}` +
      (match.stadium ? `\n🏟️ **Estádio:** ${match.stadium}` : '') +
      `\n📊 **Status:** ${statusMap[match.status] ?? match.status}`
    )
    .setFooter({ text: `ID da partida: ${match.id} · Fallen Bot · Copa` })
    .setTimestamp();

  if (match.bannerUrl) embed.setImage(match.bannerUrl);

  if (match.status === 'finished' && match.scoreA != null && match.scoreB != null) {
    embed.addFields({
      name: '📊 Resultado Final',
      value: `**${flagA} ${match.teamA}** ${match.scoreA} × ${match.scoreB} **${match.teamB} ${flagB}**`,
    });
  }

  return embed;
}

export function buildMatchVotingButtons(match, cfg) {
  const flagA = match.teamAFlag || '';
  const flagB = match.teamBFlag || '';

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`copa_voto_home:${match.id}`)
      .setLabel(`${match.teamA} vence`)
      .setEmoji(flagA || cfg.emojiHomeWin)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`copa_voto_draw:${match.id}`)
      .setLabel('Empate')
      .setEmoji(cfg.emojiDraw)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`copa_voto_away:${match.id}`)
      .setLabel(`${match.teamB} vence`)
      .setEmoji(flagB || cfg.emojiAwayWin)
      .setStyle(ButtonStyle.Danger),
  );
}

// ─── Match list select ────────────────────────────────────────────────────────

async function buildMatchListSelect(guildId) {
  const matches = await prisma.copaMatch.findMany({
    orderBy: { matchDate: 'asc' },
    take: 25,
  });

  if (!matches.length) return null;

  const statusEmoji = { pending: '⏳', open: '🟢', closed: '🔴', finished: '🏁' };

  const select = new StringSelectMenuBuilder()
    .setCustomId('copa_match_sel')
    .setPlaceholder('Selecione uma partida para gerenciar')
    .addOptions(
      matches.map(m =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${m.teamA} vs ${m.teamB}`)
          .setValue(String(m.id))
          .setDescription(`${statusEmoji[m.status] ?? '❓'} ${m.phase} · ${formatDate(m.matchDate)}`)
          .setEmoji(m.teamAFlag || '⚽'),
      ),
    );

  return select;
}

// ─── Main Copa Interaction Handler ────────────────────────────────────────────

export async function handleCopaInteraction(interaction, client) {
  const { customId } = interaction;

  // ── Vote buttons (public) ───────────────────────────────────────────────────
  if (customId.startsWith('copa_voto_')) {
    const parts = customId.split(':');
    const voteType = parts[0].replace('copa_voto_', ''); // home | draw | away
    const matchId = parseInt(parts[1], 10);

    const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
    if (!match) return interaction.reply({ content: '❌ Partida não encontrada.', ephemeral: true });
    if (match.status !== 'open') {
      return interaction.reply({ content: '❌ As apostas para essa partida estão encerradas.', ephemeral: true });
    }

    const predictionLabel = { home: `${match.teamA} vence`, draw: 'Empate', away: `${match.teamB} vence` };
    const predictionEmoji = { home: match.teamAFlag || '🏠', draw: '🤝', away: match.teamBFlag || '✈️' };

    await prisma.copaPrediction.upsert({
      where: { matchId_discordUserId: { matchId, discordUserId: interaction.user.id } },
      create: {
        matchId,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        prediction: voteType,
      },
      update: {
        prediction: voteType,
        discordUsername: interaction.user.username,
        points: null,
      },
    });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`${predictionEmoji[voteType]} Palpite registrado!`)
          .setDescription(
            `Seu palpite: **${predictionLabel[voteType]}**\n\n` +
            `Partida: **${match.teamAFlag || ''} ${match.teamA} vs ${match.teamB} ${match.teamBFlag || ''}**\n` +
            `-# Você pode mudar seu palpite clicando em outro botão antes do encerramento.`,
          ),
      ],
      ephemeral: true,
    });
  }

  // ── Admin-only from here ────────────────────────────────────────────────────
  const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
  if (!isAdmin && customId.startsWith('copa_cfg_')) {
    return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
  }

  // ── Toggle system ───────────────────────────────────────────────────────────
  if (customId === 'copa_cfg_toggle') {
    const cfg = await getCopaConfig();
    const updated = await prisma.copaConfig.update({
      where: { id: 1 },
      data: { enabled: !cfg.enabled },
    });
    return interaction.update(buildCopaConfigPayload(updated));
  }

  // ── Set channel ─────────────────────────────────────────────────────────────
  if (customId === 'copa_cfg_channel') {
    const select = new ChannelSelectMenuBuilder()
      .setCustomId('copa_chansel')
      .setPlaceholder('Selecione o canal de partidas')
      .setChannelTypes([ChannelType.GuildText]);
    const cancelBtn = new ButtonBuilder().setCustomId('copa_cfg_back').setLabel('Voltar').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
    return interaction.update({
      content: '📢 Selecione o canal onde as partidas serão postadas:',
      embeds: [],
      components: [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(cancelBtn)],
    });
  }

  // ── Back to panel ───────────────────────────────────────────────────────────
  if (customId === 'copa_cfg_back') {
    const cfg = await getCopaConfig();
    return interaction.update({ ...buildCopaConfigPayload(cfg), content: null });
  }

  // ── Edit points modal ───────────────────────────────────────────────────────
  if (customId === 'copa_cfg_pontos') {
    const cfg = await getCopaConfig();
    const modal = new ModalBuilder().setCustomId('copa_modal_pontos').setTitle('🏅 Pontuação da Copa');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pts_win').setLabel('Pontos por vencedor correto').setStyle(TextInputStyle.Short)
          .setValue(String(cfg.pointsWin)).setRequired(true).setMinLength(1).setMaxLength(3),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pts_draw').setLabel('Pontos por empate correto').setStyle(TextInputStyle.Short)
          .setValue(String(cfg.pointsDraw)).setRequired(true).setMinLength(1).setMaxLength(3),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pts_exact').setLabel('Pontos por placar exato').setStyle(TextInputStyle.Short)
          .setValue(String(cfg.pointsExact)).setRequired(true).setMinLength(1).setMaxLength(3),
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Edit emojis modal ───────────────────────────────────────────────────────
  if (customId === 'copa_cfg_emojis') {
    const cfg = await getCopaConfig();
    const modal = new ModalBuilder().setCustomId('copa_modal_emojis').setTitle('🎮 Emojis de Palpite');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_home').setLabel('Emoji — Vitória do time da casa').setStyle(TextInputStyle.Short)
          .setValue(cfg.emojiHomeWin).setRequired(true).setMaxLength(50),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_draw').setLabel('Emoji — Empate').setStyle(TextInputStyle.Short)
          .setValue(cfg.emojiDraw).setRequired(true).setMaxLength(50),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('emoji_away').setLabel('Emoji — Vitória do visitante').setStyle(TextInputStyle.Short)
          .setValue(cfg.emojiAwayWin).setRequired(true).setMaxLength(50),
      ),
    );
    return interaction.showModal(modal);
  }

  // ── New match modal ─────────────────────────────────────────────────────────
  if (customId === 'copa_partida_nova') {
    const modal = new ModalBuilder().setCustomId('copa_modal_partida').setTitle('⚽ Nova Partida');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('teams').setLabel('Times (ex: Brasil 🇧🇷 vs Argentina 🇦🇷)').setStyle(TextInputStyle.Short)
          .setPlaceholder('Brasil 🇧🇷 | Argentina 🇦🇷  (separe com |)').setRequired(true).setMaxLength(100),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('match_date').setLabel('Data e hora (DD/MM/AAAA HH:MM)').setStyle(TextInputStyle.Short)
          .setPlaceholder('28/06/2026 15:00').setRequired(true).setMaxLength(20),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('phase').setLabel('Fase | Grupo | Estádio').setStyle(TextInputStyle.Short)
          .setPlaceholder('Fase de Grupos | B | Estádio Lusail').setRequired(false).setMaxLength(150),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('banner_url').setLabel('URL do Banner (opcional)').setStyle(TextInputStyle.Short)
          .setPlaceholder('https://...').setRequired(false).setMaxLength(500),
      ),
    );
    return interaction.showModal(modal);
  }

  // ── List matches ────────────────────────────────────────────────────────────
  if (customId === 'copa_partida_listar') {
    const select = await buildMatchListSelect(interaction.guildId);
    if (!select) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('📭 Nenhuma partida cadastrada ainda.\nUse **Nova Partida** para adicionar.')],
        ephemeral: true,
      });
    }
    const backBtn = new ButtonBuilder().setCustomId('copa_cfg_back').setLabel('Voltar').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
    return interaction.update({
      content: '📋 **Partidas cadastradas** — selecione uma para gerenciar:',
      embeds: [],
      components: [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(backBtn)],
    });
  }

  // ── Ranking admin button ────────────────────────────────────────────────────
  if (customId === 'copa_ranking_admin') {
    return showRanking(interaction);
  }

  // ── Match selected from list ────────────────────────────────────────────────
  if (interaction.isStringSelectMenu() && customId === 'copa_match_sel') {
    const matchId = parseInt(interaction.values[0], 10);
    return showMatchManage(interaction, matchId);
  }

  // ── Match action buttons ────────────────────────────────────────────────────
  if (customId.startsWith('copa_match_')) {
    const [, , action, idStr] = customId.split('_');
    const matchId = parseInt(idStr, 10);

    if (action === 'postar') {
      return postMatch(interaction, matchId, client);
    }
    if (action === 'abrir') {
      await prisma.copaMatch.update({ where: { id: matchId }, data: { status: 'open' } });
      await updateMatchMessage(matchId, client);
      return interaction.update(await buildMatchManagePayload(matchId));
    }
    if (action === 'fechar') {
      await prisma.copaMatch.update({ where: { id: matchId }, data: { status: 'closed' } });
      await updateMatchMessage(matchId, client);
      return interaction.update(await buildMatchManagePayload(matchId));
    }
    if (action === 'resultado') {
      const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
      if (!match) return interaction.reply({ content: '❌ Partida não encontrada.', ephemeral: true });
      const modal = new ModalBuilder().setCustomId(`copa_modal_resultado:${matchId}`).setTitle('🏁 Registrar Resultado');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('score_a').setLabel(`Gols do ${match.teamA}`).setStyle(TextInputStyle.Short)
            .setPlaceholder('0').setRequired(true).setMinLength(1).setMaxLength(2),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('score_b').setLabel(`Gols do ${match.teamB}`).setStyle(TextInputStyle.Short)
            .setPlaceholder('0').setRequired(true).setMinLength(1).setMaxLength(2),
        ),
      );
      return interaction.showModal(modal);
    }
    if (action === 'deletar') {
      const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
      if (!match) return interaction.reply({ content: '❌ Partida não encontrada.', ephemeral: true });
      const confirmBtn = new ButtonBuilder().setCustomId(`copa_match_confirmdel_${matchId}`).setLabel('Confirmar Exclusão').setEmoji('🗑️').setStyle(ButtonStyle.Danger);
      const cancelBtn = new ButtonBuilder().setCustomId(`copa_match_voltar_${matchId}`).setLabel('Cancelar').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
      return interaction.update({
        content: `⚠️ **Tem certeza?** Isso apagará a partida **${match.teamA} vs ${match.teamB}** e todos os palpites.`,
        embeds: [],
        components: [new ActionRowBuilder().addComponents(confirmBtn, cancelBtn)],
      });
    }
    if (action === 'confirmdel') {
      await prisma.copaPrediction.deleteMany({ where: { matchId } });
      await prisma.copaMatch.delete({ where: { id: matchId } });
      const cfg = await getCopaConfig();
      return interaction.update({ ...buildCopaConfigPayload(cfg), content: null });
    }
    if (action === 'voltar') {
      return interaction.update(await buildMatchManagePayload(matchId));
    }
    if (action === 'back') {
      const cfg = await getCopaConfig();
      return interaction.update({ ...buildCopaConfigPayload(cfg), content: null });
    }
    if (action === 'palpites') {
      return showMatchPredictions(interaction, matchId);
    }
  }
}

// ─── Show match manage panel ──────────────────────────────────────────────────

async function buildMatchManagePayload(matchId) {
  const match = await prisma.copaMatch.findUnique({
    where: { id: matchId },
    include: { predictions: true },
  });
  if (!match) return { content: '❌ Partida não encontrada.', embeds: [], components: [] };

  const statusMap = { pending: '⏳ Aguardando', open: '🟢 Apostas Abertas', closed: '🔴 Encerrada', finished: '🏁 Finalizada' };
  const flagA = match.teamAFlag || '';
  const flagB = match.teamBFlag || '';

  const predCount = match.predictions.length;
  const homeCount = match.predictions.filter(p => p.prediction === 'home').length;
  const drawCount = match.predictions.filter(p => p.prediction === 'draw').length;
  const awayCount = match.predictions.filter(p => p.prediction === 'away').length;

  const embed = new EmbedBuilder()
    .setColor(0xF5C518)
    .setTitle(`⚽ ${flagA} ${match.teamA} vs ${match.teamB} ${flagB}`)
    .setDescription(
      `📅 ${formatDate(match.matchDate)}\n` +
      `📊 Status: ${statusMap[match.status] ?? match.status}\n` +
      `🏟️ ${match.phase}${match.group ? ` — Grupo ${match.group}` : ''}` +
      (match.stadium ? `\n🏟️ ${match.stadium}` : '') +
      (match.status === 'finished' ? `\n\n🏁 Resultado: **${match.scoreA} × ${match.scoreB}**` : '') +
      `\n\n**📊 Palpites (${predCount} total):**\n` +
      `> ${flagA || '🏠'} ${match.teamA}: **${homeCount}** palpites\n` +
      `> 🤝 Empate: **${drawCount}** palpites\n` +
      `> ${flagB || '✈️'} ${match.teamB}: **${awayCount}** palpites`,
    )
    .setFooter({ text: `ID: ${match.id} · Fallen Bot · Copa` });

  const posted = match.messageId && match.channelId;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`copa_match_postar_${matchId}`)
      .setLabel(posted ? 'Republicar' : 'Postar Partida')
      .setEmoji('📤')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(match.status === 'finished'),
    new ButtonBuilder()
      .setCustomId(`copa_match_abrir_${matchId}`)
      .setLabel('Abrir Apostas')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success)
      .setDisabled(match.status === 'open' || match.status === 'finished'),
    new ButtonBuilder()
      .setCustomId(`copa_match_fechar_${matchId}`)
      .setLabel('Fechar Apostas')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(match.status !== 'open'),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`copa_match_resultado_${matchId}`)
      .setLabel('Registrar Resultado')
      .setEmoji('🏁')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(match.status === 'pending'),
    new ButtonBuilder()
      .setCustomId(`copa_match_palpites_${matchId}`)
      .setLabel('Ver Palpites')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`copa_match_deletar_${matchId}`)
      .setLabel('Deletar')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`copa_match_back_${matchId}`)
      .setLabel('Voltar')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2], content: null };
}

async function showMatchManage(interaction, matchId) {
  const payload = await buildMatchManagePayload(matchId);
  return interaction.update(payload);
}

// ─── Post match to channel ────────────────────────────────────────────────────

async function postMatch(interaction, matchId, client) {
  const cfg = await getCopaConfig();
  const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
  if (!match) return interaction.reply({ content: '❌ Partida não encontrada.', ephemeral: true });

  const channelId = cfg.announcementChannelId;
  if (!channelId) {
    return interaction.reply({ content: '❌ Configure o canal de partidas no painel primeiro.', ephemeral: true });
  }

  const channel = interaction.guild.channels.cache.get(channelId)
    ?? await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return interaction.reply({ content: '❌ Canal não encontrado. Reconfigure no painel.', ephemeral: true });
  }

  // Delete old message if exists
  if (match.messageId && match.channelId) {
    try {
      const oldCh = interaction.guild.channels.cache.get(match.channelId);
      if (oldCh) {
        const oldMsg = await oldCh.messages.fetch(match.messageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }
    } catch {}
  }

  const embed = buildMatchEmbed(match, cfg, { showVoting: match.status === 'open' });
  const buttons = buildMatchVotingButtons(match, cfg);

  const newStatus = match.status === 'pending' ? 'open' : match.status;
  const updatedMatch = await prisma.copaMatch.update({
    where: { id: matchId },
    data: { status: newStatus, channelId: '', messageId: '' },
  });

  const msg = await channel.send({ embeds: [embed], components: [buttons] });

  await prisma.copaMatch.update({
    where: { id: matchId },
    data: { channelId: channel.id, messageId: msg.id, status: 'open' },
  });

  return interaction.update(await buildMatchManagePayload(matchId));
}

// ─── Update match message in channel ─────────────────────────────────────────

export async function updateMatchMessage(matchId, client) {
  try {
    const cfg = await getCopaConfig();
    const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
    if (!match || !match.messageId || !match.channelId) return;

    const ch = await client.channels.fetch(match.channelId).catch(() => null);
    if (!ch) return;
    const msg = await ch.messages.fetch(match.messageId).catch(() => null);
    if (!msg) return;

    const embed = buildMatchEmbed(match, cfg, { showVoting: match.status === 'open' });
    const buttons = buildMatchVotingButtons(match, cfg);

    const disabledButtons = new ActionRowBuilder().addComponents(
      buttons.components.map(b => ButtonBuilder.from(b.toJSON()).setDisabled(match.status !== 'open')),
    );

    await msg.edit({ embeds: [embed], components: [disabledButtons] });
  } catch (e) {
    console.error('[COPA] updateMatchMessage:', e?.message ?? e);
  }
}

// ─── Show predictions for a match ────────────────────────────────────────────

async function showMatchPredictions(interaction, matchId) {
  const match = await prisma.copaMatch.findUnique({
    where: { id: matchId },
    include: { predictions: { orderBy: { createdAt: 'asc' } } },
  });
  if (!match) return interaction.reply({ content: '❌ Partida não encontrada.', ephemeral: true });

  const flagA = match.teamAFlag || '🏠';
  const flagB = match.teamBFlag || '✈️';

  const homePreds = match.predictions.filter(p => p.prediction === 'home');
  const drawPreds = match.predictions.filter(p => p.prediction === 'draw');
  const awayPreds = match.predictions.filter(p => p.prediction === 'away');

  const fmt = (arr) => arr.length
    ? arr.slice(0, 10).map(p => `<@${p.discordUserId}>${p.points != null ? ` (+${p.points}pts)` : ''}`).join(', ')
      + (arr.length > 10 ? ` e mais ${arr.length - 10}...` : '')
    : '*Nenhum*';

  const embed = new EmbedBuilder()
    .setColor(0xF5C518)
    .setTitle(`📊 Palpites — ${match.teamA} vs ${match.teamB}`)
    .addFields(
      { name: `${flagA} ${match.teamA} vence (${homePreds.length})`, value: fmt(homePreds) },
      { name: `🤝 Empate (${drawPreds.length})`, value: fmt(drawPreds) },
      { name: `${flagB} ${match.teamB} vence (${awayPreds.length})`, value: fmt(awayPreds) },
    )
    .setFooter({ text: `Total: ${match.predictions.length} palpites · Fallen Bot` });

  const backBtn = new ButtonBuilder().setCustomId(`copa_match_voltar_${matchId}`).setLabel('Voltar').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
  return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(backBtn)], content: null });
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

async function showRanking(interaction) {
  const predictions = await prisma.copaPrediction.findMany({
    where: { points: { not: null } },
  });

  if (!predictions.length) {
    const embed = new EmbedBuilder()
      .setColor(0xF5C518)
      .setTitle('🏆 Ranking de Palpites')
      .setDescription('Nenhuma partida finalizada ainda. O ranking aparecerá aqui após os primeiros resultados!');
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const totals = {};
  for (const p of predictions) {
    if (!totals[p.discordUserId]) totals[p.discordUserId] = { username: p.discordUsername, points: 0, hits: 0 };
    totals[p.discordUserId].points += p.points ?? 0;
    if ((p.points ?? 0) > 0) totals[p.discordUserId].hits++;
  }

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 15);

  const medals = ['🥇', '🥈', '🥉'];
  const lines = sorted.map(([userId, data], i) =>
    `${medals[i] ?? `**${i + 1}.**`} <@${userId}> — **${data.points} pts** (${data.hits} acertos)`,
  );

  const embed = new EmbedBuilder()
    .setColor(0xF5C518)
    .setTitle('🏆 Ranking de Palpites — Copa')
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Fallen Bot · Copa · Ranking' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: false });
}

// ─── Modal Handlers ───────────────────────────────────────────────────────────

export async function handleCopaModal(interaction, client) {
  const { customId } = interaction;

  // ── Save points config ──────────────────────────────────────────────────────
  if (customId === 'copa_modal_pontos') {
    const ptsWin = parseInt(interaction.fields.getTextInputValue('pts_win'), 10);
    const ptsDraw = parseInt(interaction.fields.getTextInputValue('pts_draw'), 10);
    const ptsExact = parseInt(interaction.fields.getTextInputValue('pts_exact'), 10);

    if (isNaN(ptsWin) || isNaN(ptsDraw) || isNaN(ptsExact)) {
      return interaction.reply({ content: '❌ Valores inválidos. Use apenas números.', ephemeral: true });
    }

    const updated = await prisma.copaConfig.update({
      where: { id: 1 },
      data: { pointsWin: ptsWin, pointsDraw: ptsDraw, pointsExact: ptsExact },
    });
    return interaction.update({ ...buildCopaConfigPayload(updated), content: null });
  }

  // ── Save emojis config ──────────────────────────────────────────────────────
  if (customId === 'copa_modal_emojis') {
    const emojiHome = interaction.fields.getTextInputValue('emoji_home').trim();
    const emojiDraw = interaction.fields.getTextInputValue('emoji_draw').trim();
    const emojiAway = interaction.fields.getTextInputValue('emoji_away').trim();

    const updated = await prisma.copaConfig.update({
      where: { id: 1 },
      data: { emojiHomeWin: emojiHome, emojiDraw: emojiDraw, emojiAwayWin: emojiAway },
    });
    return interaction.update({ ...buildCopaConfigPayload(updated), content: null });
  }

  // ── New match ───────────────────────────────────────────────────────────────
  if (customId === 'copa_modal_partida') {
    const teamsRaw = interaction.fields.getTextInputValue('teams');
    const dateRaw = interaction.fields.getTextInputValue('match_date').trim();
    const phaseRaw = interaction.fields.getTextInputValue('phase').trim();
    const bannerUrl = interaction.fields.getTextInputValue('banner_url').trim();

    // Parse teams: "Brasil 🇧🇷 | Argentina 🇦🇷"
    const teamParts = teamsRaw.split('|').map(s => s.trim());
    if (teamParts.length < 2) {
      return interaction.reply({
        content: '❌ Formato inválido. Use: `Nome Time A 🏳️ | Nome Time B 🏳️`\nExemplo: `Brasil 🇧🇷 | Argentina 🇦🇷`',
        ephemeral: true,
      });
    }

    // Extract flag emoji from team string
    const extractFlag = (str) => {
      const match = str.match(/(\p{Emoji_Presentation}|\p{Regional_Indicator}{2}|\uD83C[\uDDE6-\uDDFF]{2})/u);
      return match ? match[0] : '';
    };
    const teamA = teamParts[0].replace(/\p{Regional_Indicator}{2}/u, '').replace(/(\p{Emoji_Presentation})/gu, '').trim();
    const teamB = teamParts[1].replace(/\p{Regional_Indicator}{2}/u, '').replace(/(\p{Emoji_Presentation})/gu, '').trim();
    const flagA = extractFlag(teamParts[0]);
    const flagB = extractFlag(teamParts[1]);

    // Parse date: DD/MM/AAAA HH:MM
    const dateParts = dateRaw.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (!dateParts) {
      return interaction.reply({
        content: '❌ Data inválida. Use o formato `DD/MM/AAAA HH:MM`. Ex: `28/06/2026 15:00`',
        ephemeral: true,
      });
    }
    const [, day, month, year, hour, min] = dateParts;
    const matchDate = new Date(`${year}-${month}-${day}T${hour}:${min}:00-03:00`);
    if (isNaN(matchDate.getTime())) {
      return interaction.reply({ content: '❌ Data inválida.', ephemeral: true });
    }

    // Parse phase|group|stadium
    let phase = 'Fase de Grupos', group = '', stadium = '';
    if (phaseRaw) {
      const phaseParts = phaseRaw.split('|').map(s => s.trim());
      phase = phaseParts[0] || phase;
      group = phaseParts[1] || '';
      stadium = phaseParts[2] || '';
    }

    const match = await prisma.copaMatch.create({
      data: {
        teamA: teamA || teamParts[0],
        teamB: teamB || teamParts[1],
        teamAFlag: flagA,
        teamBFlag: flagB,
        matchDate,
        phase,
        group,
        stadium,
        bannerUrl: bannerUrl || '',
      },
    });

    const cfg = await getCopaConfig();
    const payload = buildCopaConfigPayload(cfg);

    return interaction.update({
      ...payload,
      content: `✅ Partida **${match.teamA} vs ${match.teamB}** criada! (ID: \`${match.id}\`)\nUse **Gerenciar Partidas** para postá-la.`,
    });
  }

  // ── Register result ─────────────────────────────────────────────────────────
  if (customId.startsWith('copa_modal_resultado:')) {
    const matchId = parseInt(customId.split(':')[1], 10);
    const scoreA = parseInt(interaction.fields.getTextInputValue('score_a'), 10);
    const scoreB = parseInt(interaction.fields.getTextInputValue('score_b'), 10);

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      return interaction.reply({ content: '❌ Placar inválido. Use apenas números inteiros.', ephemeral: true });
    }

    const match = await prisma.copaMatch.update({
      where: { id: matchId },
      data: { scoreA, scoreB, status: 'finished' },
      include: { predictions: true },
    });

    const cfg = await getCopaConfig();

    // Determine correct prediction
    let correctPrediction;
    if (scoreA > scoreB) correctPrediction = 'home';
    else if (scoreA < scoreB) correctPrediction = 'away';
    else correctPrediction = 'draw';

    // Award points
    const updates = match.predictions.map(async (pred) => {
      let pts = 0;
      if (pred.prediction === correctPrediction) {
        pts = correctPrediction === 'draw' ? cfg.pointsDraw : cfg.pointsWin;
      }
      return prisma.copaPrediction.update({
        where: { id: pred.id },
        data: { points: pts },
      });
    });
    await Promise.all(updates);

    // Update match message
    await updateMatchMessage(matchId, client);

    const hitsCount = match.predictions.filter(p => p.prediction === correctPrediction).length;

    return interaction.update({
      ...await buildMatchManagePayload(matchId),
      content: `✅ Resultado registrado: **${match.teamA} ${scoreA} × ${scoreB} ${match.teamB}**\n🏆 **${hitsCount}** membro(s) acertaram!`,
    });
  }
}

// ─── Channel select handler ───────────────────────────────────────────────────

export async function handleCopaChannelSelect(interaction) {
  const channelId = interaction.values[0];
  const updated = await prisma.copaConfig.update({
    where: { id: 1 },
    data: { announcementChannelId: channelId },
  });
  return interaction.update({ ...buildCopaConfigPayload(updated), content: null });
}
