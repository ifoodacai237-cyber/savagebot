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
  ChannelType,
} from 'discord.js';
import prisma from '../database/client.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(date) {
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusLabel(s) {
  if (s === 'open')     return '🟢 Palpites abertos';
  if (s === 'closed')   return '🔴 Palpites encerrados';
  if (s === 'finished') return '✅ Partida encerrada';
  return '⏳ Aguardando abertura';
}

async function getCopaCfg(guildId) {
  return prisma.copaConfig.findFirst({ where: { guildId } }) ?? null;
}

// ─── Config panel ─────────────────────────────────────────────────────────────

export function buildCopaConfigPayload(cfg) {
  const enabled   = cfg?.enabled ?? false;
  const category  = cfg?.categoryId      ? `<#${cfg.categoryId}>` : '*Não configurado*';
  const anuncio   = cfg?.announcementChannelId ? `<#${cfg.announcementChannelId}>` : '*Não configurado*';
  const eHome     = cfg?.emojiHomeWin    ?? '🏠';
  const eDraw     = cfg?.emojiDraw       ?? '🤝';
  const eAway     = cfg?.emojiAwayWin    ?? '✈️';
  const banner    = cfg?.defaultBannerUrl ? '✅ Configurado' : '*Não configurado*';

  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🏆 Sistema de Palpites — Copa do Mundo\n` +
      `-# Configure o sistema automático de palpites para os jogos da Copa.`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**⚙️ Status do sistema:** ${enabled ? '🟢 **Ativo**' : '🔴 **Inativo**'}\n` +
      `**📂 Categoria dos canais:** ${category}\n` +
      `**📢 Canal de anúncios:** ${anuncio}\n` +
      `**🖼️ Banner padrão:** ${banner}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Emojis personalizados**\n` +
      `${eHome} Vitória casa · ${eDraw} Empate · ${eAway} Vitória fora`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# 💡 Os palpites abrem automaticamente 1 hora antes de cada jogo e fecham no horário do início.`
    )
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('copa_cfg_category').setLabel('Categoria').setStyle(ButtonStyle.Secondary).setEmoji('📂'),
    new ButtonBuilder().setCustomId('copa_cfg_anuncio').setLabel('Canal de Anúncios').setStyle(ButtonStyle.Secondary).setEmoji('📢'),
    new ButtonBuilder().setCustomId('copa_cfg_banner').setLabel('Banner Padrão').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('copa_cfg_emojis').setLabel('Emojis').setStyle(ButtonStyle.Secondary).setEmoji('😀'),
    new ButtonBuilder().setCustomId('copa_cfg_toggle').setLabel(enabled ? 'Desativar Sistema' : 'Ativar Sistema').setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji(enabled ? '🔴' : '🟢'),
  );

  return { components: [container, row1, row2], flags: MessageFlags.IsComponentsV2, ephemeral: true };
}

// ─── Match embed (open predictions) ──────────────────────────────────────────

export function buildMatchPredictionPayload(match, cfg, predCount = 0) {
  const eHome = cfg?.emojiHomeWin ?? '🏠';
  const eDraw = cfg?.emojiDraw    ?? '🤝';
  const eAway = cfg?.emojiAwayWin ?? '✈️';
  const aEmoji = match.teamAEmoji || '';
  const bEmoji = match.teamBEmoji || '';
  const banner  = match.bannerUrl || cfg?.defaultBannerUrl || null;

  const container = new ContainerBuilder();

  if (banner) {
    const gallery = new MediaGalleryBuilder();
    gallery.addItems(new MediaGalleryItemBuilder().setURL(banner));
    container.addMediaGalleryComponents(gallery);
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🏆 Copa do Mundo 2026\n` +
      `**${match.phase}**${match.group ? ` · Grupo ${match.group}` : ''}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${aEmoji} ${match.teamA}  ×  ${match.teamB} ${bEmoji}\n` +
      `📅 **${fmtDate(match.matchDate)}** (Horário de Brasília)\n` +
      (match.stadium ? `🏟️ ${match.stadium}` : '')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🎯 Faça seu palpite!\n` +
      `Clique no resultado que você acredita que vai acontecer.\n` +
      `-# ${predCount} palpite(s) registrado(s) até agora.`
    )
  );

  const isClosed = match.status === 'closed' || match.status === 'finished';

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`copa_pred_${match.id}_home`)
      .setLabel(`${match.teamA}`)
      .setEmoji(eHome)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isClosed),
    new ButtonBuilder()
      .setCustomId(`copa_pred_${match.id}_draw`)
      .setLabel('Empate')
      .setEmoji(eDraw)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isClosed),
    new ButtonBuilder()
      .setCustomId(`copa_pred_${match.id}_away`)
      .setLabel(`${match.teamB}`)
      .setEmoji(eAway)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isClosed),
  );

  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}

// ─── Closed/result embed ──────────────────────────────────────────────────────

export function buildMatchClosedPayload(match, cfg) {
  const container = new ContainerBuilder();
  const banner  = match.bannerUrl || cfg?.defaultBannerUrl || null;
  const aEmoji  = match.teamAEmoji || '';
  const bEmoji  = match.teamBEmoji || '';

  if (banner) {
    const gallery = new MediaGalleryBuilder();
    gallery.addItems(new MediaGalleryItemBuilder().setURL(banner));
    container.addMediaGalleryComponents(gallery);
  }

  const hasResult = match.scoreA !== null && match.scoreB !== null;
  let resultText = '';
  if (hasResult) {
    resultText = `\n\n## 📊 Resultado\n**${match.teamA} ${match.scoreA} × ${match.scoreB} ${match.teamB}**`;
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🏆 Copa do Mundo 2026\n**${match.phase}**${match.group ? ` · Grupo ${match.group}` : ''}`
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${aEmoji} ${match.teamA}  ×  ${match.teamB} ${bEmoji}\n` +
      `📅 **${fmtDate(match.matchDate)}** (Horário de Brasília)` +
      resultText
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`🔒 **Palpites encerrados.**`)
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('copa_pred_disabled').setLabel('Palpites encerrados').setStyle(ButtonStyle.Secondary).setEmoji('🔒').setDisabled(true),
  );

  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}

// ─── Schedule embed (weekly view) ─────────────────────────────────────────────

export function buildSchedulePayload(matches, cfg) {
  const container = new ContainerBuilder();
  const banner = cfg?.defaultBannerUrl || null;

  if (banner) {
    const gallery = new MediaGalleryBuilder();
    gallery.addItems(new MediaGalleryItemBuilder().setURL(banner));
    container.addMediaGalleryComponents(gallery);
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 🏆 Copa do Mundo 2026\n## 📅 Próximos Jogos — Esta Semana`)
  );
  container.addSeparatorComponents(new SeparatorBuilder());

  if (matches.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Nenhuma partida agendada para esta semana.*')
    );
  } else {
    const lines = matches.map(m => {
      const aEmoji = m.teamAEmoji || '';
      const bEmoji = m.teamBEmoji || '';
      return `${aEmoji} **${m.teamA}** × **${m.teamB}** ${bEmoji}\n📅 ${fmtDate(m.matchDate)} · ${m.phase}${m.group ? ` · Gr. ${m.group}` : ''}`;
    });
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join('\n\n'))
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# Os palpites abrem automaticamente 1 hora antes de cada jogo.`)
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Ranking embed ────────────────────────────────────────────────────────────

export async function buildRankingPayload(guildId) {
  const results = await prisma.copaPrediction.groupBy({
    by: ['discordUserId', 'discordUsername'],
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 10,
    where: { points: { not: null } },
  });

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 🏆 Ranking de Palpites — Copa do Mundo 2026`)
  );
  container.addSeparatorComponents(new SeparatorBuilder());

  if (!results || results.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Nenhum palpite pontuado ainda.*')
    );
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    const lines = results.map((r, i) => {
      const medal = medals[i] ?? `**${i + 1}º**`;
      const pts = r._sum.points ?? 0;
      return `${medal} <@${r.discordUserId}> — **${pts} ponto(s)**`;
    });
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join('\n'))
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# Pontuação: Acerto simples = 3pts · Placar exato = 5pts`)
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Interaction handler ──────────────────────────────────────────────────────

export async function handleCopaInteraction(interaction, client) {
  const { customId } = interaction;
  const guildId = interaction.guildId;

  // ── Config buttons ──────────────────────────────────────────────────────────
  if (customId === 'copa_cfg_toggle') {
    const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
    const enabled = !(cfg?.enabled ?? false);
    await prisma.copaConfig.upsert({
      where: { guildId },
      create: { guildId, enabled },
      update: { enabled },
    });
    const updated = await prisma.copaConfig.findFirst({ where: { guildId } });
    return interaction.update(buildCopaConfigPayload(updated));
  }

  if (customId === 'copa_cfg_category') {
    const modal = new ModalBuilder().setCustomId('copa_modal_category').setTitle('📂 Categoria dos Canais');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('value').setLabel('ID da categoria')
          .setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 1234567890123456789')
      )
    );
    return interaction.showModal(modal);
  }

  if (customId === 'copa_cfg_anuncio') {
    const modal = new ModalBuilder().setCustomId('copa_modal_anuncio').setTitle('📢 Canal de Anúncios');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('value').setLabel('ID do canal de anúncios')
          .setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 1234567890123456789')
      )
    );
    return interaction.showModal(modal);
  }

  if (customId === 'copa_cfg_banner') {
    const modal = new ModalBuilder().setCustomId('copa_modal_banner').setTitle('🖼️ Banner Padrão');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('value').setLabel('URL do banner padrão')
          .setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('https://...')
      )
    );
    return interaction.showModal(modal);
  }

  if (customId === 'copa_cfg_emojis') {
    const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
    const modal = new ModalBuilder().setCustomId('copa_modal_emojis').setTitle('😀 Emojis Personalizados');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('home').setLabel('Emoji — Vitória da Casa')
          .setStyle(TextInputStyle.Short).setRequired(true).setValue(cfg?.emojiHomeWin ?? '🏠').setMaxLength(50)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('draw').setLabel('Emoji — Empate')
          .setStyle(TextInputStyle.Short).setRequired(true).setValue(cfg?.emojiDraw ?? '🤝').setMaxLength(50)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('away').setLabel('Emoji — Vitória Visitante')
          .setStyle(TextInputStyle.Short).setRequired(true).setValue(cfg?.emojiAwayWin ?? '✈️').setMaxLength(50)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── Prediction buttons ──────────────────────────────────────────────────────
  if (customId.startsWith('copa_pred_')) {
    const parts = customId.split('_'); // copa_pred_<id>_<type>
    const matchId = parseInt(parts[2], 10);
    const predType = parts[3]; // home | draw | away

    if (!matchId || !['home', 'draw', 'away'].includes(predType)) return;

    const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });
    if (!match) return interaction.reply({ content: '❌ Partida não encontrada.', ephemeral: true });
    if (match.status !== 'open') return interaction.reply({ content: '🔒 Os palpites para esta partida já estão fechados.', ephemeral: true });

    const existing = await prisma.copaPrediction.findUnique({
      where: { matchId_discordUserId: { matchId, discordUserId: interaction.user.id } },
    });

    if (existing) {
      // Update prediction
      await prisma.copaPrediction.update({
        where: { matchId_discordUserId: { matchId, discordUserId: interaction.user.id } },
        data: { prediction: predType, discordUsername: interaction.user.username },
      });
    } else {
      await prisma.copaPrediction.create({
        data: {
          matchId,
          discordUserId: interaction.user.id,
          discordUsername: interaction.user.username,
          prediction: predType,
        },
      });
    }

    const teamLabel = predType === 'home' ? match.teamA : predType === 'away' ? match.teamB : 'Empate';
    const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
    const eHome = cfg?.emojiHomeWin ?? '🏠';
    const eDraw = cfg?.emojiDraw    ?? '🤝';
    const eAway = cfg?.emojiAwayWin ?? '✈️';
    const emoji = predType === 'home' ? eHome : predType === 'draw' ? eDraw : eAway;

    // Update embed with new count
    const predCount = await prisma.copaPrediction.count({ where: { matchId } });

    try {
      await interaction.message.edit(buildMatchPredictionPayload(match, cfg, predCount));
    } catch {}

    return interaction.reply({
      content: `${emoji} Palpite registrado: **${teamLabel}**!\n-# ${existing ? 'Palpite atualizado.' : 'Você pode alterar seu palpite enquanto estiver aberto.'}`,
      ephemeral: true,
    });
  }

  // ── Modals ──────────────────────────────────────────────────────────────────
  if (interaction.isModalSubmit()) {
    if (customId === 'copa_modal_category') {
      const value = interaction.fields.getTextInputValue('value').trim();
      await prisma.copaConfig.upsert({
        where: { guildId },
        create: { guildId, categoryId: value },
        update: { categoryId: value },
      });
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
      await interaction.message?.edit(buildCopaConfigPayload(cfg)).catch(() => {});
      return interaction.reply({ content: '✅ Categoria configurada!', ephemeral: true });
    }

    if (customId === 'copa_modal_anuncio') {
      const value = interaction.fields.getTextInputValue('value').trim();
      await prisma.copaConfig.upsert({
        where: { guildId },
        create: { guildId, announcementChannelId: value },
        update: { announcementChannelId: value },
      });
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
      await interaction.message?.edit(buildCopaConfigPayload(cfg)).catch(() => {});
      return interaction.reply({ content: '✅ Canal de anúncios configurado!', ephemeral: true });
    }

    if (customId === 'copa_modal_banner') {
      const value = (interaction.fields.getTextInputValue('value') || '').trim();
      await prisma.copaConfig.upsert({
        where: { guildId },
        create: { guildId, defaultBannerUrl: value },
        update: { defaultBannerUrl: value },
      });
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
      await interaction.message?.edit(buildCopaConfigPayload(cfg)).catch(() => {});
      return interaction.reply({ content: '✅ Banner padrão atualizado!', ephemeral: true });
    }

    if (customId === 'copa_modal_emojis') {
      const home = interaction.fields.getTextInputValue('home').trim();
      const draw = interaction.fields.getTextInputValue('draw').trim();
      const away = interaction.fields.getTextInputValue('away').trim();
      await prisma.copaConfig.upsert({
        where: { guildId },
        create: { guildId, emojiHomeWin: home, emojiDraw: draw, emojiAwayWin: away },
        update: { emojiHomeWin: home, emojiDraw: draw, emojiAwayWin: away },
      });
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
      await interaction.message?.edit(buildCopaConfigPayload(cfg)).catch(() => {});
      return interaction.reply({ content: `✅ Emojis atualizados: ${home} ${draw} ${away}`, ephemeral: true });
    }

    if (customId === 'copa_modal_add_match') {
      const teamA    = interaction.fields.getTextInputValue('team_a').trim();
      const teamB    = interaction.fields.getTextInputValue('team_b').trim();
      const dateStr  = interaction.fields.getTextInputValue('date').trim();
      const phase    = interaction.fields.getTextInputValue('phase').trim() || 'Fase de Grupos';
      const stadium  = (interaction.fields.getTextInputValue('stadium') || '').trim();

      const matchDate = new Date(dateStr);
      if (isNaN(matchDate.getTime())) {
        return interaction.reply({ content: '❌ Data inválida. Use o formato: `AAAA-MM-DD HH:MM`', ephemeral: true });
      }

      await prisma.copaMatch.create({
        data: { teamA, teamB, matchDate, phase, stadium },
      });

      return interaction.reply({
        content: `✅ Partida **${teamA} × ${teamB}** agendada para **${fmtDate(matchDate)}**!`,
        ephemeral: true,
      });
    }

    if (customId.startsWith('copa_modal_resultado_')) {
      const matchId = parseInt(customId.replace('copa_modal_resultado_', ''), 10);
      const scoreA  = parseInt(interaction.fields.getTextInputValue('score_a').trim(), 10);
      const scoreB  = parseInt(interaction.fields.getTextInputValue('score_b').trim(), 10);

      if (isNaN(scoreA) || isNaN(scoreB)) {
        return interaction.reply({ content: '❌ Placar inválido.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      // Determine winner
      const winner = scoreA > scoreB ? 'home' : scoreB > scoreA ? 'away' : 'draw';

      // Update match
      const match = await prisma.copaMatch.update({
        where: { id: matchId },
        data: { scoreA, scoreB, status: 'finished' },
      });

      // Get all predictions for this match
      const preds = await prisma.copaPrediction.findMany({ where: { matchId } });
      for (const pred of preds) {
        let points = 0;
        if (pred.prediction === winner) points += 3;
        if (pred.scoreA === scoreA && pred.scoreB === scoreB) points += 2; // exact bonus = 5 total
        await prisma.copaPrediction.update({
          where: { id: pred.id },
          data: { points },
        });
      }

      // Update channel message
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
      if (match.channelId && match.messageId) {
        try {
          const ch = await interaction.guild.channels.fetch(match.channelId).catch(() => null);
          if (ch) {
            const msg = await ch.messages.fetch(match.messageId).catch(() => null);
            if (msg) await msg.edit(buildMatchClosedPayload(match, cfg));
          }
        } catch {}
      }

      return interaction.editReply({
        content: `✅ Resultado registrado: **${match.teamA} ${scoreA} × ${scoreB} ${match.teamB}**\n${preds.length} palpites pontuados.`,
      });
    }

    if (customId.startsWith('copa_modal_emojis_match_')) {
      const matchId = parseInt(customId.replace('copa_modal_emojis_match_', ''), 10);
      const teamAEmoji = (interaction.fields.getTextInputValue('emoji_a') || '').trim();
      const teamBEmoji = (interaction.fields.getTextInputValue('emoji_b') || '').trim();
      const bannerUrl  = (interaction.fields.getTextInputValue('banner')  || '').trim();
      await prisma.copaMatch.update({
        where: { id: matchId },
        data: { teamAEmoji, teamBEmoji, ...(bannerUrl ? { bannerUrl } : {}) },
      });
      return interaction.reply({ content: '✅ Emojis/banner da partida atualizados!', ephemeral: true });
    }
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startCopaScheduler(client) {
  console.log('⚽ Copa scheduler iniciado.');

  async function tick() {
    try {
      const guilds = client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        const cfg = await prisma.copaConfig.findFirst({ where: { guildId } });
        if (!cfg?.enabled) continue;

        const now   = new Date();
        const in1h  = new Date(now.getTime() + 60 * 60 * 1000);
        const in7d  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // ── Open predictions (1h before match) ──────────────────────────
        const toOpen = await prisma.copaMatch.findMany({
          where: {
            guildId,
            status: 'pending',
            matchDate: { lte: in1h, gt: now },
          },
        });

        for (const match of toOpen) {
          try {
            const category = cfg.categoryId ? await guild.channels.fetch(cfg.categoryId).catch(() => null) : null;

            const safeName = `palpites-${match.teamA.toLowerCase().replace(/\s/g, '-')}-vs-${match.teamB.toLowerCase().replace(/\s/g, '-')}`;
            const channel = await guild.channels.create({
              name: safeName,
              type: ChannelType.GuildText,
              parent: category?.id ?? null,
              topic: `⚽ Palpites para ${match.teamA} × ${match.teamB} — ${fmtDate(match.matchDate)}`,
            });

            const predCount = await prisma.copaPrediction.count({ where: { matchId: match.id } });
            const msg = await channel.send(buildMatchPredictionPayload(match, cfg, predCount));

            await prisma.copaMatch.update({
              where: { id: match.id },
              data: { status: 'open', channelId: channel.id, messageId: msg.id, guildId },
            });

            // Announce in announcement channel
            if (cfg.announcementChannelId) {
              const anuncio = await guild.channels.fetch(cfg.announcementChannelId).catch(() => null);
              if (anuncio) {
                const aContainer = new ContainerBuilder();
                aContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `# ⚽ Palpites Abertos!\n**${match.teamA} × ${match.teamB}**\n📅 ${fmtDate(match.matchDate)}\n\n👉 Acesse ${channel} para fazer seu palpite!`
                  )
                );
                await anuncio.send({ components: [aContainer], flags: MessageFlags.IsComponentsV2 });
              }
            }

            console.log(`[COPA] Palpites abertos: ${match.teamA} × ${match.teamB} em #${channel.name}`);
          } catch (err) {
            console.error(`[COPA] Erro ao abrir palpites para match ${match.id}:`, err.message);
          }
        }

        // ── Close predictions (at match time) ──────────────────────────
        const toClose = await prisma.copaMatch.findMany({
          where: { guildId, status: 'open', matchDate: { lte: now } },
        });

        for (const match of toClose) {
          try {
            await prisma.copaMatch.update({
              where: { id: match.id },
              data: { status: 'closed' },
            });

            if (match.channelId && match.messageId) {
              const ch = await guild.channels.fetch(match.channelId).catch(() => null);
              if (ch) {
                const msg = await ch.messages.fetch(match.messageId).catch(() => null);
                if (msg) await msg.edit(buildMatchClosedPayload(match, cfg));
              }
            }

            console.log(`[COPA] Palpites fechados: ${match.teamA} × ${match.teamB}`);
          } catch (err) {
            console.error(`[COPA] Erro ao fechar palpites para match ${match.id}:`, err.message);
          }
        }

        // ── Weekly schedule announce (every Sunday at 10:00) ───────────
        const isSunday10 = now.getDay() === 0 && now.getHours() === 10 && now.getMinutes() < 5;
        if (isSunday10 && cfg.announcementChannelId) {
          const upcoming = await prisma.copaMatch.findMany({
            where: { guildId, matchDate: { gte: now, lte: in7d }, status: { in: ['pending', 'open'] } },
            orderBy: { matchDate: 'asc' },
          });

          if (upcoming.length > 0) {
            const anuncio = await guild.channels.fetch(cfg.announcementChannelId).catch(() => null);
            if (anuncio) {
              await anuncio.send(buildSchedulePayload(upcoming, cfg));
            }
          }
        }
      }
    } catch (err) {
      console.error('[COPA SCHEDULER]', err.message);
    }
  }

  // Run every 5 minutes
  setInterval(tick, 5 * 60 * 1000);
  // Run once on startup after 30s
  setTimeout(tick, 30_000);
}
