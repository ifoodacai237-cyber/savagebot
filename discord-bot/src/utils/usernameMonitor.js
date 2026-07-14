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

// Sem delay artificial — a velocidade é governada pelo rate-limit do checker.
// Com tokens no pool, o checker já espera automaticamente quando necessário.
const WORKERS_PER_CATEGORY = 8;      // workers paralelos por categoria
const WORKER_START_OFFSET  = 150;    // ms de escalonamento no start (evita burst inicial)

// ─── Listas de palavras ───────────────────────────────────────────────────────

// ─── Geradores ────────────────────────────────────────────────────────────────
// Geram combinações pronunciáveis/aleatórias quase infinitas — sem lista fixa,
// igual ao bot de referência que acumula milhares de resultados.

const DIGITS      = '0123456789';
const ALPHA       = 'abcdefghijklmnopqrstuvwxyz';
const MIXED_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const VOWELS      = 'aeiou';
const CONSONANTS  = 'bcdfghjklmnprstvwxyz';

// Sílabas comuns do português para realwordpt
const SILAS_PT = [
  'al','an','ar','as','at','ba','be','bi','bo','bu','ca','ce','ci','co','cu',
  'da','de','di','do','du','el','em','en','er','es','fa','fe','fi','fo','fu',
  'ga','ge','gi','go','gu','ia','im','in','ir','is','it','ja','je','jo','ju',
  'la','le','li','lo','lu','ma','me','mi','mo','mu','na','ne','ni','no','nu',
  'ob','oc','od','of','ol','om','on','op','or','os','pa','pe','pi','po','pu',
  'ra','re','ri','ro','ru','sa','se','si','so','su','ta','te','ti','to','tu',
  'ul','um','un','ur','us','ut','va','ve','vi','vo','vu','xa','xe','xi','xo',
  'aba','aca','ada','ado','aga','aia','ala','ama','ana','ando','ando','anha',
  'ara','arca','ardo','aria','ario','arma','arro','arte','aste','atro','ava',
  'aza','eco','ecto','ego','eiro','ela','elo','ema','endo','enha','ento','era',
  'erna','erro','erta','erva','esta','eto','ezes','fica','fico','fora','foro',
  'gado','galo','gamo','gava','gera','gino','giro','gosa','goto','grao','gura',
  'inho','ismo','isto','ista','itar','itor','ivel','izou','lada','lado','lago',
  'lama','lamo','lara','lava','ledo','lela','lemo','lena','leno','lera','lesa',
  'leva','leza','liça','lida','lido','liga','ligo','lima','lina','lira','liso',
  'mica','mida','mido','miga','migo','mina','mira','miro','mona','mora','moro',
  'nada','nado','naga','namo','nara','naro','nasa','nata','nato','nava','neca',
  'neda','nedo','nega','nego','nela','nelo','nema','nena','neno','nera','nero',
  'nica','nido','niga','nimo','nina','nino','nira','nita','nito','niva','nivo',
  'onda','ondo','onga','ongo','onho','onto','onza','opla','opro','orça','ordo',
  'orna','orro','orsa','orso','orta','orte','orto','otão','ouca','ouco','ould',
  'oura','ouro','ousa','ouso','outa','outo','pado','pago','para','paro','pata',
  'pato','pava','peca','peco','peda','pedo','pega','pego','peia','pelo','pena',
  'peno','pera','pero','pesa','peso','peta','peto','peva','pevo','pica','pico',
  'rada','rado','raga','rago','raia','rala','ralo','rama','ramo','rana','rano',
  'rara','raro','rasa','raso','rata','rato','rava','ravo','raza','razo','reca',
  'reda','redo','rega','rego','reia','rela','relo','rema','remo','rena','reno',
  'resa','reso','reta','reto','rina','rino','rira','riro','risa','riso','rita',
  'sada','sado','saga','sago','saia','sala','salo','sama','samo','sana','sano',
  'sara','saro','sasa','sata','sato','sava','savo','seca','seco','seda','sedo',
  'sega','sego','sela','selo','sema','semo','sena','seno','sera','sero','sesa',
  'tado','tago','taia','tala','tamo','tana','tano','tara','taro','tasa','tata',
  'tato','tava','tavo','teca','teco','teda','tedo','tega','tego','tela','telo',
  'tema','temo','tena','teno','tera','tico','tina','tino','tira','tiro','tisa',
  'vada','vado','vaga','vago','vaia','vala','valo','vama','vamo','vana','vano',
  'vara','varo','vasa','vato','vava','veca','veco','veda','vedo','vega','vego',
  'zada','zado','zaga','zago','zaia','zala','zalo','zama','zamo','zana','zano',
];

// Sílabas comuns do inglês para realword
const SILAS_EN = [
  'ab','ac','ad','ag','al','am','an','ap','ar','as','at','av','aw','ax','ay',
  'ba','be','bi','bl','bo','br','bu','by','ca','ce','ch','ci','cl','co','cr',
  'cu','da','de','di','do','dr','du','dy','ea','ed','el','em','en','er','es',
  'et','ex','fa','fe','fi','fl','fo','fr','fu','ga','ge','gh','gl','go','gr',
  'gu','ha','he','hi','ho','hu','hy','id','il','im','in','io','ir','is','it',
  'ja','je','jo','ju','ke','ki','kn','la','le','li','lo','lu','ly','ma','me',
  'mi','mo','mu','my','na','ne','ni','no','nu','ob','oc','od','of','ol','om',
  'on','op','or','os','ov','pa','pe','ph','pi','pl','po','pr','pu','qu','ra',
  're','ri','ro','ru','sa','sc','se','sh','si','sk','sl','sm','sn','so','sp',
  'sq','st','su','sw','sy','ta','te','th','ti','to','tr','tu','ty','ul','un',
  'up','ur','us','va','ve','vi','vo','wa','we','wh','wi','wo','wr','ya','ye',
  'able','acle','aded','aged','aled','amed','aned','aped','ared','ased','ated',
  'aved','awed','axed','ayed','bled','ched','cked','cled','dged','died','dled',
  'dned','eled','emed','ened','ered','esed','eted','eved','ewed','exed','eyed',
  'fied','fled','fted','gled','gned','gued','ided','iled','imed','ined','iped',
  'ired','ised','ited','ived','ized','jled','ked','kled','lded','lled','lmed',
  'lned','lped','lred','lsed','lted','lved','mbed','mied','mmed','mned','mped',
  'mred','msed','mted','mved','nced','nded','nged','nied','nked','nned','nred',
  'nsed','nted','nued','nved','oded','oged','oled','omed','oned','oped','ored',
  'osed','oted','oved','owed','oxed','oyed','ozing','ping','ring','ting','ling',
  'sing','ding','king','wing','ning','ming','bing','hing','ying','zing','ging',
  'ness','less','ment','tion','sion','ance','ence','ture','ures','ings','edly',
  'ably','ibly','edly','erly','enly','erly','ster','ling','ward','wise','like',
  'ful','ous','ive','ish','ing','est','ier','ied','ing','ity','ize','ise',
];

function rand(arr)        { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min,max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/** Gera string pronunciável usando sílabas e padrões vogal/consoante */
function pronounceable(silas, minLen, maxLen) {
  const target = randInt(minLen, maxLen);
  let word = '';
  while (word.length < target) {
    const sila = rand(silas);
    if (word.length + sila.length <= maxLen) word += sila;
    else break;
  }
  // Completa com vogal/consoante alternados se curto
  while (word.length < minLen) {
    word += (word.length % 2 === 0) ? rand([...CONSONANTS]) : rand([...VOWELS]);
  }
  return word.slice(0, maxLen);
}

// short: 3-5 letras minúsculas puras
function generateShort() {
  const len = randInt(3, 5);
  return Array.from({ length: len }, () => rand([...ALPHA])).join('');
}

// numbers: sequência numérica pura (5-7 dígitos)
function generateNumbers() {
  const digits = randInt(5, 7);
  const min    = Math.pow(10, digits - 1);
  const max    = Math.pow(10, digits) - 1;
  return String(randInt(min, max));
}

// rare: 2-3 letras puras
function generateRare() {
  const len = randInt(2, 3);
  return Array.from({ length: len }, () => rand([...ALPHA])).join('');
}

// realword: palavra pronunciável em inglês (6-12 chars)
function generateRealwordEN() {
  return pronounceable(SILAS_EN, 6, 12);
}

// realwordpt: palavra pronunciável em português (6-14 chars)
function generateRealwordPT() {
  return pronounceable(SILAS_PT, 6, 14);
}

// mixed: exatamente 4 chars, ao menos 1 letra e 1 dígito
function generateMixed() {
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

let _running   = false;
let _stopped   = false;
let _checked   = 0;
let _found     = 0;
let _startedAt = null;
// stats por categoria
const _catStats = {};

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
    _catStats[category] = (_catStats[category] ?? 0) + 1;
    console.log(`[MONITOR:${category}] ✅ @${username}`);
    await postToChannels(username, category, client);
  } catch (err) {
    console.error(`[MONITOR] Erro ao salvar @${username}:`, err.message);
  }
}

/** Verifica targets pessoais (/snipe_add) e notifica por DM */
async function checkPersonalTargets(client) {
  try {
    const targets = await prisma.sniperTarget.findMany({
      where: { addedByUserId: { not: null }, postedAt: null },
    });
    for (const target of targets) {
      if (_stopped) return;
      const avail = await isAvailable(target.username);
      if (avail !== true) continue;
      await prisma.sniperTarget.update({
        where: { id: target.id },
        data:  { postedAt: new Date() },
      });
      _found++;
      try {
        if (target.addedByUserId && client) {
          const user = await client.users.fetch(target.addedByUserId).catch(() => null);
          if (user) {
            await user.send({
              embeds: [{
                color: 0x57F287,
                title: '✅ Username Disponível!',
                description: `O username **@${target.username}** está **DISPONÍVEL** agora!\n\nCorra para trocar antes que alguém pegue!`,
                footer: { text: 'Fallen Angels Sniper' },
                timestamp: new Date().toISOString(),
              }],
            }).catch(() => {});
          }
        }
      } catch {}
      console.log(`[MONITOR] 🎯 Personal target disponível: @${target.username}`);
      await sleep(DELAY_MS);
    }
  } catch (err) {
    console.error('[MONITOR] Erro ao checar targets pessoais:', err.message);
  }
}

/**
 * Worker de checagem para uma categoria.
 * Múltiplos workers da mesma categoria compartilham o mesmo `seen` Set
 * para não checar o mesmo username duas vezes.
 */
async function categoryWorker(category, workerId, client) {
  const gen = GENERATORS[category];

  console.log(`[MONITOR:${category}#${workerId}] ▶ Worker iniciado.`);

  while (!_stopped) {
    try {
      const username = gen();
      if (username.length < 2 || username.length > 32) continue;

      _checked++;

      const avail = await isAvailable(username);
      if (avail === true) {
        await saveAvailable(username, category, client);
      }
      // Sem sleep aqui — o checker.js já governa velocidade via rate-limit do Discord.
      // Quando todos os tokens estão em cooldown, isAvailable() aguarda automaticamente.
    } catch (err) {
      console.error(`[MONITOR:${category}#${workerId}] Erro:`, err.message);
      await sleep(5_000);
    }
  }

  console.log(`[MONITOR:${category}#${workerId}] ⏹ Worker parado.`);
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function startMonitor(client) {
  if (_running) {
    console.warn('[MONITOR] Já está rodando.');
    return;
  }
  _running   = true;
  _stopped   = false;
  _startedAt = new Date();

  // Carrega categorias ativas (canais configurados)
  const channels = await prisma.publishChannel.findMany({});
  const cats = [...new Set(channels.map(c => c.category))].filter(c => GENERATORS[c]);
  const categories = cats.length ? cats : Object.keys(GENERATORS);

  const total = categories.length * WORKERS_PER_CATEGORY;
  console.log(`[MONITOR] 🚀 ${categories.length} cats × ${WORKERS_PER_CATEGORY} workers = ${total} workers | cats: ${categories.join(', ')}`);

  // Escalonamento: workers arrancam com WORKER_START_OFFSET ms de diferença entre si,
  // espalhando o burst inicial de requisições.
  let slot = 0;
  categories.forEach(cat => {
    for (let w = 0; w < WORKERS_PER_CATEGORY; w++) {
      const delay = slot * WORKER_START_OFFSET;
      slot++;
      setTimeout(() => {
        categoryWorker(cat, w, client).catch(err => {
          console.error(`[MONITOR:${cat}#${w}] Worker encerrado com erro:`, err.message);
        });
      }, delay);
    }
  });

  // Targets pessoais checados a cada 5 minutos num loop separado
  const personalInterval = setInterval(async () => {
    if (_stopped) { clearInterval(personalInterval); return; }
    await checkPersonalTargets(client);
  }, 5 * 60 * 1000);
}

export function stopMonitor() {
  _stopped = true;
  _running = false;
  console.log('[MONITOR] ⏹️ Monitor parado.');
}

export function getMonitorStats() {
  return {
    running:   _running,
    checked:   _checked,
    found:     _found,
    startedAt: _startedAt,
    porCategoria: { ..._catStats },
  };
}
