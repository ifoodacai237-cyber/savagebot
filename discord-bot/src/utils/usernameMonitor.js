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

// ─── Geradores ────────────────────────────────────────────────────────────────

const DIGITS      = '0123456789';
const ALPHA       = 'abcdefghijklmnopqrstuvwxyz';
const MIXED_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function rand(arr)        { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min,max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── Lista PT (verbos, substantivos, adjetivos reais em português) ─────────────
const WORDS_PT = [
  // gerúndio
  'agonizando','alcancando','almejando','ansiando','apartando','ardendo','arrepiando',
  'assombrando','atordoando','avancando','brilhando','buscando','caindo','capturando',
  'carregando','cedendo','cercando','colidindo','conquistando','correndo','cortando',
  'criando','cruzando','cuidando','deslizando','destruindo','dominando','emergindo',
  'encontrando','enfrentando','enganando','envolvendo','errando','escapando','espalhando',
  'esperando','existindo','expandindo','fechando','flutuando','forjando','fugindo',
  'fundindo','ganhando','girando','governando','guardando','guerreando','iluminando',
  'implorando','incendiando','invocando','isolando','lancando','libertando','lutando',
  'mergulhando','mudando','nascendo','navegando','obscurecendo','ondulando','partindo',
  'perseguindo','persistindo','procurando','projetando','protegendo','quebrando',
  'queimando','rastejando','reconstruindo','refletindo','reinando','renascendo',
  'resistindo','ressoando','retornando','revelando','rondando','rugindo','sacrificando',
  'salvando','sentindo','separando','sonhando','sufocando','superando','sussurrando',
  'tocando','transformando','tremendo','ultrapassando','unindo','vagando','vencendo',
  'viajando','vivendo','voando','voltando','absorvendo','aceitando','acolhendo',
  'admirando','afastando','agarrando','agitando','ajudando','alinhando','alterando',
  'aniquilando','apagando','aprendendo','arriscando','atravessando','combatendo',
  'cumpindo','derrotando','desviando','empurrando','encarando','escondendo',
  'fracassando','glorificando','impedindo','libertando','marchando','permanecendo',
  'recuando','rejeitando','rompendo','silenciando','sobrevivendo','triunfando',
  'abarcando','absorvendo','acertando','acompanhando','acorrendo','acrescentando',
  'adiantando','admirando','adotando','afirmando','agradando','agredindo','aguardando',
  'alargando','alertando','alivando','amando','ameacando','ampliando','ancorando',
  'angustiando','aniquilando','antecipando','apagando','apaixonando','aplaudindo',
  'apontando','apostando','aprovando','arranhando','assolando','atendendo','atingindo',
  'atirando','atraindo','aumentando','avaliando','batendo','bloqueando','brilhando',
  'caçando','cativando','causando','celebrando','chegando','chocando','chorando',
  'clamorando','cobrando','colhendo','completando','comunicando','concluindo',
  'condenando','confundindo','conseguindo','considerando','construindo','contendo',
  'contribuindo','convertendo','convivendo','coordenando','copiando','cuidando',
  'declarando','defendendo','desafiando','descendo','descobrindo','desejando',
  'desfazendo','desmontando','devorando','dirigindo','discutindo','distorcendo',
  'dividindo','dobrando','dominando','duvidando','elevando','emitindo','encantando',
  'encontrando','enfraquecendo','ensinando','entendendo','escolhendo','espalhando',
  'estabelecendo','estendendo','estudando','evitando','exigindo','explicando',
  'explorando','expondo','expressando','extinguindo','fazendo','feriando','finalizando',
  'florescendo','formando','funcionando','gerando','indicando','iniciando','inspirando',
  'juntando','justificando','liberando','ligando','limpando','marcando','mostrando',
  'motivando','nomeando','observando','obtendo','parando','pegando','percebendo',
  'perdendo','permitindo','pesquisando','planejando','praticando','preparando',
  'produzindo','promovendo','proporcionando','provando','publicando','realizando',
  'reconhecendo','recuperando','relacionando','removendo','representando','resolvendo',
  'respondendo','seguindo','selecionando','subindo','tentando','terminando','tirando',
  'trabalhando','transferindo','transmitindo','utilizando','verificando','visitando',
  // infinitivo
  'amortecer','apaziguar','aturdir','caminhar','clamar','desmoronar','despertar',
  'acalmar','afogar','agredir','aliviar','ampliar','aniquilar','apagar','arriscar',
  'assombrar','carregar','combater','derrotar','desviar','glorificar','iluminar',
  'impedir','libertar','marchar','obscurecer','recuar','rejeitar','romper','silenciar',
  'sobreviver','triunfar','absorver','aceitar','acolher','admirar','afastar','agarrar',
  'agitar','ajudar','alinhar','alterar','amar','ameacar','ampliar','ancorar',
  'angustiar','antecipar','apaixonar','aplaudir','apontar','apostar','aprovar',
  // substantivos e adjetivos
  'lagrimas','longevidade','sombrio','sangrado','aprisionado','ardente','corajoso',
  'temerario','valioso','soberano','orgulhoso','destemido','fervoroso','cauteloso',
  'vigilante','poderoso','glorioso','misterioso','silencioso','furioso','gracioso',
  'venturoso','perigoso','victorioso','generoso','ansioso','ambicioso','precioso',
  'harmonioso','laborioso','maravilhoso','luminoso','rigido','fragil','solido',
  'profundo','intenso','sincero','eterno','sublime','obscuro','nobre','bravo',
  'leal','fiel','sagrado','maldito','perdido','esquecido','renascido','destruido',
  'ferido','curado','amado','temido','respeitado','escolhido','marcado','salvo',
  'abismo','silencio','sombra','chama','tempestade','coragem','esperanca','verdade',
  'destino','horizonte','eternidade','sofrimento','redenção','jornada','batalha',
  'gloria','honra','traicao','lealdade','sacrificio','caminho','missao','legado',
  'conquista','derrota','vitoria','renascimento','transformacao','revelacao',
  'protecao','libertacao','dominacao','criacao','destruicao','separacao',
];

// ─── Lista EN (palavras reais inglesas, menos comuns) ─────────────────────────
const WORDS_EN = [
  // present participle / gerund
  'absolving','accruing','aching','adoring','affirming','aligning','alluring',
  'altering','amusing','angling','arching','arising','arousing','arresting',
  'ascending','aspiring','asserting','attaining','averting','baffling','beguiling',
  'bewildering','blending','blinding','blooming','bracing','braiding','bridging',
  'brooding','burning','calming','carving','cascading','chasing','circling',
  'claiming','climbing','coiling','confiding','converging','cooling','coursing',
  'craving','creeping','crossing','crushing','curling','curving','daring','darting',
  'dawning','deceiving','deepening','deflecting','departing','descending','devouring',
  'dimming','discerning','dispersing','diving','drifting','drowning','dwelling',
  'echoing','edging','emerging','enduring','erasing','escaping','evolving','fading',
  'faltering','fearing','fleeing','floating','flowing','focusing','forging',
  'forsaking','fracturing','freezing','gathering','gazing','gleaming','gliding',
  'glowing','grasping','grounding','growing','guiding','haunting','hovering',
  'hunting','igniting','invoking','isolating','kindling','lasting','leaning',
  'lifting','lingering','looming','lurking','mending','merging','mirroring',
  'mourning','narrowing','nearing','observing','orbiting','outlasting','overcoming',
  'persisting','piercing','plunging','prevailing','prowling','pursuing','reaching',
  'receding','reflecting','reforming','releasing','remaining','renewing','resisting',
  'restoring','retreating','returning','revealing','roaming','roaring','rushing',
  'scaling','scanning','scattering','seeking','sensing','separating','severing',
  'shadowing','shielding','shifting','shining','silencing','soaring','softening',
  'soothing','spiraling','spreading','steadying','stirring','striking','striving',
  'subduing','surging','sustaining','swaying','sweeping','tearing','threading',
  'tracing','trailing','transcending','traversing','trembling','unfolding',
  'unraveling','vanishing','wandering','weathering','weaving','withstanding',
  'yielding','absorbing','accelerating','accomplishing','acquiring','adapting',
  'advancing','affecting','afflicting','aggravating','aligning','amplifying',
  'anchoring','annihilating','answering','approaching','arising','awakening',
  'banishing','battling','beckoning','betraying','blindsiding','blazing',
  'challenging','channeling','compelling','concealing','condemning','confining',
  'confronting','conquering','consuming','containing','contracting','controlling',
  'corroding','countering','crumbling','crashing','darkening','dawning','decaying',
  'deceiving','deciding','defying','denying','detaching','devastating','devouring',
  'diffusing','discarding','dissolving','distorting','disturbing','diverting',
  'dominating','duplicating','eliminating','embracing','empowering','enchanting',
  'enduring','enforcing','enveloping','exceeding','exhausting','expanding',
  'expelling','extinguishing','fading','forfeiting','fracturing','fragmenting',
  'fulfilling','gaining','generating','hardening','hindering','ignoring','imploding',
  'imprisoning','infiltrating','infusing','inheriting','initiating','intensifying',
  'intercepting','invading','liberating','manifesting','masking','mastering',
  'mourning','navigating','neglecting','neutralizing','obliterating','obscuring',
  'opposing','overcoming','overwhelming','penetrating','persevering','prevailing',
  'projecting','protecting','questioning','reclaiming','redirecting','regenerating',
  'reinforcing','rejecting','relocating','remembering','resonating','revolving',
  'shattering','signaling','silencing','simplifying','solidifying','stabilizing',
  'succumbing','suppressing','surrendering','surviving','targeting','terminating',
  'tormenting','transcending','triggering','undermining','unleashing','unmasking',
  'unraveling','venturing','withering',
  // adjectives / nouns
  'bechuana','moviolas','sordidity','submarining','inexhausted','falconry',
  'glimmers','tethered','vaulting','wistful','zealous','arduous','brittle',
  'callous','cryptic','devious','elusive','fervent','gallant','ghostly',
  'hapless','immense','lawless','listless','molten','nebulous','obscure',
  'ominous','pallid','restless','ruinous','serene','sinuous','somber','spectral',
  'tenuous','valiant','verdant','voracious','abyssal','arcane','astral','blighted',
  'brazen','ceaseless','colossal','defiant','desolate','ethereal','exalted',
  'fearless','forlorn','forsaken','fractured','frenzied','hallowed','hollow',
  'immovable','infinite','invincible','languid','luminous','merciless','mortal',
  'mournful','mystic','ominous','primal','relentless','revenant','savage','shadowed',
  'shattered','silent','solitary','sovereign','steadfast','tempest','timeless',
  'tormented','unyielding','vanquished','vengeful','vigilant','wanderer','warden',
  'wretched','abiding','adamant','adverse','ancient','barren','boundless','burning',
  'cursed','darkened','daunting','dauntless','desperate','dreadful','drifting',
  'enduring','fallen','fleeting','frozen','gleaming','glorious','grim','hardened',
  'haunted','hollow','hopeless','hunted','infinite','isolated','jagged','kindred',
  'lethal','lifeless','looming','lurking','malevolent','merciless','nameless',
  'nocturnal','numb','obsidian','ordained','primordial','ravaged','reckless',
  'relentless','remnant','ruinous','ruthless','scarred','severed','shackled',
  'shattered','shrouded','sightless','sinister','sleepless','smoldering','solemn',
  'soulless','spectral','stricken','sundered','sworn','tempered','tortured',
  'treacherous','unbroken','undying','unfettered','unrelenting','unseen',
  'unyielding','vanishing','vengeful','vigilant','void','volatile','weathered',
  'withered','wrathful','abandoned','accursed','afflicted','ageless','agonized',
];

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

// realword: palavra real em inglês
function generateRealwordEN() {
  return rand(WORDS_EN);
}

// realwordpt: palavra/verbo real em português
function generateRealwordPT() {
  return rand(WORDS_PT);
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
