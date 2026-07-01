import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─── Register fonts (avoids emoji rectangle bug) ──────────────────────────────
const __dir   = dirname(fileURLToPath(import.meta.url));
const fontDir = join(__dir, '..', '..', 'fonts');
try {
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Bold.ttf'),    'Roboto');
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Regular.ttf'), 'RobotoReg');
} catch {}

// ─── Field canvas dimensions ──────────────────────────────────────────────────
const W      = 720;
const H      = 920;
const CARD_W = 90;
const CARD_H = 118;

// ─── Pack card dimensions ─────────────────────────────────────────────────────
const PC_W  = 196;   // card width
const PC_H  = 290;   // card height
const PC_PH = 170;   // photo zone
const PC_NH = 38;    // name band
const PC_SH = PC_H - PC_PH - PC_NH;  // stats band (82)

// ─── Collection card dimensions ──────────────────────────────────────────────
const CC_W  = 160;
const CC_H  = 224;
const CC_PH = 126;
const CC_NH = 34;
const CC_SH = CC_H - CC_PH - CC_NH;

// ─── Rarity themes ───────────────────────────────────────────────────────────
// Colors tuned to closely match Futecord / FIFA Ultimate Team aesthetic
const THEME = {
  black: {
    grad:      ['#9900ff', '#5200aa', '#1e0040'],
    ovrColor:  '#ffffff',
    posColor:  '#ee99ff',
    accent:    '#cc66ff',
    border:    '#aa44ee',
    shimmer:   'rgba(170,60,255,0.20)',
    nameBar:   'rgba(10,0,25,0.96)',
    statsBar:  '#080015',
    statLabel: '#cc88ff',
    statValue: '#ffffff',
    glow:      20,
    // field card
    bg1:'#1a0040', bg2:'#0a001e', num:'#fff', label:'#cc88ff', stat_bg:'rgba(10,0,25,0.90)',
  },
  gold: {
    grad:      ['#ffe040', '#d4a000', '#7a5400'],
    ovrColor:  '#1a0a00',
    posColor:  '#5a3000',
    accent:    '#ffd700',
    border:    '#e0b800',
    shimmer:   'rgba(255,230,0,0.22)',
    nameBar:   'rgba(18,10,0,0.97)',
    statsBar:  '#0e0700',
    statLabel: '#ffcc44',
    statValue: '#ffffff',
    glow:      12,
    bg1:'#c08000', bg2:'#5a3600', num:'#fff', label:'#ffc040', stat_bg:'rgba(20,10,0,0.92)',
  },
  silver: {
    grad:      ['#a8c8e0', '#6888a8', '#283848'],
    ovrColor:  '#ffffff',
    posColor:  '#d8eeff',
    accent:    '#c0d8f0',
    border:    '#7898c0',
    shimmer:   'rgba(180,210,240,0.18)',
    nameBar:   'rgba(14,20,30,0.97)',
    statsBar:  '#0a1018',
    statLabel: '#88b8d8',
    statValue: '#ffffff',
    glow:      8,
    bg1:'#5a7090', bg2:'#1e2e3e', num:'#fff', label:'#a0c0d8', stat_bg:'rgba(14,20,30,0.92)',
  },
  bronze: {
    grad:      ['#f07030', '#c04818', '#601800'],
    ovrColor:  '#1a0800',
    posColor:  '#5a2000',
    accent:    '#ff8040',
    border:    '#d06030',
    shimmer:   'rgba(230,100,40,0.22)',
    nameBar:   'rgba(16,6,0,0.97)',
    statsBar:  '#0e0400',
    statLabel: '#ff9955',
    statValue: '#ffffff',
    glow:      8,
    bg1:'#b85028', bg2:'#501808', num:'#fff', label:'#ff9955', stat_bg:'rgba(18,6,0,0.92)',
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

// ─── Fetch player photo ───────────────────────────────────────────────────────
async function fetchPlayerPhoto(sofascoreId) {
  if (!sofascoreId) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6500);
      const res   = await fetch(
        `https://api.sofascore.com/api/v1/player/${sofascoreId}/image`,
        { signal: ctrl.signal, headers: { 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer':'https://www.sofascore.com/' } }
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 1000 ? await loadImage(buf) : null;
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

// ─── Fetch flag ───────────────────────────────────────────────────────────────
async function fetchFlag(nat) {
  const iso = NAT_ISO[nat];
  if (!iso) return null;
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res   = await fetch(`https://flagcdn.com/w40/${iso}.png`, {
      signal: ctrl.signal, headers: { 'User-Agent':'Mozilla/5.0' }
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
    const p  = players[i]?.player ?? players[i];
    const id = p?.sofascoreId;
    out.push(id ? await fetchPlayerPhoto(id) : null);
    if (i < players.length - 1) await new Promise(r => setTimeout(r, 180));
  }
  return out;
}

// ─── Draw photo or silhouette ─────────────────────────────────────────────────
function drawPhotoZone(ctx, photo, x, y, w, h, t) {
  if (photo) {
    // Scale to fill full width; anchor from top so face is visible
    const scale  = w / photo.width;
    const drawH  = photo.height * scale;
    const drawY  = drawH < h ? y + (h - drawH) / 2 : y;
    ctx.drawImage(photo, x, drawY, w, drawH);
  } else {
    // Gradient background
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, t.grad[0]); bg.addColorStop(1, t.grad[1]);
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);

    // Person silhouette — head + shoulders/torso
    const cx = x + w / 2;
    const headY = y + h * 0.22;
    const headR = w * 0.155;

    ctx.fillStyle = 'rgba(0,0,0,0.22)';

    // Head
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();

    // Neck
    const neckW = headR * 0.5;
    ctx.fillRect(cx - neckW/2, headY + headR * 0.85, neckW, headR * 0.45);

    // Shoulders + torso
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    const shoulderY = headY + headR * 1.28;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.42, y + h);
    ctx.lineTo(cx - w * 0.28, shoulderY);
    ctx.bezierCurveTo(cx - w * 0.18, shoulderY - headR * 0.3, cx - w * 0.1, shoulderY - headR * 0.4, cx, shoulderY - headR * 0.4);
    ctx.bezierCurveTo(cx + w * 0.1, shoulderY - headR * 0.4, cx + w * 0.18, shoulderY - headR * 0.3, cx + w * 0.28, shoulderY);
    ctx.lineTo(cx + w * 0.42, y + h);
    ctx.closePath(); ctx.fill();
  }
}

// ─── Card glow border ─────────────────────────────────────────────────────────
function drawGlow(ctx, x, y, w, h, t, r = 10) {
  ctx.save();
  ctx.shadowColor  = t.border;
  ctx.shadowBlur   = t.glow;
  ctx.strokeStyle  = t.border;
  ctx.lineWidth    = t.glow >= 15 ? 2.5 : 1.8;
  roundRect(ctx, x, y, w, h, r); ctx.stroke();
  ctx.restore();
}

// ─── Field lines ──────────────────────────────────────────────────────────────
function drawFieldLines(ctx, fx, fy, fw, fh) {
  ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.lineWidth = 1.8;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.beginPath(); ctx.moveTo(fx, fy+fh/2); ctx.lineTo(fx+fw, fy+fh/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 52, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 3.5, 0, Math.PI*2); ctx.fill();
  const pW=fw*.52, pH=fh*.17, gW=fw*.26, gH=fh*.065;
  ctx.strokeRect(fx+(fw-pW)/2, fy, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy, gW, gH);
  ctx.strokeRect(fx+(fw-pW)/2, fy+fh-pH, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy+fh-gH, gW, gH);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  [fh*.135, fh*.865].forEach(yo => {
    ctx.beginPath(); ctx.arc(fx+fw/2, fy+yo, 2.5, 0, Math.PI*2); ctx.fill();
  });
}

// ─── Draw one pack/collection card ───────────────────────────────────────────
function drawPackCard(ctx, x, y, w, h, ph, nh, sh, player, photo, flag) {
  const t = THEME[player.rarity] ?? THEME.bronze;
  const R = 12;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 8;

  // Full card gradient background
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0,    t.grad[0]);
  bgGrad.addColorStop(0.50, t.grad[1]);
  bgGrad.addColorStop(1,    t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, w, h, R); ctx.fill();
  ctx.restore();

  // Diagonal shimmer overlay
  const shim = ctx.createLinearGradient(x, y, x+w, y+h);
  shim.addColorStop(0, 'transparent');
  shim.addColorStop(0.3, t.shimmer);
  shim.addColorStop(0.7, t.shimmer);
  shim.addColorStop(1, 'transparent');
  ctx.save(); roundRect(ctx, x, y, w, h, R); ctx.clip();
  ctx.fillStyle = shim; ctx.fillRect(x, y, w, h);

  // Clip and draw photo zone
  roundRect(ctx, x, y, w, ph + R + 2, R); ctx.clip();
  drawPhotoZone(ctx, photo, x, y, w, ph, t);
  ctx.restore();

  // Gradient fade over bottom of photo zone (smooth transition to dark)
  const fade = ctx.createLinearGradient(x, y+ph-60, x, y+ph+4);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = fade; ctx.fillRect(x, y+ph-60, w, 64);

  // ── OVR (top-left) ────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
  ctx.fillStyle = t.ovrColor;
  ctx.font = `bold 50px Roboto`; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x + 9, y + 52);
  ctx.fillStyle = t.posColor;
  ctx.font = `bold 13px Roboto`;
  ctx.fillText(player.pos, x + 10, y + 68);
  ctx.restore();

  // ── Flag (top-right) ──────────────────────────────────────────────────────
  const fw2 = 40, fh2 = 26, fx2 = x+w-fw2-8, fy2 = y+9;
  if (flag) {
    ctx.save(); roundRect(ctx, fx2, fy2, fw2, fh2, 4); ctx.clip();
    ctx.drawImage(flag, fx2, fy2, fw2, fh2); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
    roundRect(ctx, fx2, fy2, fw2, fh2, 4); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, fx2, fy2, 36, 18, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '9px RobotoReg'; ctx.textAlign = 'center';
    ctx.fillText(player.nat, fx2+18, fy2+12);
  }

  // ── Name band ─────────────────────────────────────────────────────────────
  const ny = y + ph;
  ctx.fillStyle = t.nameBar; ctx.fillRect(x, ny, w, nh);
  // Accent line at top of name band
  const accLine = ctx.createLinearGradient(x, ny, x+w, ny);
  accLine.addColorStop(0, 'transparent'); accLine.addColorStop(0.3, t.accent);
  accLine.addColorStop(0.7, t.accent); accLine.addColorStop(1, 'transparent');
  ctx.fillStyle = accLine; ctx.fillRect(x, ny, w, 2);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5;
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 14px Roboto`; ctx.textAlign = 'center';
  ctx.fillText(trunc(player.name.toUpperCase(), 14), x+w/2, ny+nh-10);
  ctx.restore();

  // ── Stats band ────────────────────────────────────────────────────────────
  const sy = ny + nh;
  ctx.save(); roundRect(ctx, x, sy, w, sh, R); ctx.clip();
  ctx.fillStyle = t.statsBar; ctx.fillRect(x, sy, w, sh); ctx.restore();

  const stats = [
    { l:'RIT', v:player.pac }, { l:'FIN', v:player.fin }, { l:'PAS', v:player.pas },
    { l:'DRI', v:player.dri }, { l:'DEF', v:player.def }, { l:'FIS', v:player.fis },
  ];
  const cw2 = w / 6;
  const my  = sy + sh/2;
  for (let i = 0; i < 6; i++) {
    const cx2 = x + cw2*i + cw2/2;
    if (i > 0) {
      ctx.fillStyle = `${t.accent}18`;
      ctx.fillRect(x + cw2*i, sy+sh*.12, 1, sh*.76);
    }
    ctx.fillStyle = t.statValue; ctx.font = `bold 13px Roboto`; ctx.textAlign = 'center';
    ctx.fillText(String(stats[i].v), cx2, my + 3);
    ctx.fillStyle = t.statLabel; ctx.font = `bold 9px RobotoReg`;
    ctx.fillText(stats[i].l, cx2, my + 14);
  }

  // ── Card glow border ──────────────────────────────────────────────────────
  drawGlow(ctx, x, y, w, h, t, R);
}

// ─── Dark atmospheric background ─────────────────────────────────────────────
function drawAtmoBg(ctx, w, h, c1='#0a0a18', c2='#040410') {
  const bg = ctx.createRadialGradient(w*.5, h*.4, 30, w*.5, h*.5, Math.max(w,h));
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.022)'; ctx.lineWidth = 0.5;
  for (let gx = 0; gx <= w; gx += 38) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
  for (let gy = 0; gy <= h; gy += 38) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke(); }
}

// ─── Pack reveal ─────────────────────────────────────────────────────────────
export async function generatePackRevealImage(players) {
  const GAP  = 14;
  const PAD  = 18;
  const COLS = Math.min(players.length, 4);
  const ROWS = Math.ceil(players.length / COLS);
  const CW   = PAD*2 + COLS*PC_W + (COLS-1)*GAP;
  const CH   = 50 + PAD + ROWS*PC_H + (ROWS-1)*GAP + PAD;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, CW, CH, '#0c0c1e', '#060610');

  // Header
  const hGrad = ctx.createLinearGradient(0, 0, CW, 0);
  hGrad.addColorStop(0, 'rgba(50,15,100,0.80)');
  hGrad.addColorStop(.5, 'rgba(90,30,170,0.80)');
  hGrad.addColorStop(1, 'rgba(50,15,100,0.80)');
  ctx.fillStyle = hGrad; ctx.fillRect(0, 0, CW, 46);
  // Bottom accent line on header
  const hLine = ctx.createLinearGradient(0, 44, CW, 44);
  hLine.addColorStop(0,'transparent'); hLine.addColorStop(.3,'#aa44ff'); hLine.addColorStop(.7,'#aa44ff'); hLine.addColorStop(1,'transparent');
  ctx.fillStyle = hLine; ctx.fillRect(0, 44, CW, 2);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Roboto'; ctx.textAlign = 'center';
  ctx.fillText('NOVAS CARTAS', CW/2, 30);

  // Staggered photos + parallel flags
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

// ─── Collection grid ──────────────────────────────────────────────────────────
export async function generateCollectionImage(playerCards) {
  const COLS=4, GAP=10, PAD=14;
  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD*2 + COLS*CC_W + (COLS-1)*GAP;
  const CH   = PAD*2 + rows*CC_H + (rows-1)*GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Field green background
  const field = ctx.createLinearGradient(0, 0, 0, CH);
  field.addColorStop(0, '#1e6c1e'); field.addColorStop(1, '#134513');
  ctx.fillStyle = field; ctx.fillRect(0, 0, CW, CH);
  for (let i=0; i<Math.ceil(CH/26); i++) {
    ctx.fillStyle = i%2===0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, i*26, CW, 26);
  }

  if (!playerCards.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 18px Roboto'; ctx.textAlign = 'center';
    ctx.fillText('Nenhuma carta ainda!', CW/2, CH/2);
    return canvas.toBuffer('image/png');
  }

  const photos = await batchFetchPhotos(playerCards);
  const flags  = await Promise.all(playerCards.map(c => fetchFlag(c.player?.nat)));

  for (let i=0; i<playerCards.length; i++) {
    const p = playerCards[i].player;
    if (!p) continue;
    const col = i%COLS, row = Math.floor(i/COLS);
    drawPackCard(ctx, PAD+col*(CC_W+GAP), PAD+row*(CC_H+GAP), CC_W, CC_H, CC_PH, CC_NH, CC_SH, p, photos[i], flags[i]);
  }

  return canvas.toBuffer('image/png');
}

// ─── Loja banner ──────────────────────────────────────────────────────────────
export async function generateLojaImage(balance) {
  const W2=700, H2=200;
  const canvas = createCanvas(W2, H2);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, W2, H2, '#12100a', '#080600');

  // Gold right glow
  const gGlow = ctx.createRadialGradient(W2*.76, H2*.5, 20, W2*.76, H2*.5, 190);
  gGlow.addColorStop(0, 'rgba(220,170,0,0.38)'); gGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = gGlow; ctx.fillRect(0, 0, W2, H2);

  // Left bar
  const lb = ctx.createLinearGradient(0,0,0,H2);
  lb.addColorStop(0,'#ffd700'); lb.addColorStop(1,'#b07000');
  ctx.fillStyle = lb; ctx.fillRect(0, 0, 5, H2);

  // Coin stack (decorative)
  [[W2-60,H2/2-8,46],[W2-108,H2/2+14,34],[W2-88,H2/2-30,26]].forEach(([cx2,cy2,r],i) => {
    const coinG = ctx.createRadialGradient(cx2-r*.25, cy2-r*.25, 2, cx2, cy2, r);
    coinG.addColorStop(0,'#fff5a0'); coinG.addColorStop(.4,'#ffd700'); coinG.addColorStop(1,'#9a6a00');
    ctx.save(); ctx.shadowColor='#ffcc00'; ctx.shadowBlur=14;
    ctx.fillStyle=coinG; ctx.beginPath(); ctx.arc(cx2,cy2,r,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle='rgba(255,240,100,0.6)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx2,cy2,r-2.5,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.font=`bold ${Math.round(r*.65)}px Roboto`; ctx.textAlign='center';
    ctx.fillText('$', cx2, cy2+Math.round(r*.24));
  });

  // Title — no emoji
  ctx.save(); ctx.shadowColor='#ffd700'; ctx.shadowBlur=22;
  ctx.fillStyle='#ffd700'; ctx.font='bold 52px Roboto'; ctx.textAlign='left';
  ctx.fillText('LOJA FUT', 22, 74); ctx.restore();

  ctx.fillStyle='rgba(255,255,255,0.52)'; ctx.font='18px RobotoReg';
  ctx.fillText('Adquira os melhores pacotes de cartas', 22, 104);

  const bal = typeof balance==='number' ? balance : 0;
  ctx.fillStyle='#ffd700'; ctx.font='bold 28px Roboto';
  ctx.fillText(`${bal.toLocaleString('pt-BR')} moedas`, 22, 152);

  const bl = ctx.createLinearGradient(0,H2-3,W2,H2-3);
  bl.addColorStop(0,'#ffd700'); bl.addColorStop(.5,'#ffcc00'); bl.addColorStop(1,'#ffd700');
  ctx.fillStyle=bl; ctx.fillRect(0, H2-3, W2, 3);

  return canvas.toBuffer('image/png');
}

// ─── Pacotes banner ───────────────────────────────────────────────────────────
export async function generatePacksImage() {
  const W2=700, H2=200;
  const canvas = createCanvas(W2, H2);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, W2, H2, '#0e080e', '#08040e');

  const purp = ctx.createRadialGradient(W2*.72, H2*.5, 10, W2*.72, H2*.5, 210);
  purp.addColorStop(0,'rgba(120,30,200,0.45)'); purp.addColorStop(1,'transparent');
  ctx.fillStyle=purp; ctx.fillRect(0,0,W2,H2);

  // Pack stack
  const packs=[['#9900ff','#5500aa'],['#ffe040','#c08000'],['#a0c0d8','#405570']];
  packs.forEach(([c1,c2],i) => {
    const bx=W2-135+i*12, by=15+i*10, bw=88, bh=145;
    const pg=ctx.createLinearGradient(bx,by,bx,by+bh);
    pg.addColorStop(0,c1); pg.addColorStop(1,c2);
    ctx.save(); ctx.shadowColor=c1; ctx.shadowBlur=14;
    ctx.fillStyle=pg; roundRect(ctx,bx,by,bw,bh,8); ctx.fill();
    ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,0.28)'; ctx.lineWidth=1.5;
    roundRect(ctx,bx,by,bw,bh,8); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(bx,by,bw,4);
    // Pack label
    ctx.fillStyle='#fff'; ctx.font=`bold ${i===0?14:11}px Roboto`; ctx.textAlign='center';
    ctx.fillText(i===0?'MITICA':i===1?'OURO':'PRATA', bx+bw/2, by+bh/2+5);
  });

  const lb=ctx.createLinearGradient(0,0,0,H2);
  lb.addColorStop(0,'#aa44ff'); lb.addColorStop(1,'#5500aa');
  ctx.fillStyle=lb; ctx.fillRect(0,0,5,H2);

  ctx.save(); ctx.shadowColor='#aa44ff'; ctx.shadowBlur=20;
  ctx.fillStyle='#cc66ff'; ctx.font='bold 48px Roboto'; ctx.textAlign='left';
  ctx.fillText('PACOTES', 22, 72); ctx.restore();

  ctx.fillStyle='rgba(255,255,255,0.50)'; ctx.font='17px RobotoReg';
  ctx.fillText('Abra pacotes e descubra novas cartas', 22, 102);

  ctx.fillStyle='#cc66ff'; ctx.font='bold 22px Roboto';
  ctx.fillText('Raridades: Mitica  Ouro  Prata  Bronze', 22, 148);

  const bl=ctx.createLinearGradient(0,H2-3,W2,H2-3);
  bl.addColorStop(0,'#aa44ff'); bl.addColorStop(.5,'#cc66ff'); bl.addColorStop(1,'#aa44ff');
  ctx.fillStyle=bl; ctx.fillRect(0,H2-3,W2,3);

  return canvas.toBuffer('image/png');
}

// ─── Partida result banner ────────────────────────────────────────────────────
export async function generatePartidaImage({ result, myScore, oppScore, myOvr, oppOvr, oppName, eloChange, newElo }) {
  const W2=700, H2=220;
  const canvas = createCanvas(W2, H2);
  const ctx    = canvas.getContext('2d');

  const isWin = result==='win', isDraw = result==='draw';
  const rc = isWin ? '#00cc44' : isDraw ? '#ffcc00' : '#cc2200';
  drawAtmoBg(ctx, W2, H2, isWin?'#041a08':isDraw?'#141008':'#1a0404', isWin?'#020c04':isDraw?'#0a0804':'#0c0202');

  const glow=ctx.createRadialGradient(W2/2,H2/2,20,W2/2,H2/2,W2*.6);
  glow.addColorStop(0,`${rc}25`); glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W2,H2);

  const bar=ctx.createLinearGradient(0,0,0,H2);
  bar.addColorStop(0,rc); bar.addColorStop(1,`${rc}88`);
  ctx.fillStyle=bar; ctx.fillRect(0,0,5,H2);

  const labelText = isWin ? 'VITORIA' : isDraw ? 'EMPATE' : 'DERROTA';
  ctx.save(); ctx.shadowColor=rc; ctx.shadowBlur=26;
  ctx.fillStyle=rc; ctx.font='bold 52px Roboto'; ctx.textAlign='left';
  ctx.fillText(labelText, 22, 68); ctx.restore();

  ctx.fillStyle='rgba(255,255,255,0.48)'; ctx.font='16px RobotoReg';
  ctx.fillText(`vs ${oppName ?? 'Adversario'}`, 22, 94);

  // Score — centered, large
  ctx.save(); ctx.shadowColor=rc; ctx.shadowBlur=22;
  ctx.fillStyle='#ffffff'; ctx.font='bold 72px Roboto'; ctx.textAlign='center';
  ctx.fillText(`${myScore}  x  ${oppScore}`, W2/2, 138); ctx.restore();

  ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.font='14px RobotoReg'; ctx.textAlign='center';
  ctx.fillText(`OVR: ${myOvr ?? '--'} vs ${oppOvr ?? '--'}`, W2/2, 164);

  const eloSign = (eloChange??0)>=0?'+':'';
  const eloColor = (eloChange??0)>=0?'#44ee88':'#ee4444';
  ctx.fillStyle=eloColor; ctx.font='bold 26px Roboto'; ctx.textAlign='right';
  ctx.fillText(`ELO: ${newElo??'--'} (${eloSign}${eloChange??0})`, W2-22, 68);

  const bl=ctx.createLinearGradient(0,H2-3,W2,H2-3);
  bl.addColorStop(0,`${rc}88`); bl.addColorStop(.5,rc); bl.addColorStop(1,`${rc}88`);
  ctx.fillStyle=bl; ctx.fillRect(0,H2-3,W2,3);

  return canvas.toBuffer('image/png');
}

// ─── Field view compact card ─────────────────────────────────────────────────
function drawFieldCard(ctx, cx, cy, player, slotPos, photo) {
  const x = Math.round(cx - CARD_W/2);
  const y = Math.round(cy - CARD_H/2);

  if (!player) {
    ctx.globalAlpha = 0.40;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=1;
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='bold 9px Roboto'; ctx.textAlign='center';
    ctx.fillText(slotPos, cx, cy+4);
    return;
  }

  const t = THEME[player.rarity]??THEME.bronze;
  const PH = 64, R = 8;

  ctx.save();
  ctx.shadowColor='rgba(0,0,0,0.88)'; ctx.shadowBlur=14; ctx.shadowOffsetX=2; ctx.shadowOffsetY=5;
  const bgGrad=ctx.createLinearGradient(x,y,x,y+CARD_H);
  bgGrad.addColorStop(0,t.grad[0]); bgGrad.addColorStop(.55,t.grad[1]); bgGrad.addColorStop(1,t.grad[2]);
  ctx.fillStyle=bgGrad; roundRect(ctx,x,y,CARD_W,CARD_H,R); ctx.fill(); ctx.restore();

  // Photo zone
  ctx.save(); roundRect(ctx,x,y,CARD_W,PH+R+2,R); ctx.clip();
  drawPhotoZone(ctx, photo, x, y, CARD_W, PH, t); ctx.restore();

  // Fade
  const fade=ctx.createLinearGradient(x,y+PH-22,x,y+PH+4);
  fade.addColorStop(0,'rgba(0,0,0,0)'); fade.addColorStop(1,'rgba(0,0,0,0.65)');
  ctx.fillStyle=fade; ctx.fillRect(x,y+PH-22,CARD_W,26);

  // OVR
  ctx.save(); ctx.shadowColor='rgba(0,0,0,1)'; ctx.shadowBlur=6; ctx.shadowOffsetX=1; ctx.shadowOffsetY=2;
  ctx.fillStyle=t.ovrColor; ctx.font='bold 22px Roboto'; ctx.textAlign='left';
  ctx.fillText(String(player.ovr), x+5, y+21);
  ctx.fillStyle=t.posColor; ctx.font='bold 8px Roboto';
  ctx.fillText(player.pos, x+5, y+31); ctx.restore();

  // Nat text
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x+CARD_W-26,y+3,24,12);
  ctx.fillStyle='#fff'; ctx.font='6px RobotoReg'; ctx.textAlign='center';
  ctx.fillText(player.nat, x+CARD_W-14, y+11);

  // Name
  ctx.fillStyle='#ffffff'; ctx.font='bold 8px Roboto'; ctx.textAlign='center';
  ctx.fillText(trunc(player.name.toUpperCase(), 11), cx, y+PH+12);

  ctx.fillStyle=t.accent; ctx.fillRect(x+3,y+PH+13,CARD_W-6,1.5);

  // Stats block
  const sTop=y+PH+16;
  ctx.save(); roundRect(ctx,x+3,sTop-1,CARD_W-6,CARD_H-sTop+y-2,4); ctx.clip();
  ctx.fillStyle=t.stat_bg; ctx.fillRect(x+3,sTop-1,CARD_W-6,CARD_H-sTop+y);
  ctx.restore();

  const ls=[{l:'RIT',v:player.pac},{l:'FIN',v:player.fin},{l:'PAS',v:player.pas}];
  const rs=[{l:'DRI',v:player.dri},{l:'DEF',v:player.def},{l:'FIS',v:player.fis}];
  const rowH=(CARD_H-sTop+y-2)/3;
  for(let i=0;i<3;i++){
    const ry=sTop+i*rowH+rowH/2;
    ctx.fillStyle=t.num; ctx.font='bold 9px Roboto'; ctx.textAlign='left';
    ctx.fillText(ls[i].v, x+7, ry+3);
    ctx.fillStyle=t.label; ctx.font='6px RobotoReg'; ctx.fillText(ls[i].l, x+7, ry+11);
    ctx.fillStyle=t.num; ctx.font='bold 9px Roboto'; ctx.textAlign='right';
    ctx.fillText(rs[i].v, x+CARD_W-7, ry+3);
    ctx.fillStyle=t.label; ctx.font='6px RobotoReg'; ctx.fillText(rs[i].l, x+CARD_W-7, ry+11);
  }

  drawGlow(ctx, x, y, CARD_W, CARD_H, t, R);

  // Slot label below card
  ctx.fillStyle='rgba(0,0,0,0.78)'; roundRect(ctx,cx-15,y+CARD_H+2,30,14,3); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 7px Roboto'; ctx.textAlign='center';
  ctx.fillText(slotPos, cx, y+CARD_H+12);
}

// ─── Field image ──────────────────────────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  // Fetch photos staggered
  const photoMap = new Map();
  for (const l of lineup.filter(l => l.player?.sofascoreId)) {
    const img = await fetchPlayerPhoto(l.player.sofascoreId);
    if (img) photoMap.set(l.player.sofascoreId, img);
    await new Promise(r => setTimeout(r, 100));
  }

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Outer dark bg
  const outerBg=ctx.createLinearGradient(0,0,0,H);
  outerBg.addColorStop(0,'#04080a'); outerBg.addColorStop(1,'#060e08');
  ctx.fillStyle=outerBg; ctx.fillRect(0,0,W,H);

  const fx=20, fy=66, fw=W-40, fh=H-98;

  // Field grass with radial stadium light
  const grass=ctx.createRadialGradient(fx+fw/2,fy+fh/2,60,fx+fw/2,fy+fh/2,fh*.78);
  grass.addColorStop(0,'#2e9630'); grass.addColorStop(.45,'#236418'); grass.addColorStop(1,'#122e10');
  ctx.fillStyle=grass; roundRect(ctx,fx,fy,fw,fh,12); ctx.fill();

  ctx.save(); roundRect(ctx,fx,fy,fw,fh,12); ctx.clip();
  const strH=fh/12;
  for(let i=0;i<12;i++){
    ctx.fillStyle=i%2===0?'rgba(0,0,0,0.09)':'rgba(255,255,255,0.04)';
    ctx.fillRect(fx,fy+i*strH,fw,strH);
  }
  const vign=ctx.createRadialGradient(fx+fw/2,fy+fh/2,fh*.22,fx+fw/2,fy+fh/2,fh*.88);
  vign.addColorStop(0,'transparent'); vign.addColorStop(1,'rgba(0,0,0,0.42)');
  ctx.fillStyle=vign; ctx.fillRect(fx,fy,fw,fh); ctx.restore();

  drawFieldLines(ctx, fx, fy, fw, fh);

  // Header
  const hdrG=ctx.createLinearGradient(fx,6,fx,58);
  hdrG.addColorStop(0,'rgba(0,0,0,0.94)'); hdrG.addColorStop(1,'rgba(0,0,0,0.72)');
  ctx.fillStyle=hdrG; roundRect(ctx,fx,6,fw,54,10); ctx.fill();
  ctx.fillStyle='#2ecc40'; ctx.fillRect(fx,6,4,54);
  ctx.fillStyle='#fff'; ctx.font='bold 22px Roboto'; ctx.textAlign='left';
  ctx.fillText(trunc(teamName,22), fx+16, 40);
  ctx.fillStyle='#FFD700'; ctx.font='bold 15px Roboto'; ctx.textAlign='right';
  ctx.fillText(`${elo} ELO`, fx+fw-14, 33);
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='11px RobotoReg';
  ctx.fillText(formation, fx+fw-14, 50);

  const slots = FORMATIONS[formation]??FORMATIONS['4-3-3'];
  for(let i=0;i<slots.length;i++){
    const s=slots[i];
    const entry=lineup.find(l=>l.slot===i+1);
    const player=entry?.player??null;
    const photo=player?.sofascoreId?(photoMap.get(player.sofascoreId)??null):null;
    drawFieldCard(ctx, Math.round(fx+s.x*fw), Math.round(fy+s.y*fh), player, s.pos, photo);
  }

  // Footer
  const ovrs=lineup.map(l=>l.player?.ovr??0).filter(v=>v>0);
  const avgOvr=ovrs.length?(ovrs.reduce((a,b)=>a+b,0)/ovrs.length).toFixed(2):'--';
  const footY=fy+fh+5;
  const ftG=ctx.createLinearGradient(fx,footY,fx,footY+28);
  ftG.addColorStop(0,'rgba(0,0,0,0.92)'); ftG.addColorStop(1,'rgba(0,0,0,0.70)');
  ctx.fillStyle=ftG; roundRect(ctx,fx,footY,fw,28,7); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 13px Roboto'; ctx.textAlign='left';
  ctx.fillText(`OVR Efetivo: ${avgOvr}`, fx+14, footY+19);
  ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='11px RobotoReg'; ctx.textAlign='right';
  ctx.fillText(`Formacao: ${formation}`, fx+fw-14, footY+19);

  return canvas.toBuffer('image/png');
}
