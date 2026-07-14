/**
 * usernameMonitor.js
 *
 * Monitor automático de usernames disponíveis no Discord.
 * - Gera usernames por categoria (numbers, realword, realwordpt, mixed)
 * - Checa disponibilidade via checker.js (autenticado quando tokens disponíveis)
 * - Salva no banco (SniperTarget) com postedAt = now() quando disponível
 * - Também checa targets do sniper (userUpdate + snipe_add) e notifica via DM + canal
 *
 * Categorias activas:
 *   mixed      → 4 chars, sempre letra+dígito misturados (ex: sf9d, 8u3g)
 *   realword   → palavra real em inglês (da wordlist)
 *   realwordpt → palavra real em português (da wordlist)
 *   numbers    → sequência numérica pura (5-7 dígitos)
 */

import prisma from '../database/client.js';
import { isAvailable } from './checker.js';
import { ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const WORKERS_PER_CATEGORY = 6;     // workers paralelos por categoria
const WORKER_START_OFFSET  = 300;   // ms de escalonamento no start — espalha o burst inicial
const WORKER_MIN_DELAY_MS  = 30;    // delay mínimo entre checks (ms) — evita spin puro
const WORKER_RATELIMIT_MS  = 800;   // backoff quando a resposta é null (rate-limit/erro)

// ─── Geradores ────────────────────────────────────────────────────────────────

const DIGITS      = '0123456789';
const ALPHA       = 'abcdefghijklmnopqrstuvwxyz';
const MIXED_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function rand(arr)        { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min,max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── Lista PT ─────────────────────────────────────────────────────────────────
const WORDS_PT = [
  // ── gerúndio comum ─────────────────────────────────────────────────────────
  'agonizando','alcancando','almejando','ansiando','ardendo','arrepiando',
  'assombrando','atordoando','brilhando','capturando','carregando','cedendo',
  'cercando','colidindo','conquistando','correndo','cortando','criando','cruzando',
  'deslizando','destruindo','dominando','emergindo','enfrentando','enganando',
  'envolvendo','escapando','espalhando','esperando','expandindo','flutuando',
  'forjando','fugindo','fundindo','ganhando','girando','governando','guerreando',
  'iluminando','implorando','incendiando','invocando','isolando','lancando',
  'libertando','lutando','mergulhando','nascendo','navegando','obscurecendo',
  'ondulando','perseguindo','persistindo','projetando','protegendo','quebrando',
  'queimando','rastejando','reconstruindo','refletindo','reinando','renascendo',
  'resistindo','ressoando','retornando','revelando','rondando','rugindo',
  'sacrificando','salvando','separando','sonhando','sufocando','superando',
  'sussurrando','transformando','tremendo','ultrapassando','vagando','vencendo',
  'viajando','vivendo','voando','voltando','aceitando','acolhendo','admirando',
  'afastando','agitando','alinhando','aniquilando','atravessando','combatendo',
  'derrotando','desviando','empurrando','encarando','fracassando','glorificando',
  'impedindo','marchando','permanecendo','recuando','rejeitando','rompendo',
  'silenciando','sobrevivendo','triunfando','acertando','acompanhando',
  'acrescentando','adiantando','adotando','afirmando','agredindo','aguardando',
  'alertando','amando','ampliando','ancorando','angustiando','antecipando',
  'apaixonando','aplaudindo','apontando','apostando','aprovando','arranhando',
  'assolando','atendendo','atingindo','atirando','atraindo','aumentando',
  'avaliando','batendo','bloqueando','cativando','causando','celebrando',
  'chegando','chocando','chorando','cobrando','colhendo','completando',
  'comunicando','concluindo','condenando','confundindo','conseguindo',
  'construindo','contribuindo','convertendo','convivendo','coordenando',
  'declarando','defendendo','desafiando','descobrindo','desfazendo',
  'desmontando','devorando','dirigindo','discutindo','dividindo','dobrando',
  'duvidando','elevando','emitindo','encantando','enfraquecendo','ensinando',
  'entendendo','escolhendo','estabelecendo','estendendo','estudando','evitando',
  'exigindo','explicando','explorando','expondo','expressando','extinguindo',
  'finalizando','florescendo','formando','gerando','indicando','iniciando',
  'inspirando','juntando','justificando','liberando','ligando','limpando',
  'marcando','mostrando','motivando','nomeando','observando','obtendo',
  'parando','pegando','percebendo','perdendo','permitindo','pesquisando',
  'planejando','praticando','preparando','produzindo','promovendo','provando',
  'publicando','realizando','reconhecendo','recuperando','relacionando',
  'removendo','representando','resolvendo','respondendo','seguindo',
  'selecionando','tentando','terminando','tirando','trabalhando','transferindo',
  'transmitindo','utilizando','verificando','visitando','absolvendo',
  'aprimorando','canalizando','corroendo','desabando','desdenhando','despertando',
  'emanando','fascinando','fermentando','germinando','habitando','ignorando',
  'impulsionando','integrando','irradiando','manifestando','neutralizando',
  'orbitando','precipitando','reagindo','recolhendo','recompondo','redescobrindo',
  'reerguendo','refazendo','regenerando','renovando','resgatando','subjugando',
  'sucumbindo','ultrajando','vasculhando','venerando','vigiando',
  // ── pretérito perfeito 3ª pessoa do plural ─────────────────────────────────
  'abandonaram','aceitaram','acordaram','alcancaram','amaram','andaram',
  'apareceram','apostaram','aprovaram','arriscaram','assombraram','atacaram',
  'atravessaram','bateram','buscaram','caminharam','cantaram','capturaram',
  'carregaram','cederam','chegaram','choraram','cobraram','colocaram',
  'combateram','conquistaram','construiram','contaram','continuaram',
  'contribuiram','conviveram','correram','cortaram','criaram','cruzaram',
  'deixaram','derrotaram','descobriram','destruiram','dominaram','encontraram',
  'enfrentaram','enganaram','escaparam','escolheram','esperaram','estudaram',
  'evoluiram','fugiram','ganharam','governaram','guerrearam','habitaram',
  'ignoraram','iluminaram','iniciaram','invadiram','juntaram','lancaram',
  'libertaram','lutaram','marcaram','mergulharam','mudaram','nasceram',
  'navegaram','partiram','perderam','permaneceram','persistiram','planejaram',
  'procuraram','protegeram','quebraram','realizaram','recuaram','reinaram',
  'rejeitaram','renasceram','resistiram','romperam','sacrificaram','salvaram',
  'seguiram','sentiram','separaram','sobreviveram','sonharam','superaram',
  'tentaram','tocaram','transformaram','triunfaram','vagaram','venceram',
  'viajaram','viveram','voltaram','voaram',
  // ── pretérito perfeito 3ª pessoa singular ──────────────────────────────────
  'abandonou','acreditou','alcancou','amou','andou','apareceu','apostou',
  'aproveitou','arriscou','assombrou','atacou','atravessou','bateu',
  'buscou','caminhou','cantou','capturou','carregou','cedeu','chegou',
  'chorou','colocou','combateu','conquistou','construiu','contou','continuou',
  'correu','cortou','criou','cruzou','derrotou','descobriu','destruiu',
  'dominou','encontrou','enfrentou','enganou','escolheu','esperou','estudou',
  'evoluiu','existiu','fugiu','ganhou','governou','guardou','guerreou',
  'habitou','ignorou','iluminou','iniciou','invadiu','lancou','libertou',
  'lutou','marcou','mergulhou','mudou','nasceu','navegou','obteve','partiu',
  'pensou','perdeu','permaneceu','persistiu','planejou','procurou','protegeu',
  'quebrou','realizou','recuou','rejeitou','renasceu','resistiu',
  'rompeu','sacrificou','salvou','sentiu','separou','sobreviveu','sonhou',
  'sumiu','superou','tentou','tocou','transformou','triunfou','vagou',
  'venceu','viajou','voltou','voou',
  // ── condicional ────────────────────────────────────────────────────────────
  'abandonaria','aceitaria','alcancaria','amaria','apareceria','arriscaria',
  'atravessaria','bateria','buscaria','caminharia','cantaria','capturaria',
  'carregaria','cederia','chegaria','choraria','chorarias','combateria',
  'conquistaria','construiria','continuaria','correria','cortaria','criaria',
  'cruzaria','derrotaria','descobriria','destruiria','dominaria','encontraria',
  'enfrentaria','enganaria','escolheria','esperaria','estudaria','evoluiria',
  'fugiria','ganharia','governaria','guerrearia','habitaria',
  'ignoraria','iluminaria','iniciaria','lancaria','libertaria',
  'lutaria','mergulharia','mudaria','nasceria','navegaria',
  'perderia','persistiria','planejaria','procuraria','protegeria',
  'quebraria','realizaria','recuaria','reinaria','rejeitaria','renasceria',
  'resistiria','romperia','sacrificaria','salvaria','seguiria','sentiria',
  'sobreviveria','sonharia','superaria','tentaria','tocaria','transformaria',
  'triunfaria','vagaria','venceria','viajaria','viveria','voltaria','voaria',
  // ── subjuntivo imperfeito ──────────────────────────────────────────────────
  'abandonasse','aceitasse','alcancasse','amasse','aparecesse','arriscasse',
  'atravessasse','batesse','buscasse','caminhasse','cantasse','capturasse',
  'cedesse','chegasse','chorasse','combatesse','conquistasse','continuasse',
  'corresse','cortasse','criasse','cruzasse','derrotasse','descobrisse',
  'destruisse','dominasse','encontrasse','enfrentasse','escolhesse',
  'esperasse','estudasse','evoluisse','fugisse','ganhasse','governasse',
  'habitasse','ignorasse','iluminasse','iniciasse','lancasse','libertasse',
  'lutasse','mergulhasse','mudasse','navegasse','perdesse','persistisse',
  'planejasse','procurasse','protegesse','quebrasse','realizasse','reinasse',
  'rejeitasse','renascesse','resistisse','rompesse','sacrificasse','salvasse',
  'seguisse','sentisse','sobrevivesse','sonhasse','superasse','tentasse',
  'tocasse','transformasse','triunfasse','vagasse','vencesse','viajasse',
  'vivesse','voltasse','voasse',
  // ── substantivos raros ─────────────────────────────────────────────────────
  'acrofobia','acronimia','agorafobia','agronomia','agudeza','alcunha',
  'algaravia','altruismo','amalgama','ambiencia','ambiguidade','anacoreta',
  'anarquia','anomalia','antagonismo','aporia','apostasia','arrepio',
  'assimetria','ataraxia','autoctone','autonomia','azimute','bailado',
  'barbarie','beatitude','bifurcacao','bizarria','brutalidade','burlesco',
  'calamidade','caligrafia','cansaco','catastrofe','cautela','ceticismo',
  'clamor','claridade','cobica','coerencia','complacencia','condescendencia',
  'conformidade','conivencia','contenda','copioso','crepusculo','desdita',
  'desfecho','desolacao','destemor','desvario','dicotomia','dilema',
  'discordancia','displicencia','divergencia','ebulicao','efemeridade',
  'efusao','elegancia','eloquencia','eminencia','empatia','epifania',
  'escassez','esgotamento','estagnacao','estranheza','euforia','exuberancia',
  'fadiga','falacia','fastio','fatalidade','fervor','fissura','flagelo',
  'fluidez','fugacidade','fulgor','galopante','genealogia','genialidade',
  'grandiosidade','gravidade','harmonia','hegemonia','heresia','hipocrisia',
  'imparcialidade','impotencia','incerteza','incongruencia','indiferenca',
  'indolencia','inevitabilidade','infamia','insensatez','insignificancia',
  'integridade','intuicao','iracundia','isolamento','lamento','languor',
  'lastima','letargia','lucidez','magnetismo','magnificencia','malevolencia',
  'malicia','malignidade','mansidao','melancolia','menosprezo','mesquinhez',
  'metamorfose','misantropia','modestia','mortalidade','mutabilidade',
  'narcisismo','necessidade','niilismo','nostalgia','obstinacao','ociosidade',
  'opressao','ostentacao','otimismo','paradoxo','parcimonia','passividade',
  'penuria','perplexidade','perseveranca','pessimismo','profundidade',
  'providencia','pudor','quietude','radicalismo','rancor','rapacidade',
  'receio','resignacao','resiliencia','retrocesso','rigidez','sagacidade',
  'sarcasmo','satisfacao','serenidade','simplicidade','soberba','sofisticacao',
  'solidariedade','tenacidade','timidez','tirania','torpor','totalidade',
  'transformacao','tumulto','unanimidade','unicidade','uniformidade',
  'vaidade','valentia','vanidade','variedade','veemencia','vilania','violencia',
  'volatilidade','vulnerabilidade',
  // ── termos técnicos / médicos ──────────────────────────────────────────────
  'esofagenterostomia','fonautografia','hepatoesplenomegalia','cardiomiopatia',
  'arterioesclerose','traqueobronquite','bronquiectasia','glomerulonefrite',
  'pielonefrite','osteossarcoma','mielodisplasia','trombocitopenia',
  'eritroblastose','dolicocefalia','braquicefalia','espondilolistese',
  'polineuropatia','encefalopatia','miocardiopatia','vasculopatia',
  'flebotomia','endarterectomia','traqueostomia','colostomia','ileostomia',
  'gastrostomia','colonoscopia','laparoscopia','toracoscopia','broncoscopia',
  'citoscopia','artroscopia','histeroscopia','amniocentese','eritropoiese',
  'hematopoiese','linfocitopoiese','granulopoiese','trombopoiese',
  'fotossintese','quimiossintese','catabolismo','anabolismo','metabolismo',
  'enzimologia','imunologia','parasitologia','microbiologia','epidemiologia',
  'endocrinologia','reumatologia','hematologia','oncologia','radiologia',
  'anestesiologia','neonatologia','gerontologia','psiquiatria',
  // ── arcaísmos e palavras raras ────────────────────────────────────────────
  'outrossim','malgrado','conquanto','porquanto','dessemelhante','alvorotado',
  'arrazoado','assaz','barafunda','bazofiar','benignidade','bisonhice',
  'borralhar','brunidura','calejar','candura','canseira','capenga',
  'caturrar','cerceamento','cismar','confabular','coonestar','corcovear',
  'crepitar','desdenhoso','desestimar','desmoronar','desvairar','detrator',
  'dimanar','dirimir','discorrer','embargar','embelecer','embicar',
  'encoleirar','entabolar','envergonhar','erigir','espoletar','esquadrinhar',
  'estultice','evadir','exacerbar','exalar','exarar','expungir','extorquir',
  'faccioso','falaz','fatuo','ferrenho','ganancioso','gastador','gatuno',
  'glutao','gracejo','grandiloquente','hesitar','hipocrita','iminente',
  'impertinente','incitar','inculcar','indagar','indignar','infamar',
  'infestar','infligir','ingrato','instigar','intimidar','intrigar','invejar',
  'ladino','lascivo','libertino','lisonjeiro','malfadado','malversacao',
  'mofino','motejador','nefasto','nescio','obtuso','odiar','ofender',
  'omitir','oprimir','parvidade','patife','perjuro','pertinaz','perverso',
  'petulante','pifio','plebeu','ponderar','presunco','procaz','rapinar',
  'rebater','rechacar','remendar','renhido','retorquir','rufianismo',
  'salafrario','sandice','soberbo','sobrepujar','sorrateiro','subornar',
  'subverter','tacanho','tergiversar','tortuoso','traidor','turvar',
  'usurpar','venal','vilipendiar','vituperar',
  // ── verbos no infinitivo ───────────────────────────────────────────────────
  'jazentio','bechuana','moviolas','sordidity','inexhausted','submarining',
  'conviveram','chorarias','fonautografia','esofagenterostomia',
];

// ─── Lista EN ─────────────────────────────────────────────────────────────────
const WORDS_EN = [
  // ── gerunds / present participle ───────────────────────────────────────────
  'absolving','accruing','adoring','affirming','alluring','altering','angling',
  'arching','arousing','arresting','ascending','aspiring','asserting','attaining',
  'averting','baffling','beguiling','bewildering','blending','blooming','braiding',
  'bridging','brooding','cascading','chasing','circling','claiming','climbing',
  'coiling','confiding','converging','coursing','craving','creeping','crushing',
  'curling','curving','darting','dawning','deceiving','deepening','deflecting',
  'departing','descending','devouring','dimming','discerning','dispersing','diving',
  'drifting','drowning','dwelling','echoing','edging','enduring','erasing',
  'evolving','faltering','fearing','fleeing','floating','flowing','forging',
  'forsaking','fracturing','freezing','gazing','gleaming','gliding','glowing',
  'grasping','grounding','haunting','hovering','hunting','igniting','invoking',
  'isolating','kindling','lasting','leaning','lifting','lingering','looming',
  'lurking','mending','merging','mirroring','mourning','narrowing','nearing',
  'orbiting','outlasting','overcoming','persisting','piercing','plunging',
  'prevailing','prowling','pursuing','reaching','receding','reflecting','reforming',
  'releasing','remaining','renewing','resisting','restoring','retreating',
  'returning','revealing','roaming','roaring','rushing','scaling','scanning',
  'scattering','seeking','sensing','severing','shadowing','shielding','shifting',
  'silencing','soaring','softening','soothing','spiraling','spreading','steadying',
  'stirring','striving','subduing','surging','sustaining','swaying','sweeping',
  'tearing','threading','tracing','trailing','trembling','unfolding','unraveling',
  'vanishing','wandering','weathering','weaving','withstanding','yielding',
  'accelerating','accomplishing','acquiring','adapting','advancing','afflicting',
  'aggravating','amplifying','anchoring','annihilating','approaching','awakening',
  'banishing','battling','beckoning','betraying','blazing','channeling',
  'compelling','concealing','condemning','confining','confronting','conquering',
  'consuming','contracting','corroding','countering','crumbling','crashing',
  'darkening','decaying','defying','denying','detaching','devastating','diffusing',
  'discarding','dissolving','distorting','disturbing','diverting','dominating',
  'eliminating','embracing','empowering','enchanting','enforcing','enveloping',
  'exceeding','exhausting','expelling','extinguishing','forfeiting','fragmenting',
  'fulfilling','generating','hardening','hindering','imploding','imprisoning',
  'infiltrating','infusing','initiating','intensifying','intercepting','invading',
  'liberating','manifesting','masking','mastering','navigating','neglecting',
  'neutralizing','obliterating','obscuring','opposing','overwhelming','penetrating',
  'persevering','projecting','questioning','reclaiming','redirecting','regenerating',
  'reinforcing','relocating','remembering','resonating','revolving','shattering',
  'simplifying','solidifying','stabilizing','succumbing','suppressing','surrendering',
  'terminating','tormenting','triggering','undermining','unleashing','unmasking',
  'venturing','withering',
  // ── past tense ─────────────────────────────────────────────────────────────
  'abandoned','abolished','abstained','acclaimed','accrued','achieved','acquiesced',
  'admonished','adorned','afflicted','alienated','alleviated','amalgamated',
  'ambushed','anchored','annihilated','anticipated','arbitrated','ascended',
  'assaulted','assimilated','attenuated','augmented','banished','beckoned',
  'besieged','betrayed','blazed','blundered','boasted','brandished','brooded',
  'captivated','challenged','channeled','circumvented','claimed','clashed',
  'collaborated','concealed','condemned','confounded','conquered','consumed',
  'corrupted','countered','crumbled','culminated','darkened','deceived',
  'defied','deliberated','demolished','departed','descended','deteriorated',
  'devoured','dispersed','dissolved','dominated','eliminated','embraced',
  'empowered','enchanted','enforced','enveloped','eradicated','evaded','exalted',
  'exhausted','expelled','exploited','extinguished','faltered','forfeited',
  'forsaken','fragmented','fulfilled','galvanized','guarded','hallowed',
  'hindered','imploded','imprisoned','infiltrated','initiated','intercepted',
  'invaded','isolated','liberated','lingered','loomed','lurked','manifested',
  'mastered','mourned','navigated','neglected','neutralized','obliterated',
  'obscured','overwhelmed','penetrated','persevered','prevailed','projected',
  'reclaimed','redirected','regenerated','reinforced','rejected','relocated',
  'resonated','retreated','revealed','revolved','roamed','rushed','scattered',
  'shattered','silenced','solidified','stabilized','surrendered','subjugated',
  'succumbed','suppressed','sustained','targeted','tormented','transcended',
  'triggered','undermined','unleashed','unmasked','vanished','ventured',
  'wandered','weathered','withered','yielded',
  // ── rare adjectives & nouns ────────────────────────────────────────────────
  'abeyance','abnegation','abrogation','absolution','abstention','accretion',
  'acrimony','adjudication','admonition','adversity','affliction','agitation',
  'alchemy','allegiance','ambiguity','amelioration','anachronism','anarchy',
  'animosity','annihilation','anomaly','antipathy','apathy','apostasy',
  'apprehension','arbitration','archetype','ardency','armistice','aspersion',
  'assimilation','atrophy','audacity','avarice','belligerence','benediction',
  'bewilderment','bravado','callousness','capitulation','catastrophe','causality',
  'celestial','censure','certitude','chicanery','cognizance','coherence',
  'collusion','complacency','condescension','congruence','consternation',
  'contention','contrition','convergence','cunning','deception','defiance',
  'delusion','depravity','desolation','despondency','detachment','divergence',
  'dogmatism','dominance','duplicity','ebullience','effrontery','eloquence',
  'emanation','embitterment','eminence','empathy','endurance','enigma',
  'epiphany','equanimity','erudition','estrangement','euphoria','exasperation',
  'exuberance','fanaticism','fervency','ferocity','forbearance',
  'foreboding','fortitude','fragility','gallantry','grandiosity','gravitas',
  'grievance','hallucination','hegemony','heresy','hubris',
  'hypocrisy','idolatry','ignominy','illusion','immovability','impunity',
  'indignation','insolence','insurgency','intransigence','irrationality',
  'isolation','jadedness','jurisdiction','juxtaposition','kinship','languor',
  'lethargy','lucidity','luminescence','magnanimity','malfeasance','malice',
  'malignancy','martyrdom','melancholy','mendacity','metamorphosis','misanthropy',
  'moderation','mortification','mysticism','narcissism','nihilism','nonchalance',
  'nostalgia','obstinacy','ominousness','omniscience','oppression','ostentation',
  'outrage','paralysis','paranoia','partiality','passivity','pathology',
  'persecution','pessimism','piety','platitude','plausibility','polarization',
  'pomposity','predisposition','prejudice','pretension','profundity','proclivity',
  'prophecy','prudence','pugnacity','quandary','radicalism','rancor',
  'rationality','recklessness','redemption','remorse','resentment','resilience',
  'retribution','reverence','rigidity','ruthlessness','sagacity','sanctimony',
  'sarcasm','savagery','schism','serenity','severity','skepticism','solemnity',
  'somberness','sovereignty','steadfastness','stoicism','stubbornness','sublimity',
  'subversion','suppression','tenacity','temerity','timidity','torment',
  'treachery','turbulence','tyranny','ubiquity','usurpation','validity','vanity',
  'vengeance','volatility','vulnerability','wickedness','zealotry','zealousness',
  // ── uncommon verbs ─────────────────────────────────────────────────────────
  'abrogate','absolve','accrue','adjudicate','admonish','afflict','alienate',
  'alleviate','amalgamate','ameliorate','arbitrate','attenuate','augment',
  'beseech','bolster','brandish','castigate','circumvent','collaborate',
  'commiserate','compel','corroborate','culminate','deliberate','deteriorate',
  'diffuse','discern','dissipate','elucidate','emanate','emulate','enumerate',
  'epitomize','eradicate','exacerbate','exasperate','exhilarate','exonerate',
  'extricate','facilitate','galvanize','illuminate','inculcate','indoctrinate',
  'instigate','invigorate','investigate','legitimize','manipulate','mitigate',
  'modulate','obfuscate','oscillate','permeate','perpetuate','proliferate',
  'propagate','saturate','scrutinize','segregate','simulate','speculate',
  'stimulate','subjugate','subordinate','transgress','trespass','vacillate',
  'validate','vindicate','violate',
  // ── extra uncommon words ───────────────────────────────────────────────────
  'inexhausted','submarining','bechuana','moviolas','sordidity','inexorable',
  'intemperate','lachrymose','unctuous','obstreperous','recalcitrant',
  'perspicacious','magniloquent','equivocate','mendacious','pusillanimous',
  'perfidious','truculent','loquacious','garrulous','sycophantic','obsequious',
  'incorrigible','fastidious','querulous','temerity','irascible','churlish',
  'peevish','petulant','supercilious','vainglorious','sanctimonious',
  'pernicious','deleterious','inimical','invidious','nefarious','egregious',
  'flagitious','ignominious','perfidious','turpitude','contumely',
];

// ─── Gerador: numbers — sequência numérica pura (5-7 dígitos) ─────────────────
function generateNumbers() {
  const digits = randInt(5, 7);
  const min    = Math.pow(10, digits - 1);
  const max    = Math.pow(10, digits) - 1;
  return String(randInt(min, max));
}

// ─── Gerador: realword — palavra real em inglês ────────────────────────────────
function generateRealwordEN() {
  return rand(WORDS_EN);
}

// ─── Gerador: realwordpt — palavra/verbo real em português ────────────────────
function generateRealwordPT() {
  return rand(WORDS_PT);
}

// ─── Gerador: mixed — SEMPRE 4 chars, pelo menos 1 letra E 1 dígito ───────────
// Exemplos dos canais: sf9d, 8u3g, qk3c, ktj8, 3oxb, pt0o
function generateMixed() {
  const len = 4;
  const arr = [];

  // Garante pelo menos 1 letra e 1 dígito
  arr.push(rand([...ALPHA]));
  arr.push(rand([...DIGITS]));

  // Completa com caracteres aleatórios (letra ou dígito)
  for (let i = 2; i < len; i++) {
    arr.push(rand([...MIXED_CHARS]));
  }

  // Embaralha (Fisher-Yates)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join('');
}

// Validadores de categoria — garante que o username gerado bate com a categoria
function validaMixed(u)      { return /^[a-z0-9]{4}$/.test(u) && /[a-z]/.test(u) && /[0-9]/.test(u); }
function validaNumbers(u)    { return /^[0-9]{5,7}$/.test(u); }
function validaRealword(u)   { return /^[a-z]{4,32}$/.test(u); }
function validaRealwordPT(u) { return /^[a-z]{4,32}$/.test(u); }

const GENERATORS = {
  numbers:    generateNumbers,
  realword:   generateRealwordEN,
  realwordpt: generateRealwordPT,
  mixed:      generateMixed,
};

const VALIDATORS = {
  numbers:    validaNumbers,
  realword:   validaRealword,
  realwordpt: validaRealwordPT,
  mixed:      validaMixed,
};

// ─── Monitor ──────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

let _running   = false;
let _stopped   = false;
let _checked   = 0;
let _found     = 0;
let _startedAt = null;
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

      let sent = false;
      try {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`<:sorte:1526435450259243180> **@${username}**\ndisponível agora · <t:${ts}:R>`)
          );
        await ch.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        sent = true;
      } catch (v2err) {
        console.warn(`[MONITOR] V2 falhou em ${cfg.channelId}, usando embed clássico:`, v2err.message);
      }

      if (!sent) {
        await ch.send({
          embeds: [{
            description: `<:sorte:1526435450259243180> **@${username}**\ndisponível agora · <t:${ts}:R>`,
            color: 0x2b2d31,
          }],
        }).catch(err => console.error(`[MONITOR] Erro ao postar (fallback) em ${cfg.channelId}:`, err.message));
      }
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

/** Posta notificação de "confirmado livre" no canal sniper */
async function postSniperConfirmed(username, client) {
  if (!client) return;
  try {
    const configs = await prisma.publishChannel.findMany({ where: { category: 'sniper' } });
    if (!configs.length) return;
    const ts = Math.floor(Date.now() / 1000);
    const texto = `<:sorte:1526435450259243180> **@${username}**\nconfirmado livre agora · <t:${ts}:R>`;

    for (const cfg of configs) {
      const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (!ch) continue;

      let sent = false;
      try {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));
        await ch.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        sent = true;
      } catch {}

      if (!sent) {
        await ch.send({
          embeds: [{ description: texto, color: 0x57F287 }],
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[MONITOR] Erro ao postar sniper confirmado:', err.message);
  }
}

/** Verifica targets do sniper (pessoais e auto-detectados) e notifica */
async function checkSniperTargets(client) {
  try {
    const targets = await prisma.sniperTarget.findMany({
      where: { category: 'sniper', postedAt: null },
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

      // Posta no canal sniper
      await postSniperConfirmed(target.username, client);

      // DM para quem adicionou pessoalmente
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

      console.log(`[MONITOR] 🎯 Sniper target disponível: @${target.username}`);
      await sleep(1_000);
    }
  } catch (err) {
    console.error('[MONITOR] Erro ao checar targets sniper:', err.message);
  }
}

/**
 * Worker de checagem para uma categoria.
 * Gera username, valida que bate com a categoria, checa disponibilidade.
 */
async function categoryWorker(category, workerId, client) {
  const gen      = GENERATORS[category];
  const validate = VALIDATORS[category];
  let localChecked = 0;

  console.log(`[MONITOR:${category}#${workerId}] ▶ Worker iniciado.`);

  while (!_stopped) {
    try {
      const username = gen();

      // Valida que o username gerado realmente pertence à categoria
      if (!validate(username)) continue;
      if (username.length < 2 || username.length > 32) continue;

      _checked++;
      localChecked++;

      if (localChecked % 200 === 0) {
        console.log(`[MONITOR:${category}#${workerId}] 💓 ${localChecked} checks | total: ${_checked} | encontrados: ${_found}`);
      }

      const avail = await isAvailable(username);
      if (avail === true) {
        await saveAvailable(username, category, client);
      } else if (avail === null) {
        // Rate-limited ou erro — recua antes de tentar de novo
        await sleep(WORKER_RATELIMIT_MS);
        continue;
      }

      await sleep(WORKER_MIN_DELAY_MS);
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

  // Busca categorias configuradas nos canais — apenas as que têm generator
  const channels   = await prisma.publishChannel.findMany({});
  const configured = [...new Set(channels.map(c => c.category))].filter(c => GENERATORS[c]);
  // Se não há canais configurados, roda todas as categorias
  const categories = configured.length ? configured : Object.keys(GENERATORS);

  const total = categories.length * WORKERS_PER_CATEGORY;
  console.log(`[MONITOR] 🚀 ${categories.length} cats × ${WORKERS_PER_CATEGORY} workers = ${total} workers | cats: ${categories.join(', ')}`);

  // Escalonamento: workers arrancam em sequência para evitar burst inicial
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

  // Sniper targets checados a cada 5 minutos num loop separado
  const sniperInterval = setInterval(async () => {
    if (_stopped) { clearInterval(sniperInterval); return; }
    await checkSniperTargets(client);
  }, 5 * 60 * 1000);

  // Primeira checagem imediata
  setTimeout(() => checkSniperTargets(client), 10_000);
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
