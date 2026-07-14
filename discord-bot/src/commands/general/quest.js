/**
 * /quest — automação de Discord Quests (Orbs)
 *
 *   /quest token      → abre modal seguro para salvar o token do usuário
 *   /quest completar  → roda a automação com o token salvo
 *   /quest status     → mostra quests ativas da conta
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';
import { fetchQuests, runQuests } from '../../utils/questRunner.js';

// ─── Utilitários ──────────────────────────────────────────────────────────────

async function getToken(userId) {
  const row = await prisma.userQuestToken.findUnique({ where: { userId } });
  return row?.token ?? null;
}

// ─── Comando ──────────────────────────────────────────────────────────────────

const quest = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Automatiza Discord Quests para ganhar Orbs 🔮')
    .addSubcommand(s =>
      s.setName('token')
        .setDescription('Salva seu token do Discord para a automação (seguro — só você vê)'))
    .addSubcommand(s =>
      s.setName('completar')
        .setDescription('Completa todas as quests ativas da sua conta automaticamente'))
    .addSubcommand(s =>
      s.setName('status')
        .setDescription('Mostra as quests ativas da sua conta')),

  name: 'quest',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── /quest token → abre modal ─────────────────────────────────────────────
    if (sub === 'token') {
      const modal = new ModalBuilder()
        .setCustomId('quest_token_modal')
        .setTitle('🔑 Seu Token do Discord');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('quest_token_input')
            .setLabel('Cole seu token aqui (só você vê)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('MTEx...')
            .setRequired(true)
            .setMinLength(50),
        ),
      );

      return interaction.showModal(modal);
    }

    // ── /quest status ─────────────────────────────────────────────────────────
    if (sub === 'status') {
      await interaction.deferReply({ flags: 64 });

      const token = await getToken(interaction.user.id);
      if (!token) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ Token não configurado. Use `/quest token` primeiro.'),
          ],
        });
      }

      let quests;
      try {
        quests = await fetchQuests(token);
      } catch (err) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ Erro ao buscar quests: \`${err.message}\`\n\nSeu token pode estar inválido ou expirado. Use \`/quest token\` para atualizar.`),
          ],
        });
      }

      if (quests.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription('📋 Nenhuma quest ativa encontrada na sua conta.'),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x9B4FD6)
        .setTitle('🔮 Quests Ativas')
        .setDescription(quests.map(q => {
          const name      = q.config.messages?.quest_name ?? q.id;
          const taskCfg   = q.config.task_config ?? q.config.task_config_v2;
          const taskName  = Object.keys(taskCfg?.tasks ?? {})[0];
          const target    = taskCfg?.tasks?.[taskName]?.target ?? '?';
          const done      = q.user_status?.progress?.[taskName]?.value ?? 0;
          const pct       = target !== '?' ? Math.floor((done / target) * 100) : '?';
          const expires   = `<t:${Math.floor(new Date(q.config.expires_at).getTime() / 1000)}:R>`;
          return `**${name}**\n┣ Tarefa: \`${taskName}\` — ${done}/${target}s (${pct}%)\n┗ Expira ${expires}`;
        }).join('\n\n'));

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /quest completar ──────────────────────────────────────────────────────
    if (sub === 'completar') {
      await interaction.deferReply({ flags: 64 });

      const token = await getToken(interaction.user.id);
      if (!token) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ Token não configurado. Use `/quest token` primeiro.'),
          ],
        });
      }

      // Aviso inicial
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9B4FD6)
            .setTitle('🔮 Quest Automator iniciado')
            .setDescription('Buscando quests ativas...\n\nAs atualizações chegarão por DM.'),
        ],
      });

      // Obtém DM channel ID (usado em PLAY_ACTIVITY)
      const dmChannel = await interaction.user.createDM().catch(() => null);
      const dmChannelId = dmChannel?.id ?? interaction.channelId;

      // Acumula log para enviar em blocos por DM
      let log = [];
      let lastSent = null;

      const flush = async (force = false) => {
        if (!log.length) return;
        const text = log.join('\n');
        log = [];
        try {
          if (lastSent) {
            await lastSent.edit({ content: text }).catch(() => {});
            if (force) lastSent = null;
          } else {
            lastSent = await dmChannel?.send({ content: text }).catch(() => null);
          }
        } catch {}
      };

      let flushTimer = setInterval(() => flush(), 5000);

      const onProgress = msg => {
        log.push(msg);
        // A cada 10 linhas, força flush
        if (log.length >= 10) flush();
      };

      try {
        const result = await runQuests(token, dmChannelId, onProgress);
        clearInterval(flushTimer);
        await flush(true);

        const summary = result.error
          ? `❌ ${result.error}`
          : [
              result.completed.length ? `✅ Concluídas: ${result.completed.map(n => `**${n}**`).join(', ')}` : null,
              result.skipped.length   ? `⚠️ Puladas: ${result.skipped.map(n => `**${n}**`).join(', ')}`    : null,
            ].filter(Boolean).join('\n');

        await dmChannel?.send({
          embeds: [
            new EmbedBuilder()
              .setColor(result.error ? 0xED4245 : 0x57F287)
              .setTitle('🔮 Quest Automator — Resultado')
              .setDescription(summary),
          ],
        }).catch(() => {});

      } catch (err) {
        clearInterval(flushTimer);
        await dmChannel?.send({ content: `❌ Erro fatal: ${err.message}` }).catch(() => {});
      }
    }
  },
};

export default [quest];
