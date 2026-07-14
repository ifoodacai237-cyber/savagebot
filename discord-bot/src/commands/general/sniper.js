/**
 * Comandos de sniper de usernames
 *
 *  /disponivel   — verifica se um username está disponível
 *  /snipe_add    — adiciona username à lista de monitoramento pessoal
 *  /snipe_list   — lista seus targets em monitoramento
 *  /gerar        — mostra usernames disponíveis encontrados recentemente
 *  /setup_canal  — configura canal para publicação automática por categoria
 *  /canais       — mostra canais configurados
 *  /publicar_agora — publica usernames imediatamente nos canais configurados
 */

import { SlashCommandBuilder, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import prisma from '../../database/client.js';
import { isAvailable } from '../../utils/checker.js';

// ─── /disponivel ──────────────────────────────────────────────────────────────

const disponivel = {
  data: new SlashCommandBuilder()
    .setName('disponivel')
    .setDescription('Verifica se um username está disponível ✅')
    .addStringOption(o =>
      o.setName('username')
        .setDescription('Username para verificar (sem @)')
        .setRequired(true)),

  name: 'disponivel',

  async execute(interaction) {
    const username = interaction.options.getString('username').toLowerCase().replace(/^@/, '');
    await interaction.deferReply({ flags: 64 });

    const avail = await isAvailable(username);

    if (avail === null) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription('⚠️ Não foi possível verificar agora. Tente novamente em instantes.'),
        ],
      });
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(avail ? 0x57F287 : 0xED4245)
          .setTitle(avail ? '✅ DISPONÍVEL' : '❌ OCUPADO')
          .setDescription(`Username: **@${username}**`)
          .setFooter({ text: 'Sistema de Sniper do Fallen Angels' }),
      ],
    });
  },
};

// ─── /snipe_add ───────────────────────────────────────────────────────────────

const snipe_add = {
  data: new SlashCommandBuilder()
    .setName('snipe_add')
    .setDescription('Adiciona username para monitoramento 🎯')
    .addStringOption(o =>
      o.setName('username')
        .setDescription('Username para monitorar (sem @)')
        .setRequired(true)),

  name: 'snipe_add',

  async execute(interaction, client) {
    const username = interaction.options.getString('username').toLowerCase().replace(/^@/, '');
    await interaction.deferReply({ flags: 64 });

    if (username.length < 2 || username.length > 32) {
      return interaction.editReply({ content: '❌ Username deve ter entre 2 e 32 caracteres.' });
    }

    const existing = await prisma.sniperTarget.findUnique({ where: { username } });
    if (existing) {
      const msg = existing.addedByUserId === interaction.user.id
        ? 'Você já está monitorando esse username.'
        : 'Esse username já está sendo monitorado.';
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription(`⚠️ **@${username}** — ${msg}`)],
      });
    }

    // Salva no banco
    await prisma.sniperTarget.create({
      data: {
        username,
        category:      'sniper',
        addedByUserId: interaction.user.id,
        addedByName:   interaction.user.username,
      },
    });

    // Posta no canal sniper (formato igual ao screenshot)
    const cl = client ?? interaction.client;
    await _postarNoCanaiSniper(username, interaction.user.username, cl);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Username Adicionado')
          .setDescription(`Monitorando: **@${username}**\nVou te avisar assim que ficar disponível.`)
          .setFooter({ text: 'Sistema de Sniper do Fallen Angels' }),
      ],
    });
  },
};

/**
 * Posta no canal sniper configurado quando um username entra na mira.
 * Formato dos prints:
 *   🎯 @target entrou na mira
 *   @addedBy — vou avisar quando @target liberar.
 *   Estimativa: entre em um dia e em 14 dias...
 */
async function _postarNoCanaiSniper(target, addedByName, client) {
  if (!client) return;
  try {
    const configs = await prisma.publishChannel.findMany({ where: { category: 'sniper' } });
    if (!configs.length) return;

    const texto =
      `🎯 **@${target}** entrou na mira\n\n` +
      `@${addedByName} — vou avisar quando **@${target}** liberar.\n` +
      `Estimativa: entre **em um dia** e **em 14 dias** (sem regra exata do Discord). Verifico de tempos em tempos.`;

    for (const cfg of configs) {
      const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (!ch) continue;

      let sent = false;
      try {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));
        await ch.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        sent = true;
      } catch {}

      if (!sent) {
        await ch.send({
          embeds: [{ description: texto, color: 0xED4245 }],
        }).catch(err => console.error(`[SNIPE_ADD] Erro ao postar em ${cfg.channelId}:`, err.message));
      }
    }
  } catch (err) {
    console.error('[SNIPE_ADD] Erro ao postar no canal sniper:', err.message);
  }
}

// ─── /snipe_list ──────────────────────────────────────────────────────────────

const snipe_list = {
  data: new SlashCommandBuilder()
    .setName('snipe_list')
    .setDescription('Lista seus usernames em monitoramento 📋'),

  name: 'snipe_list',

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const targets = await prisma.sniperTarget.findMany({
      where:   { addedByUserId: interaction.user.id },
      orderBy: { detectedAt: 'desc' },
      take:    25,
    });

    if (!targets.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription('📋 Você não possui usernames em monitoramento.\nUse `/snipe_add` para adicionar um.'),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Seus Alvos de Snipe')
      .setDescription(`Total: **${targets.length}** username(s)`)
      .setFooter({ text: 'Sistema de Sniper do Fallen Angels' });

    for (const t of targets) {
      const ts     = Math.floor(new Date(t.detectedAt).getTime() / 1000);
      const status = t.postedAt ? '✅ Encontrado' : '🔍 Monitorando';
      embed.addFields({ name: `@${t.username}`, value: `${status} · Adicionado <t:${ts}:R>`, inline: false });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};

// ─── /gerar ───────────────────────────────────────────────────────────────────

const gerar = {
  data: new SlashCommandBuilder()
    .setName('gerar')
    .setDescription('Mostra usernames disponíveis encontrados recentemente 🔄')
    .addStringOption(o =>
      o.setName('categoria')
        .setDescription('Filtrar por categoria')
        .setRequired(false)
        .addChoices(
          { name: '🇧🇷 Palavras PT (realwordpt)', value: 'realwordpt' },
          { name: '🌍 Palavras EN (realword)',    value: 'realword'   },
          { name: '🔀 Mixed',                    value: 'mixed'      },
          { name: '🎯 Sniper',                   value: 'sniper'     },
          { name: '🔢 Números',                  value: 'numbers'    },
        )),

  name: 'gerar',

  async execute(interaction) {
    const cat = interaction.options.getString('categoria');
    await interaction.deferReply({ flags: 64 });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const results = await prisma.sniperTarget.findMany({
      where:   { postedAt: { not: null, gte: since }, ...(cat ? { category: cat } : {}) },
      orderBy: { postedAt: 'desc' },
      take:    20,
    });

    const total = await prisma.sniperTarget.count({
      where: { postedAt: { not: null, gte: since } },
    });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔄 Usernames Disponíveis — Últimas 24h')
      .setFooter({ text: 'Sistema de Sniper do Fallen Angels' });

    if (!results.length) {
      embed.setDescription(
        cat
          ? `Nenhum username da categoria **${cat}** encontrado nas últimas 24h.`
          : 'Nenhum username encontrado nas últimas 24h ainda.',
      );
    } else {
      const catEmoji = { realwordpt: '🇧🇷', realword: '🌍', mixed: '🔀', sniper: '🎯', numbers: '🔢' };
      embed.setDescription(results.map(t => `${catEmoji[t.category] ?? '•'} **@${t.username}**`).join('\n'));
      embed.addFields({ name: 'Total encontrados (24h)', value: String(total), inline: true });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};

// ─── /setup_canal ─────────────────────────────────────────────────────────────

const setup_canal = {
  data: new SlashCommandBuilder()
    .setName('setup_canal')
    .setDescription('Configura canal para publicação automática de usernames 📡')
    .setDefaultMemberPermissions(0x8) // ADMINISTRATOR
    .addStringOption(o =>
      o.setName('categoria')
        .setDescription('Categoria de usernames a publicar neste canal')
        .setRequired(true)
        .addChoices(
          { name: '🔀 Mixed (letras + números, 4 chars)',  value: 'mixed'      },
          { name: '🌍 Palavras EN (realword)',              value: 'realword'   },
          { name: '🇧🇷 Palavras PT (realwordpt)',           value: 'realwordpt' },
          { name: '🔢 Números (numbers)',                  value: 'numbers'    },
          { name: '🎯 Sniper (mudanças detectadas)',        value: 'sniper'     },
        )),

  name: 'setup_canal',

  async execute(interaction) {
    const categoria = interaction.options.getString('categoria');

    await prisma.publishChannel.upsert({
      where:  { guildId_category: { guildId: interaction.guildId, category: categoria } },
      create: { guildId: interaction.guildId, channelId: interaction.channelId, category: categoria },
      update: { channelId: interaction.channelId },
    });

    const catDesc = {
      mixed:      '🔀 **Mixed** — usernames de 4 chars com letras e números (ex: sf9d, 8u3g)',
      realword:   '🌍 **Palavras EN** — palavras reais em inglês',
      realwordpt: '🇧🇷 **Palavras PT** — palavras reais em português',
      numbers:    '🔢 **Números** — sequências numéricas de 5-7 dígitos',
      sniper:     '🎯 **Sniper** — notificações de mudanças de username detectadas automaticamente',
    };

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Canal Configurado')
          .setDescription(
            `Este canal receberá usernames de categoria:\n${catDesc[categoria] ?? categoria}\n\nPublicação automática em tempo real.`,
          )
          .setFooter({ text: 'Fallen Angels Sniper' }),
      ],
    });
  },
};

// ─── /canais ──────────────────────────────────────────────────────────────────

const canais = {
  data: new SlashCommandBuilder()
    .setName('canais')
    .setDescription('Mostra canais configurados para publicação automática 📊'),

  name: 'canais',

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const configs = await prisma.publishChannel.findMany({
      where: { guildId: interaction.guildId },
    });

    if (!configs.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Nenhum canal configurado ainda!\nUse `/setup_canal` para configurar.'),
        ],
      });
    }

    const catEmoji = { mixed: '🔀', realword: '🌍', realwordpt: '🇧🇷', numbers: '🔢', sniper: '🎯' };

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Canais Configurados')
      .setDescription('Canais ativos para publicação de usernames')
      .setFooter({ text: 'Fallen Angels Sniper' });

    for (const cfg of configs) {
      const emoji = catEmoji[cfg.category] ?? '📁';
      embed.addFields({
        name:   `${emoji} ${cfg.category.toUpperCase()}`,
        value:  `<#${cfg.channelId}> · ID: \`${cfg.channelId}\``,
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};

// ─── /publicar_agora ──────────────────────────────────────────────────────────

const publicar_agora = {
  data: new SlashCommandBuilder()
    .setName('publicar_agora')
    .setDescription('Publica usernames disponíveis imediatamente nos canais configurados 📤')
    .setDefaultMemberPermissions(0x8),

  name: 'publicar_agora',

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const configs = await prisma.publishChannel.findMany({
      where: { guildId: interaction.guildId },
    });

    if (!configs.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Nenhum canal configurado! Use `/setup_canal` primeiro.'),
        ],
      });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let publicados = 0;

    const cl = client ?? interaction.client;

    for (const cfg of configs) {
      if (cfg.category === 'sniper') continue; // sniper não tem batch manual
      try {
        const channel = await cl.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel) continue;

        const targets = await prisma.sniperTarget.findMany({
          where:   { category: cfg.category, postedAt: { not: null, gte: since } },
          orderBy: { postedAt: 'desc' },
          take:    50,
        });

        if (!targets.length) continue;

        const lista = targets.map(t => `✅ \`${t.username}\``).join('\n');
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle(`🎁 Usernames Disponíveis — ${cfg.category.toUpperCase()}`)
              .setDescription(lista.length > 2048 ? lista.slice(0, 2000) + '…' : lista)
              .setFooter({ text: `Total: ${targets.length} | Fallen Angels Sniper` }),
          ],
        });
        publicados++;
      } catch { /* ignora canal inválido */ }
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(publicados ? 0x57F287 : 0xFEE75C)
          .setDescription(
            publicados
              ? `✅ Publicado em **${publicados}** canal(is).`
              : '⚠️ Nenhum username disponível para publicar no momento.',
          ),
      ],
    });
  },
};

export default [disponivel, snipe_add, snipe_list, gerar, setup_canal, canais, publicar_agora];
