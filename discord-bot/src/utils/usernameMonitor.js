/**
 * usernameMonitor.js
 * Motor de sniper de usernames:
 *  - Verifica disponibilidade de palavras PT/EN/numbers/mixed
 *  - Rastreia targets do canal sniper (via userUpdate)
 *  - Posta nos canais configurados quando disponível
 */

import prisma from '../database/client.js';
import { ptWords } from '../lists/words-pt.js';
import { enWords } from '../lists/words-en.js';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DISCORD_API   = 'https://discord.com/api/v10';
const CHECK_DELAY   = 1_500;   // 1.5s entre chamadas (evita rate limit)
const BATCH_SIZE    = 15;      // usernames por ciclo de palavra
const CYCLE_PAUSE   = 20_000;  // pausa entre lotes (20s)
const REPOST_DAYS   = 7;       // não re-anuncia se postou há menos de X dias

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Estado interno ───────────────────────────────────────────────────────────

let running       = false;
let ptArr         = null;  // Array de palavras PT
let enArr         = null;  // Array de palavras EN
let ptIdx         = 0;
let enIdx         = 0;
const foundCache  = new Set(); // evita re-checar recém-anunciados

// ─── Verificação de disponibilidade ──────────────────────────────────────────

/**
 * Retorna true se o username está disponível, false se está ocupado, null em erro/rate-limit.
 */
export async function isAvailable(username) {
  try {
    const res = await fetch(`${DISCORD_API}/unique-username/username-attempt-unauthed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (res.status === 429) {
      const retry = Number(res.headers.get('Retry-After') || 5);
      console.warn(`[SNIPER] Rate limited. Aguardando ${retry}s…`);
      await sleep(retry * 1_000);
      return null;
    }

    if (!res.ok) return null;

    const data = await res.json();
    // Discord retorna { taken: true/false }
    if (typeof data.taken === 'boolean') return !data.taken;
    return null;
  } catch {
    return null;
  }
}

// ─── Classificação de usernames ───────────────────────────────────────────────

export function classifyUsername(username) {
  const lower = username.toLowerCase();
  if (/^\d+$/.test(lower))                          return 'numbers';
  if (ptWords.has(lower))                           return 'realwordpt';
  if (enWords.has(lower))                           return 'realword';
  if (/[a-z]/i.test(lower) && /\d/.test(lower))    return 'mixed';
  return 'realword'; // palavra pura sem lista → usa realword como fallback
}

// ─── Postagem nos canais ──────────────────────────────────────────────────────

const CATEGORY_FIELD = {
  realwordpt: 'channelRealwordPt',
  realword:   'channelRealword',
  mixed:      'channelMixed',
  numbers:    'channelNumbers',
  sniper:     'channelSniper',
};

async function getChannels(client, category) {
  const field   = CATEGORY_FIELD[category];
  if (!field) return [];
  const configs = await prisma.sniperConfig.findMany({ where: { enabled: true } });
  const chs     = [];
  for (const cfg of configs) {
    const id = cfg[field];
    if (!id) continue;
    try { chs.push(await client.channels.fetch(id)); } catch {}
  }
  return chs.filter(Boolean);
}

/** Anuncia username disponível no canal correto */
async function postAvailable(client, username, category, detectedAt) {
  if (foundCache.has(username)) return;

  // Checa DB — evita re-postar no período de REPOST_DAYS
  const cutoff = new Date(Date.now() - REPOST_DAYS * 86_400_000);
  const record = await prisma.sniperTarget.findUnique({ where: { username } });
  if (record?.postedAt && record.postedAt > cutoff) return;

  const ts  = Math.floor((detectedAt ?? Date.now()) / 1000);
  const chs = await getChannels(client, category);
  if (!chs.length) return;

  // Salva/atualiza no DB
  await prisma.sniperTarget.upsert({
    where:  { username },
    create: { username, category, detectedAt: new Date(detectedAt ?? Date.now()), postedAt: new Date() },
    update: { postedAt: new Date(), availableAt: new Date(), category },
  });

  foundCache.add(username);
  setTimeout(() => foundCache.delete(username), REPOST_DAYS * 86_400_000);

  const msg = `🎉 **@${username}**\ndisponível agora · <t:${ts}:R>`;
  for (const ch of chs) {
    try { await ch.send(msg); } catch (e) {
      console.error(`[SNIPER] Erro ao postar em ${ch.id}:`, e.message);
    }
  }
}

/** Anuncia "entrou na mira" no canal sniper */
export async function postSniperAlerta(client, oldUsername, droppedById, newUsername) {
  const chs = await getChannels(client, 'sniper');
  if (!chs.length) return;

  const ts  = Math.floor(Date.now() / 1000);
  const msg = [
    `🎯 **@${oldUsername}** entrou na mira`,
    `<@${droppedById}> mudou pra **@${newUsername}** — vou avisar quando **@${oldUsername}** liberar.`,
    `Estimativa: entre **em um dia** e **em 14 dias** (sem regra exata do Discord). Verifico de tempos em tempos.`,
  ].join('\n');

  // Salva no DB
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

  for (const ch of chs) {
    try { await ch.send(msg); } catch (e) {
      console.error(`[SNIPER] Erro ao postar sniper em ${ch.id}:`, e.message);
    }
  }
}

/** Anuncia "LIBEROU!" para target do sniper */
async function postSniperLiberou(client, target) {
  const chs = await getChannels(client, 'sniper');
  if (!chs.length) return;

  const ts  = Math.floor(target.detectedAt.getTime() / 1000);
  const who = target.droppedById ? `<@${target.droppedById}>` : `**@${target.droppedByName || 'usuário-desconhecido'}**`;
  const msg = `🎉 **@${target.username}** LIBEROU!\nLargado por ${who} · confirmado livre agora · <t:${ts}:R>`;

  await prisma.sniperTarget.update({
    where: { id: target.id },
    data:  { postedAt: new Date(), availableAt: new Date() },
  });

  for (const ch of chs) {
    try { await ch.send(msg); } catch (e) {
      console.error(`[SNIPER] Erro ao postar LIBEROU em ${ch.id}:`, e.message);
    }
  }
}

// ─── Geração de números ───────────────────────────────────────────────────────

function randomNumbers(count = 10) {
  const nums = [];
  while (nums.length < count) {
    const digits = Math.random() < 0.5 ? 5 : 6;
    const min    = 10 ** (digits - 1);
    const max    = 10 ** digits - 1;
    nums.push(String(Math.floor(min + Math.random() * (max - min))));
  }
  return nums;
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

  // Prepara arrays embaralhados
  ptArr = shuffle([...ptWords]);
  enArr = shuffle([...enWords]);
  ptIdx = 0;
  enIdx = 0;

  console.log(`[SNIPER] Monitor iniciado (${ptArr.length} PT, ${enArr.length} EN).`);

  while (running) {
    try {
      // ── Lote PT ─────────────────────────────────────────────────────────
      const ptBatch = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        ptBatch.push(ptArr[ptIdx % ptArr.length]);
        ptIdx++;
      }
      await checkBatch(client, ptBatch, 'realwordpt');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── Lote EN ─────────────────────────────────────────────────────────
      const enBatch = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        enBatch.push(enArr[enIdx % enArr.length]);
        enIdx++;
      }
      await checkBatch(client, enBatch, 'realword');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── Números aleatórios ───────────────────────────────────────────────
      await checkBatch(client, randomNumbers(8), 'numbers');
      if (!running) break;
      await sleep(CYCLE_PAUSE);

      // ── Targets sniper aguardando confirmação ────────────────────────────
      const targets = await prisma.sniperTarget.findMany({
        where:   { category: 'sniper', sniperAlerted: true, postedAt: null },
        orderBy: { detectedAt: 'asc' },
        take:    5,
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

// ─── Utilitário ───────────────────────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
