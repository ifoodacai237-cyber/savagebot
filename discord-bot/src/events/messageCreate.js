import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from 'discord.js';
import prisma from '../database/client.js';
import { likesMap, threadsMap, postDataMap } from '../utils/instaState.js';
import { buildPartnershipPost } from '../utils/partnershipPanels.js';
import { askAI, askTicketAI, generateAIImage, isAIConfigured } from '../utils/aiManager.js';

const PREFIX = 'savage ';

const IMAGE_INTENT_REGEX = /\b(imagem|foto|desenh\w*|ilustra[çc][ãa]o|wallpaper|logo|arte)\b/i;

async function handleAIMention(message, client) {
  if (!isAIConfigured()) {
    await message.reply('🤖 A IA ainda não está configurada neste bot. Peça a um administrador para configurar a variável GROQ_API_KEY no Railway.').catch(() => {});
    return;
  }

  const prompt = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();

  if (!prompt) {
    await message.reply('👋 Fala! Me marca e diz o que você quer que eu faça (ex: "@bot me conte uma piada" ou "@bot desenhe um gato astronauta").').catch(() => {});
    return;
  }

  await message.channel.sendTyping().catch(() => {});

  try {
    if (IMAGE_INTENT_REGEX.test(prompt)) {
      const buffer = await generateAIImage({ prompt });
      const { AttachmentBuilder } = await import('discord.js');
      const file = new AttachmentBuilder(buffer, { name: 'ia-imagem.png' });
      await message.reply({ content: `🖼️ **Prompt:** ${prompt}`, files: [file] });
    } else {
      const resposta = await askAI({ guildId: message.guildId, userId: message.author.id, prompt });
      const chunks = resposta.match(/[\s\S]{1,1990}/g) ?? [resposta];
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    }
  } catch (err) {
    console.error('[IA MENÇÃO]', err);
    await message.reply('❌ Não consegui responder agora. Tente novamente em instantes.').catch(() => {});
  }
}

const processedMessages = new Set();

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

const ticketAiInFlight = new Set();

async function handleTicketAI(message, cfg) {
  if (!cfg?.ticketAiEnabled || !message.guildId || ticketAiInFlight.has(message.channelId)) return false;

  const ticket = await prisma.ticket.findUnique({ where: { channelId: message.channelId } }).catch(() => null);
  if (!ticket || ticket.status !== 'open' || ticket.claimedBy || ticket.userId !== message.author.id) return false;
  if (!isAIConfigured() || !process.env.GROQ_API_KEY?.trim()) {
    return false;
  }

  ticketAiInFlight.add(message.channelId);
  try {
    await message.channel.sendTyping().catch(() => {});
    const recent = await message.channel.messages.fetch({ limit: 12 }).catch(() => null);
    const messages = recent
      ? [...recent.values()]
          .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
          .filter(item => !item.author.bot && item.content?.trim())
          .map(item => ({
            author: item.author.id === ticket.userId ? 'Usuário' : 'Membro da equipe',
            content: item.content,
          }))
      : [{ author: 'Usuário', content: message.content }];

    const answer = await askTicketAI({
      guildId: message.guildId,
      ticketId: ticket.id,
      messages,
      serverName: message.guild?.name,
    });
    await message.reply(answer);
  } catch (err) {
    console.error('[TICKET IA]', err?.message ?? err);
  } finally {
    ticketAiInFlight.delete(message.channelId);
  }
  return true;
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

    // ── ECONOMIA: Contador de mensagens + XP ────────────────────────────────
    if (message.guildId) {
      const XP_GAIN = Math.floor(Math.random() * 11) + 10; // 10–20 XP por mensagem
      prisma.economy.upsert({
        where:  { userId_guildId: { userId: message.author.id, guildId: message.guildId } },
        create: { userId: message.author.id, guildId: message.guildId, messageCount: 1, xp: XP_GAIN },
        update: { messageCount: { increment: 1 }, xp: { increment: XP_GAIN } },
      }).catch(() => {});
    }

    // ── INSTAGRAM AUTO-POST ──────────────────────────────────────────────────
    if (message.guildId) {
      const cfg = await getGuildCfg(message.guildId);

      // ── ATENDIMENTO AUTOMÁTICO NOS TICKETS ────────────────────────────────
      if (await handleTicketAI(message, cfg)) return;

      // ── IA POR MENÇÃO EM CANAL DEDICADO ─────────────────────────────────────
      if (cfg?.aiChannelId && message.channelId === cfg.aiChannelId && message.mentions.has(client.user)) {
        await handleAIMention(message, client);
        return;
      }

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
        const accentColor = cfg.instaColor ? parseInt(cfg.instaColor, 16) : null;
        const likeEmoji   = parseEmoji(cfg.instaEmoji ?? '💜');
        const instaHandle = cfg.instaHandle ?? null;

        // Helpers para montar o Container e o ActionRow
        function buildInstaContainer({ authorName, authorAvatar, content, accentColor: ac, imageUrl }) {
          const c = new ContainerBuilder();
          if (ac !== null && ac !== undefined) c.setAccentColor(ac);
          const headerText = content ? `### ${authorName}\n${content}` : `### ${authorName}`;
          c.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(authorAvatar))
          );
          if (imageUrl) {
            c.addMediaGalleryComponents(
              new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imageUrl))
            );
          }
          return c;
        }

        function buildInstaActionRow({ postId, likeEmoji: emoji, likesCount, threadId, instaHandle: handle, authorId }) {
          const buttons = [
            new ButtonBuilder()
              .setCustomId(`insta_like_${postId}`)
              .setEmoji(emoji)
              .setLabel(String(likesCount))
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`insta_who_${postId}`)
              .setEmoji('👁️')
              .setLabel('Curtidas')
              .setStyle(ButtonStyle.Secondary),
          ];
          if (threadId) {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`insta_comment_${threadId}`)
                .setEmoji('💬')
                .setLabel('Comentar')
                .setStyle(ButtonStyle.Secondary)
            );
          }
          if (handle) {
            buttons.push(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.instagram.com/${handle}/`)
                .setEmoji('📸')
                .setLabel(`@${handle}`)
            );
          }
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`insta_del_${postId}_${authorId}`)
              .setEmoji('🗑️')
              .setStyle(ButtonStyle.Danger)
          );
          return new ActionRowBuilder().addComponents(buttons);
        }

        // Pré-busca todos os arquivos ANTES de deletar a mensagem original
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
          const postId     = `${message.id}_${attachment.id}`;
          const authorName = message.member?.displayName ?? message.author.username;
          const authorAvatar = message.author.displayAvatarURL({ size: 64 });
          const content    = message.content || null;

          // Monta arquivo para re-upload (imagem) ou usa URL para vídeo
          let files = [];
          let initialImageUrl = null;

          if (isImage && imageBuf) {
            const fileName = `post_${Date.now()}.${ext}`;
            files = [new AttachmentBuilder(imageBuf, { name: fileName })];
            initialImageUrl = `attachment://${fileName}`;
          } else if (isImage) {
            initialImageUrl = attachment.proxyURL || attachment.url;
          }
          // Vídeo: attachment vai automaticamente junto com a mensagem V2

          likesMap.set(postId, new Set());

          const containerOpts = { authorName, authorAvatar, content, accentColor, imageUrl: initialImageUrl };
          const post = await message.channel.send({
            components: [
              buildInstaContainer(containerOpts),
              buildInstaActionRow({ postId, likeEmoji, likesCount: 0, threadId: null, instaHandle, authorId: message.author.id }),
            ],
            files,
            flags: MessageFlags.IsComponentsV2,
          });

          // Após o envio, pega a URL CDN real do attachment para usar nos edits futuros
          const cdnImageUrl = post.attachments.first()?.url ?? initialImageUrl;

          // Armazena dados do post para reuso no handler de likes
          postDataMap.set(postId, {
            authorName,
            authorAvatar,
            content,
            accentColor,
            likeEmoji,
            instaHandle,
            authorId: message.author.id,
            cdnImageUrl,
          });

          // Cria thread de comentários e atualiza botões com "Comentar"
          try {
            const thread = await post.startThread({
              name: `Comentários · ${authorName}`,
              autoArchiveDuration: 1440,
            });
            threadsMap.set(postId, thread.id);

            const editContainerOpts = { authorName, authorAvatar, content, accentColor, imageUrl: cdnImageUrl };
            await post.edit({
              components: [
                buildInstaContainer(editContainerOpts),
                buildInstaActionRow({ postId, likeEmoji, likesCount: 0, threadId: thread.id, instaHandle, authorId: message.author.id }),
              ],
              flags: MessageFlags.IsComponentsV2,
            });
          } catch (e) {
            console.error('[INSTA THREAD]', e.message);
          }
        }

        return;
      }
    }

    // ── PREFIX COMMANDS ──────────────────────────────────────────────────────
    if (!message.content.toLowerCase().startsWith(PREFIX)) return;

    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 10_000);

    const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const cmd         = client.prefixCmds.get(commandName);
    if (!cmd?.executePrefix) return;

    try {
      await cmd.executePrefix(message, args, client, commandName);
    } catch (err) {
      console.error(`[PREFIX ERROR] ${commandName}:`, err);
      message.reply({ content: '❌ Ocorreu um erro ao executar esse comando.' }).catch(() => {});
    }
  },
};
