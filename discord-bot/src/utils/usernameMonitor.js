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

// Palavras em inglês — reais, variadas, sem números (para realword)
const WORDS_EN = [
  'absolving','accruing','aching','adopting','adoring','adrift','affirming','aglow',
  'aligning','alluring','aloft','altering','ambling','amusing','anchored','angling',
  'arching','ardent','arising','arousing','arresting','ascending','ashen','aspiring',
  'asserting','attaining','attuned','averting','awoken','baffling','beguiling',
  'believing','bewildering','blending','blinding','blooming','blunting','bracing',
  'braiding','bridging','brooding','burning','calming','carving','cascading',
  'catching','chasing','circling','claiming','climbing','clouding','coiling',
  'collecting','confiding','converging','cooling','coursing','covering','craving',
  'creeping','crossing','crouching','crushing','curling','curving','cutting',
  'daring','darting','dawning','deceiving','declaring','deepening','deflecting',
  'departing','descending','devouring','dimming','discerning','dispersing','diving',
  'drifting','drowning','dwelling','echoing','edging','emerging','enduring',
  'erasing','escaping','evolving','fading','falling','faltering','fearing','fleeing',
  'floating','flowing','flurrying','focusing','following','forging','forsaking',
  'fracturing','freezing','gathering','gazing','gleaming','gliding','glowing',
  'grasping','grounding','growing','guiding','haunting','hovering','hunting',
  'igniting','invoking','isolating','journeying','kindling','lasting','leaning',
  'lifting','lingering','listening','looming','lurking','mending','merging',
  'mirroring','mourning','narrowing','nearing','observing','opening','orbiting',
  'outlasting','overcoming','passing','persisting','piercing','plunging','prevailing',
  'prowling','pursuing','reaching','receding','reflecting','reforming','releasing',
  'remaining','renewing','resisting','restoring','retreating','returning','revealing',
  'rising','roaming','roaring','rushing','scaling','scanning','scattering','seeking',
  'sensing','separating','severing','shadowing','shielding','shifting','shining',
  'silencing','soaring','softening','soothing','spiraling','spreading','standing',
  'steadying','stirring','striking','striving','subduing','surging','sustaining',
  'swaying','sweeping','swimming','tearing','threading','tracing','trailing',
  'transcending','transforming','traversing','trembling','turning','unfolding',
  'unraveling','vanishing','veiling','wandering','watching','weathering','weaving',
  'withstanding','yielding','bechuana','moviolas','sordidity','submarining',
  'inexhausted','falconry','glimmers','tethered','vaulting','wistful','zealous',
  'arduous','blazing','brittle','callous','cryptic','devious','elusive','fervent',
  'furious','gallant','ghostly','hapless','immense','jagged','lawless','listless',
  'molten','nebulous','obscure','ominous','pallid','restless','ruinous','serene',
  'sinuous','somber','spectral','tenuous','valiant','verdant','voracious',
];

// Palavras em português — verbos conjugados, adjetivos, substantivos reais
const WORDS_PT = [
  'conviveram','chorarias','jazentio','fonautografia','agonizando','alcancando',
  'almejando','amortecer','ansiando','apartando','apaziguar','aprisionado',
  'ardendo','arrepiando','assombrando','atordoando','aturdir','avancando',
  'brilhando','buscando','caindo','caminhar','capturando','carregando','cedendo',
  'cercando','clamar','colidindo','conquistando','correndo','cortando','criando',
  'cruzando','cuidando','deslizando','desmoronar','despertar','destruindo',
  'dominando','emergindo','encontrando','enfrentando','enganando','envolvendo',
  'errando','escapando','espalhando','esperando','estilhacando','existindo',
  'expandindo','fechando','flutuando','forjando','fugindo','fundindo','ganhando',
  'girando','governando','guardando','guerreando','iluminando','implorando',
  'incendiando','invocando','isolando','lagrimas','lancando','libertando',
  'longevidade','lutando','mergulhando','mudando','nascendo','navegando',
  'obscurecendo','ondulando','partindo','perseguindo','persistindo','procurando',
  'projetando','protegendo','quebrando','queimando','rastejando','reconstruindo',
  'refletindo','reinando','renascendo','resistindo','ressoando','retornando',
  'revelando','rondando','rugindo','sacrificando','salvando','sangrado',
  'sentindo','separando','sombrio','sonhando','sufocando','superando','sussurrando',
  'tocando','transformando','tremendo','ultrapassando','unindo','vagando',
  'vencendo','viajando','vivendo','voando','voltando','acalmar','admirar',
  'afogar','agredir','alcancar','aliviar','ameacar','ampliar','aniquilar',
  'apagar','aprender','arriscar','assombrar','atravessar','carregar','combater',
  'cumprir','derrotar','desviar','empurrar','encarar','esconder','fracassar',
  'glorificar','iluminar','impedir','libertar','marchar','obscurecer','permanecer',
  'recuar','rejeitar','romper','seguir','silenciar','sobreviver','triunfar',
];

// ─── Gerador ──────────────────────────────────────────────────────────────────

const DIGITS = '0123456789';
const ALPHA  = 'abcdefghijklmnopqrstuvwxyz';
// MIXED_CHARS tem letras e dígitos em proporção equilibrada para gerar padrões tipo sf9d
const MIXED_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// short: 3-5 letras minúsculas puras
function generateShort() {
  const len = randInt(3, 5);
  return Array.from({ length: len }, () => rand([...ALPHA])).join('');
}

// numbers: sequência numérica pura (5-7 dígitos) — igual ao print: 82571, 548941
function generateNumbers() {
  const digits = randInt(5, 7);
  const min    = Math.pow(10, digits - 1);
  const max    = Math.pow(10, digits) - 1;
  return String(randInt(min, max));
}

// rare: 2-3 letras puras (ultra raros e disputados)
function generateRare() {
  const len = randInt(2, 3);
  return Array.from({ length: len }, () => rand([...ALPHA])).join('');
}

// realword: palavra real em inglês, sem números — igual ao print: inexhausted, submarining
function generateRealwordEN() {
  return rand(WORDS_EN);
}

// realwordpt: palavra/verbo real em português, sem números — igual ao print: conviveram, chorarias
function generateRealwordPT() {
  return rand(WORDS_PT);
}

// mixed: exatamente 4 chars, pelo menos 1 letra e 1 dígito — igual ao print: sf9d, 8u3g, qk3c
function generateMixed() {
  // Gera 4 chars e garante ao menos 1 dígito e 1 letra
  const arr = Array.from({ length: 4 }, () => rand([...MIXED_CHARS]));
  if (!arr.some(c => DIGITS.includes(c)))   arr[randInt(1, 3)] = rand([...DIGITS]);
  if (!arr.some(c => ALPHA.includes(c)))    arr[randInt(0, 2)] = rand([...ALPHA]);
  return arr.join('');
}

const GENERATORS = {
  short:      generateShort,
  numbers:    generateNumbers,
  realword:   generateRealwordEN,
  realwordpt: generateRealwordPT,
  mixed:      generateMixed,
  rare:       generateRare,
};

// ─── Monitor ──────────────────────────────────────────────────────────────────

let _running   = false;
let _stopped   = false;
let _checked   = 0;
let _found     = 0;
let _startedAt = null;

// Categorias ativas = exatamente o que os canais configurados pedem
async function getActiveCategories() {
  const channels = await prisma.publishChannel.findMany({});
  const cats = [...new Set(channels.map(c => c.category))].filter(c => GENERATORS[c]);
  // Sem canais configurados → gera tudo
  if (!cats.length) return Object.keys(GENERATORS);
  return cats;
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

/** Posta imediatamente em todos os canais configurados para a categoria */
async function postToChannels(username, category, client) {
  if (!client) return;
  try {
    const configs = await prisma.publishChannel.findMany({ where: { category } });
    if (!configs.length) return;

    const ts = Math.floor(Date.now() / 1000);

    for (const cfg of configs) {
      const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (!ch) continue;
      await ch.send({
        embeds: [{
          description: `🎇 **@${username}**\ndisponível agora · <t:${ts}:R>`,
          color: 0x2b2d31,
        }],
      }).catch(err => console.error(`[MONITOR] Erro ao postar em ${cfg.channelId}:`, err.message));
    }
  } catch (err) {
    console.error(`[MONITOR] Erro ao buscar canais para ${category}:`, err.message);
  }
}

/** Salva username disponível no banco e posta imediatamente nos canais */
async function saveAvailable(username, category, client) {
  try {
    await prisma.sniperTarget.upsert({
      where:  { username },
      create: { username, category, postedAt: new Date() },
      update: { postedAt: new Date(), category },
    });
    _found++;
    console.log(`[MONITOR] ✅ Disponível: @${username} (${category})`);
    await postToChannels(username, category, client);
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
        await saveAvailable(username, category, client);
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
