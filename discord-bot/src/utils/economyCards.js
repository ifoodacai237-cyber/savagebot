import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const _bjDir = join(dirname(fileURLToPath(import.meta.url)), '../assets');

const FONT = '"Noto Sans", "DejaVu Sans", Arial, sans-serif';

function fmt(n) { return Number(n).toLocaleString('pt-BR'); }

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

// ─── Sparkle / star decoration ────────────────────────────────────────────────

function drawSparkle(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, size * 0.5, size * 0.12, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Angel feather ────────────────────────────────────────────────────────────
function drawFeather(ctx, x, y, dir, alpha = 0.18) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const quillLen = 80;
  const barbs    = 12;
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth   = 1;
  // Central quill
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dir * 14, y + quillLen);
  ctx.stroke();
  for (let i = 1; i <= barbs; i++) {
    const t  = i / barbs;
    const qx = x + dir * 14 * t;
    const qy = y + quillLen * t;
    const sp = 6 + t * 22;
    // Leading barb
    ctx.beginPath();
    ctx.moveTo(qx, qy);
    ctx.quadraticCurveTo(qx + dir * sp * 0.7, qy - 4, qx + dir * sp, qy + 4);
    ctx.stroke();
    // Trailing barb (shorter)
    ctx.beginPath();
    ctx.moveTo(qx, qy);
    ctx.quadraticCurveTo(qx - dir * sp * 0.3, qy - 3, qx - dir * sp * 0.45, qy + 3);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Divine light rays from top ───────────────────────────────────────────────
function drawDivineRays(ctx, W, H) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const cx = W / 2, cy = -30;
  const rays = 10;
  for (let i = 0; i < rays; i++) {
    const angle  = -Math.PI / 2 + (i - (rays - 1) / 2) * 0.19;
    const spread = 0.045;
    const grad   = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * H * 1.8, cy + Math.sin(angle) * H * 1.8);
    grad.addColorStop(0,   'rgba(200,185,255,0.18)');
    grad.addColorStop(0.5, 'rgba(160,130,230,0.06)');
    grad.addColorStop(1,   'rgba(100,80,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle - spread) * H * 2.2, cy + Math.sin(angle - spread) * H * 2.2);
    ctx.lineTo(cx + Math.cos(angle + spread) * H * 2.2, cy + Math.sin(angle + spread) * H * 2.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// ─── Tiny stars ───────────────────────────────────────────────────────────────
function drawStars(ctx, W, H) {
  const stars = [
    [55,28],[W-50,22],[80,H-30],[W-70,H-28],[W/2+160,18],[W/2-155,20],
    [W/2,15],[30,H/2-40],[W-30,H/2+20],[W/2+280,H-22],[W/2-260,H-18],
    [140,38],[W-140,35],[W/2+80,H-12],[W/2-90,H-14]
  ];
  for (const [sx, sy] of stars) {
    ctx.save();
    ctx.fillStyle = 'rgba(220,210,255,0.55)';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Playing card (clean realistic style matching reference) ─────────────────

// ─── Suit shape drawn with canvas paths (no Unicode dependency) ───────────────
function drawSuit(ctx, cx, cy, suit, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (suit === '♥') {
    const s = size * 0.52;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.5, cy, cx - s * 1.5, cy - s * 1.1, cx, cy - s * 0.3);
    ctx.bezierCurveTo(cx + s * 1.5, cy - s * 1.1, cx + s * 1.5, cy, cx, cy + s * 0.9);
    ctx.fill();
  } else if (suit === '♦') {
    const s = size * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.65, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.65, cy);
    ctx.closePath();
    ctx.fill();
  } else if (suit === '♠') {
    const s = size * 0.48;
    // Inverted heart (top bulb)
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.4);
    ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.3, cx - s * 1.5, cy - s * 1.4, cx, cy - s * 0.6);
    ctx.bezierCurveTo(cx + s * 1.5, cy - s * 1.4, cx + s * 1.5, cy - s * 0.3, cx, cy + s * 0.4);
    ctx.fill();
    // Stem + base
    const stemW = s * 0.25, stemH = s * 0.65;
    ctx.fillRect(cx - stemW / 2, cy + s * 0.4, stemW, stemH);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.7, cy + s * 0.4 + stemH);
    ctx.lineTo(cx + s * 0.7, cy + s * 0.4 + stemH);
    ctx.lineTo(cx, cy + s * 0.4 + stemH - s * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (suit === '♣') {
    const r = size * 0.3;
    // Three circles
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.85, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.9, cy + r * 0.3, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.9, cy + r * 0.3, r, 0, Math.PI * 2); ctx.fill();
    // Stem
    const sw = r * 0.38;
    ctx.fillRect(cx - sw / 2, cy + r * 0.6, sw, r * 0.85);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy + r * 1.45);
    ctx.lineTo(cx + r * 0.7, cy + r * 1.45);
    ctx.lineTo(cx, cy + r * 1.1);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawCard(ctx, x, y, rank, suit, scale = 1) {
  const cw = Math.round(78 * scale), ch = Math.round(108 * scale), cr = Math.round(10 * scale);
  const isRed = suit === '♥' || suit === '♦';
  const col   = isRed ? '#CC2222' : '#111111';

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;

  // White card body
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, x, y, cw, ch, cr); ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  roundRect(ctx, x, y, cw, ch, cr); ctx.stroke();

  const fs = Math.round(15 * scale);

  // Top-left rank
  ctx.fillStyle = col;
  ctx.font = `bold ${fs}px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText(rank, x + Math.round(6 * scale), y + Math.round(18 * scale));
  // Top-left suit (small path)
  drawSuit(ctx, x + Math.round(10 * scale), y + Math.round(28 * scale), suit, Math.round(7 * scale), col);

  // Center large suit
  drawSuit(ctx, x + cw / 2, y + ch / 2, suit, Math.round(22 * scale), col);

  // Bottom-right (rotated 180°)
  ctx.save();
  ctx.translate(x + cw, y + ch);
  ctx.rotate(Math.PI);
  ctx.fillStyle = col;
  ctx.font = `bold ${fs}px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText(rank, Math.round(6 * scale), Math.round(18 * scale));
  drawSuit(ctx, Math.round(10 * scale), Math.round(28 * scale), suit, Math.round(7 * scale), col);
  ctx.restore();
}

// ─── Cute background helper ───────────────────────────────────────────────────

function drawCuteBg(ctx, W, H, colors) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.5, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // Polka dot decoration
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let dx = 20; dx < W; dx += 40) {
    for (let dy = 20; dy < H; dy += 40) {
      ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawCuteHeader(ctx, W, text, textColor, bgColor) {
  const g = ctx.createLinearGradient(0, 0, W, 52);
  g.addColorStop(0, bgColor);
  g.addColorStop(1, bgColor + 'bb');
  ctx.fillStyle = g;
  roundRect(ctx, 0, 0, W, 52, 20); ctx.fill();
  ctx.fillRect(0, 30, W, 22);

  ctx.fillStyle = textColor;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, 33);
}

function drawResultBanner(ctx, W, cy, text, bgFrom, bgTo, textColor) {
  const bw = 320, bh = 52, bx = W / 2 - bw / 2;
  const g = ctx.createLinearGradient(bx, cy, bx + bw, cy + bh);
  g.addColorStop(0, bgFrom);
  g.addColorStop(1, bgTo);
  ctx.fillStyle = g;
  roundRect(ctx, bx, cy, bw, bh, 26); ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, cy + 33);
}

function drawFooterStats(ctx, W, H, line1, line2) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 20, H - 50, W - 40, 34, 17); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(line1, W / 2, H - 35);

  if (line2) {
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(line2, W / 2, H - 20);
  }
}

// ─── Short number formatter ───────────────────────────────────────────────────

function fmtShort(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K';
  return fmt(n);
}

// ─── Card back (for active blackjack) ────────────────────────────────────────

function drawCardBack(ctx, x, y, scale = 1) {
  const cw = Math.round(70 * scale), ch = Math.round(98 * scale), cr = Math.round(10 * scale);
  ctx.shadowColor = 'rgba(100,50,180,0.4)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
  g.addColorStop(0, '#5B2EA0'); g.addColorStop(1, '#3A1A6A');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, cw, ch, cr); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(200,150,255,0.6)'; ctx.lineWidth = 1.5;
  roundRect(ctx, x + 5, y + 5, cw - 10, ch - 10, cr - 2); ctx.stroke();
  for (let dy = 14; dy < ch - 8; dy += 12) {
    for (let dx = 10; dx < cw - 4; dx += 12) {
      ctx.beginPath(); ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,150,255,0.2)'; ctx.fill();
    }
  }
}

// ─── Gem / Bomb icons for Mines (cute redesign) ──────────────────────────────

function drawGem(ctx, cx, cy, r) {
  ctx.save();
  // Glow aura
  const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.4);
  aura.addColorStop(0, 'rgba(103,232,249,0.45)');
  aura.addColorStop(1, 'rgba(103,232,249,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2); ctx.fill();

  // Main diamond body
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#E0F9FF');
  g.addColorStop(0.3, '#67E8F9');
  g.addColorStop(0.7, '#22D3EE');
  g.addColorStop(1, '#0891B2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx,           cy - r);
  ctx.lineTo(cx + r * 0.6, cy - r * 0.2);
  ctx.lineTo(cx + r * 0.8, cy + r * 0.2);
  ctx.lineTo(cx,           cy + r);
  ctx.lineTo(cx - r * 0.8, cy + r * 0.2);
  ctx.lineTo(cx - r * 0.6, cy - r * 0.2);
  ctx.closePath(); ctx.fill();

  // Inner facet lines
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.2); ctx.lineTo(cx + r * 0.6, cy - r * 0.2); ctx.stroke();

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(cx,           cy - r);
  ctx.lineTo(cx + r * 0.6, cy - r * 0.2);
  ctx.lineTo(cx,           cy - r * 0.05);
  ctx.lineTo(cx - r * 0.6, cy - r * 0.2);
  ctx.closePath(); ctx.fill();

  // Sparkle dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.55, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBomb(ctx, cx, cy, r) {
  ctx.save();
  // Fuse stem
  ctx.strokeStyle = '#92400E'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.42, cy - r * 0.6);
  ctx.quadraticCurveTo(cx + r * 0.8, cy - r * 1.05, cx + r * 0.55, cy - r * 1.25);
  ctx.stroke();
  // Fuse spark
  ctx.fillStyle = '#FDE68A';
  ctx.shadowColor = '#F59E0B'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(cx + r * 0.55, cy - r * 1.25, r * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(cx + 2, cy + r * 0.85, r * 0.68, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();

  // Body gradient
  const bg = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.2, r * 0.05, cx, cy + r * 0.1, r * 0.72);
  bg.addColorStop(0, '#374151');
  bg.addColorStop(0.6, '#1F2937');
  bg.addColorStop(1, '#111827');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.08, r * 0.72, 0, Math.PI * 2); ctx.fill();

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.arc(cx - r * 0.24, cy - r * 0.12, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── Mines result card (cute redesign) ───────────────────────────────────────

export function generateMinesCard({ grid, revealed, bombs, bet, payout, memberName, status }) {
  const GRID = 4, CELL = 90, GAP = 10;
  const GW  = GRID * CELL + (GRID - 1) * GAP;
  const PAD = 22;
  const W   = GW + PAD * 2;   // 426
  const H   = W + 100;        // header + footer
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Background ──────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#052e16');
  bg.addColorStop(0.5, '#064e3b');
  bg.addColorStop(1, '#052e16');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 24); ctx.fill();

  // Radial centre glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.7);
  glow.addColorStop(0, 'rgba(52,211,153,0.12)');
  glow.addColorStop(1, 'rgba(52,211,153,0)');
  ctx.fillStyle = glow;
  roundRect(ctx, 0, 0, W, H, 24); ctx.fill();

  // Sparkles
  const sp = [[38,30],[W-38,28],[22,H-40],[W-24,H-38],[W/2-60,18],[W/2+55,22],[30,H/2],[W-28,H/2+10]];
  for (const [sx,sy] of sp) drawSparkle(ctx, sx, sy, 7, 'rgba(167,243,208,0.55)');

  // ── Header pill ─────────────────────────────────────────────────────────────
  const isLost   = status === 'lost';
  const hText    = isLost ? '💥  Você perdeu!' : '✅  Você ganhou!';
  const hColor   = isLost ? ['#991B1B','#7F1D1D'] : ['#065F46','#064E3B'];

  const hg = ctx.createLinearGradient(PAD, 14, PAD + GW, 58);
  hg.addColorStop(0, hColor[0]); hg.addColorStop(1, hColor[1]);
  ctx.fillStyle = hg;
  roundRect(ctx, PAD, 14, GW, 44, 22); ctx.fill();
  ctx.strokeStyle = isLost ? 'rgba(252,165,165,0.4)' : 'rgba(110,231,183,0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, PAD, 14, GW, 44, 22); ctx.stroke();

  ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 18px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(hText, W / 2, 42);

  // ── Grid wrapper ─────────────────────────────────────────────────────────────
  const gridY = 72;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, PAD - 7, gridY - 7, GW + 14, GW + 14, 20); ctx.fill();

  // Inner grid rim
  ctx.strokeStyle = 'rgba(52,211,153,0.2)'; ctx.lineWidth = 1.5;
  roundRect(ctx, PAD - 7, gridY - 7, GW + 14, GW + 14, 20); ctx.stroke();

  // ── Cells ────────────────────────────────────────────────────────────────────
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const idx  = row * GRID + col;
      const cx   = PAD + col * (CELL + GAP);
      const cy   = gridY + row * (CELL + GAP);
      const rev  = revealed[idx];
      const bomb = grid[idx];

      // Shadow beneath cell
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      roundRect(ctx, cx + 3, cy + 5, CELL, CELL, 18); ctx.fill();

      // Cell background
      const cg = ctx.createLinearGradient(cx, cy, cx, cy + CELL);
      if (rev && bomb) {
        cg.addColorStop(0, '#FCA5A5'); cg.addColorStop(1, '#F87171');
      } else if (rev) {
        cg.addColorStop(0, '#A7F3D0'); cg.addColorStop(1, '#6EE7B7');
      } else {
        cg.addColorStop(0, '#34D399'); cg.addColorStop(1, '#10B981');
      }
      ctx.fillStyle = cg;
      roundRect(ctx, cx, cy, CELL, CELL, 18); ctx.fill();

      // Top gloss
      const gloss = ctx.createLinearGradient(cx, cy, cx, cy + CELL * 0.45);
      gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      roundRect(ctx, cx, cy, CELL, CELL * 0.45, 18); ctx.fill();

      // Border
      ctx.strokeStyle = rev && bomb
        ? 'rgba(239,68,68,0.5)'
        : rev
          ? 'rgba(52,211,153,0.5)'
          : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx, cy, CELL, CELL, 18); ctx.stroke();

      // Icon
      const iconX = cx + CELL / 2, iconY = cy + CELL / 2 + 2;
      if (rev && bomb) drawBomb(ctx, iconX, iconY, 26);
      else if (rev)    drawGem(ctx, iconX, iconY, 26);
    }
  }

  // ── Footer pill ──────────────────────────────────────────────────────────────
  const footerY = gridY + GW + 14;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  roundRect(ctx, PAD, footerY, GW, 54, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  roundRect(ctx, PAD, footerY, GW, 54, 18); ctx.stroke();

  ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center';
  const gainTxt = isLost ? '0' : fmtShort(payout);
  ctx.fillText(`Aposta: ${fmtShort(bet)}   •   Ganhos: ${gainTxt}`, W / 2, footerY + 22);
  ctx.fillStyle = 'rgba(167,243,208,0.7)'; ctx.font = `12px ${FONT}`;
  ctx.fillText(`💣 ${bombs} minas  •  ${memberName}`, W / 2, footerY + 41);

  return canvas.toBuffer('image/png');
}

// ─── Blackjack card ───────────────────────────────────────────────────────────
// Uses the two template images (green = win/playing, red = loss/bust) as
// Renders live cards and values dynamically — no static background image.

export async function generateBlackjackCard({ playerCards, dealerCards, pTotal, dTotal, won, tie, bust, hideDealer = false }) {
  const W = 820, H = 500;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Background: dark/black ──────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0a0a'); bg.addColorStop(0.5, '#111111'); bg.addColorStop(1, '#0d0d0d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 30; x < W; x += 44)
    for (let y = 30; y < H; y += 44) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }

  // ── Title bar ───────────────────────────────────────────────────────────────
  let titleText, titleBg;
  if (hideDealer) { titleText = '🃏 EM JOGO'; titleBg = '#2E7D32'; }
  else if (won)   { titleText = '🏆 VITÓRIA!'; titleBg = '#2E7D32'; }
  else if (tie)   { titleText = '🤝 EMPATE';   titleBg = '#0277BD'; }
  else if (bust)  { titleText = '💥 BUST!';    titleBg = '#B71C1C'; }
  else            { titleText = '❌ DERROTA';  titleBg = '#B71C1C'; }

  const grad = ctx.createLinearGradient(0, 0, W, 52);
  grad.addColorStop(0, titleBg); grad.addColorStop(1, titleBg + 'cc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 52);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(titleText, W / 2, 36);

  // ── Panel + card helper ─────────────────────────────────────────────────────
  function drawPanel(label, cards, total, hideLast, panelY, panelH) {
    // Panel background
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, 18, panelY, W - 36, panelH, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    roundRect(ctx, 18, panelY, W - 36, panelH, 14); ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, 38, panelY + 22);

    // Value badge (top-right)
    const bW = 118, bH = 26, bX = W - 36 - bW, bY = panelY + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, bX, bY, bW, bH, 8); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    const bustTag = bust && !hideLast ? ' 💥' : '';
    ctx.fillText(hideLast ? 'Valor: ?' : `Valor: ${total}${bustTag}`, bX + bW / 2, bY + 18);

    // Cards
    const scale  = 0.92;
    const cardW  = Math.round(78 * scale);
    const cardH  = Math.round(108 * scale);
    const gap    = Math.min(90, (W - 80) / Math.max(cards.length, 1));
    const totalW = cardW + (cards.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const cardY  = panelY + (panelH - cardH) / 2 + 5;

    cards.forEach((card, i) => {
      const cx = Math.round(startX + i * gap);
      if (hideLast && i === cards.length - 1) {
        // Draw card back
        ctx.fillStyle = '#1565C0';
        roundRect(ctx, cx, cardY, cardW, cardH, Math.round(9 * scale)); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
        roundRect(ctx, cx, cardY, cardW, cardH, Math.round(9 * scale)); ctx.stroke();
        // Inner border pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
        roundRect(ctx, cx + 5, cardY + 5, cardW - 10, cardH - 10, 5); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `${Math.round(22 * scale)}px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText('?', cx + cardW / 2, cardY + cardH / 2 + 8);
      } else {
        drawCard(ctx, cx, cardY, card.rank, card.suit, scale);
      }
    });
  }

  // Dealer always shows 2 slots: first face-up, second hidden when hideDealer
  const dealerDisplay = hideDealer && dealerCards.length > 1
    ? [dealerCards[0], dealerCards[1]]   // show 1 up + 1 hidden
    : dealerCards;

  drawPanel('Mão do Dealer', dealerDisplay, dTotal, hideDealer, 60, 188);
  drawPanel('Sua Mão',       playerCards,   pTotal, false,       258, 204);

  return canvas.toBuffer('image/png');
}

// ─── Canvas-drawn economy icons ───────────────────────────────────────────────

function drawEconomyIcon(ctx, cx, cy, type) {
  ctx.save();
  ctx.textAlign = 'center';

  if (type === 'wallet') {
    ctx.fillStyle = '#3CB55A';
    roundRect(ctx, cx - 17, cy - 12, 34, 22, 4); ctx.fill();
    ctx.strokeStyle = '#2A8A40'; ctx.lineWidth = 1;
    roundRect(ctx, cx - 17, cy - 12, 34, 22, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - 9, cy - 3); ctx.lineTo(cx + 9, cy - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 9, cy + 3); ctx.lineTo(cx + 9, cy + 3); ctx.stroke();
    ctx.fillStyle = '#F5C518';
    ctx.beginPath(); ctx.arc(cx + 10, cy + 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#C9A000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx + 10, cy + 10, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#6A4800'; ctx.font = `bold 11px Arial`;
    ctx.fillText('$', cx + 10, cy + 14);

  } else if (type === 'bank') {
    ctx.fillStyle = '#5B9FD5';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 19); ctx.lineTo(cx + 18, cy - 5); ctx.lineTo(cx - 18, cy - 5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4A88C0';
    ctx.fillRect(cx - 15, cy - 5, 30, 17);
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 10 + i * 10, cy - 4, 4, 14);
    ctx.fillStyle = '#2E6EA8'; ctx.fillRect(cx - 17, cy + 12, 34, 5);

  } else if (type === 'coins') {
    const stack = [[cx - 3, cy + 11], [cx + 3, cy + 2], [cx - 1, cy - 8]];
    for (const [x, y] of stack) {
      ctx.fillStyle = '#C9A000';
      ctx.beginPath(); ctx.arc(x + 1, y + 1, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F5C518';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#C9A000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#7A5800'; ctx.font = `bold 11px Arial`;
    ctx.fillText('$', stack[2][0], stack[2][1] + 4);
  }

  ctx.restore();
}

// ─── Balance card (matches reference design) ──────────────────────────────────

function fmtDouble(n) {
  if (n >= 1_000_000) return `${fmt(n)} (${(n / 1_000_000).toFixed(2)}M)`;
  if (n >= 1_000)     return `${fmt(n)} (${(n / 1_000).toFixed(2)}K)`;
  return fmt(n);
}

export async function generateBalanceCard({ username, avatarUrl, balance, bank }) {
  const W   = 460, H = 590;
  const PAD = 18;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Outer gray shell
  ctx.fillStyle = '#E3E3E3';
  roundRect(ctx, 0, 0, W, H, 28); ctx.fill();

  // Inner white card
  ctx.fillStyle = '#F9F9F9';
  roundRect(ctx, 10, 10, W - 20, H - 20, 20); ctx.fill();

  // Avatar
  const AV_R  = 80;
  const AV_CX = W / 2, AV_CY = AV_R + 30;

  // Gray ring
  ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 6, 0, Math.PI * 2); ctx.stroke();

  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    const buf = Buffer.from(await (await fetch(`${avatarUrl}?size=256`)).arrayBuffer());
    const img = await loadImage(buf);
    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    const fallback = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
    fallback.addColorStop(0, '#A855F7'); fallback.addColorStop(1, '#7C3AED');
    ctx.fillStyle = fallback;
    ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // Name pill
  const PILL_Y = AV_CY + AV_R + 18;
  ctx.font = `bold 20px ${FONT}`;
  const nameW  = ctx.measureText(username).width;
  const pillW  = Math.max(nameW + 48, 120), pillH = 38;
  const pillX  = W / 2 - pillW / 2;

  ctx.fillStyle = '#E5E5E5';
  roundRect(ctx, pillX, PILL_Y, pillW, pillH, pillH / 2); ctx.fill();
  ctx.fillStyle = '#1A1A1A'; ctx.textAlign = 'center';
  ctx.fillText(username, W / 2, PILL_Y + 26);

  // Rows
  const ROW_H   = 80;
  const ROW_GAP = 10;
  const ROW_Y0  = PILL_Y + pillH + 24;
  const ICON_R  = 32;

  const rows = [
    { iconType: 'wallet', label: 'Carteira', value: fmtDouble(balance),        colorA: '#B06AF7', colorB: '#7C3AED' },
    { iconType: 'bank',   label: 'Banco',    value: fmtDouble(bank),           colorA: '#9B4FD6', colorB: '#6D28D9' },
    { iconType: 'coins',  label: 'Total',    value: fmtDouble(balance + bank), colorA: '#8B35C8', colorB: '#5B21B6' },
  ];

  rows.forEach(({ iconType, label, value, colorA, colorB }, i) => {
    const ry = ROW_Y0 + i * (ROW_H + ROW_GAP);
    const rw = W - PAD * 2;

    // Row pill
    ctx.fillStyle = '#EBEBEB';
    roundRect(ctx, PAD, ry, rw, ROW_H, ROW_H / 2); ctx.fill();

    // Purple icon circle
    const circleCx = PAD + ICON_R + 5;
    const circleCy = ry + ROW_H / 2;

    const grad = ctx.createRadialGradient(circleCx - 8, circleCy - 8, 4, circleCx, circleCy, ICON_R);
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(circleCx, circleCy, ICON_R, 0, Math.PI * 2); ctx.fill();

    drawEconomyIcon(ctx, circleCx, circleCy, iconType);

    const textX = circleCx + ICON_R + 16;

    ctx.fillStyle = '#1A1A1A'; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(label, textX, ry + 28);

    ctx.fillStyle = '#555555'; ctx.font = `13px ${FONT}`;
    ctx.fillText(value, textX, ry + 52);
  });

  return canvas.toBuffer('image/png');
}

// ─── Top leaderboard card (redesign — no emoji in canvas) ─────────────────────

function drawRankBadge(ctx, cx, cy, rank) {
  let bgColor, textColor;
  if (rank === 1)      { bgColor = '#F5C518'; textColor = '#3A2000'; }
  else if (rank === 2) { bgColor = '#C0C0C0'; textColor = '#1A1A1A'; }
  else if (rank === 3) { bgColor = '#CD7F32'; textColor = '#1A0800'; }
  else                 { bgColor = '#4B1D8A'; textColor = '#DDD0FF'; }

  // Badge circle
  ctx.fillStyle = bgColor;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();

  // Inner ring for top 3
  if (rank <= 3) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.fillStyle   = textColor;
  ctx.font        = `bold 14px ${FONT}`;
  ctx.textAlign   = 'center';
  ctx.fillText(String(rank), cx, cy + 5);
}

function drawCoinAmount(ctx, x, cy, amount) {
  // Small coin circle
  const cr = 9;
  ctx.fillStyle = '#F5C518';
  ctx.beginPath(); ctx.arc(x - cr - 4, cy, cr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3A2000'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('$', x - cr - 4, cy + 3);

  // Amount text
  ctx.fillStyle   = '#C084FC';
  ctx.font        = `bold 15px ${FONT}`;
  ctx.textAlign   = 'right';
  ctx.fillText(fmt(amount), x, cy + 5);
}

export function generateTopCard(entries) {
  const W       = 640;
  const ROW_H   = 62;
  const HDR_H   = 88;
  const H       = HDR_H + entries.length * ROW_H + 20;
  const canvas  = createCanvas(W, H);
  const ctx     = canvas.getContext('2d');

  // Background — dark navy/purple
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0D0D1F');
  bg.addColorStop(1, '#140D26');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 22); ctx.fill();

  // Subtle dot grid
  ctx.fillStyle = 'rgba(180,140,255,0.04)';
  for (let gx = 24; gx < W; gx += 30)
    for (let gy = 24; gy < H; gy += 30) {
      ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill();
    }

  // Header pill
  const hGrad = ctx.createLinearGradient(20, 0, W - 20, 0);
  hGrad.addColorStop(0, '#6B21A8');
  hGrad.addColorStop(1, '#4C1D95');
  ctx.fillStyle = hGrad;
  roundRect(ctx, 20, 14, W - 40, 60, 18); ctx.fill();

  // Trophy icon (drawn) — left side of header
  const tx = 55, ty = 44;
  ctx.fillStyle = '#F5C518';
  // Cup body
  ctx.beginPath();
  ctx.moveTo(tx - 14, ty - 16);
  ctx.lineTo(tx + 14, ty - 16);
  ctx.lineTo(tx + 12, ty + 2);
  ctx.quadraticCurveTo(tx + 12, ty + 14, tx, ty + 14);
  ctx.quadraticCurveTo(tx - 12, ty + 14, tx - 12, ty + 2);
  ctx.closePath(); ctx.fill();
  // Handles
  ctx.strokeStyle = '#F5C518'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(tx - 15, ty - 6, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(tx + 15, ty - 6, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  // Base
  ctx.fillStyle = '#F5C518';
  ctx.fillRect(tx - 6, ty + 14, 12, 5);
  ctx.fillRect(tx - 10, ty + 19, 20, 4);

  ctx.fillStyle   = '#FFFFFF';
  ctx.font        = `bold 18px ${FONT}`;
  ctx.textAlign   = 'center';
  ctx.fillText('TOP ECONOMIA', W / 2 + 14, 41);

  ctx.fillStyle = '#F5C518';
  ctx.font      = `12px ${FONT}`;
  ctx.fillText('FallenCoins', W / 2 + 14, 60);

  // Rows
  entries.forEach((e, i) => {
    const ry = HDR_H + i * ROW_H;

    // Row background
    const rowBg = ctx.createLinearGradient(16, ry, W - 16, ry);
    rowBg.addColorStop(0, i % 2 === 0 ? '#14142A' : '#1A1732');
    rowBg.addColorStop(1, i % 2 === 0 ? '#18163A' : '#1E1A3C');
    ctx.fillStyle = rowBg;
    roundRect(ctx, 16, ry + 5, W - 32, ROW_H - 8, 14); ctx.fill();

    // Subtle left accent line for top 3
    if (i < 3) {
      const accentColor = i === 0 ? '#F5C518' : i === 1 ? '#C0C0C0' : '#CD7F32';
      ctx.fillStyle = accentColor;
      roundRect(ctx, 16, ry + 5, 4, ROW_H - 8, 2); ctx.fill();
    }

    const cy = ry + ROW_H / 2 + 3;

    // Rank badge
    drawRankBadge(ctx, 54, cy, i + 1);

    // Username
    const maxNameW = W - 250;
    ctx.fillStyle   = '#FFFFFF';
    ctx.font        = `bold 15px ${FONT}`;
    ctx.textAlign   = 'left';
    let name = e.username;
    while (ctx.measureText(name).width > maxNameW && name.length > 1)
      name = name.slice(0, -1);
    if (name !== e.username) name += '...';
    ctx.fillText(name, 88, cy + 5);

    // Coin amount
    drawCoinAmount(ctx, W - 22, cy, e.total);
  });

  return canvas.toBuffer('image/png');
}

// ─── Coinflip card (cute) ─────────────────────────────────────────────────────

export function generateCoinflipCard({ side, resultado, won, bet, userBalance }) {
  const W = 700, H = 380;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawCuteBg(ctx, W, H, won ? ['#3B1F6A', '#6A2D9A', '#9B4FD6'] : ['#2A2A4A', '#3A3A6A', '#5A5A8A']);

  // Sparkle decorations
  const sparkles = won
    ? [[80,60],[620,50],[100,310],[600,300],[350,40],[180,320]]
    : [[80,60],[620,50],[100,310],[600,300]];
  for (const [sx, sy] of sparkles) drawSparkle(ctx, sx, sy, 12, won ? 'rgba(255,210,80,0.4)' : 'rgba(180,180,220,0.25)');

  drawCuteHeader(ctx, W, '🪙   C O I N F L I P   🪙', won ? '#FFE0A0' : '#C0C8FF', won ? '#4A2A00' : '#1E1E3A');

  // Coin
  const cx = W / 2, cy = 195, cr = 95;

  // Glow ring
  const glowGrad = ctx.createRadialGradient(cx, cy, cr * 0.3, cx, cy, cr * 1.6);
  glowGrad.addColorStop(0, won ? 'rgba(255,200,50,0.45)' : 'rgba(120,120,180,0.25)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath(); ctx.arc(cx, cy, cr * 1.6, 0, Math.PI * 2); ctx.fill();

  // Coin gradient
  const coinGrad = ctx.createRadialGradient(cx - 25, cy - 25, 8, cx, cy, cr);
  if (won) {
    coinGrad.addColorStop(0, '#FFF0A0');
    coinGrad.addColorStop(0.4, '#F5C518');
    coinGrad.addColorStop(0.8, '#D4A017');
    coinGrad.addColorStop(1, '#8A6000');
  } else {
    coinGrad.addColorStop(0, '#D0D0E8');
    coinGrad.addColorStop(0.5, '#9090B8');
    coinGrad.addColorStop(1, '#505070');
  }
  ctx.fillStyle = coinGrad;
  ctx.shadowColor = won ? 'rgba(255,193,7,0.6)' : 'rgba(80,80,120,0.4)';
  ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Coin rim
  ctx.strokeStyle = won ? 'rgba(255,230,100,0.8)' : 'rgba(160,160,200,0.6)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = won ? 'rgba(255,255,200,0.3)' : 'rgba(200,200,230,0.2)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, cr - 14, 0, Math.PI * 2); ctx.stroke();

  // Coin text
  ctx.fillStyle = won ? '#4A3000' : '#B0B0D0';
  ctx.font = `bold 24px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(resultado === 'cara' ? 'CARA' : 'COROA', cx, cy + 9);

  // Result pill
  const resText = won ? '✨  ACERTOU!' : '❌  ERROU';
  const rFrom = won ? '#1A7A3A' : '#7A2020';
  const rTo   = won ? '#2ECC70' : '#CC3030';
  drawResultBanner(ctx, W, 315, resText, rFrom, rTo, '#FFFFFF');

  drawFooterStats(ctx, W, H,
    `${won ? '+' : '-'}${fmt(bet)} 💰  •  Saldo: ${fmt(userBalance)} 💰`,
    `Aposta: ${fmt(bet)} 💰`
  );

  return canvas.toBuffer('image/png');
}

// ─── Dice card (cute) ─────────────────────────────────────────────────────────

const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
};

function drawDie(ctx, x, y, size, value, highlight = false) {
  const r = 18;

  ctx.shadowColor = 'rgba(80,0,120,0.4)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;

  const dieGrad = ctx.createLinearGradient(x, y, x + size, y + size);
  if (highlight) {
    dieGrad.addColorStop(0, '#F0E8FF');
    dieGrad.addColorStop(1, '#DDD0F8');
  } else {
    dieGrad.addColorStop(0, '#FFFFFF');
    dieGrad.addColorStop(1, '#F0F0F8');
  }
  ctx.fillStyle = dieGrad;
  roundRect(ctx, x, y, size, size, r); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.strokeStyle = highlight ? '#9B4FD6' : 'rgba(160,130,210,0.5)'; ctx.lineWidth = 2.5;
  roundRect(ctx, x, y, size, size, r); ctx.stroke();

  ctx.fillStyle = highlight ? '#7A1DB8' : '#5A4A8A';
  (PIPS[value] || []).forEach(([px, py]) => {
    const dot = size * 0.11;
    ctx.beginPath(); ctx.arc(x + px * size, y + py * size, dot, 0, Math.PI * 2); ctx.fill();
  });
}

export function generateDiceCard({ playerDie, botDie, won, tie, bet, payout, userBalance }) {
  const W = 700, H = 390;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawCuteBg(ctx, W, H, won ? ['#1E3A5A', '#2E5C8A', '#4A7EB8'] : tie ? ['#2A3A1A', '#3A5A2A', '#5A7A3A'] : ['#3A1E2A', '#5A2E3A', '#7A4A5A']);

  for (const [sx, sy] of [[60,50],[620,60],[80,320],[600,310],[350,50]]) {
    drawSparkle(ctx, sx, sy, 11, 'rgba(255,255,255,0.2)');
  }

  const accent = won ? '#B0E0FF' : tie ? '#C0FFB0' : '#FFB0C0';
  drawCuteHeader(ctx, W, '🎲  J O G O  D E  D A D O S  🎲', accent, won ? '#0A2040' : tie ? '#0A2A0A' : '#2A0A14');

  // Player/Bot labels
  ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('✦ VOCÊ ✦', W / 2 - 125, 102);
  ctx.fillText('✦ BOT ✦', W / 2 + 125, 102);

  const dSize = 130, dY = 120;
  drawDie(ctx, W / 2 - 190, dY, dSize, playerDie, won || tie);
  drawDie(ctx, W / 2 + 60,  dY, dSize, botDie,    false);

  // VS badge
  const vsBg = ctx.createRadialGradient(W/2, dY + dSize/2, 5, W/2, dY + dSize/2, 28);
  vsBg.addColorStop(0, 'rgba(255,220,80,0.9)');
  vsBg.addColorStop(1, 'rgba(200,140,20,0.85)');
  ctx.fillStyle = vsBg;
  ctx.beginPath(); ctx.arc(W/2, dY + dSize/2, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3A2000'; ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('VS', W/2, dY + dSize/2 + 5);

  const resText = won ? '🎉  VOCÊ GANHOU!' : tie ? '🤝  EMPATE!' : '🤖  BOT GANHOU';
  const rFrom   = won ? '#1A6A2A' : tie ? '#1A4A8A' : '#8A1A2A';
  const rTo     = won ? '#2ECC70' : tie ? '#3A80F0' : '#D63060';
  drawResultBanner(ctx, W, 280, resText, rFrom, rTo, '#FFFFFF');

  const change = tie ? 0 : won ? payout - bet : bet;
  const sign   = won ? '+' : tie ? '±' : '-';
  drawFooterStats(ctx, W, H,
    `${sign}${fmt(change)} 💰  •  Saldo: ${fmt(userBalance)} 💰`,
    `Aposta: ${fmt(bet)} 💰`
  );

  return canvas.toBuffer('image/png');
}

// ─── Slots card (cute kawaii) ─────────────────────────────────────────────────

export function generateSlotsCard({ reels, won, betAmount, changeAmount, userBalance, multiplier }) {
  const W = 700, H = 400;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawCuteBg(ctx, W, H, won ? ['#3A1054', '#6A1E8A', '#9B2FD6'] : ['#1A1A3A', '#2A2050', '#3A2870']);

  for (const [sx, sy] of [[50,45],[640,55],[80,340],[600,330],[350,40],[200,360]]) {
    drawSparkle(ctx, sx, sy, 12, won ? 'rgba(255,200,80,0.45)' : 'rgba(180,160,255,0.25)');
  }

  drawCuteHeader(ctx, W, '🌸  C A Ç A - N Í Q U E L  🌸', won ? '#FFE0A0' : '#C0B0FF', won ? '#3A0A5A' : '#0A0A2A');

  // Machine body — soft rounded
  const machBg = ctx.createLinearGradient(20, 58, 20, 58 + 200);
  machBg.addColorStop(0, 'rgba(255,255,255,0.10)');
  machBg.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = machBg;
  roundRect(ctx, 20, 58, W - 40, 200, 18); ctx.fill();
  ctx.strokeStyle = won ? 'rgba(255,200,80,0.5)' : 'rgba(180,150,255,0.3)'; ctx.lineWidth = 2;
  roundRect(ctx, 20, 58, W - 40, 200, 18); ctx.stroke();

  // Center win line
  ctx.strokeStyle = won ? 'rgba(255,210,60,0.6)' : 'rgba(150,130,210,0.2)'; ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.moveTo(36, 162); ctx.lineTo(W - 36, 162); ctx.stroke();
  ctx.setLineDash([]);

  // Reel boxes
  const reelW = 140, reelH = 148, gap = (W - 40 - 3 * reelW) / 4;
  const allMatch = reels.every(s => s === reels[0]);

  reels.forEach((sym, i) => {
    const rx = 20 + gap + i * (reelW + gap);
    const ry = 80;

    const reelGrad = ctx.createLinearGradient(rx, ry, rx, ry + reelH);
    if (allMatch) {
      reelGrad.addColorStop(0, 'rgba(255,230,80,0.25)');
      reelGrad.addColorStop(1, 'rgba(255,180,20,0.15)');
    } else {
      reelGrad.addColorStop(0, 'rgba(255,255,255,0.10)');
      reelGrad.addColorStop(1, 'rgba(255,255,255,0.04)');
    }
    ctx.fillStyle = reelGrad;
    roundRect(ctx, rx, ry, reelW, reelH, 14); ctx.fill();

    ctx.strokeStyle = allMatch ? 'rgba(255,210,60,0.9)' : 'rgba(180,150,255,0.35)';
    ctx.lineWidth = allMatch ? 2.5 : 1.5;
    roundRect(ctx, rx, ry, reelW, reelH, 14); ctx.stroke();

    // Symbol
    ctx.font = `64px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(sym, rx + reelW / 2, ry + reelH / 2 + 22);
  });

  // Multiplier badge
  if (won && multiplier) {
    const mbg = ctx.createLinearGradient(W/2 - 70, 270, W/2 + 70, 298);
    mbg.addColorStop(0, '#F5C518');
    mbg.addColorStop(1, '#E0A010');
    ctx.fillStyle = mbg;
    roundRect(ctx, W/2 - 70, 270, 140, 30, 15); ctx.fill();
    ctx.fillStyle = '#3A2000';
    ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(`✨ ${multiplier}× MULTIPLICADOR ✨`, W/2, 290);
  }

  const resText = won ? `🎉  +${fmt(changeAmount)} 💰` : `💔  -${fmt(changeAmount)} 💰`;
  ctx.fillStyle = won ? '#88FFB8' : '#FFB0B8';
  ctx.font      = `bold 24px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(resText, W/2, 330);

  drawFooterStats(ctx, W, H,
    `Saldo: ${fmt(userBalance)} 💰`,
    `Aposta: ${fmt(betAmount)} 💰`
  );

  return canvas.toBuffer('image/png');
}

// ─── Roulette card (cute) ─────────────────────────────────────────────────────

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export function generateRouletteCard({ spin, escolha, won, bet, winAmt, userBalance, mult }) {
  const W = 700, H = 400;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const isRed   = RED_NUMS.has(spin);
  const isGreen = spin === 0;

  const bgColors = isGreen
    ? ['#0A3A1A', '#1A5A2A', '#2A7A3A']
    : isRed
    ? ['#3A0A1A', '#6A1A2A', '#9A2A3A']
    : ['#1A1A3A', '#2A2A5A', '#3A3A7A'];

  drawCuteBg(ctx, W, H, bgColors);

  for (const [sx, sy] of [[60,50],[620,60],[80,330],[600,320],[350,50]]) {
    drawSparkle(ctx, sx, sy, 11, 'rgba(255,255,255,0.2)');
  }

  drawCuteHeader(ctx, W, '🎡  R O L E T A  🎡', '#FFE0FF', '#2A0A3A');

  // Wheel
  const wx = W / 2, wy = 185, wr = 110;

  const outerRing = ctx.createRadialGradient(wx - 30, wy - 30, 20, wx, wy, wr + 10);
  outerRing.addColorStop(0, 'rgba(255,200,255,0.25)');
  outerRing.addColorStop(1, 'rgba(180,100,220,0.15)');
  ctx.fillStyle = outerRing;
  ctx.beginPath(); ctx.arc(wx, wy, wr + 18, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(200,150,255,0.7)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(wx, wy, wr + 10, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,150,255,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(wx, wy, wr + 2, 0, Math.PI * 2); ctx.stroke();

  // Inner disc
  const spinCol = isGreen ? '#1E8A3A' : isRed ? '#CC1A3A' : '#2A2A5A';
  const discGrad = ctx.createRadialGradient(wx - 25, wy - 25, 15, wx, wy, wr);
  discGrad.addColorStop(0, isGreen ? '#3ACC6A' : isRed ? '#F03060' : '#4A4A9A');
  discGrad.addColorStop(1, spinCol);
  ctx.fillStyle = discGrad;
  ctx.shadowColor = spinCol; ctx.shadowBlur = 35;
  ctx.beginPath(); ctx.arc(wx, wy, wr - 4, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 58px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(String(spin), wx, wy + 20);

  const colLabel = isGreen ? '🟢 Verde' : isRed ? '🔴 Vermelho' : '⚫ Preto';
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `14px ${FONT}`;
  ctx.fillText(colLabel, W/2, wy + wr + 22);

  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `13px ${FONT}`;
  ctx.fillText(`Você apostou em: ${escolha.toUpperCase()}`, W/2, wy + wr + 44);

  const resText = won ? `🎉  GANHOU  (×${mult})` : '💔  PERDEU';
  const rFrom   = won ? '#1A7A3A' : '#8A1A2A';
  const rTo     = won ? '#3ACC70' : '#D03050';
  drawResultBanner(ctx, W, 315, resText, rFrom, rTo, '#FFFFFF');

  const change = won ? winAmt - bet : bet;
  const sign   = won ? '+' : '-';
  drawFooterStats(ctx, W, H,
    `${sign}${fmt(change)} 💰  •  Saldo: ${fmt(userBalance)} 💰`,
    `Aposta: ${fmt(bet)} 💰`
  );

  return canvas.toBuffer('image/png');
}
