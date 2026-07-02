import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─── Register fonts ────────────────────────────────────────────────────────────
const __dir   = dirname(fileURLToPath(import.meta.url));
const fontDir = join(__dir, '..', '..', 'fonts');
try {
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Bold.ttf'),    'Roboto');
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Regular.ttf'), 'RobotoReg');
} catch {}

// ─── Field canvas dimensions ──────────────────────────────────────────────────
const W      = 760;
const H      = 960;
const CARD_W = 100;
const CARD_H = 134;

// ─── Pack card dimensions ──────────────────────────────────────────────────────
const PC_W  = 210;
const PC_H  = 310;
const PC_PH = 186;   // photo zone height
const PC_NH = 44;    // name bar height
const PC_SH = PC_H - PC_PH - PC_NH;  // stats zone height

// ─── Collection card dimensions ──────────────────────────────────────────────
const CC_W  = 172;
const CC_H  = 240;
const CC_PH = 144;
const CC_NH = 38;
const CC_SH = CC_H - CC_PH - CC_NH;

// ─── Rarity themes — visually distinct, football-inspired ────────────────────
const THEME = {
  black: {
    // Purple/violet: elite tier
    grad:      ['#cc44ff', '#7700cc', '#2a0055'],
    cardBg1:   '#3a0080',
    cardBg2:   '#1a0040',
    cardBg3:   '#0a0020',
    ovrColor:  '#ffffff',
    posColor:  '#e8aaff',
    accent:    '#cc44ff',
    border:    '#aa22ee',
    shimmer:   'rgba(180,80,255,0.18)',
    nameBar:   'rgba(10,0,26,0.97)',
    statsBar:  '#090016',
    statLabel: '#cc77ff',
    statValue: '#ffffff',
    statSep:   'rgba(170,40,255,0.20)',
    glow:      26,
    num:       '#ffffff',
    label:     '#cc88ff',
    stat_bg:   'rgba(8,0,20,0.95)',
    ovrBg:     'rgba(100,0,200,0.85)',
    rarityStrip: '#aa22ee',
    shimmerAngle: 30,
  },
  gold: {
    // Classic gold: premium tier
    grad:      ['#ffe566', '#d4a500', '#7a5000'],
    cardBg1:   '#c8900a',
    cardBg2:   '#7a5200',
    cardBg3:   '#3a2400',
    ovrColor:  '#1a0a00',
    posColor:  '#4a2800',
    accent:    '#ffd700',
    border:    '#e0b800',
    shimmer:   'rgba(255,230,60,0.22)',
    nameBar:   'rgba(16,8,0,0.97)',
    statsBar:  '#0c0600',
    statLabel: '#ffcc44',
    statValue: '#ffffff',
    statSep:   'rgba(255,200,0,0.18)',
    glow:      16,
    num:       '#ffffff',
    label:     '#ffc040',
    stat_bg:   'rgba(18,8,0,0.95)',
    ovrBg:     'rgba(160,100,0,0.88)',
    rarityStrip: '#e0b800',
    shimmerAngle: -25,
  },
  silver: {
    // Blue-silver: mid tier
    grad:      ['#d8eeff', '#7898c8', '#2a3a5a'],
    cardBg1:   '#6a88aa',
    cardBg2:   '#2a3c54',
    cardBg3:   '#141e2e',
    ovrColor:  '#0c1a2e',
    posColor:  '#1e3050',
    accent:    '#aacce8',
    border:    '#7898c8',
    shimmer:   'rgba(170,200,240,0.18)',
    nameBar:   'rgba(8,14,24,0.97)',
    statsBar:  '#060e18',
    statLabel: '#88b8e0',
    statValue: '#ffffff',
    statSep:   'rgba(120,160,220,0.18)',
    glow:      12,
    num:       '#ffffff',
    label:     '#a0c8e0',
    stat_bg:   'rgba(10,16,28,0.95)',
    ovrBg:     'rgba(40,70,110,0.88)',
    rarityStrip: '#7898c8',
    shimmerAngle: 20,
  },
  bronze: {
    // Orange-brown: base tier
    grad:      ['#ff9966', '#cc5522', '#601a00'],
    cardBg1:   '#b84820',
    cardBg2:   '#601a00',
    cardBg3:   '#280800',
    ovrColor:  '#1a0800',
    posColor:  '#4a1800',
    accent:    '#ff7744',
    border:    '#cc5522',
    shimmer:   'rgba(230,100,40,0.22)',
    nameBar:   'rgba(12,4,0,0.97)',
    statsBar:  '#0a0300',
    statLabel: '#ff9966',
    statValue: '#ffffff',
    statSep:   'rgba(200,80,30,0.18)',
    glow:      10,
    num:       '#ffffff',
    label:     '#ff9966',
    stat_bg:   'rgba(14,4,0,0.95)',
    ovrBg:     'rgba(120,50,10,0.88)',
    rarityStrip: '#cc5522',
    shimmerAngle: -20,
  },
};

// ─── Formations ───────────────────────────────────────────────────────────────
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

// ─── Country → ISO code ───────────────────────────────────────────────────────
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
  return str.length > max ? str.slice(0, max-1) + '.' : str;
}

// ─── Photo cache ───────────────────────────────────────────────────────────────
const _photoCache = new Map();

// ─── Fetch player photo ────────────────────────────────────────────────────────
// INVESTIGAÇÃO 2025-07-01:
//   • SofaScore API + CDN → 403 Forbidden (bloqueio de IP/bot) — REMOVIDO
//   • EA Sports CDN       → 404 Not Found (URL incorreta)      — REMOVIDO
//   • FUTWIZ CDN          → 404 Not Found                      — REMOVIDO
//   • FutHead             → retorna imagem genérica igual para TODOS IDs — REMOVIDO
//   • Futbin CDN          → ✅ ÚNICA FONTE FUNCIONAL confirmada em testes
//     Funcionamento confirmado: 65+ jogadores com fotos reais (>15KB)
//     Placeholders rejeitados: imagens <10KB são silhuetas genéricas do Futbin
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPlayerPhoto(sofascoreId, eaId) {
  const cacheKey = `ea:${eaId ?? 'x'}`;
  if (_photoCache.has(cacheKey)) return _photoCache.get(cacheKey);

  // Sem eaId → sem fonte de imagem disponível → avatar imediato
  if (!eaId) {
    _photoCache.set(cacheKey, null);
    return null;
  }

  async function tryUrl(url) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      // Rejeitar placeholders/silhuetas genéricas do Futbin (<10KB)
      // Fotos reais de jogadores têm sempre >15KB; menor confirmado: 20KB (Kroos)
      if (buf.length < 10000) return null;
      const img = await loadImage(buf);
      if (img.width < 30 || img.height < 30) return null;
      return img;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  // ✅ Futbin EAFC 25 — única fonte confirmada funcional
  let img = await tryUrl(`https://cdn.futbin.com/content/fifa25/img/players/${eaId}.png`);

  _photoCache.set(cacheKey, img);
  return img;
}

// ─── Fetch flag ───────────────────────────────────────────────────────────────
async function fetchFlag(nat) {
  const iso = NAT_ISO[nat];
  if (!iso) return null;
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res   = await fetch(`https://flagcdn.com/w40/${iso}.png`, {
      signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    return await loadImage(buf);
  } catch { return null; }
}

// ─── Staggered photo batch fetch ──────────────────────────────────────────────
async function batchFetchPhotos(players) {
  const out = [];
  for (let i = 0; i < players.length; i++) {
    const entry = players[i];
    const p     = entry?.player ?? entry;
    const ssId  = p?.sofascoreId ?? null;
    const eaId  = p?.eaId ?? null;
    out.push((ssId || eaId) ? await fetchPlayerPhoto(ssId, eaId) : null);
    if (i < players.length - 1) {
      await new Promise(r => setTimeout(r, 350 + Math.floor(Math.random() * 150)));
    }
  }
  return out;
}

// ─── Professional fallback avatar (silhouette + gradient) ────────────────────
function drawPlayerAvatar(ctx, x, y, w, h, t, name, pos) {
  const accent = t.accent ?? '#ffd700';

  // 1. Gradient background
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0,    t.cardBg1 ?? '#333');
  bg.addColorStop(0.55, t.cardBg2 ?? '#111');
  bg.addColorStop(1,    t.cardBg3 ?? '#000');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  // 2. Diagonal stripe texture (subtle)
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.2;
  const gap = Math.max(8, w * 0.12);
  for (let i = -h; i < w + h; i += gap) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h * 1.2, y + h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 3. Corner accent glow
  const glow = ctx.createRadialGradient(x + w * 0.5, y, 0, x + w * 0.5, y, w);
  glow.addColorStop(0, `${accent}28`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);

  // 4. Draw player silhouette (simple human figure)
  ctx.save();
  ctx.globalAlpha = 0.13;
  const figW = w * 0.55;
  const figH = h * 0.78;
  const figX = x + (w - figW) / 2;
  const figY = y + h * 0.08;

  // Head
  const headR = figW * 0.18;
  const headX = figX + figW / 2;
  const headY = figY + headR + 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Body (torso)
  const bodyTop    = headY + headR + 2;
  const bodyBottom = figY + figH * 0.62;
  const bodyW      = figW * 0.52;
  ctx.beginPath();
  ctx.moveTo(headX - bodyW/2, bodyTop);
  ctx.lineTo(headX - bodyW/2 * 1.1, bodyBottom);
  ctx.lineTo(headX + bodyW/2 * 1.1, bodyBottom);
  ctx.lineTo(headX + bodyW/2, bodyTop);
  ctx.closePath();
  ctx.fill();

  // Legs
  const legW = bodyW * 0.26;
  const legBottom = figY + figH;
  [headX - bodyW/2 * 0.40, headX + bodyW/2 * 0.40].forEach(lx => {
    ctx.beginPath();
    ctx.moveTo(lx - legW, bodyBottom);
    ctx.lineTo(lx + legW, bodyBottom);
    ctx.lineTo(lx + legW * 0.8, legBottom);
    ctx.lineTo(lx - legW * 0.8, legBottom);
    ctx.closePath();
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  // 5. Position watermark
  if (pos) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle   = '#ffffff';
    const pSize = Math.round(h * 0.65);
    ctx.font         = `900 ${pSize}px Roboto`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(x + w / 2, y + h * 0.52);
    ctx.rotate(-0.18);
    ctx.fillText(pos.toUpperCase(), 0, 0);
    ctx.restore();
  }

  // 6. Player initials badge
  const parts    = (name ?? '?').trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0] ?? '?').slice(0, 2).toUpperCase();

  const fSize = Math.round(Math.min(w * 0.48, h * 0.34));
  const tx    = x + w / 2;
  const ty    = y + h * 0.48;

  ctx.save();
  ctx.font             = `bold ${fSize}px Roboto`;
  ctx.textAlign        = 'center';
  ctx.textBaseline     = 'middle';
  ctx.lineWidth        = fSize * 0.09;
  ctx.strokeStyle      = 'rgba(0,0,0,0.75)';
  ctx.lineJoin         = 'round';
  ctx.strokeText(initials, tx, ty);
  ctx.shadowColor      = `${accent}90`;
  ctx.shadowBlur       = 20;
  ctx.fillStyle        = '#ffffff';
  ctx.fillText(initials, tx, ty);
  ctx.restore();

  // 7. Bottom fade into info zone
  const fade = ctx.createLinearGradient(x, y + h * 0.70, x, y + h);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.68)');
  ctx.fillStyle = fade;
  ctx.fillRect(x, y + h * 0.70, w, h * 0.30);
}

// ─── Draw photo zone — top-aligned so player face is always visible ──────────
function drawPhotoZone(ctx, photo, x, y, w, h, t, name, pos) {
  if (photo) {
    // Background first
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, t.cardBg1 ?? '#333');
    bg.addColorStop(1, t.cardBg2 ?? '#111');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);

    // Scale photo to fill width; top-align so face is visible
    const scale = Math.max(w / photo.width, h / photo.height);
    const drawW = photo.width  * scale;
    const drawH = photo.height * scale;
    // Center horizontally, align top-to-top (slight offset to show upper body)
    const drawX = x + (w - drawW) / 2;
    const drawY = y;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(photo, drawX, drawY, drawW, drawH);
    ctx.restore();
  } else {
    drawPlayerAvatar(ctx, x, y, w, h, t, name, pos);
  }
}

// ─── Card glow border ─────────────────────────────────────────────────────────
function drawGlow(ctx, x, y, w, h, t, r = 10) {
  ctx.save();
  ctx.shadowColor = t.border;
  ctx.shadowBlur  = t.glow;
  ctx.strokeStyle = t.border;
  ctx.lineWidth   = t.glow >= 20 ? 2.5 : 2.0;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

// ─── Dark atmospheric background ─────────────────────────────────────────────
function drawAtmoBg(ctx, w, h, c1='#0a0a18', c2='#040410') {
  const bg = ctx.createRadialGradient(w*.5, h*.4, 30, w*.5, h*.5, Math.max(w,h));
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
}

// ─── Football pitch store background ─────────────────────────────────────────
function drawPitchStoreBg(ctx, w, h) {
  // Dark green base
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#0e2410');
  base.addColorStop(0.5, '#091808');
  base.addColorStop(1, '#040e04');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal pitch stripes
  for (let i = 0; i < Math.ceil(h / 30); i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, i * 30, w, 30);
  }

  // Center circle outline (decorative)
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  const cx = w / 2, cy = h * 0.55;
  ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.40, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Vignette
  const vig = ctx.createRadialGradient(w/2, h/2, h*0.10, w/2, h/2, h*0.90);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Ambient light blobs (stadium lights effect)
  const blobs = [
    { x: w*0.10, y: h*0.12, r: w*0.20, c: 'rgba(80,160,40,0.08)'  },
    { x: w*0.90, y: h*0.10, r: w*0.18, c: 'rgba(60,140,30,0.07)'  },
    { x: w*0.50, y: h*0.05, r: w*0.28, c: 'rgba(50,120,20,0.06)'  },
    { x: w*0.20, y: h*0.88, r: w*0.22, c: 'rgba(40,100,15,0.05)'  },
    { x: w*0.80, y: h*0.85, r: w*0.20, c: 'rgba(40,100,15,0.05)'  },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

// ─── Field lines ──────────────────────────────────────────────────────────────
function drawFieldLines(ctx, fx, fy, fw, fh) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth   = 2;

  // Outer boundary
  ctx.strokeRect(fx, fy, fw, fh);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(fx, fy + fh/2);
  ctx.lineTo(fx + fw, fy + fh/2);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(fx + fw/2, fy + fh/2, 56, 0, Math.PI * 2);
  ctx.stroke();

  // Center spot
  ctx.fillStyle = 'rgba(255,255,255,0.60)';
  ctx.beginPath();
  ctx.arc(fx + fw/2, fy + fh/2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas
  const pW = fw * 0.52, pH = fh * 0.17;
  const gW = fw * 0.26, gH = fh * 0.065;
  ctx.strokeRect(fx + (fw - pW)/2, fy,            pW, pH);
  ctx.strokeRect(fx + (fw - gW)/2, fy,            gW, gH);
  ctx.strokeRect(fx + (fw - pW)/2, fy + fh - pH,  pW, pH);
  ctx.strokeRect(fx + (fw - gW)/2, fy + fh - gH,  gW, gH);

  // Penalty spots
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  [fh * 0.136, fh * 0.864].forEach(yo => {
    ctx.beginPath();
    ctx.arc(fx + fw/2, fy + yo, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Corner arcs
  const cr = 14;
  [
    { sx: fx,      sy: fy,       ex: fx + cr,     ey: fy,       sa: 0,           ea: Math.PI/2 },
    { sx: fx + fw, sy: fy,       ex: fx + fw - cr, ey: fy,       sa: Math.PI/2,   ea: Math.PI   },
    { sx: fx,      sy: fy + fh,  ex: fx + cr,     ey: fy + fh,  sa: 3*Math.PI/2, ea: 2*Math.PI },
    { sx: fx + fw, sy: fy + fh,  ex: fx + fw - cr, ey: fy + fh,  sa: Math.PI,     ea: 3*Math.PI/2 },
  ].forEach(c => {
    ctx.beginPath();
    ctx.arc(c.sx, c.sy, cr, c.sa, c.ea);
    ctx.stroke();
  });

  ctx.restore();
}

// ─── Draw FC mylar pack (football pack style) ─────────────────────────────────
function drawFCPack(ctx, x, y, w, h, label, playerPhoto) {
  const topSealH  = h * 0.10;
  const topSealIn = w * 0.13;
  const botIn     = w * 0.05;

  function packPath() {
    const tl = { x: x + topSealIn,     y: y };
    const tr = { x: x + w - topSealIn, y: y };

    ctx.beginPath();
    ctx.moveTo(tl.x + 5, y);
    ctx.lineTo(tr.x - 5, y);
    ctx.quadraticCurveTo(tr.x, y, tr.x, y + 5);
    ctx.bezierCurveTo(
      tr.x + (x + w - tr.x) * 0.55, y + topSealH * 0.35,
      x + w, y + topSealH * 0.80,
      x + w, y + topSealH
    );
    ctx.lineTo(x + w, y + h - 8);
    ctx.quadraticCurveTo(x + w, y + h, x + w - botIn, y + h);
    ctx.lineTo(x + botIn, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - 8);
    ctx.lineTo(x, y + topSealH);
    ctx.bezierCurveTo(
      x, y + topSealH * 0.80,
      tl.x - (tl.x - x) * 0.55, y + topSealH * 0.35,
      tl.x, y + 5
    );
    ctx.quadraticCurveTo(tl.x, y, tl.x + 5, y);
    ctx.closePath();
  }

  // Drop shadow
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.92)';
  ctx.shadowBlur    = 22;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 8;

  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGrad.addColorStop(0,    '#1e7a1e');
  bodyGrad.addColorStop(0.30, '#145514');
  bodyGrad.addColorStop(0.70, '#0a3008');
  bodyGrad.addColorStop(1,    '#040e04');
  ctx.fillStyle = bodyGrad;
  packPath(); ctx.fill();
  ctx.restore();

  // Clip inside pack shape
  ctx.save();
  packPath(); ctx.clip();

  // Metallic left-edge shine
  const shine = ctx.createLinearGradient(x, y, x + w * 0.30, y);
  shine.addColorStop(0,    'rgba(255,255,255,0.30)');
  shine.addColorStop(0.5,  'rgba(255,255,255,0.08)');
  shine.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(x, y, w * 0.30, h);

  // Right-edge shadow
  const rShade = ctx.createLinearGradient(x + w * 0.80, y, x + w, y);
  rShade.addColorStop(0, 'rgba(0,0,0,0)');
  rShade.addColorStop(1, 'rgba(0,0,0,0.40)');
  ctx.fillStyle = rShade; ctx.fillRect(x + w * 0.80, y, w * 0.20, h);

  // Top seal band
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(x, y, w, topSealH + 2);

  // Seal line
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fillRect(x, y + topSealH, w, 1.5);

  // Seal dots
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let d = 0; d < 4; d++) {
    ctx.beginPath();
    ctx.arc(x + w * 0.22 + d * w * 0.18, y + topSealH * 0.50, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // FC branding in top area
  const logoAreaTop = y + topSealH + 4;
  const fcSize      = Math.round(w * 0.42);

  ctx.save();
  ctx.shadowColor = 'rgba(60,255,80,0.38)';
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = `bold ${fcSize}px Roboto`;
  ctx.textAlign   = 'left';
  ctx.fillText('FC', x + w * 0.07, logoAreaTop + fcSize * 0.86);
  ctx.restore();

  // Football icon
  const bcx = x + w * 0.80;
  const bcy = logoAreaTop + h * 0.12;
  const br  = w * 0.12;
  const ballG = ctx.createRadialGradient(bcx - br*0.3, bcy - br*0.3, 1, bcx, bcy, br);
  ballG.addColorStop(0, '#e0e0e0'); ballG.addColorStop(1, '#888');
  ctx.fillStyle = ballG;
  ctx.beginPath(); ctx.arc(bcx, bcy, br, 0, Math.PI * 2); ctx.fill();

  // Ball pentagons (simplified)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(bcx, bcy, br * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8;
  for (let a = 0; a < 5; a++) {
    const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(bcx, bcy);
    ctx.lineTo(bcx + Math.cos(ang) * br, bcy + Math.sin(ang) * br);
    ctx.stroke();
  }

  // Player photo zone (middle section of pack)
  const photoTop = logoAreaTop + h * 0.28;
  const photoH   = h * 0.45;

  if (playerPhoto) {
    const scale = w / playerPhoto.width;
    const dh    = playerPhoto.height * scale;
    const dy    = photoTop;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, photoTop, w, photoH);
    ctx.clip();
    ctx.drawImage(playerPhoto, x, dy, w, dh);

    // Gradient fade at top of photo zone
    const fadeTop = ctx.createLinearGradient(x, photoTop, x, photoTop + photoH * 0.28);
    fadeTop.addColorStop(0, 'rgba(8,26,8,0.85)');
    fadeTop.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fadeTop; ctx.fillRect(x, photoTop, w, photoH * 0.30);

    // Fade at bottom
    const fadeBot = ctx.createLinearGradient(x, photoTop + photoH * 0.65, x, photoTop + photoH);
    fadeBot.addColorStop(0, 'rgba(0,0,0,0)');
    fadeBot.addColorStop(1, 'rgba(4,14,4,0.88)');
    ctx.fillStyle = fadeBot; ctx.fillRect(x, photoTop + photoH * 0.65, w, photoH * 0.35);
    ctx.restore();
  } else {
    // Silhouette area with gradient
    const silG = ctx.createLinearGradient(x, photoTop, x, photoTop + photoH);
    silG.addColorStop(0, 'rgba(20,60,20,0.80)');
    silG.addColorStop(1, 'rgba(4,14,4,0.90)');
    ctx.fillStyle = silG; ctx.fillRect(x, photoTop, w, photoH);

    // Simple player silhouette
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle   = '#ffffff';
    const shx = x + w * 0.5, shy = photoTop + photoH * 0.3, shr = w * 0.13;
    ctx.beginPath(); ctx.arc(shx, shy, shr, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(shx - w*0.15, shy + shr);
    ctx.lineTo(shx - w*0.16, shy + shr + photoH * 0.40);
    ctx.lineTo(shx + w*0.16, shy + shr + photoH * 0.40);
    ctx.lineTo(shx + w*0.15, shy + shr);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Position badge area
  const badgeY = photoTop + photoH + h * 0.01;
  const badgeH = h * 0.085;
  const badgeG = ctx.createLinearGradient(x, badgeY, x, badgeY + badgeH);
  badgeG.addColorStop(0, 'rgba(0,0,0,0.70)');
  badgeG.addColorStop(1, 'rgba(0,0,0,0.50)');
  ctx.fillStyle = badgeG;
  ctx.fillRect(x, badgeY, w, badgeH);

  // Accent line above badge
  const lineG = ctx.createLinearGradient(x, badgeY, x + w, badgeY);
  lineG.addColorStop(0,   'transparent');
  lineG.addColorStop(0.3, 'rgba(80,220,80,0.60)');
  lineG.addColorStop(0.7, 'rgba(80,220,80,0.60)');
  lineG.addColorStop(1,   'transparent');
  ctx.fillStyle = lineG;
  ctx.fillRect(x, badgeY, w, 1.5);

  const badgeFs = Math.max(7, Math.round(w * 0.085));
  ctx.fillStyle = '#ffffff';
  ctx.font      = `bold ${badgeFs}px Roboto`;
  ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), x + w/2, badgeY + badgeH * 0.72);

  // Bottom strip
  const botY  = y + h - h * 0.12;
  const botG2 = ctx.createLinearGradient(x, botY, x, y + h);
  botG2.addColorStop(0, 'rgba(0,0,0,0.65)');
  botG2.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = botG2;
  ctx.fillRect(x, botY, w, h * 0.12);

  const botFs = Math.max(5, Math.round(w * 0.065));
  ctx.fillStyle   = '#b0e0b0';
  ctx.font        = `bold ${botFs}px RobotoReg`;
  ctx.textAlign   = 'center';
  ctx.fillText('4 CARTAS · 1 OURO GAR.', x + w/2, botY + h * 0.075);

  ctx.restore(); // end pack clip

  // Outer pack border glow
  ctx.save();
  ctx.shadowColor = 'rgba(60,220,60,0.55)';
  ctx.shadowBlur  = 10;
  ctx.strokeStyle = 'rgba(100,240,100,0.50)';
  ctx.lineWidth   = 1.5;
  packPath(); ctx.stroke();
  ctx.restore();
}

// ─── Draw pack/collection card (FIFA Ultimate Team inspired) ─────────────────
// ph = photo zone height, nh = name bar height, sh = stats zone height
function drawPackCard(ctx, x, y, w, h, ph, nh, sh, player, photo, flag) {
  const t = THEME[player.rarity] ?? THEME.bronze;
  const R = 12;

  // ── 1. Drop shadow ────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.90)';
  ctx.shadowBlur    = 24;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 8;

  // Card base background gradient
  const bgGrad = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  bgGrad.addColorStop(0,    t.cardBg1 ?? t.grad[0]);
  bgGrad.addColorStop(0.50, t.cardBg2 ?? t.grad[1]);
  bgGrad.addColorStop(1,    t.cardBg3 ?? t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, w, h, R); ctx.fill();
  ctx.restore();

  // ── 2. Diagonal shimmer (inside card boundary) ────────────────────────────
  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();

  const shim = ctx.createLinearGradient(x, y + h, x + w, y);
  shim.addColorStop(0,    'transparent');
  shim.addColorStop(0.35, t.shimmer);
  shim.addColorStop(0.65, t.shimmer);
  shim.addColorStop(1,    'transparent');
  ctx.fillStyle = shim; ctx.fillRect(x, y, w, h);
  ctx.restore();

  // ── 3. Photo zone (clipped to photo area) ────────────────────────────────
  ctx.save();
  roundRect(ctx, x, y, w, ph + R, R); ctx.clip();
  drawPhotoZone(ctx, photo, x, y, w, ph, t, player.name, player.pos);
  ctx.restore();

  // Photo bottom fade (not clipped, intentional blend into name bar)
  const fade = ctx.createLinearGradient(x, y + ph - Math.min(ph * 0.40, 70), x, y + ph + 4);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();
  ctx.fillStyle = fade; ctx.fillRect(x, y + ph - Math.min(ph * 0.40, 70), w, Math.min(ph * 0.40, 70) + 4);
  ctx.restore();

  // ── 4. OVR badge (top-left) ───────────────────────────────────────────────
  const ovrPadX = 10, ovrPadY = 10;
  const ovrBadgeW = Math.round(w * 0.32);
  const ovrBadgeH = Math.round(w * 0.20);

  // Badge background pill
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.90)';
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = t.ovrBg;
  roundRect(ctx, x + ovrPadX, y + ovrPadY, ovrBadgeW, ovrBadgeH, ovrBadgeH / 2);
  ctx.fill();
  ctx.restore();

  // OVR number
  const ovrSize = Math.round(ovrBadgeH * 0.78);
  ctx.save();
  ctx.shadowColor    = 'rgba(0,0,0,1)';
  ctx.shadowBlur     = 8;
  ctx.shadowOffsetX  = 1;
  ctx.shadowOffsetY  = 2;
  ctx.fillStyle      = t.ovrColor;
  ctx.font           = `bold ${ovrSize}px Roboto`;
  ctx.textAlign      = 'center';
  ctx.textBaseline   = 'middle';
  ctx.fillText(String(player.ovr), x + ovrPadX + ovrBadgeW / 2, y + ovrPadY + ovrBadgeH * 0.46);
  ctx.restore();

  // Position label below OVR badge
  const posY    = y + ovrPadY + ovrBadgeH + 4;
  const posSize = Math.max(7, Math.round(w * 0.065));
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  roundRect(ctx, x + ovrPadX, posY, ovrBadgeW, posSize + 6, 3);
  ctx.fill();
  ctx.fillStyle      = t.posColor !== t.ovrColor ? '#ffffff' : t.posColor;
  ctx.font           = `bold ${posSize}px Roboto`;
  ctx.textAlign      = 'center';
  ctx.textBaseline   = 'middle';
  ctx.shadowColor    = 'rgba(0,0,0,0.90)';
  ctx.shadowBlur     = 6;
  ctx.fillText(player.pos, x + ovrPadX + ovrBadgeW / 2, posY + (posSize + 6) / 2);
  ctx.restore();

  // ── 5. Flag (top-right) ───────────────────────────────────────────────────
  const fw2 = Math.round(w * 0.22), fh2 = Math.round(fw2 * 0.63);
  const fx2 = x + w - fw2 - 10, fy2 = y + 10;
  if (flag) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.80)';
    ctx.shadowBlur  = 8;
    roundRect(ctx, fx2, fy2, fw2, fh2, 3); ctx.clip();
    ctx.drawImage(flag, fx2, fy2, fw2, fh2);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = 1;
    roundRect(ctx, fx2, fy2, fw2, fh2, 3); ctx.stroke();
    ctx.restore();
  } else {
    // Nat code text fallback
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, fx2, fy2, fw2, fh2, 3); ctx.fill();
    ctx.fillStyle      = '#ffffff';
    ctx.font           = `bold ${Math.round(fh2 * 0.52)}px Roboto`;
    ctx.textAlign      = 'center';
    ctx.textBaseline   = 'middle';
    ctx.fillText((player.nat ?? '').slice(0, 3), fx2 + fw2/2, fy2 + fh2/2);
    ctx.restore();
  }

  // ── 6. Name bar ───────────────────────────────────────────────────────────
  const ny = y + ph;
  ctx.fillStyle = t.nameBar;
  ctx.fillRect(x, ny, w, nh);

  // Accent top line (rarity color)
  const accLine = ctx.createLinearGradient(x, ny, x + w, ny);
  accLine.addColorStop(0,   'transparent');
  accLine.addColorStop(0.15, t.accent);
  accLine.addColorStop(0.85, t.accent);
  accLine.addColorStop(1,   'transparent');
  ctx.fillStyle = accLine;
  ctx.fillRect(x, ny, w, 2);

  // Player name
  const nameSize = Math.max(8, Math.round(w * 0.088));
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur  = 6;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = `bold ${nameSize}px Roboto`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(trunc(player.name.toUpperCase(), 13), x + w/2, ny + nh * 0.52);
  ctx.restore();

  // ── 7. Stats zone ─────────────────────────────────────────────────────────
  const sy = ny + nh;

  // Stats background (clipped to bottom rounded corners)
  ctx.save();
  roundRect(ctx, x, sy, w, sh, R); ctx.clip();
  ctx.fillStyle = t.statsBar;
  ctx.fillRect(x, sy, w, sh);
  ctx.restore();

  // Bottom rarity strip
  ctx.fillStyle = t.rarityStrip ?? t.border;
  ctx.fillRect(x + R, y + h - 3, w - R * 2, 3);

  const stats = [
    { l: 'PAS', v: player.pas },
    { l: 'DRI', v: player.dri },
    { l: 'DEF', v: player.def },
    { l: 'FIN', v: player.fin },
    { l: 'VEL', v: player.pac },
    { l: 'RES', v: player.fis },
  ];

  const cols    = 3;
  const rows    = 2;
  const cellW   = w / cols;
  const cellH   = sh / rows;
  const labSize = Math.max(6, Math.round(w * 0.050));
  const valSize = Math.max(8, Math.round(w * 0.078));

  for (let i = 0; i < 6; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx2 = x + cellW * col + cellW / 2;
    const ry   = sy + cellH * row;

    // Vertical separator (between cols)
    if (col > 0) {
      ctx.fillStyle = t.statSep ?? `${t.accent}18`;
      ctx.fillRect(x + cellW * col, ry + cellH * 0.14, 1, cellH * 0.72);
    }

    // Horizontal separator (between rows)
    if (row === 1 && col === 0) {
      ctx.fillStyle = t.statSep ?? `${t.accent}18`;
      ctx.fillRect(x + 4, sy + cellH, w - 8, 1);
    }

    // Stat label
    ctx.fillStyle    = t.statLabel;
    ctx.font         = `${labSize}px RobotoReg`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stats[i].l, cx2, ry + cellH * 0.46);

    // Stat value
    ctx.fillStyle    = t.statValue;
    ctx.font         = `bold ${valSize}px Roboto`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(stats[i].v ?? 0), cx2, ry + cellH * 0.88);
  }

  // ── 8. Glow border ────────────────────────────────────────────────────────
  drawGlow(ctx, x, y, w, h, t, R);
}

// ─── Pack reveal image ────────────────────────────────────────────────────────
export async function generatePackRevealImage(players) {
  const GAP  = 14;
  const PAD  = 18;
  const COLS = Math.min(players.length, 4);
  const ROWS = Math.ceil(players.length / COLS);
  const CW   = PAD * 2 + COLS * PC_W + (COLS - 1) * GAP;
  const CH   = 56 + PAD + ROWS * PC_H + (ROWS - 1) * GAP + PAD;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, CW, CH, '#0e0e1e', '#060610');

  // Header bar
  const hGrad = ctx.createLinearGradient(0, 0, CW, 0);
  hGrad.addColorStop(0,   'rgba(40,10,90,0.92)');
  hGrad.addColorStop(0.5, 'rgba(90,25,170,0.92)');
  hGrad.addColorStop(1,   'rgba(40,10,90,0.92)');
  ctx.fillStyle = hGrad; ctx.fillRect(0, 0, CW, 52);

  const hLine = ctx.createLinearGradient(0, 50, CW, 50);
  hLine.addColorStop(0, 'transparent');
  hLine.addColorStop(0.3, '#aa44ff');
  hLine.addColorStop(0.7, '#aa44ff');
  hLine.addColorStop(1, 'transparent');
  ctx.fillStyle = hLine; ctx.fillRect(0, 50, CW, 2);

  ctx.save();
  ctx.shadowColor = '#cc77ff'; ctx.shadowBlur = 16;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 24px Roboto';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚽ NOVAS CARTAS', CW / 2, 28);
  ctx.restore();

  const photos = await batchFetchPhotos(players);
  const flags  = await Promise.all(players.map(p => fetchFlag(p.nat)));

  for (let i = 0; i < players.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const cx  = PAD + col * (PC_W + GAP);
    const cy  = 56 + PAD + row * (PC_H + GAP);
    drawPackCard(ctx, cx, cy, PC_W, PC_H, PC_PH, PC_NH, PC_SH, players[i], photos[i], flags[i]);
  }

  return canvas.toBuffer('image/png');
}

// ─── Collection grid image ────────────────────────────────────────────────────
export async function generateCollectionImage(playerCards) {
  const COLS = 4, GAP = 12, PAD = 14;
  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD * 2 + COLS * CC_W + (COLS - 1) * GAP;
  const CH   = PAD * 2 + rows * CC_H + (rows - 1) * GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Pitch background for collection
  const field = ctx.createLinearGradient(0, 0, 0, CH);
  field.addColorStop(0,   '#163818');
  field.addColorStop(0.5, '#0e2810');
  field.addColorStop(1,   '#071408');
  ctx.fillStyle = field; ctx.fillRect(0, 0, CW, CH);

  // Alternating pitch stripes
  const stripeH = 28;
  for (let i = 0; i < Math.ceil(CH / stripeH); i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, i * stripeH, CW, stripeH);
  }

  // Subtle vignette
  const vig = ctx.createRadialGradient(CW/2, CH/2, CH*0.10, CW/2, CH/2, CH*0.75);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);

  if (!playerCards.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font      = 'bold 20px Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nenhuma carta ainda!', CW/2, CH/2);
    return canvas.toBuffer('image/png');
  }

  const photos = await batchFetchPhotos(playerCards);
  const flags  = await Promise.all(playerCards.map(c => fetchFlag(c.player?.nat)));

  for (let i = 0; i < playerCards.length; i++) {
    const p = playerCards[i].player;
    if (!p) continue;
    const col = i % COLS, row = Math.floor(i / COLS);
    drawPackCard(
      ctx,
      PAD + col * (CC_W + GAP),
      PAD + row * (CC_H + GAP),
      CC_W, CC_H, CC_PH, CC_NH, CC_SH,
      p, photos[i], flags[i]
    );
  }

  return canvas.toBuffer('image/png');
}

// ─── Loja banner (football pitch theme) ───────────────────────────────────────
export async function generateLojaImage(balance) {
  const repPairs = [
    [200644, 203376], // Van Dijk  → Defensores
    [889012, 231677], // Pedri     → Meias
    [839956, 239085], // Haaland   → Atacantes
    [375778, 215914], // Ederson   → Goleiros
  ];
  const repPhotos = [];
  for (const [ssId, eaId] of repPairs) {
    repPhotos.push(await fetchPlayerPhoto(ssId, eaId));
    await new Promise(r => setTimeout(r, 280));
  }

  const packDefs = [
    { label: 'DEFENSORES', photo: repPhotos[0] },
    { label: 'MEIAS',      photo: repPhotos[1] },
    { label: 'ATACANTES',  photo: repPhotos[2] },
    { label: 'GOLEIROS',   photo: repPhotos[3] },
  ];

  const PW  = 178, PH = 310;
  const GAP = 18,  PAD = 24;
  const BW  = PAD * 2 + packDefs.length * PW + (packDefs.length - 1) * GAP;
  const BH  = PH + 90;

  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  drawPitchStoreBg(ctx, BW, BH);

  // Title bar
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  roundRect(ctx, PAD, 10, BW - PAD*2, 30, 8); ctx.fill();
  ctx.fillStyle    = '#5ddb5d';
  ctx.font         = 'bold 16px Roboto';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚽ FUT LOJA', PAD + 12, 26);

  // Balance
  const bal = typeof balance === 'number' ? balance : 0;
  ctx.fillStyle    = '#ffd700';
  ctx.font         = 'bold 14px Roboto';
  ctx.textAlign    = 'right';
  ctx.fillText(`🪙 ${bal.toLocaleString('pt-BR')} FuteCoins`, BW - PAD - 12, 26);

  // Draw packs
  for (let i = 0; i < packDefs.length; i++) {
    const px = PAD + i * (PW + GAP);
    const py = 48;
    drawFCPack(ctx, px, py, PW, PH, packDefs[i].label, packDefs[i].photo);
  }

  return canvas.toBuffer('image/png');
}

// ─── Pacotes banner ───────────────────────────────────────────────────────────
export async function generatePacksImage() {
  const repPairs = [
    [200644,  203376], // Van Dijk    → Ouro
    [17892,   158023], // Messi       → Premium
    [839956,  239085], // Haaland     → Copa
    [1101557, 246669], // Bellingham  → Europa
    [342229,  231747], // Mbappé      → Padrão
  ];
  const repPhotos = [];
  for (const [ssId, eaId] of repPairs) {
    repPhotos.push(await fetchPlayerPhoto(ssId, eaId));
    await new Promise(r => setTimeout(r, 280));
  }

  const packDefs = [
    { label: 'PADRÃO',   photo: repPhotos[4] },
    { label: 'OURO',     photo: repPhotos[0] },
    { label: 'PREMIUM',  photo: repPhotos[1] },
    { label: 'COPA 26',  photo: repPhotos[2] },
    { label: 'EUROPA',   photo: repPhotos[3] },
  ];

  const PW  = 152, PH = 268;
  const GAP = 14,  PAD = 18;
  const BW  = PAD * 2 + packDefs.length * PW + (packDefs.length - 1) * GAP;
  const BH  = PH + 80;

  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  drawPitchStoreBg(ctx, BW, BH);

  // Header
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  roundRect(ctx, PAD, 10, BW - PAD*2, 30, 8); ctx.fill();
  ctx.fillStyle    = '#5ddb5d';
  ctx.font         = 'bold 15px Roboto';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📦 PACOTES DISPONÍVEIS', BW / 2, 26);

  for (let i = 0; i < packDefs.length; i++) {
    const px = PAD + i * (PW + GAP);
    const py = 48;
    drawFCPack(ctx, px, py, PW, PH, packDefs[i].label, packDefs[i].photo);

    // Price label below
    const priceY = py + PH + 10;
    ctx.fillStyle    = '#ffd700';
    ctx.font         = 'bold 12px Roboto';
    ctx.textAlign    = 'center';
    ctx.fillText('🪙 MOEDAS', px + PW / 2, priceY + 14);
  }

  return canvas.toBuffer('image/png');
}

// ─── Match result banner ──────────────────────────────────────────────────────
export async function generatePartidaImage({ result, myScore, oppScore, myOvr, oppOvr, oppName, eloChange, newElo }) {
  const BW = 720, BH = 260;
  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  const isWin  = result === 'win', isDraw = result === 'draw';
  const rc     = isWin ? '#00cc44' : isDraw ? '#ffcc00' : '#cc2200';
  const bgDark = isWin ? '#041a08' : isDraw ? '#141008' : '#1a0404';
  const bgDeep = isWin ? '#020c04' : isDraw ? '#0a0804' : '#0c0202';

  drawAtmoBg(ctx, BW, BH, bgDark, bgDeep);

  // Result glow fill
  const glow = ctx.createRadialGradient(BW/2, BH/2, 20, BW/2, BH/2, BW * 0.65);
  glow.addColorStop(0, `${rc}26`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, BW, BH);

  // Left accent bar
  const barG = ctx.createLinearGradient(0, 0, 0, BH);
  barG.addColorStop(0, rc); barG.addColorStop(1, `${rc}66`);
  ctx.fillStyle = barG; ctx.fillRect(0, 0, 5, BH);

  // Pitch line decoration (subtle)
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.moveTo(0, BH/2); ctx.lineTo(BW, BH/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(BW/2, BH/2, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Result label
  const labelText = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
  ctx.save();
  ctx.shadowColor = rc; ctx.shadowBlur = 32;
  ctx.fillStyle   = rc;
  ctx.font        = 'bold 58px Roboto';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(labelText, 22, 78);
  ctx.restore();

  ctx.fillStyle    = 'rgba(255,255,255,0.52)';
  ctx.font         = '15px RobotoReg';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`vs ${oppName ?? 'Adversário'}`, 24, 102);

  // Score
  ctx.save();
  ctx.shadowColor  = rc; ctx.shadowBlur = 22;
  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 82px Roboto';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${myScore}  ×  ${oppScore}`, BW / 2, 158);
  ctx.restore();

  // OVR comparison
  ctx.fillStyle    = 'rgba(255,255,255,0.42)';
  ctx.font         = '13px RobotoReg';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`OVR: ${myOvr ?? '--'} vs ${oppOvr ?? '--'}`, BW / 2, 180);

  // ELO change
  const eloSign  = (eloChange ?? 0) >= 0 ? '+' : '';
  const eloColor = (eloChange ?? 0) >= 0 ? '#44ee88' : '#ee4444';
  ctx.fillStyle    = eloColor;
  ctx.font         = 'bold 24px Roboto';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`ELO: ${newElo ?? '--'} (${eloSign}${eloChange ?? 0})`, BW - 22, 74);

  // Bottom accent line
  const botG = ctx.createLinearGradient(0, BH - 3, BW, BH - 3);
  botG.addColorStop(0, `${rc}66`);
  botG.addColorStop(0.5, rc);
  botG.addColorStop(1, `${rc}66`);
  ctx.fillStyle = botG; ctx.fillRect(0, BH - 3, BW, 3);

  return canvas.toBuffer('image/png');
}

// ─── Field compact card ───────────────────────────────────────────────────────
function drawFieldCard(ctx, cx, cy, player, slotPos, photo) {
  const x = Math.round(cx - CARD_W / 2);
  const y = Math.round(cy - CARD_H / 2);

  // Empty slot
  if (!player) {
    ctx.save();
    ctx.globalAlpha = 0.40;
    ctx.fillStyle   = 'rgba(255,255,255,0.05)';
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.2;
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.stroke();
    ctx.fillStyle    = 'rgba(255,255,255,0.32)';
    ctx.font         = 'bold 9px Roboto';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slotPos, cx, cy);
    ctx.globalAlpha  = 1;
    ctx.restore();
    return;
  }

  const t   = THEME[player.rarity] ?? THEME.bronze;
  const PH  = Math.round(CARD_H * 0.54);   // photo zone
  const NH  = 20;                           // name bar
  const SH  = CARD_H - PH - NH;            // stats zone
  const R   = 8;

  // ── Card shadow + background ───────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur    = 16;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 5;
  const bgGrad = ctx.createLinearGradient(x, y, x, y + CARD_H);
  bgGrad.addColorStop(0,    t.cardBg1 ?? t.grad[0]);
  bgGrad.addColorStop(0.55, t.cardBg2 ?? t.grad[1]);
  bgGrad.addColorStop(1,    t.cardBg3 ?? t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.fill();
  ctx.restore();

  // ── Photo zone (clipped) ──────────────────────────────────────────────────
  ctx.save();
  roundRect(ctx, x, y, CARD_W, PH + R, R); ctx.clip();

  if (photo) {
    // Background fill
    const photoBg = ctx.createLinearGradient(x, y, x, y + PH);
    photoBg.addColorStop(0, t.cardBg1 ?? '#333');
    photoBg.addColorStop(1, t.cardBg2 ?? '#111');
    ctx.fillStyle = photoBg; ctx.fillRect(x, y, CARD_W, PH);

    // Top-align the photo so face is always visible
    const scale = Math.max(CARD_W / photo.width, PH / photo.height);
    const drawW = photo.width  * scale;
    const drawH = photo.height * scale;
    const drawX = x + (CARD_W - drawW) / 2;
    const drawY = y;
    ctx.drawImage(photo, drawX, drawY, drawW, drawH);
  } else {
    drawPlayerAvatar(ctx, x, y, CARD_W, PH, t, player.name, player.pos);
  }
  ctx.restore();

  // Photo bottom fade
  const fade = ctx.createLinearGradient(x, y + PH - 28, x, y + PH + 4);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.save();
  roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.clip();
  ctx.fillStyle = fade; ctx.fillRect(x, y + PH - 28, CARD_W, 32);
  ctx.restore();

  // ── OVR badge (top-left overlay) ──────────────────────────────────────────
  const ovrBadgeW = Math.round(CARD_W * 0.34);
  const ovrBadgeH = Math.round(CARD_W * 0.20);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.90)'; ctx.shadowBlur = 8;
  ctx.fillStyle   = t.ovrBg;
  roundRect(ctx, x + 4, y + 4, ovrBadgeW, ovrBadgeH, ovrBadgeH / 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor    = 'rgba(0,0,0,1)'; ctx.shadowBlur = 6;
  ctx.fillStyle      = t.ovrColor;
  ctx.font           = `bold ${Math.round(ovrBadgeH * 0.76)}px Roboto`;
  ctx.textAlign      = 'center';
  ctx.textBaseline   = 'middle';
  ctx.fillText(String(player.ovr), x + 4 + ovrBadgeW / 2, y + 4 + ovrBadgeH / 2);
  ctx.restore();

  // Position small tag (bottom of badge)
  const posSize = Math.max(5, Math.round(CARD_W * 0.062));
  ctx.save();
  ctx.fillStyle      = 'rgba(0,0,0,0.72)';
  roundRect(ctx, x + 4, y + 4 + ovrBadgeH + 2, ovrBadgeW, posSize + 4, 2); ctx.fill();
  ctx.fillStyle      = t.posColor !== t.ovrColor ? '#ffffff' : t.posColor;
  ctx.font           = `bold ${posSize}px Roboto`;
  ctx.textAlign      = 'center';
  ctx.textBaseline   = 'middle';
  ctx.fillText(player.pos, x + 4 + ovrBadgeW / 2, y + 4 + ovrBadgeH + 2 + (posSize + 4) / 2);
  ctx.restore();

  // Nationality top-right
  ctx.save();
  ctx.fillStyle    = 'rgba(0,0,0,0.65)';
  const natW = Math.round(CARD_W * 0.30), natH = 13;
  roundRect(ctx, x + CARD_W - natW - 4, y + 5, natW, natH, 2); ctx.fill();
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `${Math.round(natH * 0.62)}px RobotoReg`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((player.nat ?? '').slice(0, 3), x + CARD_W - natW/2 - 4, y + 5 + natH/2);
  ctx.restore();

  // ── Name bar ──────────────────────────────────────────────────────────────
  const ny = y + PH;
  ctx.fillStyle = t.nameBar; ctx.fillRect(x, ny, CARD_W, NH);
  ctx.fillStyle = t.accent;  ctx.fillRect(x, ny, CARD_W, 1.5);

  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 4;
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold ${Math.max(7, Math.round(CARD_W * 0.082))}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(trunc(player.name.toUpperCase(), 11), cx, ny + NH / 2);
  ctx.restore();

  // ── Stats zone ────────────────────────────────────────────────────────────
  const sy2 = ny + NH;
  ctx.save();
  roundRect(ctx, x, sy2, CARD_W, SH, R); ctx.clip();
  ctx.fillStyle = t.stat_bg; ctx.fillRect(x, sy2, CARD_W, SH);
  ctx.restore();

  // Bottom rarity strip
  ctx.fillStyle = t.rarityStrip ?? t.border;
  ctx.fillRect(x + R, y + CARD_H - 3, CARD_W - R * 2, 3);

  const stats6 = [
    { l: 'PAS', v: player.pas }, { l: 'DRI', v: player.dri }, { l: 'DEF', v: player.def },
    { l: 'FIN', v: player.fin }, { l: 'VEL', v: player.pac }, { l: 'RES', v: player.fis },
  ];

  const fieldCols = 3;
  const fieldRows = 2;
  const fcellW    = (CARD_W - 4) / fieldCols;
  const fcellH    = SH / fieldRows;
  const flabSize  = Math.max(4, Math.round(CARD_W * 0.046));
  const fvalSize  = Math.max(6, Math.round(CARD_W * 0.076));

  for (let i = 0; i < 6; i++) {
    const col = i % fieldCols;
    const row = Math.floor(i / fieldCols);
    const fcx = x + 2 + fcellW * col + fcellW / 2;
    const fry = sy2 + fcellH * row;

    if (col > 0) {
      ctx.fillStyle = `${t.accent}18`;
      ctx.fillRect(x + 2 + fcellW * col, fry + fcellH * 0.15, 1, fcellH * 0.70);
    }

    ctx.fillStyle    = t.label;
    ctx.font         = `${flabSize}px RobotoReg`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stats6[i].l, fcx, fry + fcellH * 0.46);

    ctx.fillStyle    = t.num;
    ctx.font         = `bold ${fvalSize}px Roboto`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(stats6[i].v ?? 0), fcx, fry + fcellH * 0.88);
  }

  // ── Card glow border ──────────────────────────────────────────────────────
  drawGlow(ctx, x, y, CARD_W, CARD_H, t, R);

  // ── Slot label below card ─────────────────────────────────────────────────
  const slotLabelY = y + CARD_H + 3;
  const slotLabelW = CARD_W * 0.55;
  const slotLabelH = 14;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  roundRect(ctx, cx - slotLabelW/2, slotLabelY, slotLabelW, slotLabelH, 3); ctx.fill();
  ctx.fillStyle    = player.pos === slotPos ? '#5dff88' : '#ffcc44';
  ctx.font         = `bold 7px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slotPos, cx, slotLabelY + slotLabelH / 2);
  ctx.restore();
}

// ─── Field image (main team view) ────────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  // Fetch photos for unique players
  const seen     = new Set();
  const photoMap = new Map();
  for (const l of lineup) {
    const player   = l.player;
    const ssId     = player?.sofascoreId;
    const eaId     = player?.eaId;
    const cacheKey = `ss:${ssId ?? 'x'}:ea:${eaId ?? 'x'}`;
    if ((!ssId && !eaId) || seen.has(cacheKey)) continue;
    seen.add(cacheKey);
    const img = await fetchPlayerPhoto(ssId, eaId);
    if (img) photoMap.set(cacheKey, img);
    await new Promise(r => setTimeout(r, 100));
  }

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Outer background (stadium darkness)
  const outerBg = ctx.createLinearGradient(0, 0, 0, H);
  outerBg.addColorStop(0, '#03080a');
  outerBg.addColorStop(1, '#050e06');
  ctx.fillStyle = outerBg; ctx.fillRect(0, 0, W, H);

  // Header bar
  const hdrH  = 62;
  const hdrBg = ctx.createLinearGradient(0, 0, 0, hdrH);
  hdrBg.addColorStop(0, 'rgba(0,0,0,0.98)');
  hdrBg.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = hdrBg;
  roundRect(ctx, 18, 6, W - 36, hdrH, 10); ctx.fill();

  // Left accent bar (green)
  ctx.fillStyle = '#2ecc40';
  ctx.fillRect(18, 6, 4, hdrH);

  // Team name
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 5;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 22px Roboto';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(trunc(teamName ?? 'Meu Time', 24), 34, 6 + hdrH/2);
  ctx.restore();

  // ELO (top-right)
  ctx.save();
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
  ctx.fillStyle   = '#FFD700';
  ctx.font        = 'bold 16px Roboto';
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${elo ?? 0} ELO`, W - 30, 6 + hdrH * 0.48);
  ctx.restore();

  // Formation (top-right, smaller)
  ctx.fillStyle    = 'rgba(255,255,255,0.48)';
  ctx.font         = '13px RobotoReg';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(formation ?? '4-3-3', W - 30, 6 + hdrH * 0.78);

  // Pitch area
  const fx = 20, fy = 74, fw = W - 40, fh = H - 106;

  // Grass gradient with radial center
  const grass = ctx.createRadialGradient(fx + fw/2, fy + fh/2, 60, fx + fw/2, fy + fh/2, fh * 0.82);
  grass.addColorStop(0,    '#2e9a32');
  grass.addColorStop(0.40, '#1e7020');
  grass.addColorStop(1,    '#0e3a10');
  ctx.fillStyle = grass;
  roundRect(ctx, fx, fy, fw, fh, 14); ctx.fill();

  // Pitch stripes (alternating darker/lighter green bands)
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 14); ctx.clip();
  const stripeH = fh / 11;
  for (let i = 0; i < 11; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(fx, fy + i * stripeH, fw, stripeH);
  }
  // Vignette on pitch
  const vign = ctx.createRadialGradient(fx + fw/2, fy + fh/2, fh * 0.15, fx + fw/2, fy + fh/2, fh * 0.88);
  vign.addColorStop(0, 'transparent');
  vign.addColorStop(1, 'rgba(0,0,0,0.40)');
  ctx.fillStyle = vign; ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();

  // Field lines
  drawFieldLines(ctx, fx, fy, fw, fh);

  // Draw player cards
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  for (let i = 0; i < slots.length; i++) {
    const s      = slots[i];
    const entry  = lineup.find(l => l.slot === i + 1);
    const player = entry?.player ?? null;
    const _ssId  = player?.sofascoreId;
    const _eaId  = player?.eaId;
    const _ck    = `ss:${_ssId ?? 'x'}:ea:${_eaId ?? 'x'}`;
    const photo  = (_ssId || _eaId) ? (photoMap.get(_ck) ?? null) : null;
    drawFieldCard(
      ctx,
      Math.round(fx + s.x * fw),
      Math.round(fy + s.y * fh),
      player, s.pos, photo
    );
  }

  // Footer bar (OVR info)
  const footY = fy + fh + 4;
  const footH = H - footY - 4;
  const ftG   = ctx.createLinearGradient(fx, footY, fx, footY + footH);
  ftG.addColorStop(0, 'rgba(0,0,0,0.96)');
  ftG.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = ftG;
  roundRect(ctx, fx, footY, fw, footH, 8); ctx.fill();

  const validOvrs = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr    = validOvrs.length
    ? (validOvrs.reduce((a, b) => a + b, 0) / validOvrs.length).toFixed(1)
    : '--';

  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 13px Roboto';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`OVR Médio: ${avgOvr}`, fx + 14, footY + footH / 2);

  ctx.fillStyle    = 'rgba(255,255,255,0.48)';
  ctx.font         = '12px RobotoReg';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Formação: ${formation ?? '4-3-3'}`, fx + fw - 14, footY + footH / 2);

  return canvas.toBuffer('image/png');
}
