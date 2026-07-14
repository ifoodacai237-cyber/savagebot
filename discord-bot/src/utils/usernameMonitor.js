/**
 * usernameMonitor.js
 *
 * Monitor automático de usernames disponíveis no Discord.
 * - Gera usernames por categoria (short, numbers, realword, realwordpt, mixed)
 * - Checa disponibilidade via checker.js (respeita rate-limit com pool de tokens)
 * - Salva no banco (SniperTarget) com postedAt = now() quando disponível
 * - Também checa targets pessoais (/snipe_add) e notifica via DM
 */

import prisma from '../database/client.js';
import { isAvailable } from './checker.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const DELAY_MS             = 1800;   // ms entre cada checagem (1 req/1.8s ≈ 33/min)
const PERSONAL_CHECK_EVERY = 60;     // checa targets pessoais a cada N usernames gerados
const MAX_QUEUE            = 500;    // máx de usernames na fila antes de parar de gerar

// ─── Listas de palavras ───────────────────────────────────────────────────────

const WORDS_EN = [
  'storm','ghost','void','apex','nexus','realm','quest','legend','myth','prime',
  'dark','light','fire','water','earth','wind','shadow','alpha','beta','gamma',
  'delta','omega','ultra','mega','super','hyper','cyber','matrix','zenith','core',
  'blade','frost','blaze','echo','nova','pixel','viper','wolf','raven','fox',
  'hawk','lynx','owl','crow','elk','bear','lion','tiger','crane','swift',
  'ash','oak','pine','cedar','maple','stone','cliff','ridge','vale','crest',
  'war','dawn','dusk','night','noon','eve','fate','soul','veil','mark',
  'ace','arc','ark','aura','bolt','bone','byte','code','coin','cult',
  'flux','fog','hex','ice','ink','ion','ivy','jade','jet','key',
  'lab','lake','lore','maze','mode','moon','myth','net','node','null',
  'orb','path','peak','plex','pod','port','ray','rift','ring','rock',
  'rune','rush','sage','salt','sand','seal','seed','shard','sign','silk',
  'sky','slag','snow','span','spec','spin','star','stem','step','sun',
  'sync','tab','tag','tide','tower','trace','trail','trap','tree','tribe',
  'tune','twin','type','unit','vex','view','vine','vista','warp','wave',
  'web','wire','zone','zap','zen',
];

const WORDS_PT = [
  'sol','lua','estrela','noite','dia','ceu','vento','agua','fogo','terra',
  'mar','rio','neve','gelo','raio','trovao','chuva','luz','sombra','brilho',
  'puro','claro','escuro','veloz','forte','raro','fino','livre','fiel','bravo',
  'lobo','leao','aguia','onca','urso','falcao','cobra','raposa','corvo','tigre',
  'rosa','flor','pedra','areia','nuvem','praia','morro','campo','selva','gruta',
  'ouro','prata','ferro','arame','cristal','rubi','safira','esmeralda','jade',
  'alma','voz','eco','elo','fio','faca','arco','lanca','escudo','manto',
  'rei','rainha','heroi','lenda','mito','saga','bardo','guerreiro','mago',
  'fada','gnomo','elfo','dragao','fenix','kraken','golem','titan','deus',
];

// ─── Gerador ──────────────────────────────────────────────────────────────────

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateShort() {
  const len = randInt(2, 5);
  return Array.from({ length: len }, () => rand([...CHARS])).join('');
}

function generateNumbers() {
  const word = rand([...WORDS_EN, ...WORDS_PT]).slice(0, 10);
  const n    = randInt(1, 9999);
  return `${word}${n}`;
}

function generateRealwordEN() {
  const word = rand(WORDS_EN);
  // às vezes adiciona sufixo numérico pequeno
  const suffix = Math.random() < 0.3 ? String(randInt(1, 99)) : '';
  return `${word}${suffix}`;
}

function generateRealwordPT() {
  const word = rand(WORDS_PT);
  const suffix = Math.random() < 0.3 ? String(randInt(1, 99)) : '';
  return `${word}${suffix}`;
}

function generateMixed() {
  const word = rand([...WORDS_EN, ...WORDS_PT]).slice(0, 12);
  const pick = randInt(0, 2);
  if (pick === 0) return `${word}${randInt(0, 999)}`;
  if (pick === 1) return `${word}_${rand([...ALPHA])}`;
  return `${rand([...ALPHA])}_${word}`;
}

const GENERATORS = {
  short:      generateShort,
  numbers:    generateNumbers,
  realword:   generateRealwordEN,
  realwordpt: generateRealwordPT,
  mixed:      generateMixed,
};

// ─── Monitor ──────────────────────────────────────────────────────────────────

let _running   = false;
let _stopped   = false;
let _checked   = 0;
let _found     = 0;
let _startedAt = null;

// Categorias ativas com base nos canais configurados + lista padrão
async function getActiveCategories() {
  const channels = await prisma.publishChannel.findMany({});
  const cats = channels.map(c => c.category).filter(c => GENERATORS[c]);
  // Sempre inclui ao menos essas se não tiver canais configurados
  if (!cats.length) return ['short', 'numbers', 'realword', 'realwordpt', 'mixed'];
  // Adiciona categorias extra para variedade
  const extra = ['short', 'numbers'].filter(c => !cats.includes(c));
  return [...new Set([...cats, ...extra])];
}

/** Verifica targets pessoais (/snipe_add) e notifica por DM */
async function checkPersonalTargets(client) {
  try {
    const targets = await prisma.sniperTarget.findMany({
      where: { addedByUserId: { not: null }, postedAt: null },
    });
    if (!targets.length) return;

    for (const target of targets) {
      const avail = await isAvailable(target.username);
      if (avail !== true) continue;

      // Marca como encontrado
      await prisma.sniperTarget.update({
        where: { id: target.id },
        data:  { postedAt: new Date() },
      });
      _found++;

      // Tenta enviar DM para o usuário
      try {
        if (target.addedByUserId) {
          const user = await client.users.fetch(target.addedByUserId).catch(() => null);
          if (user) {
            await user.send({
              embeds: [{
                color: 0x57F287,
                title: '✅ Username Disponível!',
                description: `O username **@${target.username}** que você adicionou ao monitoramento está **DISPONÍVEL** agora!\n\nCorra para trocar no Discord antes que alguém pegue!`,
                footer: { text: 'Fallen Angels Sniper' },
                timestamp: new Date().toISOString(),
              }],
            }).catch(() => {});
          }
        }
      } catch {}

      console.log(`[MONITOR] 🎯 Personal target disponível: @${target.username}`);
    }
  } catch (err) {
    console.error('[MONITOR] Erro ao checar targets pessoais:', err.message);
  }
}

/** Salva username disponível no banco */
async function saveAvailable(username, category) {
  try {
    // Upsert — se já existir (ex: adicionado via /snipe_add), atualiza
    await prisma.sniperTarget.upsert({
      where:  { username },
      create: { username, category, postedAt: new Date() },
      update: { postedAt: new Date(), category },
    });
    _found++;
    console.log(`[MONITOR] ✅ Disponível: @${username} (${category})`);
  } catch (err) {
    console.error(`[MONITOR] Erro ao salvar @${username}:`, err.message);
  }
}

/** Loop principal do monitor */
async function monitorLoop(client) {
  const seen     = new Set();
  let   catIndex = 0;
  let   counter  = 0;

  while (!_stopped) {
    try {
      const categories = await getActiveCategories();
      const category   = categories[catIndex % categories.length];
      catIndex++;

      const gen      = GENERATORS[category] ?? generateMixed;
      const username = gen();

      // Ignora duplicatas nessa sessão
      if (seen.has(username) || username.length < 2 || username.length > 32) {
        await sleep(50);
        continue;
      }
      seen.add(username);

      // Limpa o set se ficar muito grande
      if (seen.size > 50_000) seen.clear();

      _checked++;
      counter++;

      const avail = await isAvailable(username);
      if (avail === true) {
        await saveAvailable(username, category);
      }

      // A cada N usernames checa também os targets pessoais
      if (counter % PERSONAL_CHECK_EVERY === 0 && client) {
        await checkPersonalTargets(client);
      }

      await sleep(DELAY_MS);
    } catch (err) {
      console.error('[MONITOR] Erro no loop:', err.message);
      await sleep(5000);
    }
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function startMonitor(client) {
  if (_running) {
    console.warn('[MONITOR] Já está rodando.');
    return;
  }
  _running   = true;
  _stopped   = false;
  _startedAt = new Date();
  console.log('[MONITOR] 🚀 Monitor de usernames iniciado.');
  monitorLoop(client).catch(err => {
    console.error('[MONITOR] Loop encerrado com erro:', err);
    _running = false;
  });
}

export function stopMonitor() {
  _stopped = true;
  _running = false;
  console.log('[MONITOR] ⏹️ Monitor parado.');
}

export function getMonitorStats() {
  return {
    running:  _running,
    checked:  _checked,
    found:    _found,
    startedAt: _startedAt,
  };
}
