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
const W      = 720;
const H      = 920;
const CARD_W = 92;
const CARD_H = 122;

// ─── Pack card dimensions (pack reveal) ──────────────────────────────────────
const PC_W  = 200;
const PC_H  = 295;
const PC_PH = 175;
const PC_NH = 40;
const PC_SH = PC_H - PC_PH - PC_NH;

// ─── Collection card dimensions ──────────────────────────────────────────────
const CC_W  = 160;
const CC_H  = 224;
const CC_PH = 126;
const CC_NH = 36;
const CC_SH = CC_H - CC_PH - CC_NH;

// ─── Rarity themes ────────────────────────────────────────────────────────────
const THEME = {
  black: {
    grad:      ['#9933ff', '#5500bb', '#1a003d'],
    ovrColor:  '#ffffff',
    posColor:  '#ddaaff',
    accent:    '#aa44ff',
    border:    '#9922ee',
    shimmer:   'rgba(160,60,255,0.22)',
    nameBar:   'rgba(12,0,28,0.97)',
    statsBar:  '#07000f',
    statLabel: '#cc77ff',
    statValue: '#ffffff',
    glow:      22,
    bg1:'#1e0048', bg2:'#0a0020',
    num:'#fff', label:'#cc88ff', stat_bg:'rgba(8,0,20,0.93)',
    cardBg1: '#2a006e', cardBg2: '#0d0028', cardBg3: '#050010',
  },
  gold: {
    grad:      ['#ffe566', '#d4a500', '#7a5000'],
    ovrColor:  '#1a0a00',
    posColor:  '#4a2800',
    accent:    '#ffd700',
    border:    '#e0b800',
    shimmer:   'rgba(255,220,0,0.28)',
    nameBar:   'rgba(18,8,0,0.97)',
    statsBar:  '#0e0600',
    statLabel: '#ffcc44',
    statValue: '#ffffff',
    glow:      14,
    bg1:'#c08000', bg2:'#5a3600',
    num:'#fff', label:'#ffc040', stat_bg:'rgba(18,8,0,0.93)',
    cardBg1: '#ffe566', cardBg2: '#c08800', cardBg3: '#6a4000',
  },
  silver: {
    grad:      ['#d0e8ff', '#7898c8', '#2a3a50'],
    ovrColor:  '#0c1a2e',
    posColor:  '#1e3050',
    accent:    '#aacce8',
    border:    '#7898c8',
    shimmer:   'rgba(170,200,240,0.22)',
    nameBar:   'rgba(10,16,26,0.97)',
    statsBar:  '#080e18',
    statLabel: '#88b8e0',
    statValue: '#ffffff',
    glow:      10,
    bg1:'#607898', bg2:'#1e3048',
    num:'#fff', label:'#a0c8e0', stat_bg:'rgba(12,18,28,0.93)',
    cardBg1: '#c8ddf0', cardBg2: '#5c7898', cardBg3: '#1a2838',
  },
  bronze: {
    grad:      ['#ff8855', '#cc5522', '#601800'],
    ovrColor:  '#1a0800',
    posColor:  '#4a1800',
    accent:    '#ff7744',
    border:    '#cc5522',
    shimmer:   'rgba(230,100,40,0.26)',
    nameBar:   'rgba(14,4,0,0.97)',
    statsBar:  '#0c0300',
    statLabel: '#ff9966',
    statValue: '#ffffff',
    glow:      10,
    bg1:'#c05030', bg2:'#501808',
    num:'#fff', label:'#ff9966', stat_bg:'rgba(14,4,0,0.93)',
    cardBg1: '#ff8855', cardBg2: '#b84422', cardBg3: '#501200',
  },
};

// ─── Formations ───────────────────────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': [
    { pos:'GOL',x:.50,y:.91 },
    { pos:'LE',x:.10,y:.74 },{ pos:'ZAG',x:.35,y:.74 },{ pos:'ZAG',x:.65,y:.74 },{ pos:'LD',x:.90,y:.74 },
    { pos:'MC',x:.20,y:.51 },{ pos:'MC',x:.50,y:.51 },{ pos:'MC',x:.80,y:.51 },
    { pos:'PE',x:.12,y:.23 },{ pos:'CA',x:.50,y:.14 },{ pos:'PD',x:.88,y:.23 },
  ],
  '4-4-2': [
    { pos:'GOL',x:.50,y:.91 },
    { pos:'LE',x:.10,y:.74 },{ pos:'ZAG',x:.35,y:.74 },{ pos:'ZAG',x:.65,y:.74 },{ pos:'LD',x:.90,y:.74 },
    { pos:'PE',x:.10,y:.51 },{ pos:'MC',x:.36,y:.51 },{ pos:'MC',x:.64,y:.51 },{ pos:'PD',x:.90,y:.51 },
    { pos:'CA',x:.35,y:.18 },{ pos:'CA',x:.65,y:.18 },
  ],
  '4-2-4': [
    { pos:'GOL',x:.50,y:.91 },
    { pos:'LE',x:.10,y:.74 },{ pos:'ZAG',x:.35,y:.74 },{ pos:'ZAG',x:.65,y:.74 },{ pos:'LD',x:.90,y:.74 },
    { pos:'MC',x:.34,y:.53 },{ pos:'MC',x:.66,y:.53 },
    { pos:'PE',x:.10,y:.21 },{ pos:'CA',x:.36,y:.14 },{ pos:'CA',x:.64,y:.14 },{ pos:'PD',x:.90,y:.21 },
  ],
  '3-3-4': [
    { pos:'GOL',x:.50,y:.91 },
    { pos:'ZAG',x:.22,y:.74 },{ pos:'ZAG',x:.50,y:.74 },{ pos:'ZAG',x:.78,y:.74 },
    { pos:'MC',x:.22,y:.52 },{ pos:'MC',x:.50,y:.52 },{ pos:'MC',x:.78,y:.52 },
    { pos:'PE',x:.10,y:.21 },{ pos:'CA',x:.36,y:.14 },{ pos:'CA',x:.64,y:.14 },{ pos:'PD',x:.90,y:.21 },
  ],
  '5-3-2': [
    { pos:'GOL',x:.50,y:.91 },
    { pos:'LE',x:.07,y:.73 },{ pos:'ZAG',x:.27,y:.76 },{ pos:'ZAG',x:.50,y:.76 },{ pos:'ZAG',x:.73,y:.76 },{ pos:'LD',x:.93,y:.73 },
    { pos:'MC',x:.23,y:.52 },{ pos:'MC',x:.50,y:.52 },{ pos:'MC',x:.77,y:.52 },
    { pos:'CA',x:.35,y:.18 },{ pos:'CA',x:.65,y:.18 },
  ],
  '4-5-1': [
    { pos:'GOL',x:.50,y:.91 },
    { pos:'LE',x:.10,y:.74 },{ pos:'ZAG',x:.35,y:.74 },{ pos:'ZAG',x:.65,y:.74 },{ pos:'LD',x:.90,y:.74 },
    { pos:'PE',x:.10,y:.51 },{ pos:'MC',x:.30,y:.51 },{ pos:'MC',x:.50,y:.51 },{ pos:'MC',x:.70,y:.51 },{ pos:'PD',x:.90,y:.51 },
    { pos:'CA',x:.50,y:.15 },
  ],
  '3-4-3': [
    { pos:'GOL',x:.50,y:.91 },
    { pos:'ZAG',x:.22,y:.74 },{ pos:'ZAG',x:.50,y:.74 },{ pos:'ZAG',x:.78,y:.74 },
    { pos:'LE',x:.10,y:.51 },{ pos:'MC',x:.36,y:.51 },{ pos:'MC',x:.64,y:.51 },{ pos:'LD',x:.90,y:.51 },
    { pos:'PE',x:.12,y:.20 },{ pos:'CA',x:.50,y:.13 },{ pos:'PD',x:.88,y:.20 },
  ],
};

// ─── Country → ISO code ───────────────────────────────────────────────────────
const NAT_ISO = {
  BRA:'br',ARG:'ar',FRA:'fr',ESP:'es',POR:'pt',ALE:'de',ING:'gb',ITA:'it',
  HOL:'nl',BEL:'be',MAR:'ma',SEN:'sn',NOR:'no',POL:'pl',CRO:'hr',AUT:'at',
  EGI:'eg',NIG:'ng',CMR:'cm',SVN:'si',CAN:'ca',EUA:'us',URU:'uy',CHI:'cl',
  MLT:'mt',IRL:'ie',AUS:'au',GUI:'gn',SER:'rs',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
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

// ─── Fetch player photo (SofaScore primary, Futbin CDN fallback) ──────────────
async function fetchPlayerPhoto(sofascoreId, eaId) {
  const cacheKey = `ss:${sofascoreId ?? 'x'}:ea:${eaId ?? 'x'}`;
  if (_photoCache.has(cacheKey)) return _photoCache.get(cacheKey);

  async function tryUrl(url, headers = {}) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          ...headers,
        },
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) return null;
      return await loadImage(buf);
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  let img = null;

  // 1️⃣ SofaScore API (works on Railway, may be blocked on Replit)
  if (sofascoreId) {
    img = await tryUrl(
      `https://api.sofascore.com/api/v1/player/${sofascoreId}/image`,
      { 'Referer': 'https://www.sofascore.com/', 'Accept': 'image/webp,image/png,image/*' }
    );
  }

  // 2️⃣ Futbin CDN fallback (EA ID required)
  if (!img && eaId) {
    img = await tryUrl(`https://cdn.futbin.com/content/fifa25/img/players/${eaId}.png`);
  }

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
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch { return null; }
}

// ─── Staggered photo batch ────────────────────────────────────────────────────
async function batchFetchPhotos(players) {
  const out = [];
  for (let i = 0; i < players.length; i++) {
    const entry = players[i];
    const p     = entry?.player ?? entry;
    const ssId  = p?.sofascoreId ?? null;
    const eaId  = p?.eaId ?? null;
    out.push((ssId || eaId) ? await fetchPlayerPhoto(ssId, eaId) : null);
    if (i < players.length - 1) {
      await new Promise(r => setTimeout(r, 380 + Math.floor(Math.random() * 140)));
    }
  }
  return out;
}

// ─── Draw player avatar (initials-based — guaranteed fallback) ────────────────
function drawPlayerAvatar(ctx, x, y, w, h, t, name) {
  // Themed background
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0,   t.cardBg1 ?? t.grad[0]);
  bg.addColorStop(0.5, t.cardBg2 ?? t.grad[1]);
  bg.addColorStop(1,   t.cardBg3 ?? t.grad[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  const cx = x + w / 2;
  const cy = y + h / 2;
  const r  = Math.min(w, h) * 0.36;

  // Subtle diagonal lines pattern
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = t.accent ?? '#ffffff';
  ctx.lineWidth   = 1;
  for (let i = -h; i < w + h; i += 14) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Outer glow ring
  ctx.save();
  const ring = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.15);
  ring.addColorStop(0, 'transparent');
  ring.addColorStop(1, `${t.accent ?? '#ffffff'}44`);
  ctx.fillStyle = ring;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Circle background
  ctx.save();
  const circleBg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
  circleBg.addColorStop(0, `${t.accent ?? '#ffffff'}33`);
  circleBg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = circleBg;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Circle border
  ctx.strokeStyle = `${t.accent ?? '#ffffff'}99`;
  ctx.lineWidth   = Math.max(1.5, w * 0.018);
  ctx.stroke();
  ctx.restore();

  // Initials text
  const parts    = (name ?? '?').trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0] ?? '?').slice(0, 2).toUpperCase();
  const fontSize = Math.round(r * 1.05);
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur   = 10;
  ctx.fillStyle    = t.ovrColor === '#ffffff' ? '#ffffff' : (t.statValue ?? '#ffffff');
  ctx.font         = `bold ${fontSize}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, cx, cy);
  ctx.restore();
}

// ─── Draw photo or avatar (100% coverage) ────────────────────────────────────
function drawPhotoZone(ctx, photo, x, y, w, h, t, name) {
  if (photo) {
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, t.cardBg1 ?? t.grad[0]);
    bg.addColorStop(1, t.cardBg2 ?? t.grad[1]);
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    const scale = w / photo.width;
    const drawH = photo.height * scale;
    const drawY = drawH < h ? y + (h - drawH) / 2 : y;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(photo, x, drawY, w, drawH);
    ctx.restore();
  } else {
    drawPlayerAvatar(ctx, x, y, w, h, t, name);
  }
}

// ─── Card glow border ──────────────────────────────────────────────────────────
function drawGlow(ctx, x, y, w, h, t, r = 10) {
  ctx.save();
  ctx.shadowColor = t.border;
  ctx.shadowBlur  = t.glow;
  ctx.strokeStyle = t.border;
  ctx.lineWidth   = t.glow >= 18 ? 2.8 : 2.0;
  roundRect(ctx, x, y, w, h, r); ctx.stroke();
  ctx.restore();
}

// ─── Dark atmospheric background ──────────────────────────────────────────────
function drawAtmoBg(ctx, w, h, c1='#0a0a18', c2='#040410') {
  const bg = ctx.createRadialGradient(w*.5, h*.4, 30, w*.5, h*.5, Math.max(w,h));
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
}

// ─── Dark store bokeh background ──────────────────────────────────────────────
function drawStoreBg(ctx, w, h) {
  ctx.fillStyle = '#080806';
  ctx.fillRect(0, 0, w, h);

  // Warm amber bokeh blobs (simulating store lights)
  const blobs = [
    { x: w*0.12, y: h*0.2,  r: w*0.22, c: 'rgba(140,80,20,0.12)' },
    { x: w*0.88, y: h*0.15, r: w*0.18, c: 'rgba(120,60,15,0.10)' },
    { x: w*0.50, y: h*0.08, r: w*0.30, c: 'rgba(80,50,10,0.08)'  },
    { x: w*0.25, y: h*0.85, r: w*0.20, c: 'rgba(60,40,10,0.06)'  },
    { x: w*0.75, y: h*0.80, r: w*0.22, c: 'rgba(70,45,10,0.07)'  },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // Subtle vertical shelving lines
  ctx.strokeStyle = 'rgba(255,255,255,0.018)'; ctx.lineWidth = 1;
  for (let gx = 0; gx <= w; gx += 60) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
  }

  // Bottom floor reflection
  const floor = ctx.createLinearGradient(0, h*0.75, 0, h);
  floor.addColorStop(0, 'rgba(0,0,0,0)');
  floor.addColorStop(1, 'rgba(0,0,0,0.50)');
  ctx.fillStyle = floor; ctx.fillRect(0, h*0.75, w, h*0.25);
}

// ─── Field lines ──────────────────────────────────────────────────────────────
function drawFieldLines(ctx, fx, fy, fw, fh) {
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.beginPath(); ctx.moveTo(fx, fy+fh/2); ctx.lineTo(fx+fw, fy+fh/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 54, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 4, 0, Math.PI*2); ctx.fill();
  const pW=fw*.52, pH=fh*.17, gW=fw*.26, gH=fh*.065;
  ctx.strokeRect(fx+(fw-pW)/2, fy, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy, gW, gH);
  ctx.strokeRect(fx+(fw-pW)/2, fy+fh-pH, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy+fh-gH, gW, gH);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  [fh*.135, fh*.865].forEach(yo => {
    ctx.beginPath(); ctx.arc(fx+fw/2, fy+yo, 3, 0, Math.PI*2); ctx.fill();
  });
}

// ─── Draw FC mylar pack (Futecord style) ──────────────────────────────────────
// w × h  should be roughly 1 : 1.75 ratio (e.g. 170×300)
function drawFCPack(ctx, x, y, w, h, label, playerPhoto) {
  const topSealH  = h * 0.10;          // sealed top band height
  const topSealIn = w * 0.14;          // how much the top seal narrows on each side
  const botIn     = w * 0.06;          // very slight bottom taper

  // ── Pack outline path ─────────────────────────────────────────────────────
  function packPath() {
    const tl = { x: x + topSealIn,     y: y };
    const tr = { x: x + w - topSealIn, y: y };
    const br = { x: x + w - botIn,     y: y + h };
    const bl = { x: x + botIn,         y: y + h };

    ctx.beginPath();
    // Top-left corner of seal
    ctx.moveTo(tl.x + 5, y);
    ctx.lineTo(tr.x - 5, y);
    ctx.quadraticCurveTo(tr.x, y, tr.x, y + 5);
    // Shoulder: flare right
    ctx.bezierCurveTo(
      tr.x + (x + w - tr.x) * 0.55, y + topSealH * 0.35,
      x + w, y + topSealH * 0.80,
      x + w, y + topSealH
    );
    // Right body (straight down)
    ctx.lineTo(x + w, y + h - 8);
    // Bottom right
    ctx.quadraticCurveTo(x + w, y + h, br.x, y + h);
    // Bottom
    ctx.lineTo(bl.x, y + h);
    // Bottom left
    ctx.quadraticCurveTo(x, y + h, x, y + h - 8);
    // Left body (straight up)
    ctx.lineTo(x, y + topSealH);
    // Shoulder: flare left
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
  ctx.shadowColor = 'rgba(0,0,0,0.90)';
  ctx.shadowBlur  = 24;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 10;

  // Base green gradient fill
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGrad.addColorStop(0,    '#2a8a2a');
  bodyGrad.addColorStop(0.25, '#1a5c1a');
  bodyGrad.addColorStop(0.65, '#0a3008');
  bodyGrad.addColorStop(1,    '#040e04');
  ctx.fillStyle = bodyGrad;
  packPath();
  ctx.fill();
  ctx.restore();

  // ── Clip everything inside pack shape ─────────────────────────────────────
  ctx.save();
  packPath();
  ctx.clip();

  // Metallic left-edge shine
  const shine = ctx.createLinearGradient(x, y, x + w * 0.28, y);
  shine.addColorStop(0,   'rgba(255,255,255,0.28)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  shine.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(x, y, w * 0.28, h);

  // Right-edge shadow strip
  const rShade = ctx.createLinearGradient(x + w * 0.80, y, x + w, y);
  rShade.addColorStop(0, 'rgba(0,0,0,0)');
  rShade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = rShade; ctx.fillRect(x + w * 0.80, y, w * 0.20, h);

  // Top seal band (darker tint)
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.fillRect(x, y, w, topSealH + 2);

  // Seal line at bottom of top seal
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y + topSealH, w, 1.5);

  // Dots along seal (realism)
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let d = 0; d < 4; d++) {
    ctx.beginPath();
    ctx.arc(x + w * 0.25 + d * w * 0.17, y + topSealH * 0.50, 1.5, 0, Math.PI*2);
    ctx.fill();
  }

  // ── FC + ball logo (top area) ──────────────────────────────────────────────
  const logoAreaTop = y + topSealH + 4;
  const logoH       = h * 0.26;
  const fcSize      = Math.round(w * 0.46);

  ctx.save();
  ctx.shadowColor = 'rgba(60,255,80,0.35)';
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = `bold ${fcSize}px Roboto`;
  ctx.textAlign   = 'left';
  ctx.fillText('FC', x + w * 0.07, logoAreaTop + fcSize * 0.88);
  ctx.restore();

  // Football icon (right of FC)
  const bcx = x + w * 0.77;
  const bcy = logoAreaTop + logoH * 0.46;
  const br  = w * 0.125;
  const ballG = ctx.createRadialGradient(bcx - br*0.3, bcy - br*0.3, 1, bcx, bcy, br);
  ballG.addColorStop(0, '#ddd'); ballG.addColorStop(1, '#888');
  ctx.fillStyle = ballG;
  ctx.beginPath(); ctx.arc(bcx, bcy, br, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(bcx, bcy, br * 0.28, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8;
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(bcx + Math.cos(ang)*br*0.28, bcy + Math.sin(ang)*br*0.28);
    ctx.lineTo(bcx + Math.cos(ang)*br*0.90, bcy + Math.sin(ang)*br*0.90);
    ctx.stroke();
  }

  // ── Position badge (yellow crest/shield) ──────────────────────────────────
  const badgeTop  = logoAreaTop + logoH + h * 0.01;
  const badgeH    = h * 0.185;
  const badgeW    = w * 0.92;
  const badgeX    = x + (w - badgeW) / 2;

  // Draw crest/shield shape
  const bGrad = ctx.createLinearGradient(badgeX, badgeTop, badgeX, badgeTop + badgeH);
  bGrad.addColorStop(0,   '#ffe040');
  bGrad.addColorStop(0.5, '#d4a000');
  bGrad.addColorStop(1,   '#9a6c00');
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.moveTo(badgeX + 6, badgeTop);
  ctx.lineTo(badgeX + badgeW - 6, badgeTop);
  ctx.quadraticCurveTo(badgeX + badgeW, badgeTop, badgeX + badgeW, badgeTop + 6);
  ctx.lineTo(badgeX + badgeW, badgeTop + badgeH * 0.60);
  ctx.bezierCurveTo(badgeX + badgeW, badgeTop + badgeH * 0.88, badgeX + badgeW/2, badgeTop + badgeH, badgeX + badgeW/2, badgeTop + badgeH);
  ctx.bezierCurveTo(badgeX + badgeW/2, badgeTop + badgeH, badgeX, badgeTop + badgeH * 0.88, badgeX, badgeTop + badgeH * 0.60);
  ctx.lineTo(badgeX, badgeTop + 6);
  ctx.quadraticCurveTo(badgeX, badgeTop, badgeX + 6, badgeTop);
  ctx.closePath();
  ctx.fill();

  // Badge inner border
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  ctx.stroke();

  // Small FC badge icon inside crest (top-center small)
  const miniR = badgeH * 0.18;
  const miniBX = badgeX + badgeW * 0.12;
  const miniBY = badgeTop + badgeH * 0.30;
  const miniG = ctx.createRadialGradient(miniBX, miniBY, 1, miniBX, miniBY, miniR);
  miniG.addColorStop(0, '#2a7a2a'); miniG.addColorStop(1, '#0a3a0a');
  ctx.fillStyle = miniG;
  ctx.beginPath(); ctx.arc(miniBX, miniBY, miniR, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(miniR * 1.1)}px Roboto`;
  ctx.textAlign = 'center';
  ctx.fillText('FC', miniBX, miniBY + miniR * 0.38);

  // Position label text
  const labelSize = Math.max(8, Math.round(badgeH * 0.44));
  ctx.fillStyle = '#1a0800';
  ctx.font = `bold ${labelSize}px Roboto`;
  ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), x + w/2, badgeTop + badgeH * 0.70);

  // ── Player photo zone ─────────────────────────────────────────────────────
  const photoTop = badgeTop + badgeH + h * 0.010;
  const photoH   = y + h - photoTop - h * 0.125;

  if (playerPhoto) {
    const scale = w / playerPhoto.width;
    const dh    = playerPhoto.height * scale;
    const dy    = dh > photoH
      ? photoTop - (dh - photoH) * 0.15
      : photoTop + (photoH - dh) / 2;
    ctx.drawImage(playerPhoto, x, dy, w, dh);
    // Blend photo top into badge bottom
    const fade = ctx.createLinearGradient(x, photoTop, x, photoTop + photoH * 0.22);
    fade.addColorStop(0, 'rgba(8,30,8,0.90)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade; ctx.fillRect(x, photoTop, w, photoH * 0.25);
  } else {
    const silH = h - (photoTop - y);
    drawPlayerAvatar(ctx, x, photoTop, w, silH, THEME.gold, label);
  }

  // ── Bottom strip ──────────────────────────────────────────────────────────
  const botStripY = y + h - h * 0.125;
  ctx.fillStyle   = 'rgba(0,0,0,0.70)';
  ctx.fillRect(x, botStripY, w, h * 0.125);

  // "4 CARTAS DA POSIÇÃO" — left
  const botFontSz = Math.max(6, Math.round(w * 0.074));
  ctx.fillStyle = '#ffffff';
  ctx.font      = `bold ${botFontSz}px Roboto`;
  ctx.textAlign = 'left';
  ctx.fillText('4 CARTAS DA POSIÇÃO', x + w * 0.05, botStripY + h * 0.070);

  // "1 OURO GARANTIDO" blue oval badge — right
  const oBadgeH = h * 0.055;
  const oBadgeW = w * 0.44;
  const oBadgeX = x + w - oBadgeW - w * 0.04;
  const oBadgeY = botStripY + h * 0.070 - oBadgeH * 0.80;
  const oGrad   = ctx.createLinearGradient(oBadgeX, oBadgeY, oBadgeX, oBadgeY + oBadgeH);
  oGrad.addColorStop(0, '#1a88ff');
  oGrad.addColorStop(1, '#0044cc');
  ctx.fillStyle = oGrad;
  roundRect(ctx, oBadgeX, oBadgeY, oBadgeW, oBadgeH, oBadgeH / 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font      = `bold ${Math.max(5, Math.round(oBadgeH * 0.56))}px Roboto`;
  ctx.textAlign = 'center';
  ctx.fillText('1 OURO GARANTIDO', oBadgeX + oBadgeW / 2, oBadgeY + oBadgeH * 0.72);

  ctx.restore();

  // ── Pack outline (thin bright edge) ──────────────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(80,200,80,0.50)';
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = 'rgba(120,220,120,0.55)';
  ctx.lineWidth   = 1.5;
  packPath();
  ctx.stroke();
  ctx.restore();
}

// ─── Draw one pack/collection card (Futecord style) ───────────────────────────
// Stats order: PAS DRI DEF FIN VEL RES  (labels above, numbers below)
function drawPackCard(ctx, x, y, w, h, ph, nh, sh, player, photo, flag) {
  const t = THEME[player.rarity] ?? THEME.bronze;
  const R = 12;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.88)';
  ctx.shadowBlur  = 24;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 8;

  // Card background: diagonal gradient with bright spot at top-center
  const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bgGrad.addColorStop(0,    t.cardBg1 ?? t.grad[0]);
  bgGrad.addColorStop(0.45, t.cardBg2 ?? t.grad[1]);
  bgGrad.addColorStop(1,    t.cardBg3 ?? t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, w, h, R); ctx.fill();
  ctx.restore();

  // Diagonal shimmer
  const shim = ctx.createLinearGradient(x, y, x + w, y + h);
  shim.addColorStop(0,    'transparent');
  shim.addColorStop(0.30, t.shimmer);
  shim.addColorStop(0.55, t.shimmer);
  shim.addColorStop(1,    'transparent');
  ctx.save(); roundRect(ctx, x, y, w, h, R); ctx.clip();
  ctx.fillStyle = shim; ctx.fillRect(x, y, w, h);

  // Photo zone (clipped)
  roundRect(ctx, x, y, w, ph + R, R); ctx.clip();
  drawPhotoZone(ctx, photo, x, y, w, ph, t, player.name);
  ctx.restore();

  // Photo bottom fade
  const fade = ctx.createLinearGradient(x, y + ph - 65, x, y + ph + 4);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = fade; ctx.fillRect(x, y + ph - 65, w, 70);

  // ── OVR (top-left) ────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
  const ovrSize = Math.round(w * 0.27);
  ctx.fillStyle = t.ovrColor;
  ctx.font      = `bold ${ovrSize}px Roboto`;
  ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x + 9, y + ovrSize + 4);
  ctx.fillStyle = t.posColor;
  ctx.font      = `bold ${Math.round(w * 0.08)}px Roboto`;
  ctx.fillText(player.pos, x + 10, y + ovrSize + 18);
  ctx.restore();

  // ── Flag (top-right) ──────────────────────────────────────────────────────
  const fw2 = 40, fh2 = 26, fx2 = x + w - fw2 - 8, fy2 = y + 10;
  if (flag) {
    ctx.save();
    roundRect(ctx, fx2, fy2, fw2, fh2, 3); ctx.clip();
    ctx.drawImage(flag, fx2, fy2, fw2, fh2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.50)'; ctx.lineWidth = 1;
    roundRect(ctx, fx2, fy2, fw2, fh2, 3); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    roundRect(ctx, fx2, fy2, 32, 18, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '8px RobotoReg'; ctx.textAlign = 'center';
    ctx.fillText(player.nat ?? '', fx2 + 16, fy2 + 13);
  }

  // ── Name bar ──────────────────────────────────────────────────────────────
  const ny = y + ph;
  ctx.fillStyle = t.nameBar;
  ctx.fillRect(x, ny, w, nh);
  // Accent line at top of name bar
  const accLine = ctx.createLinearGradient(x, ny, x + w, ny);
  accLine.addColorStop(0, 'transparent');
  accLine.addColorStop(0.2, t.accent);
  accLine.addColorStop(0.8, t.accent);
  accLine.addColorStop(1,   'transparent');
  ctx.fillStyle = accLine; ctx.fillRect(x, ny, w, 2);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 5;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = `bold ${Math.round(w * 0.080)}px Roboto`;
  ctx.textAlign   = 'center';
  ctx.fillText(trunc(player.name.toUpperCase(), 13), x + w/2, ny + nh - 8);
  ctx.restore();

  // ── Stats bar (PAS DRI DEF FIN VEL RES) ──────────────────────────────────
  const sy = ny + nh;
  ctx.save(); roundRect(ctx, x, sy, w, sh, R); ctx.clip();
  ctx.fillStyle = t.statsBar; ctx.fillRect(x, sy, w, sh);
  ctx.restore();

  const stats = [
    { l:'PAS', v: player.pas },
    { l:'DRI', v: player.dri },
    { l:'DEF', v: player.def },
    { l:'FIN', v: player.fin },
    { l:'VEL', v: player.pac },
    { l:'RES', v: player.fis },
  ];
  const cw2 = w / 6;
  const rowH = sh / 2;
  const labY = sy + rowH * 0.82;    // labels on top half
  const valY = sy + rowH + rowH * 0.82; // values on bottom half

  for (let i = 0; i < 6; i++) {
    const cx2 = x + cw2 * i + cw2 / 2;
    if (i > 0) {
      ctx.fillStyle = `${t.accent}18`;
      ctx.fillRect(x + cw2 * i, sy + sh * 0.12, 1, sh * 0.76);
    }
    // Label (top)
    ctx.fillStyle = t.statLabel;
    ctx.font      = `bold ${Math.round(w * 0.048)}px RobotoReg`;
    ctx.textAlign = 'center';
    ctx.fillText(stats[i].l, cx2, labY);
    // Value (bottom)
    ctx.fillStyle = t.statValue;
    ctx.font      = `bold ${Math.round(w * 0.075)}px Roboto`;
    ctx.fillText(String(stats[i].v ?? 0), cx2, valY);
  }

  drawGlow(ctx, x, y, w, h, t, R);
}

// ─── Pack reveal ──────────────────────────────────────────────────────────────
export async function generatePackRevealImage(players) {
  const GAP  = 12;
  const PAD  = 16;
  const COLS = Math.min(players.length, 4);
  const ROWS = Math.ceil(players.length / COLS);
  const CW   = PAD*2 + COLS*PC_W + (COLS-1)*GAP;
  const CH   = 50 + PAD + ROWS*PC_H + (ROWS-1)*GAP + PAD;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, CW, CH, '#0c0c1e', '#060610');

  // Header
  const hGrad = ctx.createLinearGradient(0, 0, CW, 0);
  hGrad.addColorStop(0,  'rgba(50,15,100,0.85)');
  hGrad.addColorStop(.5, 'rgba(100,35,180,0.85)');
  hGrad.addColorStop(1,  'rgba(50,15,100,0.85)');
  ctx.fillStyle = hGrad; ctx.fillRect(0, 0, CW, 46);
  const hLine = ctx.createLinearGradient(0, 44, CW, 44);
  hLine.addColorStop(0,'transparent'); hLine.addColorStop(.3,'#aa44ff');
  hLine.addColorStop(.7,'#aa44ff'); hLine.addColorStop(1,'transparent');
  ctx.fillStyle = hLine; ctx.fillRect(0, 44, CW, 2);

  ctx.save();
  ctx.shadowColor = '#cc77ff'; ctx.shadowBlur = 14;
  ctx.fillStyle   = '#ffffff'; ctx.font = 'bold 22px Roboto'; ctx.textAlign = 'center';
  ctx.fillText('NOVAS CARTAS', CW/2, 31);
  ctx.restore();

  const photos = await batchFetchPhotos(players);
  const flags  = await Promise.all(players.map(p => fetchFlag(p.nat)));

  for (let i = 0; i < players.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const cx  = PAD + col*(PC_W+GAP);
    const cy  = 50 + PAD + row*(PC_H+GAP);
    drawPackCard(ctx, cx, cy, PC_W, PC_H, PC_PH, PC_NH, PC_SH, players[i], photos[i], flags[i]);
  }

  return canvas.toBuffer('image/png');
}

// ─── Collection grid ───────────────────────────────────────────────────────────
export async function generateCollectionImage(playerCards) {
  const COLS=4, GAP=10, PAD=12;
  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD*2 + COLS*CC_W + (COLS-1)*GAP;
  const CH   = PAD*2 + rows*CC_H + (rows-1)*GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Dark green pitch background
  const field = ctx.createLinearGradient(0, 0, 0, CH);
  field.addColorStop(0, '#1a5c1a');
  field.addColorStop(0.5, '#124012');
  field.addColorStop(1, '#0a2a0a');
  ctx.fillStyle = field; ctx.fillRect(0, 0, CW, CH);
  for (let i = 0; i < Math.ceil(CH / 26); i++) {
    ctx.fillStyle = i%2===0 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, i*26, CW, 26);
  }

  if (!playerCards.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.font = 'bold 20px Roboto'; ctx.textAlign = 'center';
    ctx.fillText('Nenhuma carta ainda!', CW/2, CH/2);
    return canvas.toBuffer('image/png');
  }

  const photos = await batchFetchPhotos(playerCards);
  const flags  = await Promise.all(playerCards.map(c => fetchFlag(c.player?.nat)));

  for (let i = 0; i < playerCards.length; i++) {
    const p = playerCards[i].player;
    if (!p) continue;
    const col = i%COLS, row = Math.floor(i/COLS);
    drawPackCard(
      ctx,
      PAD + col*(CC_W+GAP), PAD + row*(CC_H+GAP),
      CC_W, CC_H, CC_PH, CC_NH, CC_SH,
      p, photos[i], flags[i]
    );
  }

  return canvas.toBuffer('image/png');
}

// ─── Loja banner (Futecord style) ─────────────────────────────────────────────
export async function generateLojaImage(balance) {
  // Representative player photos: [ssId, eaId] pairs
  // Lewandowski(DEF), Pedri(MEI), Haaland(ATK), Vinicius(PE)
  const repPairs = [
    [7157,    188545], // Lewandowski
    [889012,  231677], // Pedri
    [839956,  239085], // Haaland
    [878986,  238794], // Vinicius Jr
  ];
  const repPhotos = [];
  for (const [ssId, eaId] of repPairs) {
    repPhotos.push(await fetchPlayerPhoto(ssId, eaId));
    await new Promise(r => setTimeout(r, 300));
  }

  const packDefs = [
    { label: 'DEFENSORES', photo: repPhotos[0] },
    { label: 'MEIAS',      photo: repPhotos[1] },
    { label: 'ATACANTES',  photo: repPhotos[2] },
    { label: 'GOLEIROS',   photo: repPhotos[3] },
  ];

  // Each pack: width=170, height=300. Canvas: 4 packs + gaps + padding.
  const PW   = 170, PH = 300;
  const GAP  = 18, PAD = 22;
  const BW   = PAD*2 + packDefs.length * PW + (packDefs.length-1) * GAP;
  const BH   = PH + 80; // 40px top (header) + 40px bottom (prices)

  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  drawStoreBg(ctx, BW, BH);

  // Draw each pack
  for (let i = 0; i < packDefs.length; i++) {
    const px = PAD + i * (PW + GAP);
    const py = 40;
    drawFCPack(ctx, px, py, PW, PH, packDefs[i].label, packDefs[i].photo);

    // Price row below pack
    const priceY = py + PH + 10;
    // Coins
    ctx.fillStyle = '#ffd700';
    ctx.font      = 'bold 13px Roboto';
    ctx.textAlign = 'left';
    ctx.fillText('🪙 125,000', px, priceY + 14);
    // R$ price
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font      = '12px RobotoReg';
    ctx.textAlign = 'right';
    ctx.fillText('R$ 5,90', px + PW, priceY + 14);
  }

  // Balance info top-left
  const bal = typeof balance === 'number' ? balance : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, PAD, 8, 220, 24, 5); ctx.fill();
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px Roboto'; ctx.textAlign = 'left';
  ctx.fillText(`🪙 ${bal.toLocaleString('pt-BR')} FuteCoins`, PAD + 8, 25);

  return canvas.toBuffer('image/png');
}

// ─── Pacotes banner (Futecord style) ──────────────────────────────────────────
export async function generatePacksImage() {
  // Representative photos for 5 pack types: [ssId, eaId]
  const repPairs = [
    [200644,  203376], // Van Dijk  (ouro)
    [17892,   158023], // Messi     (premium/black)
    [839956,  239085], // Haaland   (copa)
    [1101557, 246669], // Bellingham(europa)
    [342229,  231747], // Mbappé    (padrão)
  ];
  const repPhotos = [];
  for (const [ssId, eaId] of repPairs) {
    repPhotos.push(await fetchPlayerPhoto(ssId, eaId));
    await new Promise(r => setTimeout(r, 300));
  }

  const packDefs = [
    { label: 'PADRÃO',     photo: repPhotos[4] },
    { label: 'OURO',       photo: repPhotos[0] },
    { label: 'PREMIUM',    photo: repPhotos[1] },
    { label: 'COPA 26',    photo: repPhotos[2] },
    { label: 'EUROPA',     photo: repPhotos[3] },
  ];

  const PW  = 148, PH = 260;
  const GAP = 14,  PAD = 18;
  const BW  = PAD*2 + packDefs.length * PW + (packDefs.length-1) * GAP;
  const BH  = PH + 76;

  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  drawStoreBg(ctx, BW, BH);

  for (let i = 0; i < packDefs.length; i++) {
    const px = PAD + i * (PW + GAP);
    const py = 36;
    drawFCPack(ctx, px, py, PW, PH, packDefs[i].label, packDefs[i].photo);

    const priceY = py + PH + 10;
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px Roboto'; ctx.textAlign = 'left';
    ctx.fillText('🪙 125,000', px, priceY + 13);
    ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = '11px RobotoReg'; ctx.textAlign = 'right';
    ctx.fillText('R$ 5,90', px + PW, priceY + 13);
  }

  return canvas.toBuffer('image/png');
}

// ─── Partida result banner ─────────────────────────────────────────────────────
export async function generatePartidaImage({ result, myScore, oppScore, myOvr, oppOvr, oppName, eloChange, newElo }) {
  const BW=700, BH=240;
  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  const isWin = result==='win', isDraw = result==='draw';
  const rc = isWin ? '#00cc44' : isDraw ? '#ffcc00' : '#cc2200';
  drawAtmoBg(ctx, BW, BH, isWin?'#041a08':isDraw?'#141008':'#1a0404', isWin?'#020c04':isDraw?'#0a0804':'#0c0202');

  const glow = ctx.createRadialGradient(BW/2, BH/2, 20, BW/2, BH/2, BW*.65);
  glow.addColorStop(0, `${rc}22`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, BW, BH);

  const bar = ctx.createLinearGradient(0, 0, 0, BH);
  bar.addColorStop(0, rc); bar.addColorStop(1, `${rc}88`);
  ctx.fillStyle = bar; ctx.fillRect(0, 0, 5, BH);

  const labelText = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
  ctx.save(); ctx.shadowColor = rc; ctx.shadowBlur = 30;
  ctx.fillStyle = rc; ctx.font = 'bold 56px Roboto'; ctx.textAlign = 'left';
  ctx.fillText(labelText, 22, 72); ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = '16px RobotoReg';
  ctx.fillText(`vs ${oppName ?? 'Adversário'}`, 22, 98);

  ctx.save(); ctx.shadowColor = rc; ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 76px Roboto'; ctx.textAlign = 'center';
  ctx.fillText(`${myScore}  x  ${oppScore}`, BW/2, 148); ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.font = '14px RobotoReg'; ctx.textAlign = 'center';
  ctx.fillText(`OVR: ${myOvr ?? '--'} vs ${oppOvr ?? '--'}`, BW/2, 174);

  const eloSign  = (eloChange ?? 0) >= 0 ? '+' : '';
  const eloColor = (eloChange ?? 0) >= 0 ? '#44ee88' : '#ee4444';
  ctx.fillStyle = eloColor; ctx.font = 'bold 26px Roboto'; ctx.textAlign = 'right';
  ctx.fillText(`ELO: ${newElo ?? '--'} (${eloSign}${eloChange ?? 0})`, BW-22, 72);

  const botLine = ctx.createLinearGradient(0, BH-3, BW, BH-3);
  botLine.addColorStop(0, `${rc}88`); botLine.addColorStop(.5, rc); botLine.addColorStop(1, `${rc}88`);
  ctx.fillStyle = botLine; ctx.fillRect(0, BH-3, BW, 3);

  return canvas.toBuffer('image/png');
}

// ─── Field compact card ────────────────────────────────────────────────────────
function drawFieldCard(ctx, cx, cy, player, slotPos, photo) {
  const x = Math.round(cx - CARD_W/2);
  const y = Math.round(cy - CARD_H/2);

  if (!player) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = 'bold 9px Roboto'; ctx.textAlign = 'center';
    ctx.fillText(slotPos, cx, cy + 4);
    ctx.restore();
    return;
  }

  const t   = THEME[player.rarity] ?? THEME.bronze;
  const PH  = Math.round(CARD_H * 0.52);
  const R   = 8;
  const NH  = 18;
  const SH  = CARD_H - PH - NH;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.90)'; ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 5;
  const bgGrad = ctx.createLinearGradient(x, y, x, y+CARD_H);
  bgGrad.addColorStop(0, t.cardBg1 ?? t.grad[0]);
  bgGrad.addColorStop(.55, t.cardBg2 ?? t.grad[1]);
  bgGrad.addColorStop(1, t.cardBg3 ?? t.grad[2]);
  ctx.fillStyle = bgGrad; roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.fill();
  ctx.restore();

  ctx.save(); roundRect(ctx, x, y, CARD_W, PH + R, R); ctx.clip();
  if (photo) {
    const bg2 = ctx.createLinearGradient(x, y, x, y + PH);
    bg2.addColorStop(0, t.cardBg1 ?? t.grad[0]);
    bg2.addColorStop(1, t.cardBg2 ?? t.grad[1]);
    ctx.fillStyle = bg2; ctx.fillRect(x, y, CARD_W, PH);
    const scale = CARD_W / photo.width;
    const dh    = photo.height * scale;
    const dy    = dh < PH ? y + (PH - dh) / 2 : y;
    ctx.drawImage(photo, x, dy, CARD_W, dh);
  } else {
    drawPlayerAvatar(ctx, x, y, CARD_W, PH, t, player.name);
  }
  ctx.restore();

  const fade = ctx.createLinearGradient(x, y+PH-22, x, y+PH+4);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.70)');
  ctx.fillStyle = fade; ctx.fillRect(x, y+PH-22, CARD_W, 26);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 8;
  ctx.fillStyle = t.ovrColor; ctx.font = 'bold 22px Roboto'; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x+5, y+22);
  ctx.fillStyle = t.posColor; ctx.font = 'bold 7px Roboto';
  ctx.fillText(player.pos, x+5, y+31);
  ctx.restore();

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, x+CARD_W-26, y+3, 24, 12, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '6px RobotoReg'; ctx.textAlign = 'center';
  ctx.fillText((player.nat ?? '').slice(0,3), x+CARD_W-14, y+11);

  const ny = y + PH;
  ctx.fillStyle = t.nameBar; ctx.fillRect(x, ny, CARD_W, NH);
  ctx.fillStyle = t.accent; ctx.fillRect(x, ny, CARD_W, 1.5);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Roboto'; ctx.textAlign = 'center';
  ctx.fillText(trunc(player.name.toUpperCase(), 11), cx, ny + NH - 5);
  ctx.restore();

  const sy   = ny + NH;
  ctx.save(); roundRect(ctx, x+2, sy, CARD_W-4, SH, R); ctx.clip();
  ctx.fillStyle = t.stat_bg; ctx.fillRect(x+2, sy, CARD_W-4, SH); ctx.restore();

  const stats6 = [
    {l:'PAS',v:player.pas},{l:'DRI',v:player.dri},{l:'DEF',v:player.def},
    {l:'FIN',v:player.fin},{l:'VEL',v:player.pac},{l:'RES',v:player.fis},
  ];
  const cw2 = CARD_W / 3;
  const rowH2 = SH / 2;
  const leftStats  = stats6.slice(0, 3);
  const rightStats = stats6.slice(3, 6);
  for (let i = 0; i < 3; i++) {
    const ry = sy + i * rowH2 + rowH2 / 2 + 2;
    ctx.fillStyle = t.num;   ctx.font = 'bold 9px Roboto';  ctx.textAlign = 'left';
    ctx.fillText(String(leftStats[i].v ?? 0), x+5, ry + 1);
    ctx.fillStyle = t.label; ctx.font = '5px RobotoReg';
    ctx.fillText(leftStats[i].l, x+5, ry + 8);
    ctx.fillStyle = t.num;   ctx.font = 'bold 9px Roboto';  ctx.textAlign = 'right';
    ctx.fillText(String(rightStats[i].v ?? 0), x+CARD_W-5, ry + 1);
    ctx.fillStyle = t.label; ctx.font = '5px RobotoReg';
    ctx.fillText(rightStats[i].l, x+CARD_W-5, ry + 8);
  }

  drawGlow(ctx, x, y, CARD_W, CARD_H, t, R);

  ctx.fillStyle = 'rgba(0,0,0,0.80)';
  roundRect(ctx, cx-16, y+CARD_H+2, 32, 14, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Roboto'; ctx.textAlign = 'center';
  ctx.fillText(slotPos, cx, y+CARD_H+12);
}

// ─── Field image ───────────────────────────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  const seen     = new Set();
  const photoMap = new Map();
  for (const l of lineup) {
    const player = l.player;
    const ssId   = player?.sofascoreId;
    const eaId   = player?.eaId;
    const cacheKey = `ss:${ssId ?? 'x'}:ea:${eaId ?? 'x'}`;
    if ((!ssId && !eaId) || seen.has(cacheKey)) continue;
    seen.add(cacheKey);
    const img = await fetchPlayerPhoto(ssId, eaId);
    if (img) photoMap.set(cacheKey, img);
    await new Promise(r => setTimeout(r, 120));
  }

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const outerBg = ctx.createLinearGradient(0, 0, 0, H);
  outerBg.addColorStop(0, '#04080a'); outerBg.addColorStop(1, '#050e06');
  ctx.fillStyle = outerBg; ctx.fillRect(0, 0, W, H);

  const fx=20, fy=66, fw=W-40, fh=H-98;

  const grass = ctx.createRadialGradient(fx+fw/2, fy+fh/2, 60, fx+fw/2, fy+fh/2, fh*.80);
  grass.addColorStop(0, '#2e9a32'); grass.addColorStop(.40, '#226618'); grass.addColorStop(1, '#102e10');
  ctx.fillStyle = grass; roundRect(ctx, fx, fy, fw, fh, 12); ctx.fill();

  ctx.save(); roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip();
  const strH = fh / 12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i%2===0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(fx, fy+i*strH, fw, strH);
  }
  const vign = ctx.createRadialGradient(fx+fw/2, fy+fh/2, fh*.18, fx+fw/2, fy+fh/2, fh*.90);
  vign.addColorStop(0, 'transparent'); vign.addColorStop(1, 'rgba(0,0,0,0.44)');
  ctx.fillStyle = vign; ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();

  drawFieldLines(ctx, fx, fy, fw, fh);

  const hdrG = ctx.createLinearGradient(fx, 6, fx, 60);
  hdrG.addColorStop(0, 'rgba(0,0,0,0.96)'); hdrG.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = hdrG; roundRect(ctx, fx, 6, fw, 54, 10); ctx.fill();
  ctx.fillStyle = '#2ecc40'; ctx.fillRect(fx, 6, 4, 54);

  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Roboto'; ctx.textAlign = 'left';
  ctx.fillText(trunc(teamName ?? 'Meu Time', 22), fx+16, 42);
  ctx.restore();

  ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px Roboto'; ctx.textAlign = 'right';
  ctx.fillText(`${elo ?? 0} ELO`, fx+fw-14, 34);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '12px RobotoReg'; ctx.textAlign = 'right';
  ctx.fillText(formation ?? '4-4-2', fx+fw-14, 52);

  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  for (let i = 0; i < slots.length; i++) {
    const s      = slots[i];
    const entry  = lineup.find(l => l.slot === i+1);
    const player   = entry?.player ?? null;
    const _ssId    = player?.sofascoreId;
    const _eaId    = player?.eaId;
    const _ck      = `ss:${_ssId ?? 'x'}:ea:${_eaId ?? 'x'}`;
    const photo    = (_ssId || _eaId) ? (photoMap.get(_ck) ?? null) : null;
    drawFieldCard(ctx, Math.round(fx + s.x * fw), Math.round(fy + s.y * fh), player, s.pos, photo);
  }

  const validOvrs = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr    = validOvrs.length ? (validOvrs.reduce((a,b)=>a+b,0)/validOvrs.length).toFixed(2) : '--';
  const footY     = fy + fh + 5;
  const ftG       = ctx.createLinearGradient(fx, footY, fx, footY+28);
  ftG.addColorStop(0, 'rgba(0,0,0,0.94)'); ftG.addColorStop(1, 'rgba(0,0,0,0.70)');
  ctx.fillStyle = ftG; roundRect(ctx, fx, footY, fw, 28, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Roboto'; ctx.textAlign = 'left';
  ctx.fillText(`OVR Efetivo: ${avgOvr}`, fx+14, footY+19);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '11px RobotoReg'; ctx.textAlign = 'right';
  ctx.fillText(`Formação: ${formation ?? '4-4-2'}`, fx+fw-14, footY+19);

  return canvas.toBuffer('image/png');
}
