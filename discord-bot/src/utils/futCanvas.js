import { createCanvas } from '@napi-rs/canvas';

// ─── Dimensões ────────────────────────────────────────────────────────────────
const W = 700;
const H = 900;
const CARD_W = 78;
const CARD_H = 94;

// ─── Cores por raridade ────────────────────────────────────────────────────────
const RARITY_COLORS = {
  black:  { bg: '#1a0025', top: '#5a0090', text: '#e8c0ff', badge: '#8000cc' },
  gold:   { bg: '#4a3000', top: '#b8860b', text: '#fff4cc', badge: '#d4a000' },
  silver: { bg: '#2a3040', top: '#708090', text: '#e0e8f0', badge: '#90a0b0' },
  bronze: { bg: '#3a1a00', top: '#8B4513', text: '#f0d0b0', badge: '#b06030' },
};

// ─── Layouts de formação ──────────────────────────────────────────────────────
// x,y em fração do campo (0-1). 0,0 = canto superior esq, 1,1 = inferior dir
// y=0 → linha de ataque | y=1 → goleiro
const FORMATIONS = {
  '4-3-3': [
    { pos: 'GOL', x: 0.50, y: 0.90 },
    { pos: 'LE',  x: 0.10, y: 0.73 }, { pos: 'ZAG', x: 0.35, y: 0.73 },
    { pos: 'ZAG', x: 0.65, y: 0.73 }, { pos: 'LD',  x: 0.90, y: 0.73 },
    { pos: 'MC',  x: 0.20, y: 0.50 }, { pos: 'MC',  x: 0.50, y: 0.50 }, { pos: 'MC', x: 0.80, y: 0.50 },
    { pos: 'PE',  x: 0.12, y: 0.22 }, { pos: 'CA',  x: 0.50, y: 0.13 }, { pos: 'PD', x: 0.88, y: 0.22 },
  ],
  '4-4-2': [
    { pos: 'GOL', x: 0.50, y: 0.90 },
    { pos: 'LE',  x: 0.10, y: 0.73 }, { pos: 'ZAG', x: 0.35, y: 0.73 },
    { pos: 'ZAG', x: 0.65, y: 0.73 }, { pos: 'LD',  x: 0.90, y: 0.73 },
    { pos: 'PE',  x: 0.10, y: 0.50 }, { pos: 'MC',  x: 0.36, y: 0.50 },
    { pos: 'MC',  x: 0.64, y: 0.50 }, { pos: 'PD',  x: 0.90, y: 0.50 },
    { pos: 'CA',  x: 0.35, y: 0.17 }, { pos: 'CA',  x: 0.65, y: 0.17 },
  ],
  '4-2-4': [
    { pos: 'GOL', x: 0.50, y: 0.90 },
    { pos: 'LE',  x: 0.10, y: 0.73 }, { pos: 'ZAG', x: 0.35, y: 0.73 },
    { pos: 'ZAG', x: 0.65, y: 0.73 }, { pos: 'LD',  x: 0.90, y: 0.73 },
    { pos: 'MC',  x: 0.34, y: 0.52 }, { pos: 'MC',  x: 0.66, y: 0.52 },
    { pos: 'PE',  x: 0.10, y: 0.20 }, { pos: 'CA',  x: 0.36, y: 0.13 },
    { pos: 'CA',  x: 0.64, y: 0.13 }, { pos: 'PD',  x: 0.90, y: 0.20 },
  ],
  '3-3-4': [
    { pos: 'GOL', x: 0.50, y: 0.90 },
    { pos: 'ZAG', x: 0.22, y: 0.73 }, { pos: 'ZAG', x: 0.50, y: 0.73 }, { pos: 'ZAG', x: 0.78, y: 0.73 },
    { pos: 'MC',  x: 0.22, y: 0.51 }, { pos: 'MC',  x: 0.50, y: 0.51 }, { pos: 'MC',  x: 0.78, y: 0.51 },
    { pos: 'PE',  x: 0.10, y: 0.20 }, { pos: 'CA',  x: 0.36, y: 0.13 },
    { pos: 'CA',  x: 0.64, y: 0.13 }, { pos: 'PD',  x: 0.90, y: 0.20 },
  ],
  '5-3-2': [
    { pos: 'GOL', x: 0.50, y: 0.90 },
    { pos: 'LE',  x: 0.07, y: 0.72 }, { pos: 'ZAG', x: 0.27, y: 0.75 },
    { pos: 'ZAG', x: 0.50, y: 0.75 }, { pos: 'ZAG', x: 0.73, y: 0.75 }, { pos: 'LD', x: 0.93, y: 0.72 },
    { pos: 'MC',  x: 0.23, y: 0.51 }, { pos: 'MC',  x: 0.50, y: 0.51 }, { pos: 'MC', x: 0.77, y: 0.51 },
    { pos: 'CA',  x: 0.35, y: 0.17 }, { pos: 'CA',  x: 0.65, y: 0.17 },
  ],
  '4-5-1': [
    { pos: 'GOL', x: 0.50, y: 0.90 },
    { pos: 'LE',  x: 0.10, y: 0.73 }, { pos: 'ZAG', x: 0.35, y: 0.73 },
    { pos: 'ZAG', x: 0.65, y: 0.73 }, { pos: 'LD',  x: 0.90, y: 0.73 },
    { pos: 'PE',  x: 0.10, y: 0.50 }, { pos: 'MC',  x: 0.30, y: 0.50 },
    { pos: 'MC',  x: 0.50, y: 0.50 }, { pos: 'MC',  x: 0.70, y: 0.50 }, { pos: 'PD', x: 0.90, y: 0.50 },
    { pos: 'CA',  x: 0.50, y: 0.14 },
  ],
  '3-4-3': [
    { pos: 'GOL', x: 0.50, y: 0.90 },
    { pos: 'ZAG', x: 0.22, y: 0.73 }, { pos: 'ZAG', x: 0.50, y: 0.73 }, { pos: 'ZAG', x: 0.78, y: 0.73 },
    { pos: 'LE',  x: 0.10, y: 0.50 }, { pos: 'MC',  x: 0.36, y: 0.50 },
    { pos: 'MC',  x: 0.64, y: 0.50 }, { pos: 'LD',  x: 0.90, y: 0.50 },
    { pos: 'PE',  x: 0.12, y: 0.19 }, { pos: 'CA',  x: 0.50, y: 0.12 }, { pos: 'PD', x: 0.88, y: 0.19 },
  ],
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

function drawFieldMarkings(ctx, fx, fy, fw, fh) {
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;

  // Border
  ctx.strokeRect(fx, fy, fw, fh);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(fx, fy + fh / 2);
  ctx.lineTo(fx + fw, fy + fh / 2);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(fx + fw / 2, fy + fh / 2, 55, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(fx + fw / 2, fy + fh / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Top penalty area
  const paW = fw * 0.55, paH = fh * 0.18;
  ctx.strokeRect(fx + (fw - paW) / 2, fy, paW, paH);
  const gaW = fw * 0.28, gaH = fh * 0.07;
  ctx.strokeRect(fx + (fw - gaW) / 2, fy, gaW, gaH);

  // Bottom penalty area
  ctx.strokeRect(fx + (fw - paW) / 2, fy + fh - paH, paW, paH);
  ctx.strokeRect(fx + (fw - gaW) / 2, fy + fh - gaH, gaW, gaH);

  // Penalty spots
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(fx + fw / 2, fy + fh * 0.14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(fx + fw / 2, fy + fh * 0.86, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerCard(ctx, cx, cy, player, slotPos) {
  if (!player) {
    // Empty slot
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#333';
    roundRect(ctx, cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 8);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(slotPos, cx, cy + 4);
    return;
  }

  const col = RARITY_COLORS[player.rarity] ?? RARITY_COLORS.bronze;
  const x = cx - CARD_W / 2;
  const y = cy - CARD_H / 2;

  // Card shadow
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;

  // Card background
  const grad = ctx.createLinearGradient(x, y, x, y + CARD_H);
  grad.addColorStop(0, col.top);
  grad.addColorStop(1, col.bg);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, CARD_W, CARD_H, 8);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Card border
  ctx.strokeStyle = col.badge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // OVR badge (top-left)
  ctx.fillStyle = col.badge;
  roundRect(ctx, x + 4, y + 4, 28, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(player.ovr, x + 18, y + 20);

  // Position badge (top-right)
  ctx.fillStyle = col.badge;
  roundRect(ctx, x + CARD_W - 32, y + 4, 28, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(player.pos, x + CARD_W - 18, y + 17);

  // Player silhouette area (colored rectangle)
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, x + 4, y + 30, CARD_W - 8, 36, 4);
  ctx.fill();

  // Nation + club text in silhouette area
  ctx.fillStyle = col.text;
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${player.nat} · ${truncate(player.club, 12)}`, cx, y + 52);

  // Stats row
  const stats = [player.pac, player.fin, player.pas, player.dri, player.def, player.fis];
  const labels = ['PAC','FIN','PAS','DRI','DEF','FIS'];
  const statW = (CARD_W - 8) / 6;
  ctx.font = 'bold 7px Arial';
  for (let i = 0; i < 6; i++) {
    const sx = x + 4 + statW * i + statW / 2;
    ctx.fillStyle = col.text;
    ctx.textAlign = 'center';
    ctx.fillText(stats[i], sx, y + 68);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '6px Arial';
    ctx.fillText(labels[i], sx, y + 77);
    ctx.font = 'bold 7px Arial';
  }

  // Separator
  ctx.fillStyle = col.badge;
  ctx.fillRect(x + 4, y + 80, CARD_W - 8, 1);

  // Player name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  const shortName = truncate(player.name, 13);
  ctx.fillText(shortName, cx, y + CARD_H - 6);
}

// ─── Export principal ─────────────────────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0d1f0d');
  bgGrad.addColorStop(1, '#152515');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Field area
  const fx = 25, fy = 60, fw = W - 50, fh = H - 90;

  // Field green with stripes
  const fieldGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
  fieldGrad.addColorStop(0,   '#1e6b1e');
  fieldGrad.addColorStop(0.1, '#1a5c1a');
  fieldGrad.addColorStop(0.2, '#1e6b1e');
  fieldGrad.addColorStop(0.3, '#1a5c1a');
  fieldGrad.addColorStop(0.4, '#1e6b1e');
  fieldGrad.addColorStop(0.5, '#1a5c1a');
  fieldGrad.addColorStop(0.6, '#1e6b1e');
  fieldGrad.addColorStop(0.7, '#1a5c1a');
  fieldGrad.addColorStop(0.8, '#1e6b1e');
  fieldGrad.addColorStop(0.9, '#1a5c1a');
  fieldGrad.addColorStop(1,   '#1e6b1e');
  ctx.fillStyle = fieldGrad;
  roundRect(ctx, fx, fy, fw, fh, 12);
  ctx.fill();

  // Field markings
  drawFieldMarkings(ctx, fx, fy, fw, fh);

  // Header bar
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, fx, 8, fw, 48, 8);
  ctx.fill();

  // Team name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`⚽ ${truncate(teamName, 22)}`, fx + 16, 38);

  // ELO
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`ELO: ${elo}`, fx + fw - 16, 38);

  // Formation label
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(formation, W / 2, 38);

  // Draw players
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const lineupEntry = lineup.find(l => l.slot === i + 1);
    const player = lineupEntry?.player ?? null;

    const cx = Math.round(fx + slot.x * fw);
    const cy = Math.round(fy + slot.y * fh);

    drawPlayerCard(ctx, cx, cy, player, slot.pos);
  }

  // OVR do time (bottom bar)
  const ovrs = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr = ovrs.length ? (ovrs.reduce((a, b) => a + b, 0) / ovrs.length).toFixed(2) : '—';

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, fx, fy + fh + 4, fw, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`OVR Efetivo: ${avgOvr}`, fx + 14, fy + fh + 23);
  ctx.fillStyle = '#aaa';
  ctx.font = '11px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Formação: ${formation}`, fx + fw - 14, fy + fh + 23);

  return canvas.toBuffer('image/png');
}
