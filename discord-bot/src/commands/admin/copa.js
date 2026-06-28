import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';
import {
  buildCopaConfigPayload,
  buildRankingPayload,
  buildSchedulePayload,
  buildMatchPredictionPayload,
  buildMatchClosedPayload,
} from '../../utils/copaHandlers.js';

function fmtDate(date) {
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('copa')
    .setDescription('Sistema de palpites da Copa do Mundo 2026')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup(g => g
      .setName('partida')
      .setDescription('Gerenciar partidas da Copa')
      .addSubcommand(s => s.setName('adicionar').setDescription('Adicionar uma partida'))
      .addSubcommand(s => s
        .setName('listar')
        .setDescription('Listar partidas agendadas')
        .addStringOption(o => o.setName('fase').setDescription('Filtrar por fase').setRequired(false))
      )
      .addSubcommand(s => s
        .setName('remover')
        .setDescription('Remover uma partida')
        .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))
      )
      .addSubcommand(s => s
        .setName('abrir')
        .setDescription('Abrir palpites manualmente para uma partida')
        .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))
      )
      .addSubcommand(s => s
        .setName('fechar')
        .setDescription('Fechar palpites manualmente para uma partida')
        .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))
      )
      .addSubcommand(s => s
        .setName('resultado')
        .setDescription('Registrar resultado de uma partida e calcular pontos')
        .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))
      )
      .addSubcommand(s => s
        .setName('emojis')
        .setDescription('Configurar emojis/banner de uma partida específica')
        .addIntegerOption(o => o.setName('id').setDescription('ID da partida').setRequired(true))
      )
    )
    .addSubcommand(s => s.setName('painel').setDescription('Painel de configuração do sistema'))
    .addSubcommand(s => s.setName('ranking').setDescription('Ver ranking de palpites'))
    .addSubcommand(s => s.setName('agenda').setDescription('Ver agenda da semana (postar no canal)')),

  name: 'copa',

  async execute(interaction) {
    const sub   = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);

    // ── Painel de configuração ───────────────────────────────────────────────
    if (sub === 'painel') {
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId: interaction.guildId } });
      return interaction.reply(buildCopaConfigPayload(cfg));
    }

    // ── Ranking ──────────────────────────────────────────────────────────────
    if (sub === 'ranking') {
      const payload = await buildRankingPayload(interaction.guildId);
      return interaction.reply({ ...payload, ephemeral: false });
    }

    // ── Agenda semanal ───────────────────────────────────────────────────────
    if (sub === 'agenda') {
      const now  = new Date();
      const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const matches = await prisma.copaMatch.findMany({
        where: { guildId: interaction.guildId, matchDate: { gte: now, lte: in7d }, status: { in: ['pending', 'open'] } },
        orderBy: { matchDate: 'asc' },
      });
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId: interaction.guildId } });
      return interaction.reply({ ...buildSchedulePayload(matches, cfg), ephemeral: false });
    }

    // ── Partida: adicionar ───────────────────────────────────────────────────
    if (group === 'partida' && sub === 'adicionar') {
      const modal = new ModalBuilder().setCustomId('copa_modal_add_match').setTitle('⚽ Adicionar Partida');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('team_a').setLabel('Time da Casa').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: Brasil')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('team_b').setLabel('Time Visitante').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: Argentina')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('date').setLabel('Data e Hora (AAAA-MM-DD HH:MM)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('2026-07-01 18:00')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('phase').setLabel('Fase (Ex: Oitavas, Quartas...)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Fase de Grupos')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('stadium').setLabel('Estádio (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('MetLife Stadium')
        ),
      );
      return interaction.showModal(modal);
    }

    // ── Partida: listar ──────────────────────────────────────────────────────
    if (group === 'partida' && sub === 'listar') {
      const fase = interaction.options.getString('fase');
      const matches = await prisma.copaMatch.findMany({
        where: {
          guildId: interaction.guildId,
          ...(fase ? { phase: { contains: fase, mode: 'insensitive' } } : {}),
        },
        orderBy: { matchDate: 'asc' },
        take: 20,
      });

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 📋 Partidas Agendadas — Copa 2026\n${fase ? `Filtro: *${fase}*` : ''}`)
      );
      container.addSeparatorComponents(new SeparatorBuilder());

      if (matches.length === 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent('*Nenhuma partida cadastrada.*'));
      } else {
        const lines = matches.map(m => {
          const statusIcon = m.status === 'open' ? '🟢' : m.status === 'closed' ? '🔴' : m.status === 'finished' ? '✅' : '⏳';
          return `\`#${m.id}\` ${statusIcon} **${m.teamA} × ${m.teamB}** — ${fmtDate(m.matchDate)}\n-# ${m.phase}${m.group ? ` · Gr. ${m.group}` : ''}${m.stadium ? ` · ${m.stadium}` : ''}`;
        });
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n\n')));
      }

      container.addSeparatorComponents(new SeparatorBuilder());
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Use \`/copa partida adicionar\` para cadastrar novas partidas.`)
      );

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
    }

    // ── Partida: remover ─────────────────────────────────────────────────────
    if (group === 'partida' && sub === 'remover') {
      const id = interaction.options.getInteger('id');
      const match = await prisma.copaMatch.findUnique({ where: { id } });
      if (!match) return interaction.reply({ content: `❌ Partida #${id} não encontrada.`, ephemeral: true });

      await prisma.copaMatch.delete({ where: { id } });
      return interaction.reply({
        content: `✅ Partida **${match.teamA} × ${match.teamB}** (#${id}) removida.`,
        ephemeral: true,
      });
    }

    // ── Partida: abrir manualmente ───────────────────────────────────────────
    if (group === 'partida' && sub === 'abrir') {
      const id = interaction.options.getInteger('id');
      const match = await prisma.copaMatch.findUnique({ where: { id } });
      if (!match) return interaction.reply({ content: `❌ Partida #${id} não encontrada.`, ephemeral: true });
      if (match.status === 'open') return interaction.reply({ content: '⚠️ Esta partida já está com palpites abertos.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const cfg = await prisma.copaConfig.findFirst({ where: { guildId: interaction.guildId } });

      const category = cfg?.categoryId ? await interaction.guild.channels.fetch(cfg.categoryId).catch(() => null) : null;
      const safeName = `palpites-${match.teamA.toLowerCase().replace(/\s+/g, '-')}-vs-${match.teamB.toLowerCase().replace(/\s+/g, '-')}`;

      let channel;
      if (match.channelId) {
        channel = await interaction.guild.channels.fetch(match.channelId).catch(() => null);
      }
      if (!channel) {
        channel = await interaction.guild.channels.create({
          name: safeName,
          parent: category?.id ?? null,
          topic: `⚽ Palpites — ${match.teamA} × ${match.teamB}`,
        });
      }

      const predCount = await prisma.copaPrediction.count({ where: { matchId: id } });
      const msg = await channel.send(buildMatchPredictionPayload(match, cfg, predCount));

      await prisma.copaMatch.update({
        where: { id },
        data: { status: 'open', channelId: channel.id, messageId: msg.id, guildId: interaction.guildId },
      });

      return interaction.editReply({
        content: `✅ Palpites abertos para **${match.teamA} × ${match.teamB}** em ${channel}!`,
      });
    }

    // ── Partida: fechar manualmente ──────────────────────────────────────────
    if (group === 'partida' && sub === 'fechar') {
      const id = interaction.options.getInteger('id');
      const match = await prisma.copaMatch.findUnique({ where: { id } });
      if (!match) return interaction.reply({ content: `❌ Partida #${id} não encontrada.`, ephemeral: true });
      if (match.status === 'closed' || match.status === 'finished') {
        return interaction.reply({ content: '⚠️ Esta partida já está fechada.', ephemeral: true });
      }

      const cfg = await prisma.copaConfig.findFirst({ where: { guildId: interaction.guildId } });
      const updated = await prisma.copaMatch.update({ where: { id }, data: { status: 'closed' } });

      if (match.channelId && match.messageId) {
        try {
          const ch = await interaction.guild.channels.fetch(match.channelId).catch(() => null);
          if (ch) {
            const msg = await ch.messages.fetch(match.messageId).catch(() => null);
            if (msg) await msg.edit(buildMatchClosedPayload(updated, cfg));
          }
        } catch {}
      }

      return interaction.reply({
        content: `🔒 Palpites fechados para **${match.teamA} × ${match.teamB}**.`,
        ephemeral: true,
      });
    }

    // ── Partida: resultado ───────────────────────────────────────────────────
    if (group === 'partida' && sub === 'resultado') {
      const id = interaction.options.getInteger('id');
      const match = await prisma.copaMatch.findUnique({ where: { id } });
      if (!match) return interaction.reply({ content: `❌ Partida #${id} não encontrada.`, ephemeral: true });

      const modal = new ModalBuilder().setCustomId(`copa_modal_resultado_${id}`).setTitle(`⚽ Resultado: ${match.teamA} × ${match.teamB}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('score_a').setLabel(`Gols de ${match.teamA}`).setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 2')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('score_b').setLabel(`Gols de ${match.teamB}`).setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 1')
        ),
      );
      return interaction.showModal(modal);
    }

    // ── Partida: emojis ──────────────────────────────────────────────────────
    if (group === 'partida' && sub === 'emojis') {
      const id = interaction.options.getInteger('id');
      const match = await prisma.copaMatch.findUnique({ where: { id } });
      if (!match) return interaction.reply({ content: `❌ Partida #${id} não encontrada.`, ephemeral: true });

      const modal = new ModalBuilder().setCustomId(`copa_modal_emojis_match_${id}`).setTitle(`🎨 ${match.teamA} × ${match.teamB}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('emoji_a').setLabel(`Emoji de ${match.teamA}`).setStyle(TextInputStyle.Short).setRequired(false).setValue(match.teamAEmoji ?? '').setMaxLength(50)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('emoji_b').setLabel(`Emoji de ${match.teamB}`).setStyle(TextInputStyle.Short).setRequired(false).setValue(match.teamBEmoji ?? '').setMaxLength(50)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('banner').setLabel('URL do Banner (deixe vazio para usar padrão)').setStyle(TextInputStyle.Short).setRequired(false).setValue(match.bannerUrl ?? '')
        ),
      );
      return interaction.showModal(modal);
    }
  },

  async executePrefix(message) {
    return message.reply({
      embeds: [{ color: 0x9B4FD6, description: '⚽ Use `/copa painel` para configurar o sistema de palpites da Copa.' }],
    });
  },
};
