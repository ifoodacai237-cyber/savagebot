import { createCanvas, loadImage } from '@napi-rs/canvas';

// ─── Field canvas dimensions ──────────────────────────────────────────────────
const W      = 720;
const H      = 920;
const CARD_W = 88;
const CARD_H = 114;

// ─── Pack/standalone card dimensions ─────────────────────────────────────────
const PC_W = 200;
const PC_H = 295;
const PC_PH = 168;   // photo zone height
const PC_NH = 42;    // name band
const PC_SH = PC_H - PC_PH - PC_NH;  // stats band

// ─── Collection card dimensions ──────────────────────────────────────────────
const CC_W = 162;
const CC_H = 228;
const CC_PH = 127;
const CC_NH = 34;
const CC_SH = CC_H - CC_PH - CC_NH;

// ─── Rarity themes — vibrant, FIFA-authentic colors ──────────────────────────
const THEME = {
  black: {
    // field card
    bg1: '#1a0040', bg2: '#0a001e',
    accent: '#cc66ff', border: '#8822ee',
    ovr: '#ffffff', pos: '#dd99ff',
    num: '#ffffff', label: '#cc88ff',
    stat_bg: 'rgba(10,0,25,0.90)',
    shimmer: 'rgba(160,60,255,0.22)',
    // standalone
    grad: ['#8800ff', '#4a0099', '#1e0044'],
    ovrColor: '#ffffff',
    posColor: '#ee88ff',
    nameBar: 'rgba(12,0,30,0.96)',
    statsBar: '#080015',
    statLabel: '#bb77ff',
    statValue: '#ffffff',
  },
  gold: {
    bg1: '#c08000', bg2: '#5a3600',
    accent: '#ffd700', border: '#e0a800',
    ovr: '#1a0a00', pos: '#5a3000',
    num: '#ffffff', label: '#ffc040',
    stat_bg: 'rgba(20,10,0,0.92)',
    shimmer: 'rgba(255,215,0,0.25)',
    grad: ['#f5c800', '#c89000', '#7a5200'],
    ovrColor: '#1a0a00',
    posColor: '#5a3000',
    nameBar: 'rgba(20,10,0,0.96)',
    statsBar: '#0e0700',
    statLabel: '#ffcc44',
    statValue: '#ffffff',
  },
  silver: {
    bg1: '#5a7090', bg2: '#1e2e3e',
    accent: '#c0d8ee', border: '#7098b8',
    ovr: '#ffffff', pos: '#c8d8e8',
    num: '#ffffff', label: '#a0c0d8',
    stat_bg: 'rgba(14,20,30,0.92)',
    shimmer: 'rgba(160,200,230,0.18)',
    grad: ['#90b0cc', '#5a7898', '#283848'],
    ovrColor: '#ffffff',
    posColor: '#ddeeff',
    nameBar: 'rgba(16,22,32,0.96)',
    statsBar: '#0a1018',
    statLabel: '#88b8d8',
    statValue: '#ffffff',
  },
  bronze: {
    bg1: '#b85028', bg2: '#501808',
    accent: '#ff8844', border: '#c05528',
    ovr: '#1a0800', pos: '#5a2200',
    num: '#ffffff', label: '#ff9955',
    stat_bg: 'rgba(18,6,0,0.92)',
    shimmer: 'rgba(220,110,50,0.22)',
    grad: ['#e87038', '#b04a18', '#602808'],
    ovrColor: '#1a0800',
    posColor: '#5a2200',
    nameBar: 'rgba(18,6,0,0.96)',
    statsBar: '#0e0400',
    statLabel: '#ff9955',
    statValue: '#ffffff',
  },
};

// ─── Formation slots ──────────────────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': [
    { pos:'GOL', x:0.50, y:0.91 },
    { pos:'LE',  x:0.10, y:0.74 },{ pos:'ZAG', x:0.35, y:0.74 },
    { pos:'ZAG', x:0.65, y:0.74 },{ pos:'LD',  x:0.90, y:0.74 },
    { pos:'MC',  x:0.20, y:0.51 },{ pos:'MC',  x:0.50, y:0.51 },{ pos:'MC', x:0.80, y:0.51 },
    { pos:'PE',  x:0.12, y:0.23 },{ pos:'CA',  x:0.50, y:0.14 },{ pos:'PD', x:0.88, y:0.23 },
  ],
  '4-4-2': [
    { pos:'GOL', x:0.50, y:0.91 },
    { pos:'LE',  x:0.10, y:0.74 },{ pos:'ZAG', x:0.35, y:0.74 },
    { pos:'ZAG', x:0.65, y:0.74 },{ pos:'LD',  x:0.90, y:0.74 },
    { pos:'PE',  x:0.10, y:0.51 },{ pos:'MC',  x:0.36, y:0.51 },
    { pos:'MC',  x:0.64, y:0.51 },{ pos:'PD',  x:0.90, y:0.51 },
    { pos:'CA',  x:0.35, y:0.18 },{ pos:'CA',  x:0.65, y:0.18 },
  ],
  '4-2-4': [
    { pos:'GOL', x:0.50, y:0.91 },
    { pos:'LE',  x:0.10, y:0.74 },{ pos:'ZAG', x:0.35, y:0.74 },
    { pos:'ZAG', x:0.65, y:0.74 },{ pos:'LD',  x:0.90, y:0.74 },
    { pos:'MC',  x:0.34, y:0.53 },{ pos:'MC',  x:0.66, y:0.53 },
    { pos:'PE',  x:0.10, y:0.21 },{ pos:'CA',  x:0.36, y:0.14 },
    { pos:'CA',  x:0.64, y:0.14 },{ pos:'PD',  x:0.90, y:0.21 },
  ],
  '3-3-4': [
    { pos:'GOL', x:0.50, y:0.91 },
    { pos:'ZAG', x:0.22, y:0.74 },{ pos:'ZAG', x:0.50, y:0.74 },{ pos:'ZAG', x:0.78, y:0.74 },
    { pos:'MC',  x:0.22, y:0.52 },{ pos:'MC',  x:0.50, y:0.52 },{ pos:'MC',  x:0.78, y:0.52 },
    { pos:'PE',  x:0.10, y:0.21 },{ pos:'CA',  x:0.36, y:0.14 },
    { pos:'CA',  x:0.64, y:0.14 },{ pos:'PD',  x:0.90, y:0.21 },
  ],
  '5-3-2': [
    { pos:'GOL', x:0.50, y:0.91 },
    { pos:'LE',  x:0.07, y:0.73 },{ pos:'ZAG', x:0.27, y:0.76 },
    { pos:'ZAG', x:0.50, y:0.76 },{ pos:'ZAG', x:0.73, y:0.76 },{ pos:'LD', x:0.93, y:0.73 },
    { pos:'MC',  x:0.23, y:0.52 },{ pos:'MC',  x:0.50, y:0.52 },{ pos:'MC', x:0.77, y:0.52 },
    { pos:'CA',  x:0.35, y:0.18 },{ pos:'CA',  x:0.65, y:0.18 },
  ],
  '4-5-1': [
    { pos:'GOL', x:0.50, y:0.91 },
    { pos:'LE',  x:0.10, y:0.74 },{ pos:'ZAG', x:0.35, y:0.74 },
    { pos:'ZAG', x:0.65, y:0.74 },{ pos:'LD',  x:0.90, y:0.74 },
    { pos:'PE',  x:0.10, y:0.51 },{ pos:'MC',  x:0.30, y:0.51 },
    { pos:'MC',  x:0.50, y:0.51 },{ pos:'MC',  x:0.70, y:0.51 },{ pos:'PD', x:0.90, y:0.51 },
    { pos:'CA',  x:0.50, y:0.15 },
  ],
  '3-4-3': [
    { pos:'GOL', x:0.50, y:0.91 },
    { pos:'ZAG', x:0.22, y:0.74 },{ pos:'ZAG', x:0.50, y:0.74 },{ pos:'ZAG', x:0.78, y:0.74 },
    { pos:'LE',  x:0.10, y:0.51 },{ pos:'MC',  x:0.36, y:0.51 },
    { pos:'MC',  x:0.64, y:0.51 },{ pos:'LD',  x:0.90, y:0.51 },
    { pos:'PE',  x:0.12, y:0.20 },{ pos:'CA',  x:0.50, y:0.13 },{ pos:'PD', x:0.88, y:0.20 },
  ],
};

// ─── Country → ISO flag code ──────────────────────────────────────────────────
const NAT_ISO = {
  BRA:'br', ARG:'ar', FRA:'fr', ESP:'es', POR:'pt', ALE:'de',
  ING:'gb', ITA:'it', HOL:'nl', BEL:'be', MAR:'ma', SEN:'sn',
  NOR:'no', POL:'pl', CRO:'hr', AUT:'at', EGI:'eg', NIG:'ng',
  CMR:'cm', SVN:'si', CAN:'ca', EUA:'us', URU:'uy', CHI:'cl',
  MLT:'mt', IRL:'ie', AUS:'au', GUI:'gn', SER:'rs',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ─── Fetch player photo — with retry ─────────────────────────────────────────
async function fetchPlayerPhoto(sofascoreId) {
  if (!sofascoreId) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res   = await fetch(
        `https://api.sofascore.com/api/v1/player/${sofascoreId}/image`,
        { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' } }
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      return await loadImage(Buffer.from(await res.arrayBuffer()));
    } catch {
      if (attempt === 0) await new Promise(r => setTimeout(r, 400));
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
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res   = await fetch(`https://flagcdn.com/w40/${iso}.png`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch { return null; }
}

// ─── Fetch photos in batches to avoid rate limiting ──────────────────────────
async function batchFetchPhotos(players) {
  const photos = [];
  for (let i = 0; i < players.length; i++) {
    const p = Array.isArray(players) ? players[i] : players[i]?.player;
    const id = p?.sofascoreId;
    photos.push(id ? await fetchPlayerPhoto(id) : null);
    if (i < players.length - 1) await new Promise(r => setTimeout(r, 150));
  }
  return photos;
}

// ─── Draw photo inside a clipped region ──────────────────────────────────────
function drawPhoto(ctx, photo, x, y, w, h, t) {
  if (photo) {
    // Scale to fill width; anchor top to show player's face
    const scale = w / photo.width;
    const drawH = photo.height * scale;
    // Top-align so face (top of image) is visible
    const drawY = drawH < h ? y + (h - drawH) / 2 : y;
    ctx.drawImage(photo, x, drawY, w, drawH);
  } else {
    // Gradient background
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, t.grad[0]);
    bg.addColorStop(1, t.grad[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    // Person silhouette
    const cx = x + w / 2, headY = y + h * 0.24, headR = w * 0.14;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.36, y + h);
    ctx.lineTo(cx - w * 0.18, y + h * 0.43);
    ctx.quadraticCurveTo(cx, y + h * 0.38, cx + w * 0.18, y + h * 0.43);
    ctx.lineTo(cx + w * 0.36, y + h);
    ctx.closePath();
    ctx.fill();
  }
}

// ─── Rarity border glow ───────────────────────────────────────────────────────
function drawCardGlow(ctx, x, y, w, h, t, r) {
  ctx.shadowColor   = t.border;
  ctx.shadowBlur    = r === 'black' ? 18 : r === 'gold' ? 12 : 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle   = t.border;
  ctx.lineWidth     = r === 'black' ? 2.5 : r === 'gold' ? 2 : 1.5;
  roundRect(ctx, x, y, w, h, 10); ctx.stroke();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

// ─── Field markings ───────────────────────────────────────────────────────────
function drawFieldMarkings(ctx, fx, fy, fw, fh) {
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth   = 1.8;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.beginPath(); ctx.moveTo(fx, fy + fh/2); ctx.lineTo(fx + fw, fy + fh/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx + fw/2, fy + fh/2, 52, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(fx + fw/2, fy + fh/2, 3.5, 0, Math.PI*2); ctx.fill();
  const paW = fw*0.52, paH = fh*0.17, gaW = fw*0.26, gaH = fh*0.065;
  ctx.strokeRect(fx + (fw-paW)/2, fy, paW, paH);
  ctx.strokeRect(fx + (fw-gaW)/2, fy, gaW, gaH);
  ctx.strokeRect(fx + (fw-paW)/2, fy+fh-paH, paW, paH);
  ctx.strokeRect(fx + (fw-gaW)/2, fy+fh-gaH, gaW, gaH);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  [fh*0.135, fh*0.865].forEach(yOff => {
    ctx.beginPath(); ctx.arc(fx + fw/2, fy + yOff, 2.5, 0, Math.PI*2); ctx.fill();
  });
}

// ─── Draw stats row (6 columns) ───────────────────────────────────────────────
function drawStatsRow(ctx, x, y, w, h, stats, t) {
  const cw = w / 6;
  const my = y + h / 2;
  for (let i = 0; i < 6; i++) {
    const cx = x + cw * i + cw / 2;
    if (i > 0) {
      ctx.fillStyle = `${t.accent}22`;
      ctx.fillRect(x + cw * i, y + h * 0.1, 1, h * 0.8);
    }
    ctx.fillStyle = t.statValue;
    ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(String(stats[i].v), cx, my + 2);
    ctx.fillStyle = t.statLabel;
    ctx.font = '9px Arial';
    ctx.fillText(stats[i].l, cx, my + 14);
  }
}

// ─── Draw a full pack/collection card ────────────────────────────────────────
function drawPackCard(ctx, x, y, w, h, ph, nh, sh, player, photo, flag) {
  const t = THEME[player.rarity] ?? THEME.bronze;

  // ── Card shadow ────────────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 7;

  // ── Gradient background ────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0,    t.grad[0]);
  bgGrad.addColorStop(0.55, t.grad[1]);
  bgGrad.addColorStop(1,    t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, w, h, 10); ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // ── Diagonal shimmer ──────────────────────────────────────────────────────
  const shim = ctx.createLinearGradient(x, y, x + w, y + h);
  shim.addColorStop(0,    'transparent');
  shim.addColorStop(0.35, t.shimmer ?? 'rgba(255,255,255,0.12)');
  shim.addColorStop(0.65, t.shimmer ?? 'rgba(255,255,255,0.12)');
  shim.addColorStop(1,    'transparent');
  ctx.save(); roundRect(ctx, x, y, w, h, 10); ctx.clip();
  ctx.fillStyle = shim; ctx.fillRect(x, y, w, h); ctx.restore();

  // ── Photo zone ────────────────────────────────────────────────────────────
  ctx.save(); roundRect(ctx, x, y, w, ph + 6, 10); ctx.clip();
  drawPhoto(ctx, photo, x, y, w, ph, t);
  ctx.restore();

  // ── Photo-to-card fade ────────────────────────────────────────────────────
  const fade = ctx.createLinearGradient(x, y + ph - 50, x, y + ph + 4);
  fade.addColorStop(0, 'transparent');
  fade.addColorStop(1, t.grad[2]);
  ctx.fillStyle = fade; ctx.fillRect(x, y + ph - 50, w, 54);

  // ── OVR (top-left, large) ─────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.99)'; ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
  ctx.fillStyle = t.ovrColor ?? '#ffffff';
  ctx.font = `bold 40px Arial`; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x + 8, y + 44);
  ctx.fillStyle = t.posColor ?? t.pos;
  ctx.font = 'bold 13px Arial';
  ctx.fillText(player.pos, x + 10, y + 60);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // ── Flag (top-right) ──────────────────────────────────────────────────────
  const fw = 38, fh = 25, fx = x + w - fw - 8, fy = y + 9;
  if (flag) {
    ctx.save(); roundRect(ctx, fx, fy, fw, fh, 4); ctx.clip();
    ctx.drawImage(flag, fx, fy, fw, fh); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
    roundRect(ctx, fx, fy, fw, fh, 4); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.50)'; roundRect(ctx, fx, fy, 34, 18, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(player.nat, fx + 17, fy + 12);
  }

  // ── Name band ─────────────────────────────────────────────────────────────
  const ny = y + ph;
  ctx.fillStyle = t.nameBar; ctx.fillRect(x, ny, w, nh);
  ctx.fillStyle = t.accent; ctx.fillRect(x, ny, w, 2.5);
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 14px Arial`; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  ctx.fillText(truncate(player.name.toUpperCase(), 13), x + w/2, ny + nh - 12);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // ── Stats band ────────────────────────────────────────────────────────────
  const sy = ny + nh;
  ctx.save(); roundRect(ctx, x, sy, w, sh, 10); ctx.clip();
  ctx.fillStyle = t.statsBar; ctx.fillRect(x, sy, w, sh); ctx.restore();

  const stats = [
    { l:'RIT', v:player.pac }, { l:'FIN', v:player.fin }, { l:'PAS', v:player.pas },
    { l:'DRI', v:player.dri }, { l:'DEF', v:player.def }, { l:'FIS', v:player.fis },
  ];
  drawStatsRow(ctx, x, sy, w, sh, stats, t);

  // ── Border glow ───────────────────────────────────────────────────────────
  drawCardGlow(ctx, x, y, w, h, t, player.rarity);
}

// ─── FIELD VIEW compact card (88×114) ────────────────────────────────────────
function drawPlayerCard(ctx, cx, cy, player, slotPos, photo) {
  const x = Math.round(cx - CARD_W/2);
  const y = Math.round(cy - CARD_H/2);

  if (!player) {
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(slotPos, cx, cy + 4);
    return;
  }

  const t = THEME[player.rarity] ?? THEME.bronze;
  const PH = 62, STATS_TOP_OFFSET = PH + 14;

  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5;

  const bgGrad = ctx.createLinearGradient(x, y, x, y + CARD_H);
  bgGrad.addColorStop(0, t.grad[0]);
  bgGrad.addColorStop(0.55, t.grad[1]);
  bgGrad.addColorStop(1, t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  const shim = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
  shim.addColorStop(0, 'transparent'); shim.addColorStop(0.42, t.shimmer); shim.addColorStop(0.58, t.shimmer); shim.addColorStop(1, 'transparent');
  ctx.save(); roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.clip();
  ctx.fillStyle = shim; ctx.fillRect(x, y, CARD_W, CARD_H); ctx.restore();

  ctx.save(); roundRect(ctx, x, y, CARD_W, PH + 4, 8); ctx.clip();
  drawPhoto(ctx, photo, x, y, CARD_W, PH, t);
  ctx.restore();

  const fade = ctx.createLinearGradient(x, y + PH - 20, x, y + PH + 4);
  fade.addColorStop(0, 'transparent'); fade.addColorStop(1, t.grad[2]);
  ctx.fillStyle = fade; ctx.fillRect(x, y + PH - 20, CARD_W, 24);

  ctx.shadowColor = 'rgba(0,0,0,0.99)'; ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
  ctx.fillStyle = t.ovrColor ?? '#ffffff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x + 5, y + 19);
  ctx.fillStyle = t.posColor ?? t.pos; ctx.font = 'bold 8px Arial';
  ctx.fillText(player.pos, x + 5, y + 29);

  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + CARD_W - 24, y + 3, 22, 11);
  ctx.fillStyle = '#ffffff'; ctx.font = '6px Arial'; ctx.textAlign = 'center';
  ctx.shadowBlur = 0; ctx.fillText(player.nat, x + CARD_W - 13, y + 11);

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText(truncate(player.name.toUpperCase(), 10), cx, y + PH + 11);

  ctx.fillStyle = t.accent; ctx.fillRect(x + 3, y + PH + 13, CARD_W - 6, 1.5);

  const statsTop = y + STATS_TOP_OFFSET;
  ctx.fillStyle = t.stat_bg;
  roundRect(ctx, x + 3, statsTop - 1, CARD_W - 6, CARD_H - STATS_TOP_OFFSET - 2, 4); ctx.fill();

  const leftStats  = [{ l:'RIT', v:player.pac }, { l:'FIN', v:player.fin }, { l:'PAS', v:player.pas }];
  const rightStats = [{ l:'DRI', v:player.dri }, { l:'DEF', v:player.def }, { l:'FIS', v:player.fis }];
  const rowH = (CARD_H - statsTop + y - 4) / 3;
  for (let i = 0; i < 3; i++) {
    const ry = statsTop + i * rowH + rowH/2 - 1;
    ctx.fillStyle = t.num; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
    ctx.fillText(leftStats[i].v, x + 7, ry + 4);
    ctx.fillStyle = t.label; ctx.font = '6px Arial'; ctx.fillText(leftStats[i].l, x + 7, ry + 11);
    ctx.fillStyle = t.num; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'right';
    ctx.fillText(rightStats[i].v, x + CARD_W - 7, ry + 4);
    ctx.fillStyle = t.label; ctx.font = '6px Arial'; ctx.fillText(rightStats[i].l, x + CARD_W - 7, ry + 11);
  }

  drawCardGlow(ctx, x, y, CARD_W, CARD_H, t, player.rarity);

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  roundRect(ctx, cx - 14, y + CARD_H + 2, 28, 13, 3); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
  ctx.fillText(slotPos, cx, y + CARD_H + 11);
}

// ─── Atmospheric dark background ──────────────────────────────────────────────
function drawAtmoBg(ctx, w, h, color1 = '#0a0a18', color2 = '#040410') {
  const bg = ctx.createRadialGradient(w*0.5, h*0.4, 30, w*0.5, h*0.5, Math.max(w,h));
  bg.addColorStop(0, color1);
  bg.addColorStop(1, color2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // subtle grid texture
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 0.5;
  for (let gx = 0; gx <= w; gx += 36) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
  for (let gy = 0; gy <= h; gy += 36) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke(); }
}

// ─── Pack reveal image ────────────────────────────────────────────────────────
export async function generatePackRevealImage(players) {
  const GAP  = 16;
  const PAD  = 20;
  const COLS = Math.min(players.length, 4);
  const ROWS = Math.ceil(players.length / COLS);
  const CW   = PAD*2 + COLS*PC_W + (COLS-1)*GAP;
  const CH   = PAD*2 + ROWS*PC_H + (ROWS-1)*GAP + 52;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, CW, CH, '#0c0c1e', '#050510');

  // Title strip
  const headerGrad = ctx.createLinearGradient(0, 0, CW, 0);
  headerGrad.addColorStop(0, 'rgba(40,10,80,0.7)');
  headerGrad.addColorStop(0.5, 'rgba(80,40,160,0.7)');
  headerGrad.addColorStop(1, 'rgba(40,10,80,0.7)');
  ctx.fillStyle = headerGrad; ctx.fillRect(0, 0, CW, 44);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
  ctx.fillText('📦 NOVAS CARTAS', CW/2, 30);

  // Fetch photos in batch (staggered) + flags in parallel
  const photos = await batchFetchPhotos(players);
  const flags  = await Promise.all(players.map(p => fetchFlag(p.nat)));

  for (let i = 0; i < players.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx  = PAD + col*(PC_W + GAP);
    const cy  = 52 + PAD + row*(PC_H + GAP);
    drawPackCard(ctx, cx, cy, PC_W, PC_H, PC_PH, PC_NH, PC_SH, players[i], photos[i], flags[i]);
  }

  return canvas.toBuffer('image/png');
}

// ─── Collection grid image ────────────────────────────────────────────────────
export async function generateCollectionImage(playerCards) {
  const COLS = 4, GAP = 10, PAD = 14;
  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD*2 + COLS*CC_W + (COLS-1)*GAP;
  const CH   = PAD*2 + rows*CC_H + (rows-1)*GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Green field background
  const field = ctx.createLinearGradient(0, 0, 0, CH);
  field.addColorStop(0, '#1e6c1e'); field.addColorStop(1, '#134513');
  ctx.fillStyle = field; ctx.fillRect(0, 0, CW, CH);
  for (let i = 0; i < Math.ceil(CH/26); i++) {
    ctx.fillStyle = i%2===0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, i*26, CW, 26);
  }

  if (!playerCards.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Nenhuma carta ainda!', CW/2, CH/2);
    return canvas.toBuffer('image/png');
  }

  const photos = await batchFetchPhotos(playerCards);
  const flags  = await Promise.all(playerCards.map(c => fetchFlag(c.player?.nat)));

  for (let i = 0; i < playerCards.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const cx  = PAD + col*(CC_W+GAP), cy = PAD + row*(CC_H+GAP);
    const p   = playerCards[i].player;
    if (!p) continue;
    drawPackCard(ctx, cx, cy, CC_W, CC_H, CC_PH, CC_NH, CC_SH, p, photos[i], flags[i]);
  }

  return canvas.toBuffer('image/png');
}

// ─── Loja banner image ────────────────────────────────────────────────────────
export async function generateLojaImage(balance) {
  const W2 = 680, H2 = 190;
  const canvas = createCanvas(W2, H2);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, W2, H2, '#12100a', '#080600');

  // Gold glow on right
  const goldGlow = ctx.createRadialGradient(W2*0.75, H2*0.5, 20, W2*0.75, H2*0.5, 180);
  goldGlow.addColorStop(0, 'rgba(220,170,0,0.35)');
  goldGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = goldGlow; ctx.fillRect(0, 0, W2, H2);

  // Left accent bar
  const leftBar = ctx.createLinearGradient(0, 0, 0, H2);
  leftBar.addColorStop(0, '#ffd700'); leftBar.addColorStop(1, '#b07000');
  ctx.fillStyle = leftBar; ctx.fillRect(0, 0, 5, H2);

  // Coin circles (decorative)
  const coinColors = ['#ffd700','#e8b800','#c89000','#a07000'];
  [[W2-60, H2/2-10, 48], [W2-110, H2/2+15, 36], [W2-90, H2/2-28, 28]].forEach(([cx2,cy2,r],i) => {
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
    ctx.fillStyle = coinColors[i % coinColors.length];
    ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx2, cy2, r-3, 0, Math.PI*2); ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.font = `bold ${Math.round(r*0.6)}px Arial`; ctx.textAlign = 'center';
    ctx.fillText('$', cx2, cy2 + Math.round(r*0.22));
  });

  // Title
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'left';
  ctx.fillText('🛒 LOJA FUT', 22, 70);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '18px Arial';
  ctx.fillText('Adquira os melhores pacotes de cartas', 22, 100);

  // Balance
  const bal = typeof balance === 'number' ? balance : 0;
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 28px Arial';
  ctx.fillText(`🪙 ${bal.toLocaleString('pt-BR')} moedas`, 22, 148);

  // Bottom line
  const line = ctx.createLinearGradient(0, H2-3, W2, H2-3);
  line.addColorStop(0, '#ffd700'); line.addColorStop(0.5, '#ffcc00'); line.addColorStop(1, '#ffd700');
  ctx.fillStyle = line; ctx.fillRect(0, H2-3, W2, 3);

  return canvas.toBuffer('image/png');
}

// ─── Pacotes banner image ─────────────────────────────────────────────────────
export async function generatePacksImage() {
  const W2 = 680, H2 = 190;
  const canvas = createCanvas(W2, H2);
  const ctx    = canvas.getContext('2d');
  drawAtmoBg(ctx, W2, H2, '#0e080e', '#08040e');

  // Purple glow
  const purpGlow = ctx.createRadialGradient(W2*0.7, H2*0.5, 10, W2*0.7, H2*0.5, 200);
  purpGlow.addColorStop(0, 'rgba(120,40,200,0.4)');
  purpGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = purpGlow; ctx.fillRect(0, 0, W2, H2);

  // Pack stack (decorative rectangles)
  const packColors = [
    {g:['#8800ff','#5000aa']}, {g:['#ffd700','#b07000']}, {g:['#90b0cc','#385060']},
  ];
  [0,1,2].forEach((i) => {
    const bx = W2 - 130 + i*10, by = 20 + i*8, bw = 90, bh = 130;
    ctx.shadowColor = packColors[i].g[0]; ctx.shadowBlur = 15;
    const pg = ctx.createLinearGradient(bx, by, bx, by+bh);
    pg.addColorStop(0, packColors[i].g[0]); pg.addColorStop(1, packColors[i].g[1]);
    ctx.fillStyle = pg; roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, by, bw, 4);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  });

  // Left accent bar
  const leftBar = ctx.createLinearGradient(0, 0, 0, H2);
  leftBar.addColorStop(0, '#aa44ff'); leftBar.addColorStop(1, '#5500aa');
  ctx.fillStyle = leftBar; ctx.fillRect(0, 0, 5, H2);

  ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 18;
  ctx.fillStyle = '#cc66ff'; ctx.font = 'bold 44px Arial'; ctx.textAlign = 'left';
  ctx.fillText('📦 PACOTES', 22, 68);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '17px Arial';
  ctx.fillText('Abra pacotes e descubra novas cartas', 22, 98);

  ctx.fillStyle = '#cc66ff'; ctx.font = 'bold 22px Arial';
  ctx.fillText('✨ Raridades: ⬛ Mítica · 🥇 Ouro · 🥈 Prata · 🥉 Bronze', 22, 140);

  const line = ctx.createLinearGradient(0, H2-3, W2, H2-3);
  line.addColorStop(0, '#aa44ff'); line.addColorStop(0.5, '#cc66ff'); line.addColorStop(1, '#aa44ff');
  ctx.fillStyle = line; ctx.fillRect(0, H2-3, W2, 3);

  return canvas.toBuffer('image/png');
}

// ─── Partida result banner image ──────────────────────────────────────────────
export async function generatePartidaImage({ result, myScore, oppScore, myOvr, oppOvr, oppName, eloChange, newElo }) {
  const W2 = 680, H2 = 220;
  const canvas = createCanvas(W2, H2);
  const ctx    = canvas.getContext('2d');

  const isWin  = result === 'win';
  const isDraw = result === 'draw';

  // Background
  const bg1 = isWin ? '#041a08' : isDraw ? '#141008' : '#1a0404';
  const bg2 = isWin ? '#020c04' : isDraw ? '#0a0804' : '#0c0202';
  drawAtmoBg(ctx, W2, H2, bg1, bg2);

  // Result glow overlay
  const rc = isWin ? '#00cc44' : isDraw ? '#ffcc00' : '#cc2200';
  const glow = ctx.createRadialGradient(W2/2, H2/2, 20, W2/2, H2/2, W2*0.6);
  glow.addColorStop(0, `${rc}22`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W2, H2);

  // Left accent bar (result color)
  const bar = ctx.createLinearGradient(0, 0, 0, H2);
  bar.addColorStop(0, rc); bar.addColorStop(1, `${rc}88`);
  ctx.fillStyle = bar; ctx.fillRect(0, 0, 5, H2);

  // Result label
  const resultText = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
  const resultEmoji = isWin ? '🏆' : isDraw ? '🤝' : '💀';
  ctx.shadowColor = rc; ctx.shadowBlur = 24;
  ctx.fillStyle = rc; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'left';
  ctx.fillText(`${resultEmoji} ${resultText}`, 22, 64);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // Opponent
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '16px Arial';
  ctx.fillText(`vs ${oppName ?? 'Adversário'}`, 22, 90);

  // Score (center, huge)
  const scoreText = `${myScore} × ${oppScore}`;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px Arial'; ctx.textAlign = 'center';
  ctx.shadowColor = rc; ctx.shadowBlur = 20;
  ctx.fillText(scoreText, W2/2, 130);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // OVR comparison
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '14px Arial';
  ctx.fillText(`OVR: ${myOvr ?? '—'} vs ${oppOvr ?? '—'}`, W2/2, 158);

  // ELO change (right side)
  const eloSign = (eloChange ?? 0) >= 0 ? '+' : '';
  ctx.fillStyle = (eloChange ?? 0) >= 0 ? '#44ee88' : '#ee4444';
  ctx.font = 'bold 26px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`ELO: ${newElo ?? '—'} (${eloSign}${eloChange ?? 0})`, W2 - 22, 64);

  // Bottom line
  const line = ctx.createLinearGradient(0, H2-3, W2, H2-3);
  line.addColorStop(0, `${rc}88`); line.addColorStop(0.5, rc); line.addColorStop(1, `${rc}88`);
  ctx.fillStyle = line; ctx.fillRect(0, H2-3, W2, 3);

  return canvas.toBuffer('image/png');
}

// ─── Field image ──────────────────────────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  const photoMap = new Map();
  for (const l of lineup.filter(l => l.player?.sofascoreId)) {
    const img = await fetchPlayerPhoto(l.player.sofascoreId);
    if (img) photoMap.set(l.player.sofascoreId, img);
    await new Promise(r => setTimeout(r, 100));
  }

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Dark stadium atmosphere
  const outerBg = ctx.createLinearGradient(0, 0, 0, H);
  outerBg.addColorStop(0, '#04080a'); outerBg.addColorStop(1, '#070e08');
  ctx.fillStyle = outerBg; ctx.fillRect(0, 0, W, H);

  const fx = 20, fy = 66, fw = W-40, fh = H-98;

  // Field grass (radial light from center — stadium lights)
  const fieldGrad = ctx.createRadialGradient(fx+fw/2, fy+fh/2, 60, fx+fw/2, fy+fh/2, fh*0.78);
  fieldGrad.addColorStop(0, '#2e9630');
  fieldGrad.addColorStop(0.45, '#236418');
  fieldGrad.addColorStop(1, '#122e10');
  ctx.fillStyle = fieldGrad;
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.fill();

  // Horizontal grass strips
  ctx.save(); roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip();
  const strH = fh / 12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i%2===0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(fx, fy + i*strH, fw, strH);
  }
  // Field edge vignette
  const vign = ctx.createRadialGradient(fx+fw/2, fy+fh/2, fh*0.22, fx+fw/2, fy+fh/2, fh*0.88);
  vign.addColorStop(0, 'transparent'); vign.addColorStop(1, 'rgba(0,0,0,0.40)');
  ctx.fillStyle = vign; ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();

  drawFieldMarkings(ctx, fx, fy, fw, fh);

  // Header
  const hdrGrad = ctx.createLinearGradient(fx, 6, fx, 58);
  hdrGrad.addColorStop(0, 'rgba(0,0,0,0.93)'); hdrGrad.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = hdrGrad; roundRect(ctx, fx, 6, fw, 54, 10); ctx.fill();
  ctx.fillStyle = '#2ecc40'; ctx.fillRect(fx, 6, 4, 54);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'left';
  ctx.fillText(`⚽ ${truncate(teamName, 20)}`, fx+16, 40);
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`${elo} ELO`, fx+fw-14, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px Arial';
  ctx.fillText(formation, fx+fw-14, 50);

  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  for (let i = 0; i < slots.length; i++) {
    const slot   = slots[i];
    const entry  = lineup.find(l => l.slot === i+1);
    const player = entry?.player ?? null;
    const photo  = player?.sofascoreId ? (photoMap.get(player.sofascoreId) ?? null) : null;
    const cx2    = Math.round(fx + slot.x * fw);
    const cy2    = Math.round(fy + slot.y * fh);
    drawPlayerCard(ctx, cx2, cy2, player, slot.pos, photo);
  }

  // Footer
  const ovrs   = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr = ovrs.length ? (ovrs.reduce((a,b)=>a+b,0)/ovrs.length).toFixed(2) : '—';
  const footerY = fy + fh + 5;
  const ftGrad = ctx.createLinearGradient(fx, footerY, fx, footerY+27);
  ftGrad.addColorStop(0, 'rgba(0,0,0,0.90)'); ftGrad.addColorStop(1, 'rgba(0,0,0,0.70)');
  ctx.fillStyle = ftGrad; roundRect(ctx, fx, footerY, fw, 27, 7); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
  ctx.fillText(`OVR Efetivo: ${avgOvr}`, fx+14, footerY+18);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`Formação: ${formation}`, fx+fw-14, footerY+18);

  return canvas.toBuffer('image/png');
}
