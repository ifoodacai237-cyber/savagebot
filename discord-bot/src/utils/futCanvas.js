import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─── Fontes ───────────────────────────────────────────────────────────────────
const __dir   = dirname(fileURLToPath(import.meta.url));
const fontDir = join(__dir, '..', '..', 'fonts');
try {
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Bold.ttf'),    'Roboto');
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Regular.ttf'), 'RobotoReg');
} catch {}

// ─── Dimensões do campo ───────────────────────────────────────────────────────
const FIELD_W  = 760;
const FIELD_H  = 960;
const CARD_W   = 98;     // campo: card width
const CARD_H   = 132;    // campo: card height

// ─── Dimensões cards ──────────────────────────────────────────────────────────
const PC_W = 200;  // pack reveal
const PC_H = 272;
const CC_W = 160;  // collection
const CC_H = 216;

// ─── Raridades EA FC 26 — cores autênticas ────────────────────────────────────
const RARITY = {
  // Carta Preta/Especial (85-99): fundo escuro roxo/preto
  black: {
    bg1: '#1c0040', bg2: '#0c0020', bg3: '#060010',
    leftBg: 'rgba(30,0,70,0.88)',
    accent: '#c040ff',
    ovr: '#ffffff',
    pos: '#dd99ff',
    statVal: '#ffffff',
    statLab: '#cc88ff',
    nameBg: 'rgba(10,0,30,0.95)',
    statBg: 'rgba(14,0,40,0.98)',
    border: '#9922cc',
    glow: 22,
    strip: '#8822bb',
    shimmer: 'rgba(160,60,255,0.15)',
  },
  // Carta Ouro (75-84): fundo dourado autêntico EA FC
  gold: {
    bg1: '#c8920a', bg2: '#8a6000', bg3: '#503800',
    leftBg: 'rgba(100,60,0,0.82)',
    accent: '#ffd700',
    ovr: '#1a0a00',
    pos: '#3a1a00',
    statVal: '#1a0a00',
    statLab: '#5a3000',
    nameBg: 'rgba(12,6,0,0.95)',
    statBg: 'rgba(20,10,0,0.98)',
    border: '#e0c000',
    glow: 14,
    strip: '#d4aa00',
    shimmer: 'rgba(255,220,40,0.18)',
  },
  // Carta Prata (65-74): azul-acinzentado
  silver: {
    bg1: '#7890b0', bg2: '#3a4e6a', bg3: '#1e2e40',
    leftBg: 'rgba(30,44,65,0.85)',
    accent: '#aabbcc',
    ovr: '#0a1422',
    pos: '#1a2a3a',
    statVal: '#ffffff',
    statLab: '#8899aa',
    nameBg: 'rgba(8,14,24,0.96)',
    statBg: 'rgba(12,20,32,0.98)',
    border: '#7898b8',
    glow: 10,
    strip: '#6688aa',
    shimmer: 'rgba(150,180,220,0.14)',
  },
  // Carta Bronze (55-64): cobre/marrom quente
  bronze: {
    bg1: '#c07838', bg2: '#804a18', bg3: '#4a2400',
    leftBg: 'rgba(70,36,0,0.85)',
    accent: '#e09040',
    ovr: '#1a0800',
    pos: '#3a1400',
    statVal: '#ffffff',
    statLab: '#cc8040',
    nameBg: 'rgba(12,4,0,0.96)',
    statBg: 'rgba(18,8,0,0.98)',
    border: '#cc7028',
    glow: 8,
    strip: '#b06020',
    shimmer: 'rgba(200,120,40,0.15)',
  },
};

// ─── Formações ────────────────────────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'MC', x:.20,y:.50 },{ pos:'MC', x:.50,y:.50 },{ pos:'MC', x:.80,y:.50 },
    { pos:'PE', x:.12,y:.22 },{ pos:'CA', x:.50,y:.13 },{ pos:'PD', x:.88,y:.22 },
  ],
  '4-4-2': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'PE', x:.10,y:.50 },{ pos:'MC', x:.36,y:.50 },{ pos:'MC', x:.64,y:.50 },{ pos:'PD',x:.90,y:.50 },
    { pos:'CA', x:.35,y:.18 },{ pos:'CA', x:.65,y:.18 },
  ],
  '4-2-4': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'MC', x:.34,y:.52 },{ pos:'MC', x:.66,y:.52 },
    { pos:'PE', x:.10,y:.20 },{ pos:'CA', x:.36,y:.13 },{ pos:'CA', x:.64,y:.13 },{ pos:'PD',x:.90,y:.20 },
  ],
  '3-3-4': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'ZAG',x:.22,y:.73 },{ pos:'ZAG',x:.50,y:.73 },{ pos:'ZAG',x:.78,y:.73 },
    { pos:'MC', x:.22,y:.51 },{ pos:'MC', x:.50,y:.51 },{ pos:'MC', x:.78,y:.51 },
    { pos:'PE', x:.10,y:.20 },{ pos:'CA', x:.36,y:.13 },{ pos:'CA', x:.64,y:.13 },{ pos:'PD',x:.90,y:.20 },
  ],
  '5-3-2': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.07,y:.72 },{ pos:'ZAG',x:.27,y:.75 },{ pos:'ZAG',x:.50,y:.75 },{ pos:'ZAG',x:.73,y:.75 },{ pos:'LD',x:.93,y:.72 },
    { pos:'MC', x:.23,y:.51 },{ pos:'MC', x:.50,y:.51 },{ pos:'MC', x:.77,y:.51 },
    { pos:'CA', x:.35,y:.18 },{ pos:'CA', x:.65,y:.18 },
  ],
  '4-5-1': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'PE', x:.10,y:.50 },{ pos:'MC', x:.30,y:.50 },{ pos:'MC', x:.50,y:.50 },{ pos:'MC', x:.70,y:.50 },{ pos:'PD',x:.90,y:.50 },
    { pos:'CA', x:.50,y:.15 },
  ],
  '3-4-3': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'ZAG',x:.22,y:.73 },{ pos:'ZAG',x:.50,y:.73 },{ pos:'ZAG',x:.78,y:.73 },
    { pos:'LE', x:.10,y:.50 },{ pos:'MC', x:.36,y:.50 },{ pos:'MC', x:.64,y:.50 },{ pos:'LD',x:.90,y:.50 },
    { pos:'PE', x:.12,y:.20 },{ pos:'CA', x:.50,y:.13 },{ pos:'PD', x:.88,y:.20 },
  ],
};

// ─── Nationalidades → ISO ──────────────────────────────────────────────────────
const NAT_ISO = {
  BRA:'br',ARG:'ar',FRA:'fr',ESP:'es',POR:'pt',ALE:'de',ING:'gb',ITA:'it',
  HOL:'nl',BEL:'be',MAR:'ma',SEN:'sn',NOR:'no',POL:'pl',CRO:'hr',AUT:'at',
  EGI:'eg',NIG:'ng',CMR:'cm',SVN:'si',CAN:'ca',EUA:'us',URU:'uy',CHI:'cl',
  MLT:'mt',IRL:'ie',AUS:'au',GUI:'gn',SER:'rs',SUI:'ch',VEN:'ve',CIV:'ci',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w / 2), Math.abs(h / 2));
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '.' : str;
}

function statColor(val) {
  if (val >= 85) return '#00cc44';
  if (val >= 70) return '#88cc00';
  if (val >= 55) return '#ffcc00';
  if (val >= 40) return '#ff8800';
  return '#ee2222';
}

// ─── Cache de fotos e bandeiras ────────────────────────────────────────────────
const _photoCache = new Map();
const _flagCache  = new Map();

// ─── Mapeamento de nomes curtos → nome completo para busca no TheSportsDB ─────
const TSDB_NAME_MAP = {
  // Brasileiros
  'Vinícius Jr':      'Vinicius Junior',
  'Vinicius Jr':      'Vinicius Junior',
  'Vinícius Jr':      'Vinicius Junior',
  'Alisson':          'Alisson Becker',
  'Casemiro':         'Carlos Casemiro',
  'Marquinhos':       'Marquinhos',
  'Militão':          'Eder Militao',
  'Militao':          'Eder Militao',
  'Raphinha':         'Raphael Dias Belloli',
  // Franceses
  'Mbappé':           'Kylian Mbappe',
  'Mbappe':           'Kylian Mbappe',
  'Griezmann':        'Antoine Griezmann',
  'Theo Hernández':   'Theo Hernandez',
  'Theo Hernandez':   'Theo Hernandez',
  'Benzema':          'Karim Benzema',
  // Belgas
  'De Bruyne':        'Kevin De Bruyne',
  'Courtois':         'Thibaut Courtois',
  // Holandeses / Alemães
  'Van Dijk':         'Virgil Van Dijk',
  'Neuer':            'Manuel Neuer',
  'Kroos':            'Toni Kroos',
  'Ter Stegen':       'Marc-Andre Ter Stegen',
  // Espanhóis
  'Rodri':            'Rodrigo Hernandez',
  'Pedri':            'Pedri Gonzalez',
  'Gavi':             'Pablo Gavi',
  'Lamine Yamal':     'Lamine Yamal',
  'Carvajal':         'Dani Carvajal',
  // Portugueses
  'Rúben Dias':       'Ruben Dias',
  'Ruben Dias':       'Ruben Dias',
  'Dias':             'Ruben Dias',
  // Ingleses / Europeus
  'Bellingham':       'Jude Bellingham',
  'Saka':             'Bukayo Saka',
  'Salah':            'Mohamed Salah',
  'Hakimi':           'Achraf Hakimi',
  'Osimhen':          'Victor Osimhen',
  'Bastoni':          'Alessandro Bastoni',
  'Lewandowski':      'Robert Lewandowski',
  'Haaland':          'Erling Haaland',
  'Modric':           'Luka Modric',
  'Modric':           'Luka Modric',
};

// Apelidos de clube para ajudar no matching
const CLUB_ALIASES = {
  'Man City':   'Manchester City',
  'Man United': 'Manchester United',
  'Inter':      'Inter Milan',
  'PSG':        'Paris',
  'RB Leipzig': 'Leipzig',
  'Atletico':   'Atletico',
  'Al-Ittihad': 'Al-Ittihad',
  'Al Ittihad': 'Al-Ittihad',
};

// ─── Buscar foto do jogador via TheSportsDB API ────────────────────────────────
async function fetchPlayerPhoto(name, club) {
  const searchName = TSDB_NAME_MAP[name] ?? name;
  const clubStr    = CLUB_ALIASES[club ?? ''] ?? (club ?? '');
  const cacheKey   = `tsdb:${(searchName ?? 'x').toLowerCase()}|${clubStr.toLowerCase()}`;
  if (_photoCache.has(cacheKey)) return _photoCache.get(cacheKey);
  if (!name) { _photoCache.set(cacheKey, null); return null; }

  const img = await _fetchTheSportsDB(searchName, clubStr);
  _photoCache.set(cacheKey, img);
  return img;
}

async function _fetchTheSportsDB(searchName, clubStr) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(searchName)}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data    = await res.json();
    const players = data?.player ?? [];
    if (!players.length) return null;

    // ── Pontuação de melhor match ────────────────────────────────────────────
    const normalize = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
    const normClub  = normalize(clubStr);
    const normName  = normalize(searchName);
    const clubWords = normClub.split(/\s+/).filter(w => w.length > 2);

    let bestMatch = null;
    let bestScore = -1;

    for (const p of players) {
      const teamNorm = normalize(p.strTeam ?? '');
      const nameNorm = normalize(p.strPlayer ?? '');

      let score = 0;
      // Nome exato = alta pontuação
      if (nameNorm === normName) score += 10;
      else if (nameNorm.includes(normName) || normName.includes(nameNorm)) score += 5;

      // Clube match
      if (normClub && clubWords.length) {
        const clubHits = clubWords.filter(w => teamNorm.includes(w)).length;
        score += clubHits * 4;
      }

      // Foto disponível
      if (p.strThumb || p.strCutout) score += 2;

      if (score > bestScore) { bestScore = score; bestMatch = p; }
    }

    // Se nenhum match tem pontuação razoável e há vários resultados, use avatar
    if (bestScore < 2 && players.length > 3) return null;

    const thumbUrl = bestMatch?.strThumb || bestMatch?.strCutout;
    if (!thumbUrl) return null;

    // Baixa a imagem real
    const ctrl2  = new AbortController();
    const timer2 = setTimeout(() => ctrl2.abort(), 12000);
    const imgRes = await fetch(thumbUrl, {
      signal: ctrl2.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.thesportsdb.com/' },
    });
    clearTimeout(timer2);
    if (!imgRes.ok) return null;

    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length < 8000) return null;

    const img = await loadImage(buf);
    if (img.width < 30 || img.height < 30) return null;
    return img;
  } catch { clearTimeout(timer); return null; }
}

// ─── Buscar bandeira ──────────────────────────────────────────────────────────
async function fetchFlag(nat) {
  if (_flagCache.has(nat)) return _flagCache.get(nat);
  const iso = NAT_ISO[nat];
  if (!iso) { _flagCache.set(nat, null); return null; }
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res   = await fetch(`https://flagcdn.com/w40/${iso}.png`, {
      signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timer);
    if (!res.ok) { _flagCache.set(nat, null); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) { _flagCache.set(nat, null); return null; }
    const img = await loadImage(buf);
    _flagCache.set(nat, img);
    return img;
  } catch { _flagCache.set(nat, null); return null; }
}

// ─── Batch fetch fotos ────────────────────────────────────────────────────────
async function batchFetchPhotos(players) {
  const out = [];
  for (let i = 0; i < players.length; i++) {
    const p    = players[i]?.player ?? players[i];
    const name = p?.name ?? null;
    const club = p?.club ?? null;
    out.push(name ? await fetchPlayerPhoto(name, club) : null);
    if (i < players.length - 1) await new Promise(r => setTimeout(r, 180));
  }
  return out;
}

// ─── Silhueta / avatar fallback ───────────────────────────────────────────────
function drawAvatar(ctx, x, y, w, h, r, name) {
  // Fundo gradiente sólido (cor da raridade)
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, r.bg1); bg.addColorStop(0.6, r.bg2); bg.addColorStop(1, r.bg3);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);

  // Iniciais do jogador
  const parts    = (name ?? '?').trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : (parts[0]??'?').slice(0,2).toUpperCase();

  const fs = Math.round(Math.min(w * 0.45, h * 0.38));
  ctx.save();
  ctx.font         = `bold ${fs}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle  = 'rgba(0,0,0,0.60)';
  ctx.lineWidth    = fs * 0.08;
  ctx.lineJoin     = 'round';
  ctx.strokeText(initials, x + w * 0.62, y + h * 0.44);
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.fillText(initials, x + w * 0.62, y + h * 0.44);
  ctx.restore();
}

// ─── CARD EA FC 26 — design autêntico ─────────────────────────────────────────
// Layout:
//   ┌──────────────────────────────┐
//   │ [OVR] │  foto preenche fundo │
//   │ [POS] │                      │
//   │ [NAT] │                      │
//   │───────────────────────────── │
//   │         NOME JOGADOR         │
//   │ PAC  SHO  PAS  DRI  DEF  PHY │
//   └──────────────────────────────┘
function drawEACard(ctx, x, y, w, h, player, photo, flag) {
  const R   = Math.round(w * 0.075);
  const r   = RARITY[player.rarity] ?? RARITY.bronze;

  // ── 1. Sombra ──────────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.92)';
  ctx.shadowBlur    = 18;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 6;
  const bgGrad = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  bgGrad.addColorStop(0, r.bg1); bgGrad.addColorStop(0.55, r.bg2); bgGrad.addColorStop(1, r.bg3);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, w, h, R); ctx.fill();
  ctx.restore();

  // ── 2. Foto como fundo (clipped) ──────────────────────────────────────────
  const STATS_H = Math.round(h * 0.215);
  const NAME_H  = Math.round(h * 0.115);
  const photoH  = h - STATS_H - NAME_H;
  const photoX  = x;
  const photoY  = y;

  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();

  if (photo) {
    // Renderiza foto ocupando toda a parte superior
    const scale  = Math.max(w / photo.width, photoH / photo.height);
    const drawW  = photo.width  * scale;
    const drawH  = photo.height * scale;
    const drawX  = photoX + (w - drawW) / 2;
    const drawY  = photoY;
    ctx.drawImage(photo, drawX, drawY, drawW, drawH);
  } else {
    drawAvatar(ctx, photoX, photoY, w, photoH, r, player.name);
  }

  // Fade inferior da foto para barra de nome
  const fadeBot = ctx.createLinearGradient(x, photoY + photoH * 0.55, x, photoY + photoH);
  fadeBot.addColorStop(0, 'rgba(0,0,0,0)');
  fadeBot.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = fadeBot; ctx.fillRect(x, photoY + photoH * 0.55, w, photoH * 0.45);

  // Shimmer diagonal
  const shim = ctx.createLinearGradient(x, y + h, x + w, y);
  shim.addColorStop(0, 'transparent'); shim.addColorStop(0.4, r.shimmer);
  shim.addColorStop(0.6, r.shimmer); shim.addColorStop(1, 'transparent');
  ctx.fillStyle = shim; ctx.fillRect(x, y, w, h);

  ctx.restore();

  // ── 3. Painel esquerdo: OVR / POS / Bandeira ─────────────────────────────
  const PANEL_W = Math.round(w * 0.38);

  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();

  // Gradiente do painel esquerdo
  const panelGrad = ctx.createLinearGradient(x, y, x + PANEL_W * 1.5, y);
  panelGrad.addColorStop(0,   r.leftBg);
  panelGrad.addColorStop(0.70,'rgba(0,0,0,0.25)');
  panelGrad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = panelGrad; ctx.fillRect(x, y, PANEL_W * 1.5, photoH);

  ctx.restore();

  // OVR number
  const padL    = Math.round(w * 0.065);
  const ovrSize = Math.round(h * 0.165);
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.fillStyle    = r.ovr;
  ctx.font         = `bold ${ovrSize}px Roboto`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(player.ovr), x + padL, y + Math.round(h * 0.044));
  ctx.restore();

  // Position
  const posSize = Math.round(h * 0.077);
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.90)'; ctx.shadowBlur = 6;
  ctx.fillStyle    = r.pos;
  ctx.font         = `bold ${posSize}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(player.pos, x + padL + ovrSize * 0.44, y + Math.round(h * 0.044) + ovrSize + 1);
  ctx.restore();

  // Bandeira
  const flagY = y + Math.round(h * 0.044) + ovrSize + posSize + 6;
  const flagW = Math.round(w * 0.22);
  const flagH = Math.round(flagW * 0.63);
  const flagX = x + padL - 1;

  if (flag) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.80)'; ctx.shadowBlur = 4;
    roundRect(ctx, flagX, flagY, flagW, flagH, 2); ctx.clip();
    ctx.drawImage(flag, flagX, flagY, flagW, flagH);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.40)'; ctx.lineWidth = 0.8;
    roundRect(ctx, flagX, flagY, flagW, flagH, 2); ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, flagX, flagY, flagW, flagH, 2); ctx.fill();
    ctx.fillStyle    = 'rgba(255,255,255,0.90)';
    ctx.font         = `bold ${Math.round(flagH * 0.55)}px Roboto`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((player.nat ?? '').slice(0, 3), flagX + flagW / 2, flagY + flagH / 2);
    ctx.restore();
  }

  // ── 4. Barra de nome ──────────────────────────────────────────────────────
  const ny = y + photoH;
  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();
  ctx.fillStyle = r.nameBg; ctx.fillRect(x, ny, w, NAME_H);

  // Linha accent no topo
  const accG = ctx.createLinearGradient(x, ny, x + w, ny);
  accG.addColorStop(0, 'transparent'); accG.addColorStop(0.15, r.accent);
  accG.addColorStop(0.85, r.accent); accG.addColorStop(1, 'transparent');
  ctx.fillStyle = accG; ctx.fillRect(x, ny, w, 1.5);

  const nameSize = Math.max(8, Math.round(w * 0.094));
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 5;
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold ${nameSize}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(trunc((player.name ?? '').toUpperCase(), 12), x + w / 2, ny + NAME_H / 2);
  ctx.restore();

  // ── 5. Barra de stats ─────────────────────────────────────────────────────
  // Stats EA FC 26: PAC SHO PAS DRI DEF PHY
  const sy  = ny + NAME_H;
  const stats = [
    { l:'PAC', v: player.pac },
    { l:'SHO', v: player.fin },
    { l:'PAS', v: player.pas },
    { l:'DRI', v: player.dri },
    { l:'DEF', v: player.def },
    { l:'PHY', v: player.fis },
  ];

  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();
  ctx.fillStyle = r.statBg; ctx.fillRect(x, sy, w, STATS_H);

  const cellW  = w / 6;
  const labSz  = Math.max(5, Math.round(w * 0.049));
  const valSz  = Math.max(7, Math.round(w * 0.082));

  for (let i = 0; i < 6; i++) {
    const cx = x + cellW * i + cellW / 2;

    // Separador vertical
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + cellW * i, sy + STATS_H * 0.15, 1, STATS_H * 0.70);
    }

    // Valor (em cima, colorido por performance)
    ctx.fillStyle    = statColor(stats[i].v ?? 0);
    ctx.font         = `bold ${valSz}px Roboto`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(stats[i].v ?? 0), cx, sy + STATS_H * 0.60);

    // Label (embaixo, muted)
    ctx.fillStyle    = r.statLab;
    ctx.font         = `${labSz}px RobotoReg`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stats[i].l, cx, sy + STATS_H * 0.93);
  }

  // Tira inferior colorida
  ctx.fillStyle = r.strip;
  ctx.fillRect(x + R, y + h - 2.5, w - R * 2, 2.5);
  ctx.restore();

  // ── 6. Borda brilhante ────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = r.border; ctx.shadowBlur = r.glow;
  ctx.strokeStyle = r.border;
  ctx.lineWidth   = r.glow >= 20 ? 2.0 : 1.5;
  roundRect(ctx, x, y, w, h, R); ctx.stroke();
  ctx.restore();
}

// ─── Slot vazio no campo ──────────────────────────────────────────────────────
function drawEmptySlot(ctx, cx, cy, slotPos) {
  const x = Math.round(cx - CARD_W / 2);
  const y = Math.round(cy - CARD_H / 2);
  const R = 7;

  ctx.save();
  ctx.globalAlpha = 0.55;

  // Fundo sólido semi-transparente
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.fill();

  // Borda pontilhada
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.2;
  roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.stroke();
  ctx.setLineDash([]);

  // Ícone + e posição
  ctx.fillStyle    = 'rgba(255,255,255,0.50)';
  ctx.font         = `bold ${Math.round(CARD_H * 0.24)}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', cx, cy - CARD_H * 0.10);

  ctx.font         = `bold ${Math.round(CARD_H * 0.08)}px Roboto`;
  ctx.fillStyle    = 'rgba(255,255,255,0.40)';
  ctx.fillText(slotPos, cx, cy + CARD_H * 0.20);

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Card no campo (versão compacta do EACard) ────────────────────────────────
function drawFieldCard(ctx, cx, cy, player, slotPos, photo, flag) {
  if (!player) { drawEmptySlot(ctx, cx, cy, slotPos); return; }

  const x = Math.round(cx - CARD_W / 2);
  const y = Math.round(cy - CARD_H / 2);
  drawEACard(ctx, x, y, CARD_W, CARD_H, player, photo, flag);

  // Label da posição do slot abaixo do card
  const lblW  = Math.round(CARD_W * 0.60);
  const lblH  = 13;
  const lblY  = y + CARD_H + 2;
  const match = player.pos === slotPos;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.80)';
  roundRect(ctx, cx - lblW/2, lblY, lblW, lblH, 3); ctx.fill();
  ctx.fillStyle    = match ? '#44ff88' : '#ffcc44';
  ctx.font         = 'bold 7px Roboto';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slotPos, cx, lblY + lblH / 2);
  ctx.restore();
}

// ─── Fundo de campo futebol ───────────────────────────────────────────────────
function drawPitch(ctx, fx, fy, fw, fh) {
  // Grama com gradiente radial
  const grass = ctx.createRadialGradient(fx+fw/2, fy+fh/2, 60, fx+fw/2, fy+fh/2, fh*0.85);
  grass.addColorStop(0,    '#2e9a32');
  grass.addColorStop(0.38, '#1e7020');
  grass.addColorStop(1,    '#0c3a10');
  ctx.fillStyle = grass;
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.fill();

  // Listras de grama
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip();
  const strH = fh / 11;
  for (let i = 0; i < 11; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(fx, fy + i * strH, fw, strH);
  }
  // Vignette no campo
  const vig = ctx.createRadialGradient(fx+fw/2, fy+fh/2, fh*0.12, fx+fw/2, fy+fh/2, fh*0.90);
  vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig; ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();

  // Linhas do campo
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth   = 1.8;

  // Borda
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.stroke();

  // Linha do meio
  ctx.beginPath(); ctx.moveTo(fx, fy+fh/2); ctx.lineTo(fx+fw, fy+fh/2); ctx.stroke();

  // Círculo central
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 54, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 3.5, 0, Math.PI*2); ctx.fill();

  // Áreas
  const pW = fw * 0.52, pH = fh * 0.165;
  const gW = fw * 0.24, gH = fh * 0.060;
  ctx.strokeRect(fx+(fw-pW)/2, fy, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy, gW, gH);
  ctx.strokeRect(fx+(fw-pW)/2, fy+fh-pH, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy+fh-gH, gW, gH);

  // Pontos de penalty
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  [fh*0.132, fh*0.868].forEach(yo => {
    ctx.beginPath(); ctx.arc(fx+fw/2, fy+yo, 3, 0, Math.PI*2); ctx.fill();
  });

  // Arcos de canto
  const cr = 12;
  [[fx,fy,0,Math.PI/2],[fx+fw,fy,Math.PI/2,Math.PI],[fx,fy+fh,3*Math.PI/2,2*Math.PI],[fx+fw,fy+fh,Math.PI,3*Math.PI/2]].forEach(([ax,ay,sa,ea]) => {
    ctx.beginPath(); ctx.arc(ax, ay, cr, sa, ea); ctx.stroke();
  });
  ctx.restore();
}

// ─── Imagem do campo (visão do time) ─────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  // Fetch fotos únicas
  const seen     = new Set();
  const photoMap = new Map();
  const flagMap  = new Map();

  for (const l of lineup) {
    const p    = l.player;
    if (!p) continue;
    const key  = `tsdb:${p.name ?? 'x'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const img = await fetchPlayerPhoto(p.name, p.club);
    if (img) photoMap.set(key, img);
    const flag = await fetchFlag(p.nat);
    if (flag) flagMap.set(p.nat, flag);
    await new Promise(r => setTimeout(r, 80));
  }

  const canvas = createCanvas(FIELD_W, FIELD_H);
  const ctx    = canvas.getContext('2d');

  // Fundo escuro do estádio
  const bg = ctx.createLinearGradient(0, 0, 0, FIELD_H);
  bg.addColorStop(0, '#040810'); bg.addColorStop(1, '#040a06');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  // ── Header bar ───────────────────────────────────────────────────────────
  const HDR_H = 60;
  const hdrBg = ctx.createLinearGradient(0, 0, 0, HDR_H + 8);
  hdrBg.addColorStop(0, 'rgba(0,0,0,0.98)'); hdrBg.addColorStop(1, 'rgba(0,0,0,0.80)');
  ctx.fillStyle = hdrBg;
  roundRect(ctx, 16, 4, FIELD_W - 32, HDR_H, 10); ctx.fill();

  // Linha verde à esquerda
  ctx.fillStyle = '#2ecc40'; ctx.fillRect(16, 4, 4, HDR_H);

  // Nome do time
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.80)'; ctx.shadowBlur = 5;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 22px Roboto';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(trunc(teamName ?? 'Meu Time', 24), 32, 4 + HDR_H / 2);
  ctx.restore();

  // ELO (direita, dourado)
  ctx.save();
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 14;
  ctx.fillStyle   = '#FFD700';
  ctx.font        = 'bold 17px Roboto';
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${elo ?? 0} ELO`, FIELD_W - 26, 4 + HDR_H * 0.50);
  ctx.restore();

  // Formação (direita, menor)
  ctx.fillStyle    = 'rgba(255,255,255,0.50)';
  ctx.font         = '13px RobotoReg';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(formation ?? '4-3-3', FIELD_W - 26, 4 + HDR_H * 0.80);

  // ── Campo de futebol ─────────────────────────────────────────────────────
  const FX = 18, FY = 70, FW = FIELD_W - 36, FH = FIELD_H - 110;
  drawPitch(ctx, FX, FY, FW, FH);

  // ── Cards dos jogadores ──────────────────────────────────────────────────
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  for (let i = 0; i < slots.length; i++) {
    const s   = slots[i];
    const ent = lineup.find(l => l.slot === i + 1);
    const p   = ent?.player ?? null;
    const key = p ? `tsdb:${p.name ?? 'x'}` : null;
    const photo = key ? (photoMap.get(key) ?? null) : null;
    const flag  = p ? (flagMap.get(p.nat) ?? null) : null;
    drawFieldCard(
      ctx,
      Math.round(FX + s.x * FW),
      Math.round(FY + s.y * FH),
      p, s.pos, photo, flag,
    );
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footY = FY + FH + 4;
  const footH = FIELD_H - footY - 4;
  const ftG   = ctx.createLinearGradient(FX, footY, FX, footY + footH);
  ftG.addColorStop(0, 'rgba(0,0,0,0.96)'); ftG.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = ftG;
  roundRect(ctx, FX, footY, FW, footH, 8); ctx.fill();

  const validOvrs = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr    = validOvrs.length
    ? (validOvrs.reduce((a, b) => a + b, 0) / validOvrs.length).toFixed(1)
    : '--';

  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 13px Roboto';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`OVR Médio: ${avgOvr}`, FX + 14, footY + footH / 2);

  ctx.fillStyle    = 'rgba(255,255,255,0.48)';
  ctx.font         = '12px RobotoReg';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Formação: ${formation ?? '4-3-3'}`, FX + FW - 14, footY + footH / 2);

  return canvas.toBuffer('image/png');
}

// ─── Pack reveal image ────────────────────────────────────────────────────────
export async function generatePackRevealImage(players) {
  if (!players?.length) {
    const c = createCanvas(400, 100);
    const cx = c.getContext('2d');
    cx.fillStyle = '#111'; cx.fillRect(0,0,400,100);
    cx.fillStyle = '#fff'; cx.font = 'bold 18px Roboto';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('Nenhuma carta encontrada!', 200, 50);
    return c.toBuffer('image/png');
  }
  const GAP  = 14;
  const PAD  = 18;
  const COLS = Math.min(players.length, 4);
  const ROWS = Math.ceil(players.length / COLS);
  const CW   = PAD * 2 + COLS * PC_W + (COLS - 1) * GAP;
  const CH   = 56 + PAD + ROWS * PC_H + (ROWS - 1) * GAP + PAD;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Fundo escuro com gradiente roxo
  const bg = ctx.createLinearGradient(0, 0, CW, CH);
  bg.addColorStop(0, '#08081a'); bg.addColorStop(1, '#040410');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

  // Header
  const hG = ctx.createLinearGradient(0, 0, CW, 0);
  hG.addColorStop(0, 'rgba(40,10,90,0.95)'); hG.addColorStop(0.5, 'rgba(90,25,170,0.95)'); hG.addColorStop(1, 'rgba(40,10,90,0.95)');
  ctx.fillStyle = hG; ctx.fillRect(0, 0, CW, 52);

  const hLine = ctx.createLinearGradient(0, 50, CW, 50);
  hLine.addColorStop(0, 'transparent'); hLine.addColorStop(0.3, '#aa44ff'); hLine.addColorStop(0.7, '#aa44ff'); hLine.addColorStop(1, 'transparent');
  ctx.fillStyle = hLine; ctx.fillRect(0, 50, CW, 2);

  ctx.save();
  ctx.shadowColor = '#cc77ff'; ctx.shadowBlur = 18;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 24px Roboto';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚽  NOVAS CARTAS', CW / 2, 28);
  ctx.restore();

  const photos = await batchFetchPhotos(players);
  const flags  = await Promise.all(players.map(p => fetchFlag(p.nat)));

  for (let i = 0; i < players.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    drawEACard(
      ctx,
      PAD + col * (PC_W + GAP),
      56 + PAD + row * (PC_H + GAP),
      PC_W, PC_H,
      players[i], photos[i], flags[i],
    );
  }

  return canvas.toBuffer('image/png');
}

// ─── Collection image ─────────────────────────────────────────────────────────
export async function generateCollectionImage(playerCards) {
  const COLS = 4, GAP = 12, PAD = 14;
  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD * 2 + COLS * CC_W + (COLS - 1) * GAP;
  const CH   = PAD * 2 + rows * CC_H + (rows - 1) * GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Fundo verde escuro
  const field = ctx.createLinearGradient(0, 0, 0, CH);
  field.addColorStop(0, '#163818'); field.addColorStop(0.5, '#0e2810'); field.addColorStop(1, '#071408');
  ctx.fillStyle = field; ctx.fillRect(0, 0, CW, CH);

  const stripeH = 26;
  for (let i = 0; i < Math.ceil(CH / stripeH); i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, i * stripeH, CW, stripeH);
  }

  const vig = ctx.createRadialGradient(CW/2, CH/2, CH*0.10, CW/2, CH/2, CH*0.75);
  vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.36)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);

  if (!playerCards.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font      = 'bold 18px Roboto';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Nenhuma carta ainda!', CW/2, CH/2);
    return canvas.toBuffer('image/png');
  }

  const photos = await batchFetchPhotos(playerCards);
  const flags  = await Promise.all(playerCards.map(c => fetchFlag(c.player?.nat)));

  for (let i = 0; i < playerCards.length; i++) {
    const p = playerCards[i].player;
    if (!p) continue;
    const col = i % COLS, row = Math.floor(i / COLS);
    drawEACard(
      ctx,
      PAD + col * (CC_W + GAP),
      PAD + row * (CC_H + GAP),
      CC_W, CC_H,
      p, photos[i], flags[i],
    );
  }

  return canvas.toBuffer('image/png');
}

// ─── Pacotes banner ───────────────────────────────────────────────────────────
function drawPitchBg(ctx, w, h) {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#0e2410'); base.addColorStop(0.5, '#091808'); base.addColorStop(1, '#040e04');
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < Math.ceil(h / 28); i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, i * 28, w, 28);
  }
  const vig = ctx.createRadialGradient(w/2, h/2, h*0.10, w/2, h/2, h*0.88);
  vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
}

// ─── Pack card (visual de pacote fechado) ─────────────────────────────────────
function drawPackCard(ctx, x, y, w, h, packName, price, photo, guaranteed) {
  const topIn = w * 0.12, botIn = w * 0.05;

  function path() {
    const tl = x + topIn, tr = x + w - topIn;
    ctx.beginPath();
    ctx.moveTo(tl + 4, y); ctx.lineTo(tr - 4, y);
    ctx.quadraticCurveTo(tr, y, tr, y + 4);
    ctx.bezierCurveTo(tr + (x+w-tr)*0.5, y+h*0.08*0.4, x+w, y+h*0.08*0.9, x+w, y+h*0.08);
    ctx.lineTo(x+w, y+h-8); ctx.quadraticCurveTo(x+w, y+h, x+w-botIn, y+h);
    ctx.lineTo(x+botIn, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-8);
    ctx.lineTo(x, y+h*0.08);
    ctx.bezierCurveTo(x, y+h*0.08*0.9, tl-(tl-x)*0.5, y+h*0.08*0.4, tl, y+4);
    ctx.quadraticCurveTo(tl, y, tl+4, y); ctx.closePath();
  }

  const rarColors = {
    gold:   { g1:'#c8920a', g2:'#7a5a00', g3:'#3a2800', accent:'#ffd700', shadow:'rgba(255,200,0,0.55)' },
    black:  { g1:'#2a0060', g2:'#140030', g3:'#080018', accent:'#aa44ff', shadow:'rgba(150,40,255,0.60)' },
    silver: { g1:'#6888a8', g2:'#384868', g3:'#182838', accent:'#aabbd0', shadow:'rgba(150,180,220,0.40)' },
    bronze: { g1:'#c07838', g2:'#7a4818', g3:'#3a2008', accent:'#e09040', shadow:'rgba(200,120,40,0.45)' },
  };
  const rc = rarColors[guaranteed] ?? rarColors.gold;

  // Sombra + corpo
  ctx.save();
  ctx.shadowColor = rc.shadow; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  const bodyG = ctx.createLinearGradient(x, y, x+w, y+h);
  bodyG.addColorStop(0, rc.g1); bodyG.addColorStop(0.45, rc.g2); bodyG.addColorStop(1, rc.g3);
  ctx.fillStyle = bodyG; path(); ctx.fill();
  ctx.restore();

  ctx.save(); path(); ctx.clip();

  // Brilho lateral esquerdo
  const shine = ctx.createLinearGradient(x, y, x+w*0.35, y);
  shine.addColorStop(0, 'rgba(255,255,255,0.28)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(x, y, w*0.35, h);

  // Foto do jogador representativo
  const photoTop = y + h * 0.20;
  const photoH2  = h * 0.52;
  if (photo) {
    const scale = Math.max(w / photo.width, photoH2 / photo.height);
    const dw = photo.width * scale, dh = photo.height * scale;
    ctx.save(); ctx.rect(x, photoTop, w, photoH2); ctx.clip();
    ctx.drawImage(photo, x + (w-dw)/2, photoTop, dw, dh);
    const fadeT = ctx.createLinearGradient(x, photoTop, x, photoTop+photoH2*0.28);
    fadeT.addColorStop(0, 'rgba(0,0,0,0.70)'); fadeT.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fadeT; ctx.fillRect(x, photoTop, w, photoH2*0.30);
    const fadeB = ctx.createLinearGradient(x, photoTop+photoH2*0.60, x, photoTop+photoH2);
    fadeB.addColorStop(0, 'rgba(0,0,0,0)'); fadeB.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = fadeB; ctx.fillRect(x, photoTop+photoH2*0.60, w, photoH2*0.40);
    ctx.restore();
  } else {
    // fundo gradiente sem foto
    const silG = ctx.createLinearGradient(x, photoTop, x, photoTop+photoH2);
    silG.addColorStop(0, 'rgba(255,255,255,0.05)'); silG.addColorStop(1, 'rgba(0,0,0,0.40)');
    ctx.fillStyle = silG; ctx.fillRect(x, photoTop, w, photoH2);
  }

  // Barra de título
  ctx.fillStyle = 'rgba(0,0,0,0.70)'; ctx.fillRect(x, y, w, h*0.18);
  const accLine = ctx.createLinearGradient(x, y, x+w, y);
  accLine.addColorStop(0,'transparent'); accLine.addColorStop(0.25,rc.accent); accLine.addColorStop(0.75,rc.accent); accLine.addColorStop(1,'transparent');
  ctx.fillStyle = accLine; ctx.fillRect(x, y+h*0.18-1.5, w, 1.5);

  // "EA FC 26"
  ctx.fillStyle = rc.accent;
  ctx.font      = `bold ${Math.round(w*0.14)}px Roboto`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('EA FC 26', x + w*0.08, y + h*0.04);

  // Nome do pacote (bottom)
  const nameY = y + h * 0.73;
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(x, nameY, w, h*0.14);
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold ${Math.round(w*0.094)}px Roboto`;
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(packName.toUpperCase(), x+w/2, nameY+h*0.07);

  // Preço
  const priceY = nameY + h * 0.14;
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(x, priceY, w, h*0.13);
  ctx.fillStyle    = '#ffd700';
  ctx.font         = `bold ${Math.round(w*0.082)}px Roboto`;
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`🪙 ${typeof price === 'number' ? price.toLocaleString('pt-BR') : price}`, x+w/2, priceY+h*0.065);

  ctx.restore();

  // Borda brilhante
  ctx.save();
  ctx.shadowColor = rc.accent; ctx.shadowBlur = 10;
  ctx.strokeStyle = `${rc.accent}80`; ctx.lineWidth = 1.5;
  path(); ctx.stroke();
  ctx.restore();
}

// ─── Loja image ────────────────────────────────────────────────────────────────
export async function generateLojaImage(balance) {
  const packDefs = [
    { name:'Padrão',  rep:'Raphinha',          club:'Barcelona',         price: 500,  guaranteed:'bronze' },
    { name:'Ouro',    rep:'Mohamed Salah',      club:'Liverpool',         price: 2000, guaranteed:'gold'   },
    { name:'Premium', rep:'Kylian Mbappe',      club:'Real Madrid',       price: 5000, guaranteed:'black'  },
    { name:'Europeu', rep:'Lamine Yamal',       club:'Barcelona',         price: 2800, guaranteed:'gold'   },
  ];

  const photos = [];
  for (const d of packDefs) {
    photos.push(await fetchPlayerPhoto(d.rep, d.club));
    await new Promise(r => setTimeout(r, 250));
  }

  const PW = 175, PH = 300, GAP = 16, PAD = 22;
  const CW = PAD*2 + packDefs.length*PW + (packDefs.length-1)*GAP;
  const CH = PH + 80;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawPitchBg(ctx, CW, CH);

  // Header
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  roundRect(ctx, PAD, 10, CW-PAD*2, 32, 8); ctx.fill();
  ctx.fillStyle    = '#4ddd4d';
  ctx.font         = 'bold 16px Roboto';
  ctx.textAlign    = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('⚽  FUT LOJA', PAD+14, 26);
  ctx.fillStyle    = '#ffd700';
  ctx.font         = 'bold 14px Roboto';
  ctx.textAlign    = 'right';
  ctx.fillText(`🪙 ${(balance ?? 0).toLocaleString('pt-BR')} FuteCoins`, CW-PAD-14, 26);

  for (let i = 0; i < packDefs.length; i++) {
    drawPackCard(ctx, PAD+i*(PW+GAP), 50, PW, PH, packDefs[i].name, packDefs[i].price, photos[i], packDefs[i].guaranteed);
  }

  return canvas.toBuffer('image/png');
}

// ─── Pacotes image (seleção de pacotes) ───────────────────────────────────────
export async function generatePacksImage(packsInfo) {
  // packsInfo: array de { name, price, guaranteed, eaId } vindo do futManager
  const defaults = [
    { name:'Padrão',  rep:'Raphinha',       club:'Barcelona',   price: 500,  guaranteed:'bronze' },
    { name:'Ouro',    rep:'Mohamed Salah',  club:'Liverpool',   price: 2000, guaranteed:'gold'   },
    { name:'Premium', rep:'Kylian Mbappe',  club:'Real Madrid', price: 5000, guaranteed:'black'  },
    { name:'Copa 26', rep:'Vinicius Junior',club:'Real Madrid', price: 3000, guaranteed:'gold'   },
    { name:'Europeu', rep:'Lamine Yamal',   club:'Barcelona',   price: 2800, guaranteed:'gold'   },
  ];
  const defs = packsInfo ?? defaults;

  const photos = [];
  for (const d of defs) {
    const rep  = d.rep  ?? null;
    const club = d.club ?? null;
    photos.push(await fetchPlayerPhoto(rep, club));
    await new Promise(r => setTimeout(r, 240));
  }

  const PW = 148, PH = 262, GAP = 12, PAD = 16;
  const CW = PAD*2 + defs.length*PW + (defs.length-1)*GAP;
  const CH = PH + 72;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawPitchBg(ctx, CW, CH);

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  roundRect(ctx, PAD, 10, CW-PAD*2, 30, 8); ctx.fill();
  ctx.fillStyle    = '#4ddd4d';
  ctx.font         = 'bold 15px Roboto';
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('📦  PACOTES DISPONÍVEIS', CW/2, 25);

  for (let i = 0; i < defs.length; i++) {
    drawPackCard(ctx, PAD+i*(PW+GAP), 48, PW, PH, defs[i].name, defs[i].price, photos[i], defs[i].guaranteed);
  }

  return canvas.toBuffer('image/png');
}

// ─── Partida result image ────────────────────────────────────────────────────
export async function generatePartidaImage({ result, myScore, oppScore, myOvr, oppOvr, oppName, eloChange, newElo }) {
  const BW = 720, BH = 260;
  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  const isWin  = result === 'win', isDraw = result === 'draw';
  const rc     = isWin ? '#00cc44' : isDraw ? '#ffcc00' : '#cc2200';
  const dark   = isWin ? '#040f06' : isDraw ? '#101006' : '#100404';
  const deep   = isWin ? '#020804' : isDraw ? '#0a0a02' : '#0c0202';

  const bg = ctx.createLinearGradient(0, 0, BW, BH);
  bg.addColorStop(0, dark); bg.addColorStop(1, deep);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, BW, BH);

  // Glow central
  const glow = ctx.createRadialGradient(BW/2, BH/2, 20, BW/2, BH/2, BW*0.65);
  glow.addColorStop(0, `${rc}22`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, BW, BH);

  // Barra esquerda colorida
  const barG = ctx.createLinearGradient(0, 0, 0, BH);
  barG.addColorStop(0, rc); barG.addColorStop(1, `${rc}55`);
  ctx.fillStyle = barG; ctx.fillRect(0, 0, 5, BH);

  // Linhas decorativas (campo)
  ctx.save(); ctx.globalAlpha = 0.055; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, BH/2); ctx.lineTo(BW, BH/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(BW/2, BH/2, 60, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.restore();

  const label = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
  ctx.save();
  ctx.shadowColor = rc; ctx.shadowBlur = 30;
  ctx.fillStyle   = rc;
  ctx.font        = 'bold 58px Roboto';
  ctx.textAlign   = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, 22, 78);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.font      = '14px RobotoReg';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`vs ${oppName ?? 'Adversário'}`, 24, 100);

  // Placar
  ctx.save();
  ctx.shadowColor = rc; ctx.shadowBlur = 22;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 82px Roboto';
  ctx.textAlign   = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${myScore}  ×  ${oppScore}`, BW/2, 158);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.font      = '13px RobotoReg';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`OVR: ${myOvr ?? '--'} vs ${oppOvr ?? '--'}`, BW/2, 178);

  const eloSign  = (eloChange ?? 0) >= 0 ? '+' : '';
  const eloColor = (eloChange ?? 0) >= 0 ? '#44ee88' : '#ee4444';
  ctx.fillStyle    = eloColor;
  ctx.font         = 'bold 24px Roboto';
  ctx.textAlign    = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`ELO: ${newElo ?? '--'} (${eloSign}${eloChange ?? 0})`, BW-22, 74);

  const botG = ctx.createLinearGradient(0, BH-3, BW, BH-3);
  botG.addColorStop(0, `${rc}55`); botG.addColorStop(0.5, rc); botG.addColorStop(1, `${rc}55`);
  ctx.fillStyle = botG; ctx.fillRect(0, BH-3, BW, 3);

  return canvas.toBuffer('image/png');
}
