import { createCanvas, loadImage } from '@napi-rs/canvas';

// ─── Field canvas dimensions ──────────────────────────────────────────────────
const W      = 720;
const H      = 920;
const CARD_W = 88;
const CARD_H = 114;

// ─── Standalone / Pack card dimensions ───────────────────────────────────────
const SC_W    = 280;   // single standalone card width
const SC_H    = 400;   // single standalone card height
const SC_PH   = 230;   // photo zone height
const SC_NH   = 46;    // name band height
const SC_SH   = SC_H - SC_PH - SC_NH; // stats band height (124px)

// ─── Themes ──────────────────────────────────────────────────────────────────
const THEME = {
  black: {
    // field card
    bg1:'#08001a', bg2:'#1a0038',
    accent:'#c060ff', border:'#9030dd',
    ovr:'#f0d0ff', pos:'#c080ff',
    num:'#ffffff', label:'#cc99ff',
    stat_bg:'rgba(20,0,50,0.85)', shimmer:'rgba(180,80,255,0.18)',
    // standalone extras
    grad:['#4a0080','#22003d','#100020'],
    nameBar:'rgba(18,0,36,0.95)', statsBar:'#0d0020',
    statLabel:'#c090ff', statValue:'#ffffff',
  },
  gold: {
    bg1:'#5c3200', bg2:'#2a1800',
    accent:'#e8a800', border:'#c88a00',
    ovr:'#ffffff', pos:'#ffe080',
    num:'#ffffff', label:'#ffd060',
    stat_bg:'rgba(30,15,0,0.88)', shimmer:'rgba(255,195,0,0.18)',
    grad:['#c8860a','#7a4d00','#3d2500'],
    nameBar:'rgba(30,16,0,0.95)', statsBar:'#1a0f00',
    statLabel:'#ffc060', statValue:'#ffffff',
  },
  silver: {
    bg1:'#3a4555', bg2:'#1a2030',
    accent:'#b0c0d0', border:'#7090a8',
    ovr:'#ffffff', pos:'#c8d8e8',
    num:'#ffffff', label:'#a0bcd0',
    stat_bg:'rgba(15,22,35,0.88)', shimmer:'rgba(140,180,210,0.15)',
    grad:['#5a7080','#2e3d4d','#141e28'],
    nameBar:'rgba(18,26,38,0.95)', statsBar:'#0e181f',
    statLabel:'#90b8d0', statValue:'#ffffff',
  },
  bronze: {
    bg1:'#5a2800', bg2:'#2a1000',
    accent:'#c87030', border:'#9a5018',
    ovr:'#ffffff', pos:'#f0c090',
    num:'#ffffff', label:'#e8b070',
    stat_bg:'rgba(25,10,0,0.88)', shimmer:'rgba(200,120,40,0.15)',
    grad:['#7a3d10','#4a2008','#220d00'],
    nameBar:'rgba(28,12,0,0.95)', statsBar:'#180800',
    statLabel:'#e09060', statValue:'#ffffff',
  },
};

// ─── Formation slot layouts ───────────────────────────────────────────────────
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

// ─── Fetch player photo (SofaScore) ──────────────────────────────────────────
async function fetchPlayerPhoto(sofascoreId) {
  if (!sofascoreId) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://api.sofascore.com/api/v1/player/${sofascoreId}/image`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)', 'Accept': 'image/*' },
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch { return null; }
}

// ─── Fetch country flag ────────────────────────────────────────────────────────
async function fetchFlag(nat) {
  const iso = NAT_ISO[nat];
  if (!iso) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://flagcdn.com/w40/${iso}.png`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)', 'Accept': 'image/*' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch { return null; }
}

// ─── Silhouette placeholder ───────────────────────────────────────────────────
function drawSilhouette(ctx, x, y, w, h, t) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, t.bg1);
  g.addColorStop(1, t.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `${t.accent}28`;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.28, w * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `${t.accent}18`;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.65, w * 0.28, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Field markings ───────────────────────────────────────────────────────────
function drawFieldMarkings(ctx, fx, fy, fw, fh) {
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.beginPath(); ctx.moveTo(fx, fy + fh / 2); ctx.lineTo(fx + fw, fy + fh / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx + fw / 2, fy + fh / 2, 52, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(fx + fw / 2, fy + fh / 2, 3.5, 0, Math.PI * 2); ctx.fill();
  const paW = fw * 0.52, paH = fh * 0.17;
  ctx.strokeRect(fx + (fw - paW) / 2, fy, paW, paH);
  const gaW = fw * 0.26, gaH = fh * 0.065;
  ctx.strokeRect(fx + (fw - gaW) / 2, fy, gaW, gaH);
  ctx.strokeRect(fx + (fw - paW) / 2, fy + fh - paH, paW, paH);
  ctx.strokeRect(fx + (fw - gaW) / 2, fy + fh - gaH, gaW, gaH);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  [fh * 0.135, fh * 0.865].forEach(yOff => {
    ctx.beginPath(); ctx.arc(fx + fw / 2, fy + yOff, 2.5, 0, Math.PI * 2); ctx.fill();
  });
}

// ─── FIELD VIEW card (compact, 88×114) ───────────────────────────────────────
function drawPlayerCard(ctx, cx, cy, player, slotPos, photo) {
  const x = Math.round(cx - CARD_W / 2);
  const y = Math.round(cy - CARD_H / 2);

  if (!player) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(slotPos, cx, cy + 4);
    return;
  }

  const t = THEME[player.rarity] ?? THEME.bronze;
  const PHOTO_H = 62;
  const STATS_Y = PHOTO_H + 14;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
  bgGrad.addColorStop(0, t.grad[0]);
  bgGrad.addColorStop(0.5, t.grad[1]);
  bgGrad.addColorStop(1, t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Shimmer diagonal
  const shim = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
  shim.addColorStop(0, 'transparent');
  shim.addColorStop(0.42, t.shimmer);
  shim.addColorStop(0.58, t.shimmer);
  shim.addColorStop(1, 'transparent');
  ctx.save();
  roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.clip();
  ctx.fillStyle = shim; ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.restore();

  // Photo area
  ctx.save();
  roundRect(ctx, x, y, CARD_W, PHOTO_H + 4, 8); ctx.clip();
  if (photo) {
    const scale = CARD_W / photo.width;
    const drawH = photo.height * scale;
    ctx.drawImage(photo, x, y + (PHOTO_H - drawH) / 2, CARD_W, drawH);
  } else {
    drawSilhouette(ctx, x, y, CARD_W, PHOTO_H, t);
  }
  ctx.restore();

  // Photo fade at bottom
  const fade = ctx.createLinearGradient(x, y + PHOTO_H - 20, x, y + PHOTO_H + 4);
  fade.addColorStop(0, 'transparent');
  fade.addColorStop(1, t.grad[2]);
  ctx.fillStyle = fade;
  ctx.fillRect(x, y + PHOTO_H - 20, CARD_W, 24);

  // OVR + POS overlay (top-left)
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
  ctx.fillStyle = t.ovr; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), x + 5, y + 19);
  ctx.fillStyle = t.pos; ctx.font = 'bold 8px Arial';
  ctx.fillText(player.pos, x + 5, y + 29);

  // NAT (top-right)
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x + CARD_W - 24, y + 3, 22, 11);
  ctx.fillStyle = '#ffffff'; ctx.font = '6px Arial'; ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.fillText(player.nat, x + CARD_W - 13, y + 11);

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Name
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText(truncate(player.name.toUpperCase(), 11), cx, y + PHOTO_H + 11);

  // Accent separator line
  ctx.fillStyle = t.accent;
  ctx.fillRect(x + 3, y + PHOTO_H + 13, CARD_W - 6, 1);

  // Stats background
  const statsTop = y + PHOTO_H + 16;
  ctx.fillStyle = t.stat_bg;
  roundRect(ctx, x + 3, statsTop - 1, CARD_W - 6, CARD_H - PHOTO_H - 19, 4);
  ctx.fill();

  // Stats in 2 columns
  const leftStats  = [{ label:'RIT', val:player.pac }, { label:'FIN', val:player.fin }, { label:'PAS', val:player.pas }];
  const rightStats = [{ label:'DRI', val:player.dri }, { label:'DEF', val:player.def }, { label:'FIS', val:player.fis }];
  const rowH = (CARD_H - statsTop + y - 4) / 3;

  for (let i = 0; i < 3; i++) {
    const ry = statsTop + i * rowH + rowH / 2 - 1;
    ctx.fillStyle = t.num; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
    ctx.fillText(leftStats[i].val, x + 7, ry + 4);
    ctx.fillStyle = t.label; ctx.font = '6px Arial';
    ctx.fillText(leftStats[i].label, x + 7, ry + 11);
    ctx.fillStyle = t.num; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'right';
    ctx.fillText(rightStats[i].val, x + CARD_W - 7, ry + 4);
    ctx.fillStyle = t.label; ctx.font = '6px Arial';
    ctx.fillText(rightStats[i].label, x + CARD_W - 7, ry + 11);
  }

  // Border glow
  ctx.strokeStyle = t.border;
  ctx.lineWidth = player.rarity === 'black' ? 2 : 1.4;
  roundRect(ctx, x, y, CARD_W, CARD_H, 8); ctx.stroke();

  // Slot label below card
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  roundRect(ctx, cx - 14, y + CARD_H + 2, 28, 13, 3); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
  ctx.fillText(slotPos, cx, y + CARD_H + 11);
}

// ─── STANDALONE card (280×400) — Futecord style ───────────────────────────────
async function drawStandaloneCard(ctx, ox, oy, player, photo, flag) {
  const t = THEME[player.rarity] ?? THEME.bronze;

  // ── Card shadow ──────────────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 8;

  // ── Background gradient (full card) ──────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(ox, oy, ox, oy + SC_H);
  bgGrad.addColorStop(0,   t.grad[0]);
  bgGrad.addColorStop(0.5, t.grad[1]);
  bgGrad.addColorStop(1,   t.grad[2]);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, ox, oy, SC_W, SC_H, 12); ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // ── Shimmer ──────────────────────────────────────────────────────────────────
  const shim = ctx.createLinearGradient(ox, oy, ox + SC_W, oy + SC_H);
  shim.addColorStop(0,   'transparent');
  shim.addColorStop(0.38, t.shimmer);
  shim.addColorStop(0.62, t.shimmer);
  shim.addColorStop(1,   'transparent');
  ctx.save();
  roundRect(ctx, ox, oy, SC_W, SC_H, 12); ctx.clip();
  ctx.fillStyle = shim; ctx.fillRect(ox, oy, SC_W, SC_H);
  ctx.restore();

  // ── Photo zone (top SC_PH px) ────────────────────────────────────────────────
  ctx.save();
  roundRect(ctx, ox, oy, SC_W, SC_PH + 8, 12); ctx.clip();
  if (photo) {
    // Scale photo to fill width, center vertically
    const scale = SC_W / photo.width;
    const drawH = photo.height * scale;
    const drawY = oy + (SC_PH - drawH) / 2;
    ctx.drawImage(photo, ox, drawY < oy ? oy : drawY, SC_W, drawH);
  } else {
    drawSilhouette(ctx, ox, oy, SC_W, SC_PH, t);
  }
  ctx.restore();

  // ── Gradient fade at bottom of photo ─────────────────────────────────────────
  const photoFade = ctx.createLinearGradient(ox, oy + SC_PH - 60, ox, oy + SC_PH + 4);
  photoFade.addColorStop(0, 'transparent');
  photoFade.addColorStop(1, t.grad[2]);
  ctx.fillStyle = photoFade;
  ctx.fillRect(ox, oy + SC_PH - 60, SC_W, 64);

  // ── OVR (large, top-left over photo) ─────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.99)'; ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 56px Arial'; ctx.textAlign = 'left';
  ctx.fillText(String(player.ovr), ox + 10, oy + 58);

  // ── POS below OVR ────────────────────────────────────────────────────────────
  ctx.fillStyle = t.pos; ctx.font = 'bold 18px Arial';
  ctx.fillText(player.pos, ox + 12, oy + 78);

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // ── Flag (top-right) ─────────────────────────────────────────────────────────
  if (flag) {
    // draw flag with rounded corners
    const fw = 44, fh = 29;
    const fx = ox + SC_W - fw - 10;
    const fy = oy + 10;
    ctx.save();
    roundRect(ctx, fx, fy, fw, fh, 4); ctx.clip();
    ctx.drawImage(flag, fx, fy, fw, fh);
    ctx.restore();
    // flag border
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    roundRect(ctx, fx, fy, fw, fh, 4); ctx.stroke();
  } else {
    // fallback: colored badge with nat text
    const fw = 40, fh = 22;
    const fx = ox + SC_W - fw - 10;
    const fy = oy + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, fx, fy, fw, fh, 4); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(player.nat, fx + fw / 2, fy + fh / 2 + 4);
  }

  // ── Name band ────────────────────────────────────────────────────────────────
  const nameY = oy + SC_PH;
  ctx.fillStyle = t.nameBar;
  ctx.fillRect(ox, nameY, SC_W, SC_NH);

  // Accent line at top of name band
  ctx.fillStyle = t.accent;
  ctx.fillRect(ox, nameY, SC_W, 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4;
  const displayName = player.name.toUpperCase();
  ctx.fillText(truncate(displayName, 14), ox + SC_W / 2, nameY + 31);

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // ── Stats band ────────────────────────────────────────────────────────────────
  const statsY = nameY + SC_NH;
  ctx.fillStyle = t.statsBar;
  ctx.fillRect(ox, statsY, SC_W, SC_SH);

  // Rounded bottom corners for stats band
  ctx.save();
  roundRect(ctx, ox, statsY, SC_W, SC_SH, 12);
  ctx.clip(); ctx.fillStyle = t.statsBar;
  ctx.fillRect(ox, statsY, SC_W, SC_SH);
  ctx.restore();

  // 6 stats in equal columns
  const stats = [
    { label:'RIT', val:player.pac },
    { label:'FIN', val:player.fin },
    { label:'PAS', val:player.pas },
    { label:'DRI', val:player.dri },
    { label:'DEF', val:player.def },
    { label:'FIS', val:player.fis },
  ];

  const colW = SC_W / 6;
  const statMidY = statsY + SC_SH / 2;

  for (let i = 0; i < 6; i++) {
    const cx2 = ox + colW * i + colW / 2;

    // Separator between stats (except first)
    if (i > 0) {
      ctx.fillStyle = `${t.accent}30`;
      ctx.fillRect(ox + colW * i, statsY + SC_SH * 0.15, 1, SC_SH * 0.7);
    }

    // Value
    ctx.fillStyle = t.statValue;
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText(String(stats[i].val), cx2, statMidY + 4);

    // Label
    ctx.fillStyle = t.statLabel;
    ctx.font = '10px Arial';
    ctx.fillText(stats[i].label, cx2, statMidY + 20);
  }

  // ── Border ───────────────────────────────────────────────────────────────────
  ctx.strokeStyle = t.border;
  ctx.lineWidth = player.rarity === 'black' ? 2.5 : 1.8;
  roundRect(ctx, ox, oy, SC_W, SC_H, 12); ctx.stroke();
}

// ─── Generate single large card image ────────────────────────────────────────
export async function generateCardImage(player) {
  const PAD = 24;
  const canvas = createCanvas(SC_W + PAD * 2, SC_H + PAD * 2);
  const ctx = canvas.getContext('2d');

  // Dark atmospheric background
  const bg = ctx.createRadialGradient(
    (SC_W + PAD * 2) / 2, (SC_H + PAD * 2) / 2, 40,
    (SC_W + PAD * 2) / 2, (SC_H + PAD * 2) / 2, Math.max(SC_W, SC_H)
  );
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#05050f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SC_W + PAD * 2, SC_H + PAD * 2);

  const [photo, flag] = await Promise.all([
    fetchPlayerPhoto(player.sofascoreId),
    fetchFlag(player.nat),
  ]);

  await drawStandaloneCard(ctx, PAD, PAD, player, photo, flag);

  return canvas.toBuffer('image/png');
}

// ─── Generate pack reveal image (all cards in a row) ─────────────────────────
export async function generatePackRevealImage(players) {
  const PC_W  = 190;  // pack card width
  const PC_H  = 270;  // pack card height
  const PC_PH = 150;  // photo zone height
  const PC_NH = 38;   // name band height
  const PC_SH = PC_H - PC_PH - PC_NH;  // stats band height
  const GAP   = 14;
  const PAD   = 18;

  const cols = Math.min(players.length, 4);
  const rows = Math.ceil(players.length / cols);
  const CW   = PAD * 2 + cols * PC_W + (cols - 1) * GAP;
  const CH   = PAD * 2 + rows * PC_H + (rows - 1) * GAP + 40; // +40 for title

  const canvas = createCanvas(CW, CH);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, '#0d0d1a');
  bg.addColorStop(1, '#060610');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

  // Pre-fetch all photos and flags in parallel
  const assets = await Promise.all(players.map(p => Promise.all([
    fetchPlayerPhoto(p.sofascoreId),
    fetchFlag(p.nat),
  ])));

  // Draw each card
  for (let i = 0; i < players.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = PAD + col * (PC_W + GAP);
    const cy = PAD + 40 + row * (PC_H + GAP);
    const p  = players[i];
    const t  = THEME[p.rarity] ?? THEME.bronze;
    const [photo, flag] = assets[i];

    // ── Card shadow ────────────────────────────────────────────────────────────
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;

    // ── Card background ────────────────────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(cx, cy, cx, cy + PC_H);
    bgGrad.addColorStop(0, t.grad[0]);
    bgGrad.addColorStop(0.5, t.grad[1]);
    bgGrad.addColorStop(1, t.grad[2]);
    ctx.fillStyle = bgGrad;
    roundRect(ctx, cx, cy, PC_W, PC_H, 10); ctx.fill();

    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // ── Shimmer ────────────────────────────────────────────────────────────────
    const shim = ctx.createLinearGradient(cx, cy, cx + PC_W, cy + PC_H);
    shim.addColorStop(0, 'transparent');
    shim.addColorStop(0.4, t.shimmer);
    shim.addColorStop(0.6, t.shimmer);
    shim.addColorStop(1, 'transparent');
    ctx.save();
    roundRect(ctx, cx, cy, PC_W, PC_H, 10); ctx.clip();
    ctx.fillStyle = shim; ctx.fillRect(cx, cy, PC_W, PC_H);
    ctx.restore();

    // ── Photo ──────────────────────────────────────────────────────────────────
    ctx.save();
    roundRect(ctx, cx, cy, PC_W, PC_PH + 6, 10); ctx.clip();
    if (photo) {
      const scale = PC_W / photo.width;
      const dh = photo.height * scale;
      ctx.drawImage(photo, cx, cy + (PC_PH - dh) / 2, PC_W, dh);
    } else {
      const sil = ctx.createLinearGradient(cx, cy, cx, cy + PC_PH);
      sil.addColorStop(0, t.grad[0]); sil.addColorStop(1, t.grad[1]);
      ctx.fillStyle = sil; ctx.fillRect(cx, cy, PC_W, PC_PH);
      ctx.fillStyle = `${t.accent}25`;
      ctx.beginPath(); ctx.arc(cx + PC_W/2, cy + PC_PH*0.28, PC_W*0.16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `${t.accent}15`;
      ctx.beginPath(); ctx.ellipse(cx + PC_W/2, cy + PC_PH*0.65, PC_W*0.27, PC_PH*0.25, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Photo fade
    const pf = ctx.createLinearGradient(cx, cy + PC_PH - 40, cx, cy + PC_PH + 4);
    pf.addColorStop(0, 'transparent'); pf.addColorStop(1, t.grad[2]);
    ctx.fillStyle = pf; ctx.fillRect(cx, cy + PC_PH - 40, PC_W, 44);

    // ── OVR (top-left over photo) ──────────────────────────────────────────────
    ctx.shadowColor = 'rgba(0,0,0,0.99)'; ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 36px Arial'; ctx.textAlign = 'left';
    ctx.fillText(String(p.ovr), cx + 8, cy + 40);
    ctx.fillStyle = t.pos; ctx.font = 'bold 12px Arial';
    ctx.fillText(p.pos, cx + 9, cy + 55);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // ── Flag (top-right) ──────────────────────────────────────────────────────
    if (flag) {
      const fw = 34, fh = 22;
      const fx = cx + PC_W - fw - 7;
      const fy = cy + 8;
      ctx.save();
      roundRect(ctx, fx, fy, fw, fh, 3); ctx.clip();
      ctx.drawImage(flag, fx, fy, fw, fh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      roundRect(ctx, fx, fy, fw, fh, 3); ctx.stroke();
    } else {
      const fw = 32, fh = 18;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, cx + PC_W - fw - 7, cy + 9, fw, fh, 3); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = '9px Arial'; ctx.textAlign = 'center';
      ctx.fillText(p.nat, cx + PC_W - fw/2 - 7, cy + 21);
    }

    // ── Name band ──────────────────────────────────────────────────────────────
    const ny = cy + PC_PH;
    ctx.fillStyle = t.nameBar; ctx.fillRect(cx, ny, PC_W, PC_NH);
    ctx.fillStyle = t.accent; ctx.fillRect(cx, ny, PC_W, 2);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 3;
    ctx.fillText(truncate(p.name.toUpperCase(), 13), cx + PC_W / 2, ny + 25);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

    // ── Stats band (6 stats in a row) ──────────────────────────────────────────
    const sy = ny + PC_NH;
    ctx.save();
    roundRect(ctx, cx, sy, PC_W, PC_SH, 10); ctx.clip();
    ctx.fillStyle = t.statsBar; ctx.fillRect(cx, sy, PC_W, PC_SH);
    ctx.restore();

    const stats = [
      { l:'RIT', v:p.pac }, { l:'FIN', v:p.fin }, { l:'PAS', v:p.pas },
      { l:'DRI', v:p.dri }, { l:'DEF', v:p.def }, { l:'FIS', v:p.fis },
    ];
    const scw = PC_W / 6;
    const smy = sy + PC_SH / 2;
    for (let j = 0; j < 6; j++) {
      const scx = cx + scw * j + scw / 2;
      if (j > 0) { ctx.fillStyle = `${t.accent}28`; ctx.fillRect(cx + scw*j, sy + PC_SH*0.15, 1, PC_SH*0.7); }
      ctx.fillStyle = t.statValue; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
      ctx.fillText(String(stats[j].v), scx, smy + 3);
      ctx.fillStyle = t.statLabel; ctx.font = '8px Arial';
      ctx.fillText(stats[j].l, scx, smy + 14);
    }

    // ── Border ─────────────────────────────────────────────────────────────────
    ctx.strokeStyle = t.border;
    ctx.lineWidth = p.rarity === 'black' ? 2 : 1.5;
    roundRect(ctx, cx, cy, PC_W, PC_H, 10); ctx.stroke();
  }

  return canvas.toBuffer('image/png');
}

// ─── Generate collection grid image ──────────────────────────────────────────
export async function generateCollectionImage(playerCards) {
  const CC_W  = 160;
  const CC_H  = 225;
  const CC_PH = 125;
  const CC_NH = 32;
  const CC_SH = CC_H - CC_PH - CC_NH;
  const COLS  = 4;
  const GAP   = 10;
  const PAD   = 14;

  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD * 2 + COLS * CC_W + (COLS - 1) * GAP;
  const CH   = PAD * 2 + rows * CC_H + (rows - 1) * GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Green field background
  const fieldBg = ctx.createLinearGradient(0, 0, 0, CH);
  fieldBg.addColorStop(0, '#1a5c1a');
  fieldBg.addColorStop(1, '#155015');
  ctx.fillStyle = fieldBg;
  ctx.fillRect(0, 0, CW, CH);

  // Subtle horizontal strips
  for (let i = 0; i < Math.ceil(CH / 28); i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, i * 28, CW, 28);
  }

  if (playerCards.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Nenhuma carta ainda!', CW / 2, CH / 2);
    return canvas.toBuffer('image/png');
  }

  // Pre-fetch photos in parallel (no flags for collection grid)
  const photos = await Promise.all(
    playerCards.map(c => c.player?.sofascoreId ? fetchPlayerPhoto(c.player.sofascoreId) : Promise.resolve(null))
  );

  for (let i = 0; i < playerCards.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx  = PAD + col * (CC_W + GAP);
    const cy  = PAD + row * (CC_H + GAP);
    const p   = playerCards[i].player;
    if (!p) continue;
    const t   = THEME[p.rarity] ?? THEME.bronze;
    const photo = photos[i];

    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;

    const bgGrad = ctx.createLinearGradient(cx, cy, cx, cy + CC_H);
    bgGrad.addColorStop(0, t.grad[0]); bgGrad.addColorStop(0.55, t.grad[1]); bgGrad.addColorStop(1, t.grad[2]);
    ctx.fillStyle = bgGrad;
    roundRect(ctx, cx, cy, CC_W, CC_H, 8); ctx.fill();

    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // Shimmer
    const shim = ctx.createLinearGradient(cx, cy, cx + CC_W, cy + CC_H);
    shim.addColorStop(0, 'transparent'); shim.addColorStop(0.42, t.shimmer); shim.addColorStop(0.58, t.shimmer); shim.addColorStop(1, 'transparent');
    ctx.save(); roundRect(ctx, cx, cy, CC_W, CC_H, 8); ctx.clip();
    ctx.fillStyle = shim; ctx.fillRect(cx, cy, CC_W, CC_H); ctx.restore();

    // Photo
    ctx.save(); roundRect(ctx, cx, cy, CC_W, CC_PH + 4, 8); ctx.clip();
    if (photo) {
      const scale = CC_W / photo.width;
      const dh = photo.height * scale;
      ctx.drawImage(photo, cx, cy + (CC_PH - dh) / 2, CC_W, dh);
    } else {
      const sil = ctx.createLinearGradient(cx, cy, cx, cy + CC_PH);
      sil.addColorStop(0, t.grad[0]); sil.addColorStop(1, t.grad[1]);
      ctx.fillStyle = sil; ctx.fillRect(cx, cy, CC_W, CC_PH);
      ctx.fillStyle = `${t.accent}25`;
      ctx.beginPath(); ctx.arc(cx + CC_W/2, cy + CC_PH*0.3, CC_W*0.15, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Photo fade
    const pf = ctx.createLinearGradient(cx, cy + CC_PH - 30, cx, cy + CC_PH + 2);
    pf.addColorStop(0, 'transparent'); pf.addColorStop(1, t.grad[2]);
    ctx.fillStyle = pf; ctx.fillRect(cx, cy + CC_PH - 30, CC_W, 34);

    // OVR
    ctx.shadowColor = 'rgba(0,0,0,0.99)'; ctx.shadowBlur = 5; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'left';
    ctx.fillText(String(p.ovr), cx + 6, cy + 32);
    ctx.fillStyle = t.pos; ctx.font = 'bold 10px Arial';
    ctx.fillText(p.pos, cx + 7, cy + 44);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // NAT badge
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(ctx, cx + CC_W - 30, cy + 6, 26, 14, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '8px Arial'; ctx.textAlign = 'center';
    ctx.fillText(p.nat, cx + CC_W - 17, cy + 16);

    // Name band
    const ny = cy + CC_PH;
    ctx.fillStyle = t.nameBar; ctx.fillRect(cx, ny, CC_W, CC_NH);
    ctx.fillStyle = t.accent; ctx.fillRect(cx, ny, CC_W, 2);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText(truncate(p.name.toUpperCase(), 13), cx + CC_W / 2, ny + 22);

    // Stats row
    const sy = ny + CC_NH;
    ctx.save(); roundRect(ctx, cx, sy, CC_W, CC_SH, 8); ctx.clip();
    ctx.fillStyle = t.statsBar; ctx.fillRect(cx, sy, CC_W, CC_SH); ctx.restore();

    const stats = [
      { l:'RIT', v:p.pac }, { l:'FIN', v:p.fin }, { l:'PAS', v:p.pas },
      { l:'DRI', v:p.dri }, { l:'DEF', v:p.def }, { l:'FIS', v:p.fis },
    ];
    const scw = CC_W / 6;
    const smy = sy + CC_SH / 2;
    for (let j = 0; j < 6; j++) {
      const scx = cx + scw * j + scw / 2;
      if (j > 0) { ctx.fillStyle = `${t.accent}28`; ctx.fillRect(cx + scw*j, sy + CC_SH*0.15, 1, CC_SH*0.7); }
      ctx.fillStyle = t.statValue; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(String(stats[j].v), scx, smy + 2);
      ctx.fillStyle = t.statLabel; ctx.font = '7px Arial';
      ctx.fillText(stats[j].l, scx, smy + 11);
    }

    // Border
    ctx.strokeStyle = t.border; ctx.lineWidth = p.rarity === 'black' ? 2 : 1.4;
    roundRect(ctx, cx, cy, CC_W, CC_H, 8); ctx.stroke();
  }

  return canvas.toBuffer('image/png');
}

// ─── Generate field image ─────────────────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  // Pre-fetch photos in parallel
  const photoMap = new Map();
  await Promise.all(
    lineup
      .filter(l => l.player?.sofascoreId)
      .map(async l => {
        const img = await fetchPlayerPhoto(l.player.sofascoreId);
        if (img) photoMap.set(l.player.sofascoreId, img);
      })
  );

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Dark stadium atmosphere background ────────────────────────────────────────
  const outerBg = ctx.createLinearGradient(0, 0, 0, H);
  outerBg.addColorStop(0, '#060c06');
  outerBg.addColorStop(1, '#0a140a');
  ctx.fillStyle = outerBg;
  ctx.fillRect(0, 0, W, H);

  // ── Field area ────────────────────────────────────────────────────────────────
  const fx = 20, fy = 66, fw = W - 40, fh = H - 98;

  // Main grass gradient — lighter center, darker edges (stadium lights)
  const fieldGrad = ctx.createRadialGradient(fx + fw / 2, fy + fh / 2, 80, fx + fw / 2, fy + fh / 2, fh * 0.75);
  fieldGrad.addColorStop(0, '#2a8c2a');
  fieldGrad.addColorStop(0.5, '#226022');
  fieldGrad.addColorStop(1, '#163c16');
  ctx.fillStyle = fieldGrad;
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.fill();

  // Horizontal grass strips (alternating lighter/darker)
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip();
  const stripeH = fh / 12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(fx, fy + i * stripeH, fw, stripeH);
  }

  // Vignette overlay on field edges
  const vign = ctx.createRadialGradient(fx + fw / 2, fy + fh / 2, fh * 0.25, fx + fw / 2, fy + fh / 2, fh * 0.85);
  vign.addColorStop(0, 'transparent');
  vign.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vign;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();

  // Field markings
  drawFieldMarkings(ctx, fx, fy, fw, fh);

  // ── Header ─────────────────────────────────────────────────────────────────────
  const headerGrad = ctx.createLinearGradient(fx, 6, fx, 58);
  headerGrad.addColorStop(0, 'rgba(0,0,0,0.92)');
  headerGrad.addColorStop(1, 'rgba(0,0,0,0.70)');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, fx, 6, fw, 54, 10); ctx.fill();

  // Left accent line
  ctx.fillStyle = '#2ecc40';
  ctx.fillRect(fx, 6, 4, 54);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'left';
  ctx.fillText(`⚽ ${truncate(teamName, 20)}`, fx + 16, 40);

  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`${elo} ELO`, fx + fw - 14, 34);

  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '11px Arial';
  ctx.fillText(formation, fx + fw - 14, 50);

  // ── Players ────────────────────────────────────────────────────────────────────
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  for (let i = 0; i < slots.length; i++) {
    const slot  = slots[i];
    const entry = lineup.find(l => l.slot === i + 1);
    const player = entry?.player ?? null;
    const photo  = player?.sofascoreId ? (photoMap.get(player.sofascoreId) ?? null) : null;
    const cx = Math.round(fx + slot.x * fw);
    const cy = Math.round(fy + slot.y * fh);
    drawPlayerCard(ctx, cx, cy, player, slot.pos, photo);
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const ovrs   = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr = ovrs.length
    ? (ovrs.reduce((a, b) => a + b, 0) / ovrs.length).toFixed(2)
    : '—';

  const footerY = fy + fh + 5;
  const footerGrad = ctx.createLinearGradient(fx, footerY, fx, footerY + 26);
  footerGrad.addColorStop(0, 'rgba(0,0,0,0.88)');
  footerGrad.addColorStop(1, 'rgba(0,0,0,0.70)');
  ctx.fillStyle = footerGrad;
  roundRect(ctx, fx, footerY, fw, 27, 7); ctx.fill();

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
  ctx.fillText(`OVR Efetivo: ${avgOvr}`, fx + 14, footerY + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`Formação: ${formation}`, fx + fw - 14, footerY + 18);

  return canvas.toBuffer('image/png');
}
