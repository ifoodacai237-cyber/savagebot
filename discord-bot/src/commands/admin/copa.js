import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { getCopaConfig, buildCopaConfigPayload, buildMatchEmbed, buildMatchVotingButtons } from '../../utils/copaHandlers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('copa')
    .setDescription('Sistema de apostas da Copa do Mundo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup(g =>
      g.setName('admin').setDescription('Administração da Copa')
        .addSubcommand(s => s.setName('painel').setDescription('Abre o painel de configuração da Copa'))
        .addSubcommand(s =>
          s.setName('resultado')
            .setDescription('Registra o resultado de uma partida')
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))
            .addIntegerOption(o => o.setName('gols_a').setDescription('Gols do time A').setRequired(true).setMinValue(0))
            .addIntegerOption(o => o.setName('gols_b').setDescription('Gols do time B').setRequired(true).setMinValue(0)),
        )
        .addSubcommand(s =>
          s.setName('postar')
            .setDescription('Posta uma partida no canal para apostas')
            .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true)),
        ),
    )
    .addSubcommand(s => s.setName('ranking').setDescription('Ver o ranking de palpites da Copa'))
    .addSubcommand(s => s.setName('minhas-apostas').setDescription('Ver seus palpites da Copa')),

  name: 'copa',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);

    // ── Ranking (público) ───────────────────────────────────────────────────
    if (sub === 'ranking') {
      const predictions = await prisma.copaPrediction.findMany({
        where: { points: { not: null } },
      });

      if (!predictions.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xF5C518)
              .setTitle('🏆 Ranking de Palpites — Copa')
              .setDescription('Nenhuma partida finalizada ainda. O ranking aparecerá aqui após os primeiros resultados!'),
          ],
          ephemeral: true,
        });
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

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xF5C518)
            .setTitle('🏆 Ranking de Palpites — Copa')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Fallen Bot · Copa · Ranking' })
            .setTimestamp(),
        ],
      });
    }

    // ── Minhas Apostas ──────────────────────────────────────────────────────
    if (sub === 'minhas-apostas') {
      const preds = await prisma.copaPrediction.findMany({
        where: { discordUserId: interaction.user.id },
        include: { match: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (!preds.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xF5C518)
              .setTitle('🎯 Meus Palpites')
              .setDescription('Você ainda não fez nenhum palpite. Quando uma partida for postada, clique nos botões para participar!'),
          ],
          ephemeral: true,
        });
      }

      const predLabel = { home: 'Vitória do Time A', draw: 'Empate', away: 'Vitória do Time B' };
      const fields = preds.map(p => {
        const flagA = p.match.teamAFlag || '';
        const flagB = p.match.teamBFlag || '';
        const myPred = p.prediction === 'home'
          ? `${flagA} ${p.match.teamA} vence`
          : p.prediction === 'away'
          ? `${flagB} ${p.match.teamB} vence`
          : '🤝 Empate';

        const result = p.points != null
          ? `${p.points > 0 ? `✅ +${p.points} pts` : '❌ 0 pts'}`
          : '⏳ Aguardando resultado';

        return {
          name: `${flagA} ${p.match.teamA} vs ${p.match.teamB} ${flagB}`,
          value: `Palpite: **${myPred}**\n${result}`,
          inline: true,
        };
      });

      const totalPts = preds.reduce((acc, p) => acc + (p.points ?? 0), 0);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xF5C518)
            .setTitle('🎯 Meus Palpites — Copa')
            .setDescription(`Total de pontos: **${totalPts} pts**`)
            .addFields(fields)
            .setFooter({ text: 'Fallen Bot · Copa' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    // ── Admin commands ──────────────────────────────────────────────────────
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }

    if (group === 'admin') {
      // ── Admin Painel ──────────────────────────────────────────────────────
      if (sub === 'painel') {
        const cfg = await getCopaConfig();
        return interaction.reply({ ...buildCopaConfigPayload(cfg), ephemeral: true });
      }

      // ── Admin Postar ──────────────────────────────────────────────────────
      if (sub === 'postar') {
        const matchId = interaction.options.getInteger('id');
        const cfg = await getCopaConfig();
        const match = await prisma.copaMatch.findUnique({ where: { id: matchId } });

        if (!match) return interaction.reply({ content: `❌ Partida com ID \`${matchId}\` não encontrada.`, ephemeral: true });

        const channelId = cfg.announcementChannelId;
        if (!channelId) return interaction.reply({ content: '❌ Configure o canal no painel (`/copa admin painel`) antes.', ephemeral: true });

        const channel = interaction.guild.channels.cache.get(channelId)
          ?? await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return interaction.reply({ content: '❌ Canal não encontrado. Reconfigure no painel.', ephemeral: true });

        if (match.messageId && match.channelId) {
          try {
            const oldCh = interaction.guild.channels.cache.get(match.channelId);
            if (oldCh) {
              const oldMsg = await oldCh.messages.fetch(match.messageId).catch(() => null);
              if (oldMsg) await oldMsg.delete().catch(() => {});
            }
          } catch {}
        }

        const embed = buildMatchEmbed(match, cfg, { showVoting: true });
        const buttons = buildMatchVotingButtons(match, cfg);
        const msg = await channel.send({ embeds: [embed], components: [buttons] });

        await prisma.copaMatch.update({
          where: { id: matchId },
          data: { channelId: channel.id, messageId: msg.id, status: 'open' },
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setDescription(`✅ Partida **${match.teamA} vs ${match.teamB}** postada em <#${channel.id}>!\nApostas abertas.`),
          ],
          ephemeral: true,
        });
      }

      // ── Admin Resultado ───────────────────────────────────────────────────
      if (sub === 'resultado') {
        const matchId = interaction.options.getInteger('id');
        const scoreA = interaction.options.getInteger('gols_a');
        const scoreB = interaction.options.getInteger('gols_b');
        const cfg = await getCopaConfig();

        const match = await prisma.copaMatch.update({
          where: { id: matchId },
          data: { scoreA, scoreB, status: 'finished' },
          include: { predictions: true },
        }).catch(() => null);

        if (!match) return interaction.reply({ content: `❌ Partida \`${matchId}\` não encontrada.`, ephemeral: true });

        let correctPrediction;
        if (scoreA > scoreB) correctPrediction = 'home';
        else if (scoreA < scoreB) correctPrediction = 'away';
        else correctPrediction = 'draw';

        const updates = match.predictions.map(async (pred) => {
          let pts = 0;
          if (pred.prediction === correctPrediction) {
            pts = correctPrediction === 'draw' ? cfg.pointsDraw : cfg.pointsWin;
          }
          return prisma.copaPrediction.update({ where: { id: pred.id }, data: { points: pts } });
        });
        await Promise.all(updates);

        const { updateMatchMessage } = await import('../../utils/copaHandlers.js');
        await updateMatchMessage(matchId, client);

        const hitsCount = match.predictions.filter(p => p.prediction === correctPrediction).length;
        const flagA = match.teamAFlag || '';
        const flagB = match.teamBFlag || '';

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🏁 Resultado Registrado!')
              .setDescription(
                `**${flagA} ${match.teamA} ${scoreA} × ${scoreB} ${match.teamB} ${flagB}**\n\n` +
                `🏆 **${hitsCount}** membro(s) acertaram o vencedor!\n` +
                `🏅 Pontos distribuídos automaticamente.`,
              ),
          ],
          ephemeral: true,
        });
      }
    }
  },
};
