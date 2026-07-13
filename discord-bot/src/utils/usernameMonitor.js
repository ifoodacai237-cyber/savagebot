/**
 * usernameMonitor.js
 * Motor de sniper de usernames:
 *  - Verifica disponibilidade de palavras PT/EN/numbers/mixed
 *  - Rastreia targets do canal sniper (via userUpdate)
 *  - Posta nos canais/fóruns configurados quando disponível
 */

import { ChannelType, EmbedBuilder } from 'discord.js';
import prisma from '../database/client.js';
import { ptWords } from '../lists/words-pt.js';
import { enWords } from '../lists/words-en.js';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DISCORD_API  = 'https://discord.com/api/v10';
const CHECK_DELAY  = 1_500;   // 1.5s entre chamadas (evita rate limit)
const BATCH_SIZE   = 15;      // usernames por lote
const CYCLE_PAUSE  = 20_000;  // pausa entre lotes (20s)
const REPOST_DAYS  = 7;       // não re-anuncia se postou há menos de X dias

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Estado interno ───────────────────────────────────────────────────────────

let running      = false;
let ptArr        = null;
let enArr        = null;
let ptIdx        = 0;
let enIdx        = 0;
const foundCache = new Set();

// ─── Verificação de disponibilidade ──────────────────────────────────────────

export async function isAvailable(username) {
  try {
    const res = await fetch(`${DISCORD_API}/unique-username/username-attempt-unauthed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (res.status === 429) {
      const retry = Number(res.headers.get('Retry-After') || 5);
      console.warn(`[SNIPER] Rate limited — aguardando ${retry}s…`);
      await sleep(retry * 1_000);
      return null;
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.taken === 'boolean') return !data.taken;
    return null;
  } catch {
    return null;
  }
}

// ─── Classificação ───────────────────────────────────────────────────────────

export function classifyUsername(username) {
  const lower = username.toLowerCase();
  if (/^\d+$/.test(lower))                       return 'numbers';
  if (ptWords.has(lower))                        return 'realwordpt';
  if (enWords.has(lower))                        return 'realword';
  if (/[a-z]/i.test(lower) && /\d/.test(lower)) return 'mixed';
  return 'realword';
}

// ─── Card sem barra lateral (embed sem accent color) ──────────────────────────
// Usamos embed clássico (não Components V2) porque o preview de post do fórum
// (visão "Ordenar e ver" / galeria no mobile) só lê content/embeds da mensagem —
// mensagens Components V2 não têm content e ficam com o card vazio no fórum.
// Embed sem setColor() não desenha barra lateral colorida, então o visual bate
// com o do print (sem faixa de cor).

/** Monta o payload (embed) de um card "username disponível". */
function buildAvailableCard(username, ts) {
  const embed = new EmbedBuilder().setDescription(`🎉 **@${username}**\ndisponível agora · <t:${ts}:R>`);
  return { embeds: [embed] };
}

/** Monta o payload (embed) de um card com título + linhas extras (sniper). */
function buildCard(lines) {
  const embed = new EmbedBuilder().setDescription(lines.join('\n'));
  return { embeds: [embed] };
}

// ─── Postagem universal: fórum (thread "users" persistente) ou texto ─────────

/**
 * Envia o payload no canal. Se for fórum:
 *  - reaproveita a thread da categoria já existente (threadId) quando possível;
 *  - cria a thread (nome = categoria) na primeira vez e retorna o novo ID.
 * Retorna o threadId (novo ou reaproveitado) ou null se for canal de texto.
 */
async function sendOrPost(ch, threadId, threadName, payload) {
  if (!ch) return null;

  if (ch.type === ChannelType.GuildForum) {
    if (threadId) {
      try {
        const thread = await ch.threads.fetch(threadId);
        if (thread) {
          await thread.send(payload);
          return threadId;
        }
      } catch { /* thread não existe mais — recria abaixo */ }
    }
    const thread = await ch.threads.create({ name: threadName, message: payload });
    return thread.id;
  }

  await ch.send(payload);
  return null;
}

// ─── Buscar canais configurados ───────────────────────────────────────────────

const CATEGORY_FIELD = {
  realwordpt: 'channelRealwordPt',
  realword:   'channelRealword',
  mixed:      'channelMixed',
  numbers:    'channelNumbers',
  sniper:     'channelSniper',
};

// Todas as categorias têm uma thread persistente própria (nomeada pela categoria)
// dentro do fórum configurado — reaproveitada a cada novo username encontrado.
const THREAD_FIELD = {
  realwordpt: 'threadRealwordPt',
  realword:   'threadRealword',
  mixed:      'threadMixed',
  numbers:    'threadNumbers',
  sniper:     'threadSniper',
};

async function getConfigsWithChannel(client, category) {
  const field = CATEGORY_FIELD[category];
  if (!field) return [];
  const configs = await prisma.sniperConfig.findMany({ where: { enabled: true } });
  const out = [];
  for (const cfg of configs) {
    const id = cfg[field];
    if (!id) continue;
    try {
      const ch = await client.channels.fetch(id);
      if (ch) out.push({ cfg, ch });
    } catch {}
  }
  return out;
}

/**
 * Posta o payload na thread persistente da categoria (criando-a na primeira vez)
 * em todos os canais/fóruns configurados para essa categoria.
 */
async function postToCategory(client, category, payload) {
  const targets     = await getConfigsWithChannel(client, category);
  const threadField = THREAD_FIELD[category];

  for (const { cfg, ch } of targets) {
    try {
      const currentThreadId = threadField ? cfg[threadField] : null;
      const newThreadId     = await sendOrPost(ch, currentThreadId, category, payload);
      if (threadField && newThreadId && newThreadId !== currentThreadId) {
        await prisma.sniperConfig.update({ where: { id: cfg.id }, data: { [threadField]: newThreadId } });
      }
    } catch (e) {
      console.error(`[SNIPER] Erro ao postar em ${ch.id}:`, e.message);
    }
  }

  return targets.length > 0;
}

// ─── Posta username disponível (word channels) ────────────────────────────────

async function postAvailable(client, username, category, detectedAt) {
  if (foundCache.has(username)) return;

  const cutoff = new Date(Date.now() - REPOST_DAYS * 86_400_000);
  const record = await prisma.sniperTarget.findUnique({ where: { username } });
  if (record?.postedAt && record.postedAt > cutoff) return;

  const ts = Math.floor((detectedAt ?? Date.now()) / 1000);

  const posted = await postToCategory(client, category, buildAvailableCard(username, ts));
  if (!posted) return;

  await prisma.sniperTarget.upsert({
    where:  { username },
    create: { username, category, detectedAt: new Date(detectedAt ?? Date.now()), postedAt: new Date() },
    update: { postedAt: new Date(), availableAt: new Date(), category },
  });

  foundCache.add(username);
  setTimeout(() => foundCache.delete(username), REPOST_DAYS * 86_400_000);
}

// ─── Posta "entrou na mira" (sniper channel) ──────────────────────────────────

export async function postSniperAlerta(client, oldUsername, droppedById, newUsername) {
  const payload = buildCard([
    `🎯 **@${oldUsername}** entrou na mira`,
    `<@${droppedById}> mudou pra **@${newUsername}** — vou avisar quando **@${oldUsername}** liberar.`,
    `Estimativa: entre **em um dia** e **em 14 dias** (sem regra exata do Discord). Verifico de tempos em tempos.`,
  ]);

  const posted = await postToCategory(client, 'sniper', payload);
  if (!posted) return;

  await prisma.sniperTarget.upsert({
    where:  { username: oldUsername },
    create: {
      username: oldUsername, category: 'sniper',
      droppedById, droppedByName: oldUsername, pickedByName: newUsername,
      detectedAt: new Date(), sniperAlerted: true,
    },
    update: {
      droppedById, droppedByName: oldUsername, pickedByName: newUsername,
      detectedAt: new Date(), sniperAlerted: true, postedAt: null,
    },
  });
}

// ─── Posta "LIBEROU!" (sniper channel) ───────────────────────────────────────

async function postSniperLiberou(client, target) {
  const ts  = Math.floor(target.detectedAt.getTime() / 1000);
  const who = target.droppedById
    ? `<@${target.droppedById}>`
    : `**@${target.droppedByName || 'usuário-desconhecido'}**`;
  const payload = buildCard([
    `🎉 **@${target.username}** LIBEROU!`,
    `Largado por ${who} · confirmado livre agora · <t:${ts}:R>`,
  ]);

  // Marca como postado ANTES de tentar enviar (evita re-tentativas paralelas)
  await prisma.sniperTarget.update({
    where: { id: target.id },
    data:  { postedAt: new Date(), availableAt: new Date() },
  });

  // Posta na mesma thread persistente "sniper" (nova mensagem, não thread separada)
  await postToCategory(client, 'sniper', payload);
}

// ─── Geradores ───────────────────────────────────────────────────────────────

/** Gera números aleatórios de 4-6 dígitos */
function generateNumbers(count = 15) {
  const nums = new Set();
  while (nums.size < count) {
    const digits = [4, 5, 6][Math.floor(Math.random() * 3)];
    const min    = 10 ** (digits - 1);
    const max    = 10 ** digits - 1;
    nums.add(String(Math.floor(min + Math.random() * (max - min))));
  }
  return [...nums];
}

/** Gera strings "mixed" de 4 chars alfanuméricos (ex: 2n6a, wpb8, 4hcq)
 *  Garantia: pelo menos 1 letra e 1 dígito.
 */
function generateMixed(count = 15) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const digits  = '0123456789';
  const all     = letters + digits;
  const results = new Set();

  while (results.size < count) {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += all[Math.floor(Math.random() * all.length)];
    }
    if (/[a-z]/.test(s) && /\d/.test(s)) results.add(s);
  }
  return [...results];
}

/** Retorna próximo lote da lista de palavras (PT ou EN) com rotação */
function nextBatch(arr, idxRef, size) {
  const batch = [];
  for (let i = 0; i < size; i++) {
    batch.push(arr[idxRef.v % arr.length]);
    idxRef.v++;
  }
  return batch;
}

// ─── Loop principal ───────────────────────────────────────────────────────────

async function checkBatch(client, words, category) {
  for (const word of words) {
    if (!running) return;
    if (foundCache.has(word)) { await sleep(100); continue; }
    const avail = await isAvailable(word);
    if (avail === true) await postAvailable(client, word, category, Date.now());
    await sleep(CHECK_DELAY);
  }
}

export async function startMonitor(client) {
  if (running) return;
  running = true;

  // Prepara listas de palavras reais (PT e EN) com rotação
  ptArr = shuffle([...ptWords]);
  enArr = shuffle([...enWords]);
  const ptRef = { v: 0 };
  const enRef = { v: 0 };

  console.log(`[SNIPER] Monitor iniciado. PT=${ptArr.length} EN=${enArr.length} | mixed+numbers gerados em tempo real.`);

  while (running) {
    try {
      // ── 1. Palavras PT reais ────────────────────────────────────────────
      await checkBatch(client, nextBatch(ptArr, ptRef, BATCH_SIZE), 'realwordpt');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── 2. Mixed: 4 chars alfanumérico aleatório (ex: 2n6a, wpb8) ──────
      await checkBatch(client, generateMixed(BATCH_SIZE), 'mixed');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── 3. Palavras EN reais ────────────────────────────────────────────
      await checkBatch(client, nextBatch(enArr, enRef, BATCH_SIZE), 'realword');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── 4. Mixed: mais um lote (canal mais ativo) ───────────────────────
      await checkBatch(client, generateMixed(BATCH_SIZE), 'mixed');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── 5. Números aleatórios (4-6 dígitos) ────────────────────────────
      await checkBatch(client, generateNumbers(BATCH_SIZE), 'numbers');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── 6. Targets sniper aguardando confirmação ────────────────────────
      const targets = await prisma.sniperTarget.findMany({
        where:   { category: 'sniper', sniperAlerted: true, postedAt: null },
        orderBy: { detectedAt: 'asc' },
        take:    10,
      });
      for (const t of targets) {
        if (!running) break;
        const avail = await isAvailable(t.username);
        if (avail === true) await postSniperLiberou(client, t);
        await sleep(CHECK_DELAY);
      }

      await sleep(CYCLE_PAUSE);

    } catch (err) {
      console.error('[SNIPER] Erro no loop:', err.message);
      await sleep(15_000);
    }
  }

  console.log('[SNIPER] Monitor parado.');
}

export function stopMonitor() {
  running = false;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
