/**
 * /sniper-config — configura canais/fóruns e gerencia o sistema de sniper
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ForumLayoutType,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';
import { startMonitor, stopMonitor, isAvailable } from '../../utils/usernameMonitor.js';
import { CATEGORIAS } from '../../utils/sniperCategories.js';

// Nome do fórum único criado automaticamente por /sniper-config criar-canais
const FORUM_NOME = 'users';

// Aceita canal de texto, anúncio ou fórum. Threads dentro de um fórum não
// aparecem no seletor nativo de canal do Discord — por isso, ao escolher um
// fórum, mostramos logo em seguida uma lista das threads dele pra escolher.
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

    // ── criar-canais ───────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('criar-canais')
        .setDescription('Cria automaticamente todos os fóruns de categoria e ativa o sniper'))

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

      // Fórum: o Discord não deixa escolher uma thread direto no seletor de
      // canal do comando, então buscamos as threads desse fórum e mostramos
      // um menu simples pra clicar em qual usar (ou deixar automático).
      if (ch.type === ChannelType.GuildForum) {
        const active   = await ch.threads.fetchActive().catch(() => null);
        const archived = await ch.threads.fetchArchived().catch(() => null);
        const threads  = [
          ...(active?.threads?.values() ?? []),
          ...(archived?.threads?.values() ?? []),
        ];

        const options = [
          {
            label:       '🤖 Deixar o bot criar/gerenciar sozinho',
            value:       'auto',
            description: 'O bot cria a thread da categoria automaticamente',
          },
          ...threads.slice(0, 24).map(t => ({
            label:       t.name.slice(0, 100),
            value:       t.id,
            description: `Postar as notificações de ${found.label} aqui`.slice(0, 100),
          })),
        ];

        const select = new StringSelectMenuBuilder()
          .setCustomId(`sniperthread:${found.value}:${ch.id}`)
          .setPlaceholder('Escolha a thread (ou deixe automático)')
          .addOptions(options);

        return interaction.editReply({
          content: threads.length
            ? `📋 Encontrei ${threads.length} thread(s) dentro de ${ch}. Escolha qual vai receber **${found.label}**:`
            : `⚠️ Não encontrei nenhuma thread dentro de ${ch} ainda. Crie uma lá e rode o comando de novo, ou deixe o bot criar sozinho:`,
          components: [new ActionRowBuilder().addComponents(select)],
        });
      }

      // Canal de texto/anúncio — salva direto, sem thread
      await prisma.sniperConfig.upsert({
        where:  { guildId },
        create: { guildId, [found.field]: ch.id, [found.threadField]: null },
        update: { [found.field]: ch.id, [found.threadField]: null },
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Canal configurado')
            .setDescription(`${found.label} → ${ch} *(canal de texto)*`)
            .setFooter({ text: 'Use /sniper-config ver para ver todos os canais.' }),
        ],
      });
    }

    // ── criar-canais ───────────────────────────────────────────────────────
    if (sub === 'criar-canais') {
      const guild = interaction.guild;
      if (!guild) return interaction.editReply({ content: '❌ Só funciona dentro de um servidor.' });

      const me = await guild.members.fetchMe();
      if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.editReply({
          content: '❌ Preciso da permissão **Gerenciar Canais** para criar os fóruns automaticamente.',
        });
      }

      const cfgAtual = await prisma.sniperConfig.findUnique({ where: { guildId } });

      // Fórum único que recebe todas as categorias — reaproveita se já existir
      let forum = null;
      const existingId = cfgAtual?.forumChannelId;
      if (existingId) {
        try { forum = await guild.channels.fetch(existingId); } catch {}
      }
      if (!forum) {
        forum = await guild.channels.create({
          name: FORUM_NOME,
          type: ChannelType.GuildForum,
          topic: 'Usernames encontrados automaticamente pelo sniper. Cada categoria vira uma thread. Somente leitura.',
          defaultForumLayout: ForumLayoutType.ListView,
        });
      } else if (forum.defaultForumLayout !== ForumLayoutType.ListView) {
        // Fóruns criados antes desta correção ficaram no layout padrão (Galeria),
        // que deixa os cards em branco porque nossos posts não têm imagem.
        try { await forum.edit({ defaultForumLayout: ForumLayoutType.ListView }); } catch {}
      }

      const updateData = { forumChannelId: forum.id, enabled: true };
      for (const c of CATEGORIAS) updateData[c.field] = forum.id;

      await prisma.sniperConfig.upsert({
        where:  { guildId },
        create: { guildId, ...updateData },
        update: updateData,
      });

      startMonitor(client);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Fórum criado e sniper ativado')
            .setDescription(
              `Tudo dentro de ${forum} agora — cada categoria (${CATEGORIAS.map(c => c.label).join(', ')}) vira uma thread própria lá dentro.`,
            ),
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
          const id       = cfg[c.field];
          const threadId = cfg[c.threadField];
          if (!id) return `${c.label}: \`não configurado\``;
          try {
            const ch = await client.channels.fetch(id);
            const tipo = ch.type === ChannelType.GuildForum ? ' 📋 fórum' : ' 💬 texto';
            const threadInfo = threadId ? ` → thread <#${threadId}>` : '';
            return `${c.label}: <#${id}>${tipo}${threadInfo}`;
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
