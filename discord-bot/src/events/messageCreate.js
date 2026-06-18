import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../database/client.js';
import { likesMap, threadsMap } from '../utils/instaState.js';

const PREFIX = 'fallen ';

const cfgCache = new Map();
async function getGuildCfg(guildId) {
  if (cfgCache.has(guildId)) return cfgCache.get(guildId);
  const cfg = await prisma.guildConfig.findUnique({ where: { guildId } });
  cfgCache.set(guildId, cfg);
  setTimeout(() => cfgCache.delete(guildId), 30_000);
  return cfg;
}

// ─── Utilitário: converte string de emoji para formato do Discord.js ──────────
// Aceita: "💜" (unicode) ou "<a:name:id>" / "<:name:id>" (custom de qualquer servidor)
function parseEmoji(str) {
  const raw = (str ?? '💜').trim();
  const match = raw.match(/^<(a?):([^:>\s]+):(\d+)>$/);
  if (match) {
    return { animated: match[1] === 'a', name: match[2], id: match[3] };
  }
  return raw; // emoji unicode padrão
}

export default {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    if (message.author.bot) return;

    // ── INSTAGRAM AUTO-POST ──────────────────────────────────────────────────
    if (message.guildId) {
      const cfg = await getGuildCfg(message.guildId);

      if (cfg?.instaChannel && message.channelId === cfg.instaChannel && message.attachments.size > 0) {
        const color      = parseInt(cfg.instaColor ?? '833AB4', 16);
        const likeEmoji  = parseEmoji(cfg.instaEmoji ?? '💜');

        try { await message.delete(); } catch {}

        for (const attachment of message.attachments.values()) {
          const isImage = attachment.contentType?.startsWith('image/');
          const isVideo = attachment.contentType?.startsWith('video/');
          if (!isImage && !isVideo) continue;

          const postId       = `${message.id}_${attachment.id}`;
          const authorName   = message.member?.displayName ?? message.author.username;
          const authorAvatar = message.author.displayAvatarURL({ size: 64 });

          const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: authorName, iconURL: authorAvatar })
            .setTimestamp();

          if (message.content) embed.setDescription(message.content);
          if (isImage)         embed.setImage(attachment.url);

          // Inicializa set de likes em memória
          likesMap.set(postId, new Set());

          // Botões base (sem Comentar ainda)
          const baseRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`insta_like_${postId}`)
              .setEmoji(likeEmoji)
              .setLabel('0')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`insta_del_${postId}_${message.author.id}`)
              .setEmoji('🗑️')
              .setStyle(ButtonStyle.Danger),
          );

          const post = await message.channel.send({ embeds: [embed], components: [baseRow] });

          // Cria thread de comentários e atualiza botões com "Comentar"
          try {
            const thread = await post.startThread({
              name: `Comentários · ${authorName}`,
              autoArchiveDuration: 1440,
            });

            threadsMap.set(postId, thread.id);

            const rowWithComment = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`insta_like_${postId}`)
                .setEmoji(likeEmoji)
                .setLabel('0')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`insta_comment_${thread.id}`)
                .setEmoji('💬')
                .setLabel('Comentar')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`insta_del_${postId}_${message.author.id}`)
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger),
            );

            await post.edit({ components: [rowWithComment] });
          } catch (e) {
            console.error('[INSTA THREAD]', e.message);
          }
        }

        return;
      }
    }

    // ── PREFIX COMMANDS ──────────────────────────────────────────────────────
    if (!message.content.toLowerCase().startsWith(PREFIX)) return;

    const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const cmd         = client.prefixCmds.get(commandName);
    if (!cmd?.executePrefix) return;

    try {
      await cmd.executePrefix(message, args, client);
    } catch (err) {
      console.error(`[PREFIX ERROR] ${commandName}:`, err);
      message.reply({ content: '❌ Ocorreu um erro ao executar esse comando.' }).catch(() => {});
    }
  },
};
