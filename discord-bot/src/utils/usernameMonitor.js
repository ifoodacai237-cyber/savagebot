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
import { ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';

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

// ─── Lista PT ─────────────────────────────────────────────────────────────────
// Gerúndios, infinitivos, pretérito perfeito, condicional, subj. imperfeito,
// substantivos raros, termos técnicos/médicos, arcaísmos — tudo sem acento
// pois Discord usernames não aceitam caracteres especiais.
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
  'aprimorando','canalizando','carinhando','castigando','cativando','corroendo',
  'desabando','desdenhando','despertando','emanando','encarcerando','evoluindo',
  'fascinando','fermentando','germinando','habitando','ignorando','impulsionando',
  'integrando','irradiando','manifestando','neutralizando','orbitando',
  'precipitando','reagindo','recolhendo','recompondo','redescobrindo',
  'reerguendo','refazendo','regenerando','reivindicando','renovando',
  'resgatando','reverberando','subjugando','sucumbindo','transplantando',
  'ultrajando','vaciando','vasculhando','venerando','vigiando','zarpeando',
  // ── pretérito perfeito 3ª pessoa do plural (-aram / -eram / -iram) ─────────
  'abandonaram','aceitaram','acordaram','alcancaram','amaram','andaram',
  'apareceram','apostaram','aprovaram','arriscaram','assombraram','atacaram',
  'atravessaram','avancaram','bateram','buscaram','cabiram','calharam',
  'caminharam','cantaram','capturaram','carregaram','cederam','chegaram',
  'choraram','cobraram','colocaram','combateram','conquistaram','construiram',
  'contaram','continuaram','contribuiram','conviveram','correram','cortaram',
  'criaram','cruzaram','deixaram','derrotaram','descobriram','destruiram',
  'dominaram','encontraram','enfrentaram','enganaram','escaparam','escolheram',
  'esperaram','estudaram','evoluiram','existiram','fugiram','ganharam',
  'governaram','guardaram','guerrearam','habitaram','ignoraram','iluminaram',
  'iniciaram','invadiram','juntaram','lancaram','libertaram','lutaram',
  'marcaram','mergulharam','mudaram','nasceram','navegaram','obtiveram',
  'partiram','pensaram','perderam','permaneceram','persistiram','planejaram',
  'procuraram','protegeram','quebraram','realizaram','recuaram','reinaram',
  'rejeitaram','renasceram','resistiram','romperam','sacrificaram','salvaram',
  'seguiram','sentiram','separaram','sobreviveram','sonharam','sumiram',
  'superaram','tentaram','tocaram','transformaram','triunfaram','uniram',
  'vagaram','venceram','viajaram','viram','viveram','voltaram','voaram',
  'zebraram','desviaram','erguiram','falharam','forjaram','fundiram',
  'invadiram','largaram','marcharam','partiram','rasgaram','retornaram',
  'revelaram','roubaram','rugeram','silenciaram','sombrearam','sufocaram',
  // ── pretérito perfeito 3ª pessoa singular (-ou / -eu / -iu / -oi) ──────────
  'abandonou','acreditou','alcancou','amou','andou','apareceu','apostou',
  'aproveitou','arriscou','assombrou','atacou','atravessou','avancou','bateu',
  'buscou','cahiu','caminhou','cantou','capturou','carregou','cedeu','chegou',
  'chorou','colocou','combateu','conquistou','construiu','contou','continuou',
  'correu','cortou','criou','cruzou','derrotou','descobriu','destruiu',
  'dominou','encontrou','enfrentou','enganou','escolheu','esperou','estudou',
  'evoluiu','existiu','fugiu','ganhou','governou','guardou','guerreou',
  'habitou','ignorou','iluminou','iniciou','invadiu','lancou','libertou',
  'lutou','marcou','mergulhou','mudou','nasceu','navegou','obteve','partiu',
  'pensou','perdeu','permaneceu','persistiu','planejou','procurou','protegeu',
  'quebrou','realizou','recuou','reiniciou','rejeitou','renasceu','resistiu',
  'rompeu','sacrificou','salvou','sentiu','separou','sobreviveu','sonhou',
  'sumiu','superou','tentou','tocou','transformou','triunfou','vagou',
  'venceu','viajou','voltou','voou','desviou','ergueu','falhou','forjou',
  'fundiu','largou','marchou','rasgou','retornou','revelou','roubou',
  'rugiu','silenciou','sofreu','sufocou','traiu','tremeu',
  // ── condicional (-aria / -eria / -iria) ────────────────────────────────────
  'abandonaria','aceitaria','alcancaria','amaria','apareceria','arriscaria',
  'atravessaria','bateria','buscaria','caminharia','cantaria','capturaria',
  'carregaria','cederia','chegaria','choraria','chorarias','combateria',
  'conquistaria','construiria','continuaria','correria','cortaria','criaria',
  'cruzaria','derrotaria','descobriria','destruiria','dominaria','encontraria',
  'enfrentaria','enganaria','escolheria','esperaria','estudaria','evoluiria',
  'existiria','fugiria','ganharia','governaria','guerrearia','habitaria',
  'ignoraria','iluminaria','iniciaria','invadiria','lancaria','libertaria',
  'lutaria','marcaria','mergulharia','mudaria','nasceria','navegaria',
  'partiria','perderia','persistiria','planejaria','procuraria','protegeria',
  'quebraria','realizaria','recuaria','reinaria','rejeitaria','renasceria',
  'resistiria','romperia','sacrificaria','salvaria','seguiria','sentiria',
  'sobreviveria','sonharia','superaria','tentaria','tocaria','transformaria',
  'triunfaria','vagaria','venceria','viajaria','viveria','voltaria','voaria',
  'amarias','viveria','fugiria','buscarias','chorarias','dormitaria',
  'resistiria','cresceria','valeria','sairia','faria','teria','diria',
  'saberia','poderia','deveria','quereria','veria','viria','iria',
  'traria','fariamos','teriamos','seriamos','iriamos','viriamos',
  // ── subjuntivo imperfeito (-asse / -esse / -isse) ──────────────────────────
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
  'vivesse','voltasse','voasse','crescesse','valesse','soubesse','pudesse',
  'devesse','quisesse','fosse','tivesse','viesse','dissesse','fizesse',
  'trouxesse','visse','saisse','trouxesse','houvesse',
  // ── substantivos raros e incomuns ──────────────────────────────────────────
  'abissobentonica','acrofobia','acronimia','acrospira','acuidade','adagio',
  'adamancia','adumbrar','aeluropode','aerofobia','agorafobia','agronomia',
  'agudeza','alcunha','alfeizar','algaravia','alhures','alquebrar','altruismo',
  'alvissaras','amalgama','ambiencia','ambiguidade','ambulatorio','amebismo',
  'amordacar','anacoreta','anadiplosse','anarquia','anfibolia','angariacao',
  'angulosidade','animadversao','anomalia','antagonismo','antropofagia',
  'aporia','apostasia','aquiescencia','arrepio','assimetria','assombro',
  'ataraxia','atavistico','autoctone','autonomia','avessia','azimute',
  'bailado','balbucio','barbarie','beatitude','berberisco','bifurcacao',
  'bizarria','blandicia','boicote','bravata','brutalidade','burlesco',
  'calamidade','caligrafia','cansaco','carmesim','catastrofe','cautela',
  'celeuma','ceticismo','chacota','clamor','claridade','cobica','coerencia',
  'complacencia','condescendencia','conformidade','conivencia','contenda',
  'convulsao','copioso','crepusculo','curvatura','desdita','desfecho',
  'desmembramento','desolacao','destemor','desvario','dicotomia','dilema',
  'discordancia','displicencia','divergencia','ebulicao','efemeridade',
  'efusao','elegancia','eloquencia','eminencia','emolientez','empatia',
  'epifania','erupcao','escassez','escoamento','esgotamento','espiritualidade',
  'estagnacao','estranheza','euforia','exuberancia','fadiga','falacia',
  'familiaridade','fastio','fatalidade','fatuidade','feiticeira','fervor',
  'fetiche','fissura','flagelo','fluidez','fugacidade','fulgor','funesto',
  'galopante','genealogia','genialidade','grandiosidade','gravidade',
  'habitualidade','harmonia','hegemonia','heresia','hipocrisia','imobilidade',
  'imparcialidade','impavido','impertinencia','impotencia','impudencia',
  'imundice','inadimplencia','incerteza','incongruencia','indiferenca',
  'indolencia','inercial','inevitabilidade','infamia','insensatez',
  'insignificancia','insuficiencia','integridade','interminavel','intuicao',
  'iracundia','isolamento','lamento','languor','lastima','letargia',
  'levedad','limitacao','lividez','lucidez','lusco','magnetismo','magnificencia',
  'malevolencia','malfadado','malicia','malignidade','mancebo','mansidao',
  'melancolia','menosprezo','mesquinhez','metamorfose','misantropia',
  'mobilidade','modestia','mortalidade','mutabilidade','narcisismo',
  'necessidade','negatividade','niilismo','nocturnidade','nostalgia',
  'obstinacao','obsolescencia','obtusidade','ociosidade','ofuscamento',
  'opressao','ostentacao','otimismo','pantomima','paradoxo','parcimonia',
  'passividade','penuria','perdulario','perplexidade','perseveranca',
  'pessimismo','predicamento','prepotencia','produtividade','profundidade',
  'providencia','pudor','pusilanimidade','querela','quietude','radicalismo',
  'rancor','rapacidade','receio','resignacao','resiliencia','retrocesso',
  'rigidez','sagacidade','sarcasmo','satisfacao','serenidade','sevicia',
  'simplicidade','soberba','sofisticacao','solidariedade','somatorio',
  'somnolencia','submissao','subversao','sufraganca','suplicio','susceptivel',
  'tenacidade','tenuidade','testemunho','timidez','tirania','torpor',
  'totalidade','toxidade','transformacao','transicao','tumulto','turpitude',
  'ubiquidade','unanimidade','unicidade','uniformidade','urticaria',
  'usurpacao','vagabundagem','vaidade','valentia','vanidade','variedade',
  'veemencia','verossimilhanca','versabilidade','vilania','violencia',
  'volatilidade','vulnerabilidade','xenofobia','zealotismo',
  // ── termos técnicos / médicos / científicos ────────────────────────────────
  'esofagenterostomia','fonautografia','hepatoesplenomegalia','cardiomiopatia',
  'arterioesclerose','traqueobronquite','bronquiectasia','glomerulonefrite',
  'pielonefrite','osteossarcoma','condrossarcoma','hemangiossarcoma',
  'mielodisplasia','trombocitopenia','eritroblastose','platirrinia',
  'dolicocefalia','braquicefalia','espondilolistese','espondilodiscite',
  'polineuropatia','encefalopatia','miocardiopatia','vasculopatia',
  'flebotomia','endarterectomia','traqueostomia','colostomia','ileostomia',
  'gastrostomia','cecostomia','jejunostomia','sigmoidoscopia','colonoscopia',
  'esofagogastroduodenoscopia','laparoscopia','toracoscopia','mediastinoscopia',
  'broncoscopia','citoscopia','ureteroscopia','nefroscopia','artroscopia',
  'histeroscopia','fetoscopia','amniocentese','cordocentese','placentocentese',
  'eritropoiese','hematopoiese','megacariocitopoiese','linfocitopoiese',
  'granulopoiese','mielopoiese','trombopoiese','angiopoiese',
  'ferrocinetica','cromossomiopatia','cromossomiopatias','policromatofilia',
  'hipocromasia','macrocitose','microcitose','anisocitose','poiquilocitose',
  'esferocitose','eliptocitose','acantocitose','estomatocitose',
  'fotossintese','quimiossintese','catabolismo','anabolismo','metabolismo',
  'enzimologia','imunologia','virology','parasitologia','microbiologia',
  'epidemiologia','endocrinologia','reumatologia','hematologia','oncologia',
  'radiologia','anestesiologia','neonatologia','gerontologia','psiquiatria',
  // ── arcaísmos e palavras raras em uso ─────────────────────────────────────
  'outrossim','dessarte','malgrado','conquanto','porquanto','outrementemente',
  'dessemelhante','alvorocar','alvorotado','aquilatar','arrazoado','assaz',
  'aterimo','atuitar','aventalmente','barafunda','bargantear','bazofiar',
  'benignidade','bisonhice','borralhar','bravear','brunidura','bulhento',
  'calejar','calhambeque','candura','canseira','capenga','catilagem',
  'caturrar','cerceamento','cismar','condoer','confabular','coonestar',
  'corcovear','cotoviar','crepitar','custear','desdenhoso','desestimar',
  'desmoronar','desvairar','detrator','dimanar','dirimir','discorrer',
  'embargar','embelecer','embicar','encardir','encoleirar','entabolar',
  'entrambos','envergonhar','erigir','espoletar','esquadrinhar',
  'estultice','evadir','exacerbar','exalar','exarar','expungir','extorquir',
  'faccioso','falaz','fatuo','ferrenho','fugacidade','ganancioso',
  'gastador','gatuno','glutao','gracejo','grandiloquente','habilidoso',
  'hesitar','hipocrita','iminente','impertinente','incitar','inculcar',
  'indagar','indignar','infamar','infestar','infligir','ingrato',
  'instigar','intimidar','intrigar','invejar','irrisorio','ladino',
  'lascivo','libertino','lisonjeiro','malfadado','malversacao','mesclado',
  'mofino','motejador','nefasto','nescio','obtuso','odiar','ofender',
  'omitir','oprimir','parvidade','patife','perjuro','pertinaz','perverso',
  'petulante','pifio','plebeu','ponderar','presunco','procaz','provocar',
  'rapinar','rebater','rechacar','remendar','renhido','retorquir','revel',
  'rufianismo','salafrario','sandice','saturar','soberbo','sobrepujar',
  'sorrateiro','subornar','subverter','tacanho','tergiversar','tolo',
  'tortuoso','traidor','turvar','usurpar','venal','vilipendiar','vituperar',
];

// ─── Lista EN (palavras reais inglesas, raras e incomuns) ─────────────────────
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
  'venturing','withering','abdicating','absolving','accentuating','acclaiming',
  'accumulating','acutely','adhering','adjudicating','administering','admonishing',
  'adorning','aggrandizing','agitating','alienating','alleviating','amalgamating',
  'amassing','ameliorating','anticipating','arbitrating','articulating','aspiring',
  'assimilating','attenuating','augmenting','circumventing','collaborating',
  'commiserating','compelling','contemplating','corroborating','culminating',
  'deliberating','deteriorating','discerning','dissipating','emulating',
  'enumerating','epitomizing','eradicating','exacerbating','exaggerating',
  'exasperating','exhilarating','exonerating','extricating','facilitating',
  'galvanizing','illuminating','incapacitating','inculcating','indoctrinating',
  'infiltrating','instigating','intimidating','invigorating','investigating',
  'legitimizing','manipulating','mitigating','modulating','motivating',
  'obfuscating','oscillating','permeating','perpetuating','proliferating',
  'propagating','saturating','scrutinizing','segregating','simulating',
  'speculating','stimulating','subjugating','subordinating','suffocating',
  'terminating','transgressing','trespassing','vacillating','validating',
  'vindicating','violating','visualizing',
  // ── past tense (irregular & regular) ───────────────────────────────────────
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
  'exuberance','fanaticism','fervency','ferocity','fervidness','forbearance',
  'foreboding','fortitude','fragility','gallantry','grandiosity','gravitas',
  'grievance','groundlessness','hallucination','hegemony','heresy','hubris',
  'hypocrisy','idolatry','ignominy','illusion','immovability','impunity',
  'incorruptibility','indignation','infallibility','insolence','insurgency',
  'intransigence','invincibility','irrationality','isolation','jadedness',
  'judgement','jurisdiction','juxtaposition','kinship','languor','lethargy',
  'lucidity','luminescence','magnanimity','malfeasance','malice','malignancy',
  'martyrdom','melancholy','mendacity','metamorphosis','misanthropy','moderation',
  'mortification','mysticism','narcissism','nihilism','nonchalance','nostalgia',
  'obstinacy','ominousness','omniscience','oppression','ostentation','outrage',
  'paralysis','paranoia','partiality','passivity','pathology','persecution',
  'pessimism','piety','platitude','plausibility','polarization','pomposity',
  'predisposition','prejudice','pretension','profundity','proclivity','prophecy',
  'prudence','pugnacity','quandary','radicalism','rancor','rationality',
  'recklessness','redemption','remorse','resentment','resilience','retribution',
  'reverence','rigidity','ruthlessness','sagacity','sanctimony','sarcasm',
  'savagery','schism','serenity','severity','skepticism','solemnity','somberness',
  'sovereignty','steadfastness','stoicism','stubbornness','sublimity','subversion',
  'suppression','tenacity','temerity','timidity','torment','treachery','turbulence',
  'tyranny','ubiquity','unyielding','usurpation','validity','vanity','vengeance',
  'volatility','vulnerability','wickedness','zealotry','zealousness',
  // ── uncommon verbs (infinitive / base form) ────────────────────────────────
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

// mixed: letras + dígitos, vários padrões e comprimentos
const MIXED_PREFIXES = [
  'xo','ae','ix','oz','ue','ei','ao','ui','eu','oi','ax','ez','ux','ya','ko',
  'zk','qr','vx','jy','wq','bz','fx','gv','hj','lm','np','pt','rw','sv','tz',
];
function generateMixed() {
  const mode = randInt(0, 5);
  switch (mode) {
    case 0: {
      // letras + 2 dígitos: ex "ae47"
      const l = randInt(2, 4);
      const letters = Array.from({ length: l }, () => rand([...ALPHA])).join('');
      const nums    = String(randInt(10, 999));
      return letters + nums;
    }
    case 1: {
      // dígito + letras + dígito: ex "3xo8"
      const l = randInt(1, 3);
      const mid = Array.from({ length: l }, () => rand([...ALPHA])).join('');
      return rand([...DIGITS]) + mid + rand([...DIGITS]);
    }
    case 2: {
      // prefixo raro + 2-3 dígitos: ex "zk42"
      return rand(MIXED_PREFIXES) + String(randInt(10, 9999));
    }
    case 3: {
      // 3 letras + underscore + 2 dígitos: ex "vxk_08" — Discord permite _
      const letters = Array.from({ length: randInt(2, 4) }, () => rand([...ALPHA])).join('');
      return letters + '_' + String(randInt(0, 99)).padStart(2, '0');
    }
    case 4: {
      // 1-2 dígitos + letras + 1 dígito: ex "7az3"
      const pre  = String(randInt(1, 99));
      const mid  = Array.from({ length: randInt(1, 3) }, () => rand([...ALPHA])).join('');
      const suf  = rand([...DIGITS]);
      return pre + mid + suf;
    }
    default: {
      // fallback: 4-6 chars aleatórios com pelo menos 1 letra e 1 dígito
      const len = randInt(4, 6);
      const arr = Array.from({ length: len }, () => rand([...MIXED_CHARS]));
      if (!arr.some(c => DIGITS.includes(c))) arr[randInt(1, len - 1)] = rand([...DIGITS]);
      if (!arr.some(c => ALPHA.includes(c)))  arr[randInt(0, len - 2)] = rand([...ALPHA]);
      return arr.join('');
    }
  }
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
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`<:sorte:1526435450259243180> **@${username}**\ndisponível agora · <t:${ts}:R>`)
        );
      await ch.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
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
