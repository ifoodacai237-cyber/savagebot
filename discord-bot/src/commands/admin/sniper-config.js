/**
 * /sniper-config — configura canais/fóruns e gerencia o sistema de sniper
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import prisma from '../../database/client.js';
import { startMonitor, stopMonitor, isAvailable } from '../../utils/usernameMonitor.js';

const CATEGORIAS = [
  { value: 'realwordpt', label: '🇧🇷 Palavras PT',   field: 'channelRealwordPt' },
  { value: 'realword',   label: '🌍 Palavras EN',    field: 'channelRealword'   },
  { value: 'mixed',      label: '🔀 Mixed',          field: 'channelMixed'      },
  { value: 'sniper',     label: '🎯 Sniper',         field: 'channelSniper'     },
  { value: 'numbers',    label: '🔢 Números',        field: 'channelNumbers'    },
];

// Aceita canal de texto OU fórum
const CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildForum,
  ChannelType.GuildAnnouncement,
];

export default {
  data: new SlashCommandBuilder()
    .setName('sniper-config')
    .setDescription('Configura o sistema de sniper de usernames do Discord')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── canal ──────────────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('canal')
        .setDescription('Define o canal/fórum para uma categoria de usernames')
        .addStringOption(o =>
          o.setName('categoria')
            .setDescription('Categoria de usernames')
            .setRequired(true)
            .addChoices(
              { name: '🇧🇷 Palavras PT (realwordpt)', value: 'realwordpt' },
              { name: '🌍 Palavras EN (realword)',    value: 'realword'   },
              { name: '🔀 Mixed',                    value: 'mixed'      },
              { name: '🎯 Sniper (mudança de nick)', value: 'sniper'     },
              { name: '🔢 Números',                  value: 'numbers'    },
            ))
        .addChannelOption(o =>
          o.setName('canal')
            .setDescription('Canal ou fórum onde serão postadas as notificações')
            .addChannelTypes(...CHANNEL_TYPES)
            .setRequired(true)))

    // ── ver ────────────────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('ver')
        .setDescription('Mostra a configuração atual dos canais'))

    // ── ativar / desativar ─────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('ativar')
        .setDescription('Ativa o monitor de usernames neste servidor'))
    .addSubcommand(sub =>
      sub.setName('desativar')
        .setDescription('Desativa o monitor de usernames neste servidor'))

    // ── checar ─────────────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('checar')
        .setDescription('Verifica manualmente se um username está disponível')
        .addStringOption(o =>
          o.setName('username')
            .setDescription('Username a verificar (sem @)')
            .setRequired(true)))

    // ── adicionar ──────────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('adicionar')
        .setDescription('Adiciona um username à lista de monitoramento sniper')
        .addStringOption(o =>
          o.setName('username')
            .setDescription('Username a rastrear (sem @)')
            .setRequired(true))),

  name: 'sniper-config',

  async execute(interaction, client) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    await interaction.deferReply({ flags: 64 });

    // ── canal ───────────────────────────────────────────────────────────────
    if (sub === 'canal') {
      const cat   = interaction.options.getString('categoria');
      const ch    = interaction.options.getChannel('canal');
      const found = CATEGORIAS.find(c => c.value === cat);
      if (!found) return interaction.editReply({ content: '❌ Categoria inválida.' });

      const isForum = ch.type === ChannelType.GuildForum;

      await prisma.sniperConfig.upsert({
        where:  { guildId },
        create: { guildId, [found.field]: ch.id },
        update: { [found.field]: ch.id },
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Canal configurado')
            .setDescription(`${found.label} → ${ch} ${isForum ? '*(fórum — cada username vira um post)*' : '*(canal de texto)*'}`)
            .setFooter({ text: 'Use /sniper-config ver para ver todos os canais.' }),
        ],
      });
    }

    // ── ver ─────────────────────────────────────────────────────────────────
    if (sub === 'ver') {
      const cfg = await prisma.sniperConfig.findUnique({ where: { guildId } });
      if (!cfg) {
        return interaction.editReply({
          content: '⚠️ Nenhuma configuração encontrada. Use `/sniper-config canal` para começar.',
        });
      }

      const linhas = await Promise.all(
        CATEGORIAS.map(async c => {
          const id = cfg[c.field];
          if (!id) return `${c.label}: \`não configurado\``;
          try {
            const ch = await client.channels.fetch(id);
            const tipo = ch.type === ChannelType.GuildForum ? ' 📋 fórum' : ' 💬 texto';
            return `${c.label}: <#${id}>${tipo}`;
          } catch {
            return `${c.label}: <#${id}> *(sem acesso)*`;
          }
        }),
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(cfg.enabled ? 0x57F287 : 0xED4245)
            .setTitle(`🎯 Sniper Config — ${cfg.enabled ? '🟢 Ativo' : '🔴 Inativo'}`)
            .setDescription(linhas.join('\n')),
        ],
      });
    }

    // ── ativar ──────────────────────────────────────────────────────────────
    if (sub === 'ativar') {
      await prisma.sniperConfig.upsert({
        where:  { guildId },
        create: { guildId, enabled: true },
        update: { enabled: true },
      });
      startMonitor(client);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x57F287).setDescription('✅ Monitor de usernames **ativado** neste servidor.')],
      });
    }

    // ── desativar ───────────────────────────────────────────────────────────
    if (sub === 'desativar') {
      await prisma.sniperConfig.upsert({
        where:  { guildId },
        create: { guildId, enabled: false },
        update: { enabled: false },
      });
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('⏸️ Monitor desativado para este servidor.')],
      });
    }

    // ── checar ──────────────────────────────────────────────────────────────
    if (sub === 'checar') {
      const username = interaction.options.getString('username').toLowerCase().replace(/^@/, '');
      const avail    = await isAvailable(username);

      if (avail === null) {
        return interaction.editReply({ content: '⚠️ Não foi possível verificar agora. Tente novamente em instantes.' });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(avail ? 0x57F287 : 0xED4245)
            .setDescription(avail
              ? `✅ **@${username}** está **disponível**!`
              : `❌ **@${username}** está **ocupado**.`),
        ],
      });
    }

    // ── adicionar ───────────────────────────────────────────────────────────
    if (sub === 'adicionar') {
      const username = interaction.options.getString('username').toLowerCase().replace(/^@/, '');

      const existing = await prisma.sniperTarget.findUnique({ where: { username } });
      if (existing) {
        return interaction.editReply({ content: `⚠️ **@${username}** já está sendo rastreado.` });
      }

      await prisma.sniperTarget.create({
        data: { username, category: 'sniper', sniperAlerted: false },
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`🎯 **@${username}** adicionado à lista de monitoramento.\nSerei notificado assim que ficar disponível.`),
        ],
      });
    }
  },
};
