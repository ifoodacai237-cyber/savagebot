/**
 * /monitor — painel de controle do monitor de usernames
 * Comandos disponíveis:
 *   /monitor status    — estatísticas do monitor
 *   /monitor pausar    — para o monitor
 *   /monitor retomar   — reinicia o monitor
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { startMonitor, stopMonitor, getMonitorStats } from '../../utils/usernameMonitor.js';
import { getTokenPoolStatus } from '../../utils/checker.js';

const monitor = {
  data: new SlashCommandBuilder()
    .setName('monitor')
    .setDescription('Controla o monitor automático de usernames 🤖')
    .setDefaultMemberPermissions(0x8) // ADMINISTRATOR
    .addSubcommand(s =>
      s.setName('status')
        .setDescription('Mostra estatísticas do monitor'))
    .addSubcommand(s =>
      s.setName('pausar')
        .setDescription('Para o monitor automático'))
    .addSubcommand(s =>
      s.setName('retomar')
        .setDescription('Reinicia o monitor automático')),

  name: 'monitor',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      await interaction.deferReply({ flags: 64 });
      const stats = getMonitorStats();
      const pool  = getTokenPoolStatus();

      const uptime = stats.startedAt
        ? Math.floor((Date.now() - new Date(stats.startedAt).getTime()) / 1000)
        : 0;

      const uptimeFmt = uptime < 60
        ? `${uptime}s`
        : uptime < 3600
          ? `${Math.floor(uptime / 60)}min ${uptime % 60}s`
          : `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}min`;

      const rate = uptime > 0 ? ((stats.checked / uptime) * 60).toFixed(1) : '0';

      const tokenLine = pool.total === 0
        ? '⚠️ Nenhum — modo tokenless'
        : `${pool.ready} prontos · ${pool.cooling} em cooldown · ${pool.dead} mortos`;

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(stats.running ? 0x57F287 : 0xED4245)
            .setTitle('🤖 Monitor de Usernames')
            .addFields(
              { name: '⚡ Status',       value: stats.running ? '🟢 Ativo' : '🔴 Parado', inline: true },
              { name: '⏱️ Uptime',       value: stats.startedAt ? uptimeFmt : '—',         inline: true },
              { name: '🔍 Checados',     value: stats.checked.toLocaleString('pt-BR'),      inline: true },
              { name: '✅ Encontrados',  value: stats.found.toLocaleString('pt-BR'),        inline: true },
              { name: '⚡ Taxa',         value: `~${rate}/min`,                             inline: true },
              { name: '🔑 Tokens',       value: tokenLine,                                  inline: false },
            )
            .setFooter({ text: 'Use /setup_canal para configurar canais de publicação' }),
        ],
      });
    }

    if (sub === 'pausar') {
      stopMonitor();
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('⏹️ Monitor pausado. Use `/monitor retomar` para reiniciar.'),
        ],
        flags: 64,
      });
    }

    if (sub === 'retomar') {
      const { running } = getMonitorStats();
      if (running) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('⚠️ O monitor já está rodando.')],
          flags: 64,
        });
      }
      startMonitor(client);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription('✅ Monitor retomado! Checando usernames automaticamente.'),
        ],
        flags: 64,
      });
    }
  },
};

export default [monitor];
