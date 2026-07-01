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

// ─── Pack card dimensions ─────────────────────────────────────────────────────
const PC_W  = 200;
const PC_H  = 295;
const PC_PH = 172;
const PC_NH = 38;
const PC_SH = PC_H - PC_PH - PC_NH;

// ─── Collection card dimensions ──────────────────────────────────────────────
const CC_W  = 162;
const CC_H  = 228;
const CC_PH = 128;
const CC_NH = 34;
const CC_SH = CC_H - CC_PH - CC_NH;

// ─── Rarity themes (FIFA UT inspired) ────────────────────────────────────────
const THEME = {
  black: {
    grad:      ['#b44eff', '#6600cc', '#220044'],
    ovrColor:  '#ffffff',
    posColor:  '#ddaaff',
    accent:    '#cc55ff',
    border:    '#aa33ee',
    shimmer:   'rgba(180,78,255,0.25)',
    nameBar:   'rgba(8,0,20,0.97)',
    statsBar:  '#06000f',
    statLabel: '#cc88ff',
    statValue: '#ffffff',
    glow:      22,
    bg1:'#1e0048', bg2:'#0a0020',
    num:'#fff', label:'#cc88ff', stat_bg:'rgba(8,0,20,0.93)',
    topBg: '#3a0088',
  },
  gold: {
    grad:      ['#ffe55a', '#d4a500', '#7a5000'],
    ovrColor:  '#1a0a00',
    posColor:  '#5a3000',
    accent:    '#ffd700',
    border:    '#e0b800',
    shimmer:   'rgba(255,230,0,0.28)',
    nameBar:   'rgba(16,8,0,0.97)',
    statsBar:  '#0c0600',
    statLabel: '#ffcc44',
    statValue: '#ffffff',
    glow:      14,
    bg1:'#c08000', bg2:'#5a3600',
    num:'#fff', label:'#ffc040', stat_bg:'rgba(18,8,0,0.93)',
    topBg: '#8a5c00',
  },
  silver: {
    grad:      ['#c0d8f0', '#7090b8', '#2a3a50'],
    ovrColor:  '#ffffff',
    posColor:  '#d8eeff',
    accent:    '#c0d8f0',
    border:    '#7898c8',
    shimmer:   'rgba(180,210,248,0.22)',
    nameBar:   'rgba(12,18,28,0.97)',
    statsBar:  '#080e18',
    statLabel: '#88b8e0',
    statValue: '#ffffff',
    glow:      10,
    bg1:'#607898', bg2:'#1e3048',
    num:'#fff', label:'#a0c8e0', stat_bg:'rgba(12,18,28,0.93)',
    topBg: '#3a5070',
  },
  bronze: {
    grad:      ['#ff7840', '#c84820', '#601800'],
    ovrColor:  '#1a0800',
    posColor:  '#5a2000',
    accent:    '#ff8844',
    border:    '#d06830',
    shimmer:   'rgba(240,110,50,0.26)',
    nameBar:   'rgba(14,4,0,0.97)',
    statsBar:  '#0c0300',
    statLabel: '#ff9966',
    statValue: '#ffffff',
    glow:      10,
    bg1:'#c05030', bg2:'#501808',
    num:'#fff', label:'#ff9966', stat_bg:'rgba(14,4,0,0.93)',
    topBg: '#803020',
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

// ─── Photo cache (session-level, avoids re-fetching) ──────────────────────────
const _photoCache = new Map();

// ─── Fetch player photo ───────────────────────────────────────────────────────
async function fetchPlayerPhoto(sofascoreId) {
  if (!sofascoreId) return null;
  if (_photoCache.has(sofascoreId)) return _photoCache.get(sofascoreId);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res   = await fetch(
        `https://api.sofascore.com/api/v1/player/${sofascoreId}/image`,
        {
          signal: ctrl.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer':    'https://www.sofascore.com/',
            'Accept':     'image/webp,image/png,image/*',
          },
        }
      );
      clearTimeout(timer);
      if (!res.ok) { _photoCache.set(sofascoreId, null); return null; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) { _photoCache.set(sofascoreId, null); return null; }
      const img = await loadImage(buf);
      _photoCache.set(sofascoreId, img);
      return img;
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  _photoCache.set(sofascoreId, null);
  return null;
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

// ─── Staggered photo batch — returns array indexed EXACTLY like players ────────
async function batchFetchPhotos(players) {
  const out = [];
  for (let i = 0; i < players.length; i++) {
    const entry = players[i];
    const p     = entry?.player ?? entry;
    const id    = p?.sofascoreId ?? null;
    out.push(id ? await fetchPlayerPhoto(id) : null);
    // 350ms + random jitter to stay under sofascore rate limit
    if (i < players.length - 1) {
      await new Promise(r => setTimeout(r, 350 + Math.floor(Math.random() * 150)));
    }
  }
  return out;
}

// ─── Draw player silhouette (FIFA UT style) ────────────────────────────────────
function drawPlayerSilhouette(ctx, x, y, w, h, t) {
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, t.grad[0]);
  bg.addColorStop(0.5, t.grad[1]);
  bg.addColorStop(1, t.grad[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  const cx  = x + w / 2;
  const sc  = w / 200;
  const by  = y + h;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur  = 12;

  const silColor = 'rgba(0,0,0,0.32)';

  // Head
  const headR = 22 * sc;
  const headCY = by - h * 0.72;
  ctx.fillStyle = silColor;
  ctx.beginPath(); ctx.arc(cx, headCY, headR, 0, Math.PI * 2); ctx.fill();

  // Neck
  ctx.fillStyle = silColor;
  ctx.fillRect(cx - 8 * sc, headCY + headR * 0.8, 16 * sc, 14 * sc);

  // Shoulders
  const shoulderY = headCY + headR + 14 * sc;
  ctx.fillStyle = silColor;
  ctx.beginPath();
  ctx.moveTo(cx - 55 * sc, by - h * 0.15);
  ctx.lineTo(cx - 38 * sc, shoulderY);
  ctx.bezierCurveTo(cx - 22 * sc, shoulderY - 6 * sc, cx - 8 * sc, shoulderY - 10 * sc, cx, shoulderY - 10 * sc);
  ctx.bezierCurveTo(cx + 8 * sc, shoulderY - 10 * sc, cx + 22 * sc, shoulderY - 6 * sc, cx + 38 * sc, shoulderY);
  ctx.lineTo(cx + 55 * sc, by - h * 0.15);
  ctx.closePath(); ctx.fill();

  // Left arm
  ctx.beginPath();
  ctx.moveTo(cx - 38 * sc, shoulderY);
  ctx.lineTo(cx - 60 * sc, shoulderY + 40 * sc);
  ctx.lineTo(cx - 52 * sc, by - h * 0.15);
  ctx.closePath(); ctx.fill();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(cx + 38 * sc, shoulderY);
  ctx.lineTo(cx + 60 * sc, shoulderY + 40 * sc);
  ctx.lineTo(cx + 52 * sc, by - h * 0.15);
  ctx.closePath(); ctx.fill();

  ctx.restore();
}

// ─── Draw photo or silhouette ─────────────────────────────────────────────────
function drawPhotoZone(ctx, photo, x, y, w, h, t) {
  if (photo) {
    const scale = w / photo.width;
    const drawH = photo.height * scale;
    const drawY = drawH < h ? y + (h - drawH) / 2 : y;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(photo, x, drawY, w, drawH);
    ctx.restore();
  } else {
    drawPlayerSilhouette(ctx, x, y, w, h, t);
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

// ─── Draw one pack/collection card ────────────────────────────────────────────
function drawPackCard(ctx, x, y, w, h, ph, nh, sh, player, photo, flag) {
  const t = THEME[player.rarity] ?? THEME.bronze;
  const R = 12;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.90)'; ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 10;

  // Full card gradient background
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0,    t.grad[0]);
  bgGrad.addColorStop(0.50, t.grad[1]);
  bgGrad.addColorStop(1,    t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, w, h, R); ctx.fill();
  ctx.restore();

  // Shimmer overlay
  const shim = ctx.createLinearGradient(x, y, x+w, y+h);
  shim.addColorStop(0, 'transparent');
  shim.addColorStop(0.35, t.shimmer);
  shim.addColorStop(0.65, t.shimmer);
  shim.addColorStop(1, 'transparent');
  ctx.save(); roundRect(ctx, x, y, w, h, R); ctx.clip();
  ctx.fillStyle = shim; ctx.fillRect(x, y, w, h);

  // Photo zone (clipped to card shape)
  roundRect(ctx, x, y, w, ph + R + 2, R); ctx.clip();
  drawPhotoZone(ctx, photo, x, y, w, ph, t);
  ctx.restore();

  // Gradient fade bottom of photo
  const fade = ctx.createLinearGradient(x, y+ph-70, x, y+ph+4);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = fade; ctx.fillRect(x, y+ph-70, w, 74);

  // ── OVR (top-left, large) ──────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
  ctx.fillStyle = t.ovrColor;
  const ovrSize = Math.round(w * 0.26);
  ctx.font = `bold ${ovrSize}px Roboto`; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x + 9, y + ovrSize + 6);
  ctx.fillStyle = t.posColor;
  ctx.font = `bold ${Math.round(w * 0.075)}px Roboto`;
  ctx.fillText(player.pos, x + 10, y + ovrSize + 20);
  ctx.restore();

  // ── Flag (top-right) ──────────────────────────────────────────────────────
  const fw2 = 42, fh2 = 28, fx2 = x+w-fw2-8, fy2 = y+10;
  if (flag) {
    ctx.save(); roundRect(ctx, fx2, fy2, fw2, fh2, 4); ctx.clip();
    ctx.drawImage(flag, fx2, fy2, fw2, fh2); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
    roundRect(ctx, fx2, fy2, fw2, fh2, 4); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, fx2, fy2, 36, 20, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '9px RobotoReg'; ctx.textAlign = 'center';
    ctx.fillText(player.nat ?? '', fx2+18, fy2+14);
  }

  // ── Name band ─────────────────────────────────────────────────────────────
  const ny = y + ph;
  ctx.fillStyle = t.nameBar; ctx.fillRect(x, ny, w, nh);
  const accLine = ctx.createLinearGradient(x, ny, x+w, ny);
  accLine.addColorStop(0, 'transparent'); accLine.addColorStop(0.3, t.accent);
  accLine.addColorStop(0.7, t.accent); accLine.addColorStop(1, 'transparent');
  ctx.fillStyle = accLine; ctx.fillRect(x, ny, w, 2);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(w * 0.075)}px Roboto`; ctx.textAlign = 'center';
  ctx.fillText(trunc(player.name.toUpperCase(), 14), x+w/2, ny+nh-9);
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
      ctx.fillStyle = `${t.accent}20`;
      ctx.fillRect(x + cw2*i, sy+sh*.14, 1, sh*.72);
    }
    ctx.fillStyle = t.statValue;
    ctx.font = `bold ${Math.round(w * 0.07)}px Roboto`; ctx.textAlign = 'center';
    ctx.fillText(String(stats[i].v ?? 0), cx2, my + 4);
    ctx.fillStyle = t.statLabel;
    ctx.font = `bold ${Math.round(w * 0.046)}px RobotoReg`;
    ctx.fillText(stats[i].l, cx2, my + 15);
  }

  drawGlow(ctx, x, y, w, h, t, R);
}

// ─── Dark atmospheric background ──────────────────────────────────────────────
function drawAtmoBg(ctx, w, h, c1='#0a0a18', c2='#040410') {
  const bg = ctx.createRadialGradient(w*.5, h*.4, 30, w*.5, h*.5, Math.max(w,h));
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.018)'; ctx.lineWidth = 0.4;
  for (let gx = 0; gx <= w; gx += 36) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
  for (let gy = 0; gy <= h; gy += 36) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke(); }
}

// ─── Draw FC card pack thumbnail ──────────────────────────────────────────────
function drawFCPack(ctx, x, y, w, h, label, accentColor, ovr) {
  // Pack outer shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.80)'; ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 6;

  // Pack body gradient
  const packGrad = ctx.createLinearGradient(x, y, x, y + h);
  packGrad.addColorStop(0,    '#1a6e1a');
  packGrad.addColorStop(0.25, '#0e4a0e');
  packGrad.addColorStop(0.65, '#062006');
  packGrad.addColorStop(1,    '#020802');
  ctx.fillStyle = packGrad;
  roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.restore();

  // Subtle shimmer highlight on left edge
  const shimmer = ctx.createLinearGradient(x, y, x + w * 0.4, y);
  shimmer.addColorStop(0, 'rgba(255,255,255,0.12)');
  shimmer.addColorStop(1, 'transparent');
  ctx.save(); roundRect(ctx, x, y, w, h, 10); ctx.clip();
  ctx.fillStyle = shimmer; ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Top dark band
  const topH = h * 0.30;
  ctx.save(); roundRect(ctx, x, y, w, h, 10); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  ctx.fillRect(x, y, w, topH);
  ctx.restore();

  // Horizontal accent line between top band and body
  const accGrad = ctx.createLinearGradient(x, y + topH, x + w, y + topH);
  accGrad.addColorStop(0, 'transparent');
  accGrad.addColorStop(0.15, accentColor);
  accGrad.addColorStop(0.85, accentColor);
  accGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = accGrad;
  ctx.fillRect(x, y + topH - 1, w, 3);

  // ── FC text + soccer ball ────────────────────────────────────────────────
  const fcSize = Math.round(w * 0.30);
  ctx.save();
  ctx.shadowColor = accentColor; ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fcSize}px Roboto`; ctx.textAlign = 'left';
  ctx.fillText('FC', x + w * 0.06, y + topH * 0.72);
  ctx.restore();

  // Soccer ball icon (drawn circles + lines)
  const bcx = x + w * 0.74, bcy = y + topH * 0.48, br = w * 0.115;
  const ballG = ctx.createRadialGradient(bcx - br * 0.3, bcy - br * 0.3, 1, bcx, bcy, br);
  ballG.addColorStop(0, '#ffffff'); ballG.addColorStop(1, '#c0c0c0');
  ctx.fillStyle = ballG;
  ctx.beginPath(); ctx.arc(bcx, bcy, br, 0, Math.PI * 2); ctx.fill();
  // Pentagon center
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.arc(bcx, bcy, br * 0.30, 0, Math.PI * 2); ctx.fill();
  // Hex lines
  ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8;
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(bcx + Math.cos(ang) * br * 0.30, bcy + Math.sin(ang) * br * 0.30);
    ctx.lineTo(bcx + Math.cos(ang) * br * 0.90, bcy + Math.sin(ang) * br * 0.90);
    ctx.stroke();
  }

  // ── Category badge (gold/yellow) ─────────────────────────────────────────
  const badgeY = y + topH + h * 0.04;
  const badgeH = h * 0.185;
  const badgeGrad = ctx.createLinearGradient(x + w * 0.05, badgeY, x + w * 0.05, badgeY + badgeH);
  badgeGrad.addColorStop(0, '#ffe040'); badgeGrad.addColorStop(1, '#c08000');
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, x + w * 0.05, badgeY, w * 0.90, badgeH, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8;
  roundRect(ctx, x + w * 0.05, badgeY, w * 0.90, badgeH, 5); ctx.stroke();

  const labelSize = Math.max(8, Math.round(badgeH * 0.52));
  ctx.fillStyle = '#1a0800';
  ctx.font = `bold ${labelSize}px Roboto`; ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), x + w / 2, badgeY + badgeH * 0.71);

  // ── "4 CARTAS DA POSIÇÃO" ─────────────────────────────────────────────────
  const textY = badgeY + badgeH + h * 0.06;
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.font = `bold ${Math.round(w * 0.082)}px Roboto`; ctx.textAlign = 'left';
  ctx.fillText('4 CARTAS', x + w * 0.07, textY);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `${Math.round(w * 0.068)}px RobotoReg`;
  ctx.fillText('DA POSIÇÃO', x + w * 0.07, textY + h * 0.08);

  // ── OVR badge (if provided) ────────────────────────────────────────────────
  if (ovr) {
    const ovrBadgeX = x + w * 0.07;
    const ovrBadgeY = textY + h * 0.17;
    const ovrBW = w * 0.86, ovrBH = h * 0.155;
    const ovrGrad = ctx.createLinearGradient(ovrBadgeX, ovrBadgeY, ovrBadgeX, ovrBadgeY + ovrBH);
    ovrGrad.addColorStop(0, '#ffd700'); ovrGrad.addColorStop(1, '#9a6a00');
    ctx.fillStyle = ovrGrad;
    roundRect(ctx, ovrBadgeX, ovrBadgeY, ovrBW, ovrBH, ovrBH / 2); ctx.fill();
    const ovrLabelSize = Math.round(ovrBH * 0.50);
    ctx.fillStyle = '#1a0800';
    ctx.font = `bold ${ovrLabelSize}px Roboto`; ctx.textAlign = 'center';
    ctx.fillText('1 OURO GARANTIDO', ovrBadgeX + ovrBW / 2, ovrBadgeY + ovrBH * 0.68);
  }

  // Outer glow border
  ctx.save();
  ctx.shadowColor = accentColor; ctx.shadowBlur = 12;
  ctx.strokeStyle = accentColor; ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 10); ctx.stroke();
  ctx.restore();
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
  hGrad.addColorStop(0, 'rgba(50,15,100,0.85)');
  hGrad.addColorStop(.5, 'rgba(100,35,180,0.85)');
  hGrad.addColorStop(1, 'rgba(50,15,100,0.85)');
  ctx.fillStyle = hGrad; ctx.fillRect(0, 0, CW, 46);
  const hLine = ctx.createLinearGradient(0, 44, CW, 44);
  hLine.addColorStop(0,'transparent'); hLine.addColorStop(.3,'#aa44ff');
  hLine.addColorStop(.7,'#aa44ff'); hLine.addColorStop(1,'transparent');
  ctx.fillStyle = hLine; ctx.fillRect(0, 44, CW, 2);

  ctx.save();
  ctx.shadowColor = '#cc77ff'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Roboto'; ctx.textAlign = 'center';
  ctx.fillText('NOVAS CARTAS', CW/2, 31);
  ctx.restore();

  // Fetch photos — each player directly (no .player wrapper)
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
  const COLS=4, GAP=10, PAD=14;
  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD*2 + COLS*CC_W + (COLS-1)*GAP;
  const CH   = PAD*2 + rows*CC_H + (rows-1)*GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Stadium-style field background
  const field = ctx.createLinearGradient(0, 0, 0, CH);
  field.addColorStop(0, '#1e6c1e'); field.addColorStop(0.5, '#175215'); field.addColorStop(1, '#0e3a0e');
  ctx.fillStyle = field; ctx.fillRect(0, 0, CW, CH);
  for (let i=0; i<Math.ceil(CH/28); i++) {
    ctx.fillStyle = i%2===0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, i*28, CW, 28);
  }

  if (!playerCards.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 20px Roboto'; ctx.textAlign = 'center';
    ctx.fillText('Nenhuma carta ainda!', CW/2, CH/2);
    return canvas.toBuffer('image/png');
  }

  // Fetch photos — each entry is { player: {...}, ... }
  const photos = await batchFetchPhotos(playerCards);
  const flags  = await Promise.all(playerCards.map(c => fetchFlag(c.player?.nat)));

  for (let i=0; i<playerCards.length; i++) {
    const p = playerCards[i].player;
    if (!p) continue;
    const col = i%COLS, row = Math.floor(i/COLS);
    drawPackCard(
      ctx,
      PAD+col*(CC_W+GAP), PAD+row*(CC_H+GAP),
      CC_W, CC_H, CC_PH, CC_NH, CC_SH,
      p, photos[i], flags[i]
    );
  }

  return canvas.toBuffer('image/png');
}

// ─── Loja banner ───────────────────────────────────────────────────────────────
export async function generateLojaImage(balance) {
  const BW = 700, BH = 300;
  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  // Dark stadium night background
  const bg = ctx.createLinearGradient(0, 0, 0, BH);
  bg.addColorStop(0, '#0a1505'); bg.addColorStop(1, '#040a02');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, BW, BH);

  // Radial stadium light from center-top
  const light = ctx.createRadialGradient(BW / 2, 0, 20, BW / 2, BH * 0.5, BW * 0.7);
  light.addColorStop(0, 'rgba(30,180,50,0.18)'); light.addColorStop(1, 'transparent');
  ctx.fillStyle = light; ctx.fillRect(0, 0, BW, BH);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.015)'; ctx.lineWidth = 0.5;
  for (let gx = 0; gx <= BW; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,BH); ctx.stroke(); }
  for (let gy = 0; gy <= BH; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(BW,gy); ctx.stroke(); }

  // Green left accent bar
  const lb = ctx.createLinearGradient(0, 0, 0, BH);
  lb.addColorStop(0, '#00dd44'); lb.addColorStop(1, '#006622');
  ctx.fillStyle = lb; ctx.fillRect(0, 0, 5, BH);

  // Header section
  const headerH = 76;
  const hBg = ctx.createLinearGradient(0, 0, BW, 0);
  hBg.addColorStop(0, 'rgba(0,0,0,0.82)'); hBg.addColorStop(1, 'rgba(0,0,0,0.50)');
  ctx.fillStyle = hBg; ctx.fillRect(0, 0, BW, headerH);

  // FC badge (green circle with FC text)
  const fcBadgeX = 22, fcBadgeY = 10, fcBR = 26;
  const fcGrad = ctx.createRadialGradient(fcBadgeX + fcBR, fcBadgeY + fcBR, 4, fcBadgeX + fcBR, fcBadgeY + fcBR, fcBR);
  fcGrad.addColorStop(0, '#1aee44'); fcGrad.addColorStop(1, '#006622');
  ctx.fillStyle = fcGrad;
  ctx.beginPath(); ctx.arc(fcBadgeX + fcBR, fcBadgeY + fcBR, fcBR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(fcBadgeX + fcBR, fcBadgeY + fcBR, fcBR, 0, Math.PI * 2); ctx.stroke();
  ctx.save();
  ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Roboto'; ctx.textAlign = 'center';
  ctx.fillText('FC', fcBadgeX + fcBR, fcBadgeY + fcBR + 6);
  ctx.restore();

  // Title
  ctx.save();
  ctx.shadowColor = '#00ee44'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 32px Roboto'; ctx.textAlign = 'left';
  ctx.fillText('Loja Futecord', fcBadgeX + fcBR * 2 + 10, 48);
  ctx.restore();

  // Balance row
  const balY = headerH + 14;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 14, balY, BW - 28, 38, 8); ctx.fill();

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 15px Roboto'; ctx.textAlign = 'left';
  ctx.fillText('🪙', 24, balY + 25);
  const bal = typeof balance === 'number' ? balance : 0;
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 18px Roboto';
  ctx.fillText(`${bal.toLocaleString('pt-BR')} FuteCoins`, 46, balY + 25);

  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '13px RobotoReg'; ctx.textAlign = 'right';
  ctx.fillText('Acesse os melhores pacotes e produtos exclusivos!', BW - 20, balY + 25);

  // Accent line
  ctx.fillStyle = 'rgba(0,220,60,0.5)';
  ctx.fillRect(14, headerH + 14 + 38 + 4, BW - 28, 1);

  // Pack thumbnails row
  const packLabels = [
    { label: 'DEFESA',  color: '#2288ff' },
    { label: 'MEIAS',   color: '#aa44ff' },
    { label: 'ATAQUE',  color: '#ff4422' },
    { label: 'GOLEIROS',color: '#ffaa00' },
  ];
  const packRowY  = headerH + 60;
  const packH     = BH - packRowY - 14;
  const totalPackW = BW - 28;
  const packGap   = 10;
  const packW     = (totalPackW - packGap * (packLabels.length - 1)) / packLabels.length;

  for (let i = 0; i < packLabels.length; i++) {
    const px = 14 + i * (packW + packGap);
    drawFCPack(ctx, px, packRowY, packW, packH, packLabels[i].label, packLabels[i].color, true);
  }

  // Bottom accent line
  const botLine = ctx.createLinearGradient(0, BH - 3, BW, BH - 3);
  botLine.addColorStop(0, 'transparent'); botLine.addColorStop(0.3, '#00dd44');
  botLine.addColorStop(0.7, '#00dd44'); botLine.addColorStop(1, 'transparent');
  ctx.fillStyle = botLine; ctx.fillRect(0, BH - 3, BW, 3);

  return canvas.toBuffer('image/png');
}

// ─── Pacotes banner ────────────────────────────────────────────────────────────
export async function generatePacksImage() {
  const BW = 700, BH = 300;
  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  // Dark night background
  const bg = ctx.createLinearGradient(0, 0, 0, BH);
  bg.addColorStop(0, '#08050f'); bg.addColorStop(1, '#030208');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, BW, BH);

  // Purple glow
  const purp = ctx.createRadialGradient(BW * 0.5, BH * 0.5, 20, BW * 0.5, BH * 0.5, BW * 0.6);
  purp.addColorStop(0, 'rgba(120,30,220,0.20)'); purp.addColorStop(1, 'transparent');
  ctx.fillStyle = purp; ctx.fillRect(0, 0, BW, BH);

  ctx.strokeStyle = 'rgba(255,255,255,0.014)'; ctx.lineWidth = 0.4;
  for (let gx = 0; gx <= BW; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,BH); ctx.stroke(); }
  for (let gy = 0; gy <= BH; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(BW,gy); ctx.stroke(); }

  // Purple left bar
  const lb = ctx.createLinearGradient(0, 0, 0, BH);
  lb.addColorStop(0, '#cc55ff'); lb.addColorStop(1, '#550099');
  ctx.fillStyle = lb; ctx.fillRect(0, 0, 5, BH);

  // Header
  const headerH = 72;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, BW, headerH);

  // FC badge (purple)
  const fcBadgeX = 22, fcBadgeY = 10, fcBR = 24;
  const fcGrad = ctx.createRadialGradient(fcBadgeX + fcBR, fcBadgeY + fcBR, 4, fcBadgeX + fcBR, fcBadgeY + fcBR, fcBR);
  fcGrad.addColorStop(0, '#cc55ff'); fcGrad.addColorStop(1, '#550099');
  ctx.fillStyle = fcGrad;
  ctx.beginPath(); ctx.arc(fcBadgeX + fcBR, fcBadgeY + fcBR, fcBR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(fcBadgeX + fcBR, fcBadgeY + fcBR, fcBR, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px Roboto'; ctx.textAlign = 'center';
  ctx.fillText('FC', fcBadgeX + fcBR, fcBadgeY + fcBR + 6);

  ctx.save();
  ctx.shadowColor = '#cc55ff'; ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px Roboto'; ctx.textAlign = 'left';
  ctx.fillText('Pacotes FC', fcBadgeX + fcBR * 2 + 10, 46);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = '13px RobotoReg';
  ctx.fillText('Abra pacotes e descubra novas cartas raras', fcBadgeX + fcBR * 2 + 10, 63);

  // 5 pack thumbnails: padrão, ouro, premium, copa2026, europeu
  const packDefs = [
    { label: 'PADRÃO',  color: '#6699ff' },
    { label: 'OURO',    color: '#ffd700' },
    { label: 'PREMIUM', color: '#cc55ff' },
    { label: 'COPA 26', color: '#ffcc00' },
    { label: 'EUROPA',  color: '#00aaff' },
  ];
  const packRowY  = headerH + 10;
  const packH     = BH - packRowY - 14;
  const totalPackW = BW - 28;
  const packGap   = 8;
  const packW     = (totalPackW - packGap * (packDefs.length - 1)) / packDefs.length;

  for (let i = 0; i < packDefs.length; i++) {
    const px = 14 + i * (packW + packGap);
    drawFCPack(ctx, px, packRowY, packW, packH, packDefs[i].label, packDefs[i].color, true);
  }

  const botLine = ctx.createLinearGradient(0, BH - 3, BW, BH - 3);
  botLine.addColorStop(0,'transparent'); botLine.addColorStop(.3,'#aa55ff');
  botLine.addColorStop(.7,'#aa55ff'); botLine.addColorStop(1,'transparent');
  ctx.fillStyle = botLine; ctx.fillRect(0, BH - 3, BW, 3);

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

  // Stadium light
  const glow = ctx.createRadialGradient(BW/2, BH/2, 20, BW/2, BH/2, BW*.65);
  glow.addColorStop(0, `${rc}22`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, BW, BH);

  // Left bar
  const bar = ctx.createLinearGradient(0, 0, 0, BH);
  bar.addColorStop(0, rc); bar.addColorStop(1, `${rc}88`);
  ctx.fillStyle = bar; ctx.fillRect(0, 0, 5, BH);

  // Result text
  const labelText = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
  ctx.save(); ctx.shadowColor = rc; ctx.shadowBlur = 30;
  ctx.fillStyle = rc; ctx.font = 'bold 56px Roboto'; ctx.textAlign = 'left';
  ctx.fillText(labelText, 22, 72); ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = '16px RobotoReg';
  ctx.fillText(`vs ${oppName ?? 'Adversário'}`, 22, 98);

  // Score
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

  // Shadow + card bg
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.90)'; ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 5;
  const bgGrad = ctx.createLinearGradient(x, y, x, y+CARD_H);
  bgGrad.addColorStop(0, t.grad[0]); bgGrad.addColorStop(.55, t.grad[1]); bgGrad.addColorStop(1, t.grad[2]);
  ctx.fillStyle = bgGrad; roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.fill();
  ctx.restore();

  // Photo zone clipped
  ctx.save(); roundRect(ctx, x, y, CARD_W, PH + R + 2, R); ctx.clip();
  if (photo) {
    const scale = CARD_W / photo.width;
    const dh    = photo.height * scale;
    const dy    = dh < PH ? y + (PH - dh) / 2 : y;
    ctx.drawImage(photo, x, dy, CARD_W, dh);
  } else {
    drawPlayerSilhouette(ctx, x, y, CARD_W, PH, t);
  }
  ctx.restore();

  // Photo fade
  const fade = ctx.createLinearGradient(x, y+PH-24, x, y+PH+4);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.68)');
  ctx.fillStyle = fade; ctx.fillRect(x, y+PH-24, CARD_W, 28);

  // OVR number (large, top-left)
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
  ctx.fillStyle = t.ovrColor; ctx.font = 'bold 22px Roboto'; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x+5, y+22);
  ctx.fillStyle = t.posColor; ctx.font = 'bold 8px Roboto';
  ctx.fillText(player.pos, x+5, y+31);
  ctx.restore();

  // Nationality (top-right, small pill)
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, x+CARD_W-26, y+3, 24, 12, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '6px RobotoReg'; ctx.textAlign = 'center';
  ctx.fillText((player.nat ?? '').slice(0,3), x+CARD_W-14, y+11);

  // Name band
  const ny = y + PH;
  ctx.fillStyle = t.nameBar; ctx.fillRect(x, ny, CARD_W, NH);
  ctx.fillStyle = t.accent;
  ctx.fillRect(x, ny, CARD_W, 1.5);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Roboto'; ctx.textAlign = 'center';
  ctx.fillText(trunc(player.name.toUpperCase(), 11), cx, ny + NH - 5);
  ctx.restore();

  // Stats block — 2 columns of 3
  const sy   = ny + NH;
  ctx.save(); roundRect(ctx, x+2, sy, CARD_W-4, SH, R); ctx.clip();
  ctx.fillStyle = t.stat_bg; ctx.fillRect(x+2, sy, CARD_W-4, SH); ctx.restore();

  const ls = [{l:'RIT',v:player.pac},{l:'FIN',v:player.fin},{l:'PAS',v:player.pas}];
  const rs = [{l:'DRI',v:player.dri},{l:'DEF',v:player.def},{l:'FIS',v:player.fis}];
  const rowH = SH / 3;
  for (let i = 0; i < 3; i++) {
    const ry = sy + i * rowH + rowH / 2;
    ctx.fillStyle = t.num; ctx.font = 'bold 9px Roboto'; ctx.textAlign = 'left';
    ctx.fillText(String(ls[i].v ?? 0), x+6, ry+3);
    ctx.fillStyle = t.label; ctx.font = '6px RobotoReg';
    ctx.fillText(ls[i].l, x+6, ry+11);
    ctx.fillStyle = t.num; ctx.font = 'bold 9px Roboto'; ctx.textAlign = 'right';
    ctx.fillText(String(rs[i].v ?? 0), x+CARD_W-6, ry+3);
    ctx.fillStyle = t.label; ctx.font = '6px RobotoReg';
    ctx.fillText(rs[i].l, x+CARD_W-6, ry+11);
  }

  drawGlow(ctx, x, y, CARD_W, CARD_H, t, R);

  // Slot label below
  ctx.fillStyle = 'rgba(0,0,0,0.80)';
  roundRect(ctx, cx-16, y+CARD_H+2, 32, 14, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Roboto'; ctx.textAlign = 'center';
  ctx.fillText(slotPos, cx, y+CARD_H+12);
}

// ─── Field image ───────────────────────────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  // Build a stable player-id → photo map, fetching each unique sofascoreId once
  const seen    = new Set();
  const photoMap = new Map();
  for (const l of lineup) {
    const id = l.player?.sofascoreId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const img = await fetchPlayerPhoto(id);
    if (img) photoMap.set(id, img);
    await new Promise(r => setTimeout(r, 100));
  }

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Outer dark bg
  const outerBg = ctx.createLinearGradient(0, 0, 0, H);
  outerBg.addColorStop(0, '#04080a'); outerBg.addColorStop(1, '#050e06');
  ctx.fillStyle = outerBg; ctx.fillRect(0, 0, W, H);

  const fx=20, fy=66, fw=W-40, fh=H-98;

  // Field grass with stadium light effect
  const grass = ctx.createRadialGradient(fx+fw/2, fy+fh/2, 60, fx+fw/2, fy+fh/2, fh*.80);
  grass.addColorStop(0, '#2e9a32'); grass.addColorStop(.40, '#226618'); grass.addColorStop(1, '#102e10');
  ctx.fillStyle = grass; roundRect(ctx, fx, fy, fw, fh, 12); ctx.fill();

  ctx.save(); roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip();
  // Alternating grass stripes
  const strH = fh / 12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i%2===0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(fx, fy+i*strH, fw, strH);
  }
  // Vignette
  const vign = ctx.createRadialGradient(fx+fw/2, fy+fh/2, fh*.18, fx+fw/2, fy+fh/2, fh*.90);
  vign.addColorStop(0, 'transparent'); vign.addColorStop(1, 'rgba(0,0,0,0.44)');
  ctx.fillStyle = vign; ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();

  drawFieldLines(ctx, fx, fy, fw, fh);

  // Header
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

  // Draw each slot
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  for (let i = 0; i < slots.length; i++) {
    const s      = slots[i];
    const entry  = lineup.find(l => l.slot === i+1);
    const player = entry?.player ?? null;
    const photo  = player?.sofascoreId ? (photoMap.get(player.sofascoreId) ?? null) : null;
    drawFieldCard(ctx, Math.round(fx + s.x * fw), Math.round(fy + s.y * fh), player, s.pos, photo);
  }

  // Footer
  const validOvrs = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr    = validOvrs.length ? (validOvrs.reduce((a,b)=>a+b,0) / validOvrs.length).toFixed(2) : '--';
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
