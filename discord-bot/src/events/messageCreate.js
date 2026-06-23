import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../database/client.js';
import { likesMap, threadsMap } from '../utils/instaState.js';
import { buildPartnershipPost } from '../utils/partnershipPanels.js';

const PREFIX = 'fallen ';

const cfgCache = new Map();
async function getGuildCfg(guildId) {
  if (cfgCache.has(guildId)) return cfgCache.get(guildId);
  const cfg = await prisma.guildConfig.findUnique({ where: { guildId } });
  cfgCache.set(guildId, cfg);
  setTimeout(() => cfgCache.delete(guildId), 5_000);
  return cfg;
}

export function invalidateGuildCfgCache(guildId) {
  cfgCache.delete(guildId);
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

    // ── ECONOMIA: Contador de mensagens ─────────────────────────────────────
    if (message.guildId) {
      prisma.economy.upsert({
        where:  { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
        create: { userId: message.author.id, guildId: message.guildId, messageCount: 1 },
        update: { messageCount: { increment: 1 } },
      }).catch(() => {});
    }

    // ── INSTAGRAM AUTO-POST ──────────────────────────────────────────────────
    if (message.guildId) {
      const cfg = await getGuildCfg(message.guildId);

      // ── PARCERIAS AUTO-DETECT ──────────────────────────────────────────────
      if (cfg?.partnerEnabled && cfg?.partnerChannel && message.channelId === cfg.partnerChannel) {
        const hasRole = cfg.partnerResponsibleRole
          ? message.member?.roles.cache.has(cfg.partnerResponsibleRole)
          : true;

        if (hasRole) {
          const inviteMatch = message.content.match(/discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([a-zA-Z0-9-]+)/i);

          if (!inviteMatch) {
            const warn = await message.reply({ content: '⚠️ Nenhum link de convite detectado. Inclua um link `discord.gg/...` na mensagem.' }).catch(() => null);
            if (warn) setTimeout(() => warn.delete().catch(() => {}), 8_000);
          } else {
            const inviteCode = inviteMatch[1];

            let invite = null;
            let fetchError = null;
            try { invite = await message.client.fetchInvite(inviteCode); } catch (e) { fetchError = e; }

            if (!invite || !invite.guild) {
              const warn = await message.reply({ content: `⚠️ Não consegui buscar o convite \`${inviteCode}\`. Verifique se ele é válido e não expirou.` }).catch(() => null);
              if (warn) setTimeout(() => warn.delete().catch(() => {}), 10_000);
            } else if (invite.guild.id === message.guildId) {
              const warn = await message.reply({ content: '⚠️ O convite enviado é do próprio servidor. Envie o convite do **servidor parceiro**.' }).catch(() => null);
              if (warn) setTimeout(() => warn.delete().catch(() => {}), 8_000);
            } else {
              const partnerServerId = invite.guild.id   || 'unknown';
              const partnerName     = invite.guild.name || 'Desconhecido';

              let representativeId = null;
              const repMatch = message.content.match(/(?:rep(?:resentante)?)\s*:\s*<@!?(\d+)>/i);
              if (repMatch) {
                representativeId = repMatch[1];
              } else if (message.mentions.users.size > 0) {
                representativeId = message.mentions.users.first().id;
              }

              const prevCount = await prisma.partnership.count({
                where: { guildId: message.guildId, promoterId: message.author.id },
              });
              const partnershipCount = prevCount + 1;

              const allPromoterCounts = await prisma.partnership.groupBy({
                by: ['promoterId'],
                where: { guildId: message.guildId, promoterId: { not: message.author.id } },
                _count: { id: true },
              });
              const rank = allPromoterCounts.filter(p => p._count.id >= partnershipCount).length + 1;

              await prisma.partnership.create({
                data: {
                  guildId: message.guildId,
                  partnerServerId,
                  partnerName,
                  promoterId:       message.author.id,
                  representativeId: representativeId ?? null,
                  inviteCode,
                  messageUrl: message.url,
                },
              }).catch(() => {});

              if (cfg.partnerRole && representativeId) {
                const rep = message.guild.members.cache.get(representativeId)
                  ?? await message.guild.members.fetch(representativeId).catch(() => null);
                if (rep) rep.roles.add(cfg.partnerRole).catch(() => {});
              }

              const thumbUrl = cfg.partnerThumbnail || invite.guild?.iconURL?.({ size: 256 })    || null;
              const imageUrl = cfg.partnerImage     || invite.guild?.bannerURL?.({ size: 1024 }) || null;

              const post = buildPartnershipPost({
                cfg,
                promoterId: message.author.id,
                partnerName,
                inviteCode,
                partnershipCount,
                rank,
                thumbUrl,
                imageUrl,
                messageUrl: message.url,
              });

              if (cfg.partnerPingRole) {
                await message.channel.send({ content: `<@&${cfg.partnerPingRole}>` }).catch(() => {});
              }
              await message.channel.send(post);

              if (cfg.partnerNotifyDm && representativeId) {
                const accentColor = cfg.partnerColor ? (parseInt(cfg.partnerColor, 16) || 0xA020F0) : 0xA020F0;
                const rep = message.guild.members.cache.get(representativeId)
                  ?? await message.guild.members.fetch(representativeId).catch(() => null);
                if (rep) {
                  rep.user.send({
                    embeds: [new EmbedBuilder()
                      .setColor(accentColor)
                      .setTitle('🤝 Parceria Realizada!')
                      .setDescription(`Você foi marcado como representante da parceria com **${partnerName}** no servidor **${message.guild.name}**.\n\n[Ver parceria](${message.url})`)
                      .setTimestamp()
                    ],
                  }).catch(() => {});
                }
              }
            }
          }
        }
        return;
      }

      if (cfg?.instaChannel && message.channelId === cfg.instaChannel && message.attachments.size > 0) {
        const color      = parseInt(cfg.instaColor ?? '833AB4', 16);
        const likeEmoji  = parseEmoji(cfg.instaEmoji ?? '💜');

        // Pré-busca todos os arquivos de imagem ANTES de deletar a mensagem original
        const attachmentFiles = [];
        for (const attachment of message.attachments.values()) {
          const isImage = attachment.contentType?.startsWith('image/');
          const isVideo = attachment.contentType?.startsWith('video/');
          if (!isImage && !isVideo) continue;

          let imageBuf = null;
          if (isImage) {
            try {
              const resp = await fetch(attachment.url);
              imageBuf = Buffer.from(await resp.arrayBuffer());
            } catch {
              try {
                const resp = await fetch(attachment.proxyURL);
                imageBuf = Buffer.from(await resp.arrayBuffer());
              } catch {}
            }
          }

          const ext = attachment.name?.split('.').pop()?.toLowerCase() ?? 'png';
          attachmentFiles.push({ attachment, isImage, isVideo, imageBuf, ext });
        }

        // Deleta a mensagem original SÓ APÓS ter baixado os arquivos
        try { await message.delete(); } catch {}

        for (const { attachment, isImage, isVideo, imageBuf, ext } of attachmentFiles) {
          const postId       = `${message.id}_${attachment.id}`;
          const authorName   = message.member?.displayName ?? message.author.username;
          const authorAvatar = message.author.displayAvatarURL({ size: 64 });

          const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: authorName, iconURL: authorAvatar })
            .setTimestamp();

          if (message.content) embed.setDescription(message.content);

          // Monta o arquivo para re-upload (persiste independente da mensagem original)
          let files = [];
          if (isImage && imageBuf) {
            const fileName = `post_${Date.now()}.${ext}`;
            files = [new AttachmentBuilder(imageBuf, { name: fileName })];
            embed.setImage(`attachment://${fileName}`);
          } else if (isImage) {
            // fallback se o fetch falhou
            embed.setImage(attachment.proxyURL || attachment.url);
          }

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

          const post = await message.channel.send({ embeds: [embed], files, components: [baseRow] });

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
