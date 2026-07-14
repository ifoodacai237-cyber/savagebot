/**
 * publishChannels.js
 *
 * Resolve e posta mensagens nos canais configurados por categoria
 * (PublishChannel), com um cuidado crítico:
 *
 *   NUNCA cria uma thread de fórum nova por username.
 *
 * Antes, cada username disponível criava uma thread de fórum própria
 * (`ch.threads.create`). Criação de thread em fórum tem rate limit MUITO
 * mais agressivo que enviar mensagem num canal/thread já existente — isso
 * era a causa raiz de:
 *   1. Demora para o username aparecer no canal (fila de criação de thread)
 *   2. Categorias que simplesmente paravam de postar (erros de rate limit
 *      engolidos pelo catch, thread nunca criada)
 *
 * A solução: se o canal configurado for um Fórum, criamos (ou reaproveitamos)
 * UMA ÚNICA thread persistente por categoria — igual ao formato dos prints
 * (thread "realwordpt", "mixed", "numbers" etc. acumulando milhares de posts)
 * — e a partir daí só fazemos `.send()` nela, exatamente como um canal de
 * texto normal. A migração é automática: a primeira postagem detecta o
 * fórum, cria/acha a thread, e já regrava o channelId no banco para nunca
 * mais precisar resolver de novo.
 */

import { ChannelType } from 'discord.js';
import prisma from '../database/client.js';

// Cache em memória: cfg.id -> id da thread já resolvida (evita bater no fórum de novo)
const _resolvedCache = new Map();

export async function resolveChannel(client, cfg) {
  const cachedId = _resolvedCache.get(cfg.id);
  if (cachedId) {
    const cached = await client.channels.fetch(cachedId).catch(() => null);
    if (cached) return cached;
    _resolvedCache.delete(cfg.id);
  }

  const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
  if (!ch) return null;

  // Canal de texto ou thread já existente — usa direto, sem criar nada.
  if (ch.type !== ChannelType.GuildForum) return ch;

  // Canal configurado é o Fórum em si — precisamos de UMA thread persistente
  // por categoria (nunca uma por username).
  let thread = null;

  const active = await ch.threads.fetchActive().catch(() => null);
  thread = active?.threads?.find(t => t.name === cfg.category) ?? null;

  if (!thread) {
    const archived = await ch.threads.fetchArchived().catch(() => null);
    thread = archived?.threads?.find(t => t.name === cfg.category) ?? null;
    if (thread?.archived) await thread.setArchived(false).catch(() => {});
  }

  if (!thread) {
    thread = await ch.threads.create({
      name: cfg.category,
      message: { content: `📡 Feed de **${cfg.category}** iniciado — usernames disponíveis vão aparecer aqui.` },
    });
  }

  // Regrava no banco para que da próxima vez o canal já resolva direto (sem passar pelo fórum).
  await prisma.publishChannel.update({
    where: { id: cfg.id },
    data:  { channelId: thread.id },
  }).catch(() => {});

  _resolvedCache.set(cfg.id, thread.id);
  return thread;
}

/**
 * Posta um embed em todos os canais configurados para `category`.
 * Sempre `.send()` puro — nunca cria thread por mensagem.
 */
export async function postEmbedToCategory(client, category, embed, logTag = 'PUBLISH') {
  if (!client) return;
  try {
    const configs = await prisma.publishChannel.findMany({ where: { category } });
    if (!configs.length) return;

    for (const cfg of configs) {
      try {
        const ch = await resolveChannel(client, cfg);
        if (!ch) continue;
        await ch.send({ embeds: [embed] });
      } catch (err) {
        console.error(`[${logTag}:${category}] Erro ao postar em ${cfg.channelId}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[${logTag}] Erro ao buscar canais para ${category}:`, err.message);
  }
}
