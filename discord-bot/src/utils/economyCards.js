import { createCanvas, loadImage } from '@napi-rs/canvas';

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

// ─── Playing card ─────────────────────────────────────────────────────────────

function drawCard(ctx, x, y, rank, suit, scale = 1) {
  const cw = Math.round(70 * scale), ch = Math.round(98 * scale), cr = Math.round(7 * scale);
  const isRed = suit === '♥' || suit === '♦';
  const col   = isRed ? '#CC1111' : '#141414';

  ctx.shadowColor   = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur    = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle     = '#FAFAFA';
  roundRect(ctx, x, y, cw, ch, cr);
  ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.strokeStyle = '#DDDDDD'; ctx.lineWidth = 1;
  roundRect(ctx, x, y, cw, ch, cr); ctx.stroke();

  ctx.fillStyle = col;
  ctx.font = `bold ${Math.round(13 * scale)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(rank, x + Math.round(5 * scale), y + Math.round(16 * scale));
  ctx.font = `${Math.round(11 * scale)}px ${FONT}`;
  ctx.fillText(suit, x + Math.round(5 * scale), y + Math.round(28 * scale));

  ctx.font = `${Math.round(30 * scale)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(suit, x + cw / 2, y + ch / 2 + Math.round(10 * scale));

  ctx.save();
  ctx.translate(x + cw, y + ch);
  ctx.rotate(Math.PI);
  ctx.fillStyle = col;
  ctx.font = `bold ${Math.round(13 * scale)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(rank, Math.round(5 * scale), Math.round(16 * scale));
  ctx.font = `${Math.round(11 * scale)}px ${FONT}`;
  ctx.fillText(suit, Math.round(5 * scale), Math.round(28 * scale));
  ctx.restore();
}

function drawScoreBadge(ctx, cx, y, text, dim = false) {
  ctx.font = `bold 13px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const pw = tw + 28, ph = 26;

  ctx.fillStyle = dim ? '#111111' : '#1a1a1a';
  roundRect(ctx, cx - pw / 2, y, pw, ph, 4);
  ctx.fill();
  ctx.strokeStyle = '#444444'; ctx.lineWidth = 1;
  roundRect(ctx, cx - pw / 2, y, pw, ph, 4); ctx.stroke();

  ctx.fillStyle = '#EEEEEE';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, y + 17);
}

// ─── Blackjack casino table ────────────────────────────────────────────────────

export function generateBlackjackCard({ playerCards, dealerCards, pTotal, dTotal, won, tie, bust, bet, payout, userBalance }) {
  const W = 920, H = 490;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Outer background ────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);

  // Subtle stripe texture
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let ly = 0; ly < H; ly += 3) {
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
  }

  // ── Title bar ───────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(0, 0, W, 46);
  ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(W, 46); ctx.stroke();
  ctx.strokeStyle = 'rgba(201,162,39,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 49); ctx.lineTo(W, 49); ctx.stroke();

  ctx.fillStyle = '#C9A227';
  ctx.font      = `bold 19px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('♠   B L A C K J A C K   ♠', W / 2, 30);

  // ── Corner decorations ──────────────────────────────────────────────────────
  for (const [cx, cy] of [[28, 28], [W - 28, 28], [28, H - 28], [W - 28, H - 28]]) {
    ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#C9A227';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  }

  // ── Green felt oval ─────────────────────────────────────────────────────────
  const ox = W / 2, oy = H / 2 + 22, rx = 408, ry = 192;

  ctx.beginPath();
  ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1e6640';
  ctx.fill();

  // Felt gradient overlay (light source from top)
  const feltGrad = ctx.createRadialGradient(ox, oy - 60, 60, ox, oy, rx);
  feltGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
  feltGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = feltGrad; ctx.fill();

  // Outer gold oval border
  ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();

  // Inner gold oval border
  ctx.strokeStyle = 'rgba(201,162,39,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(ox, oy, rx - 10, ry - 10, 0, 0, Math.PI * 2); ctx.stroke();

  // Dashed inner oval
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = 'rgba(201,162,39,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(ox, oy, rx - 26, ry - 26, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // ── DEALER area ─────────────────────────────────────────────────────────────
  const dZoneY = oy - ry + 18;

  drawScoreBadge(ctx, ox, dZoneY, `DEALER  •  ${dTotal}`);

  const dCount  = dealerCards.length;
  const dGap    = Math.min(78, (rx * 1.4) / dCount);
  const dStartX = ox - ((dCount - 1) * dGap) / 2 - 35;
  dealerCards.forEach((c, i) => drawCard(ctx, dStartX + i * dGap, dZoneY + 34, c.rank, c.suit));

  // ── Center result banner ─────────────────────────────────────────────────────
  const BANNER_TEXT = won ? '✅   VITÓRIA' : tie ? '🤝   EMPATE' : bust ? '💥   BUST!' : '❌   DERROTA';
  const BANNER_BG   = won ? '#0f3d1c' : tie ? '#0d2340' : '#3d0f0f';
  const BANNER_STR  = won ? '#3FB950' : tie ? '#58A6FF' : '#CC3333';

  ctx.fillStyle = BANNER_BG;
  roundRect(ctx, ox - 170, oy - 28, 340, 56, 8); ctx.fill();
  ctx.strokeStyle = BANNER_STR; ctx.lineWidth = 2;
  roundRect(ctx, ox - 170, oy - 28, 340, 56, 8); ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font      = `bold 23px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(BANNER_TEXT, ox, oy + 9);

  // ── PLAYER area ─────────────────────────────────────────────────────────────
  const pZoneY = oy + 36;

  const bustLabel = bust ? ` 💥` : '';
  drawScoreBadge(ctx, ox, pZoneY, `VOCÊ  •  ${pTotal}${bustLabel}`);

  const pCount  = playerCards.length;
  const pGap    = Math.min(78, (rx * 1.4) / pCount);
  const pStartX = ox - ((pCount - 1) * pGap) / 2 - 35;
  playerCards.forEach((c, i) => drawCard(ctx, pStartX + i * pGap, pZoneY + 34, c.rank, c.suit));

  // ── Footer ──────────────────────────────────────────────────────────────────
  const sign   = won ? '+' : tie ? '±' : '-';
  const change = tie ? 0 : won ? payout - bet : bet;
  ctx.fillStyle = won ? '#3FB950' : tie ? '#8B949E' : '#F85149';
  ctx.font      = `bold 13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${sign}${fmt(change)} 💰  •  Saldo: ${fmt(userBalance)} 💰`, W - 20, H - 10);

  return canvas.toBuffer('image/png');
}

// ─── Canvas-drawn economy icons ───────────────────────────────────────────────

function drawEconomyIcon(ctx, cx, cy, type) {
  ctx.save();
  ctx.textAlign = 'center';

  if (type === 'wallet') {
    // Green money bill
    ctx.fillStyle = '#3CB55A';
    roundRect(ctx, cx - 17, cy - 12, 34, 22, 4); ctx.fill();
    ctx.strokeStyle = '#2A8A40'; ctx.lineWidth = 1;
    roundRect(ctx, cx - 17, cy - 12, 34, 22, 4); ctx.stroke();
    // Bill texture lines
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - 9, cy - 3); ctx.lineTo(cx + 9, cy - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 9, cy + 3); ctx.lineTo(cx + 9, cy + 3); ctx.stroke();
    // Gold coin
    ctx.fillStyle = '#F5C518';
    ctx.beginPath(); ctx.arc(cx + 10, cy + 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#C9A000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx + 10, cy + 10, 10, 0, Math.PI * 2); ctx.stroke();
    // $ on coin
    ctx.fillStyle = '#6A4800'; ctx.font = `bold 11px Arial`;
    ctx.fillText('$', cx + 10, cy + 14);

  } else if (type === 'bank') {
    // Roof / pediment
    ctx.fillStyle = '#5B9FD5';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 19); ctx.lineTo(cx + 18, cy - 5); ctx.lineTo(cx - 18, cy - 5);
    ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = '#4A88C0';
    ctx.fillRect(cx - 15, cy - 5, 30, 17);
    // Columns (white)
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 10 + i * 10, cy - 4, 4, 14);
    // Base
    ctx.fillStyle = '#2E6EA8'; ctx.fillRect(cx - 17, cy + 12, 34, 5);

  } else if (type === 'coins') {
    // Three stacked coins (back to front)
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

// ─── Balance card (matches the reference photo) ──────────────────────────────

export async function generateBalanceCard({ username, avatarUrl, balance, bank }) {
  const W   = 480, H = 610;
  const PAD = 18;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Outer light gray background ─────────────────────────────────────────────
  ctx.fillStyle = '#E8E8E8';
  roundRect(ctx, 0, 0, W, H, 26); ctx.fill();

  // ── White inner card ────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 8, 8, W - 16, H - 16, 20); ctx.fill();

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const AV_R  = 90;
  const AV_CX = W / 2, AV_CY = AV_R + 24;

  // Gray ring (thick)
  ctx.strokeStyle = '#D0D0D0'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 5, 0, Math.PI * 2); ctx.stroke();

  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    const buf = Buffer.from(await (await fetch(`${avatarUrl}?size=256`)).arrayBuffer());
    const img = await loadImage(buf);
    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#CCCCCC'; ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // ── Username pill (fully rounded, gray) ──────────────────────────────────────
  const PILL_Y = AV_CY + AV_R + 18;
  ctx.font = `bold 22px ${FONT}`;
  const nameW = ctx.measureText(username).width;
  const pillW = Math.max(nameW + 52, 120), pillH = 40;
  const pillX = W / 2 - pillW / 2;

  ctx.fillStyle = '#EBEBEB';
  roundRect(ctx, pillX, PILL_Y, pillW, pillH, pillH / 2); ctx.fill();

  ctx.fillStyle = '#111111'; ctx.textAlign = 'center';
  ctx.fillText(username, W / 2, PILL_Y + 28);

  // ── Rows ─────────────────────────────────────────────────────────────────────
  const ROW_H   = 84;
  const ROW_GAP = 8;
  const ROW_Y0  = PILL_Y + pillH + 22;
  const CIRCLE_R = 34;

  const rows = [
    { iconType: 'wallet', label: 'Carteira', value: fmt(balance),          colorA: '#A855F7', colorB: '#7C3AED' },
    { iconType: 'bank',   label: 'Banco',    value: fmt(bank),             colorA: '#9333EA', colorB: '#6D28D9' },
    { iconType: 'coins',  label: 'Total',    value: fmt(balance + bank),   colorA: '#7C3AED', colorB: '#5B21B6' },
  ];

  rows.forEach(({ iconType, label, value, colorA, colorB }, i) => {
    const ry = ROW_Y0 + i * (ROW_H + ROW_GAP);
    const rw = W - PAD * 2;

    // Row background (light gray rounded rect)
    ctx.fillStyle = '#EBEBEB';
    roundRect(ctx, PAD, ry, rw, ROW_H, ROW_H / 2); ctx.fill();

    // Purple gradient circle (left side, inside the row)
    const circleCx = PAD + CIRCLE_R + 5;
    const circleCy = ry + ROW_H / 2;

    const grad = ctx.createRadialGradient(circleCx - 8, circleCy - 8, 5, circleCx, circleCy, CIRCLE_R);
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(circleCx, circleCy, CIRCLE_R, 0, Math.PI * 2); ctx.fill();

    // Icon inside circle
    drawEconomyIcon(ctx, circleCx, circleCy, iconType);

    // Label + value text
    const textX = circleCx + CIRCLE_R + 16;

    ctx.fillStyle = '#111111'; ctx.font = `bold 18px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(label, textX, ry + 32);

    ctx.fillStyle = '#666666'; ctx.font = `15px ${FONT}`;
    ctx.fillText(value, textX, ry + 56);
  });

  return canvas.toBuffer('image/png');
}

// ─── Top leaderboard card ─────────────────────────────────────────────────────

export function generateTopCard(entries) {
  const W     = 620;
  const ROW_H = 56;
  const H     = 68 + entries.length * ROW_H + 24;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#F2F2F2';
  roundRect(ctx, 0, 0, W, H, 18); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 10, 10, W - 20, H - 20, 12); ctx.fill();

  // Header
  ctx.fillStyle = '#9B4FD6';
  roundRect(ctx, 10, 10, W - 20, 50, 12); ctx.fill();
  ctx.fillRect(10, 38, W - 20, 22);

  ctx.fillStyle = '#FFFFFF';
  ctx.font      = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('🏆  TOP ECONOMIA — FallenCoins', W / 2, 41);

  const MEDALS = ['🥇', '🥈', '🥉'];

  entries.forEach((e, i) => {
    const y = 70 + i * ROW_H;
    ctx.fillStyle = i % 2 === 0 ? '#F7F7F7' : '#FFFFFF';
    roundRect(ctx, 16, y, W - 32, ROW_H - 6, 10); ctx.fill();

    ctx.font      = `bold 16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText(MEDALS[i] ?? `#${i + 1}`, 30, y + 33);

    ctx.fillStyle = '#333333';
    ctx.font      = `bold 14px ${FONT}`;
    ctx.fillText(e.username, 70, y + 33);

    ctx.fillStyle = '#9B4FD6';
    ctx.font      = `bold 15px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(e.total)} 💰`, W - 30, y + 33);
  });

  return canvas.toBuffer('image/png');
}

// ─── Coinflip card ────────────────────────────────────────────────────────────

export function generateCoinflipCard({ side, resultado, won, bet, userBalance }) {
  const W = 700, H = 360;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Dark bg
  ctx.fillStyle = '#12121f';
  roundRect(ctx, 0, 0, W, H, 16); ctx.fill();

  // Header
  const accentCol = won ? '#F5C518' : '#888888';
  ctx.fillStyle = '#0c0c18';
  roundRect(ctx, 0, 0, W, 44, 8); ctx.fill(); ctx.fillRect(0, 30, W, 14);
  ctx.fillStyle = accentCol;
  ctx.font      = `bold 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('🪙   C O I N F L I P', W / 2, 27);

  // Coin circle
  const cx = W / 2, cy = 192, cr = 90;

  // Glow
  const glow = ctx.createRadialGradient(cx, cy, cr * 0.3, cx, cy, cr * 1.4);
  glow.addColorStop(0, won ? 'rgba(255,193,7,0.35)' : 'rgba(100,100,120,0.25)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, cr * 1.4, 0, Math.PI * 2); ctx.fill();

  // Coin bg
  const coinGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, cr);
  if (won) {
    coinGrad.addColorStop(0, '#FFE066');
    coinGrad.addColorStop(0.5, '#F5C518');
    coinGrad.addColorStop(1, '#B8860B');
  } else {
    coinGrad.addColorStop(0, '#B0B0C0');
    coinGrad.addColorStop(0.5, '#808090');
    coinGrad.addColorStop(1, '#404050');
  }
  ctx.fillStyle = coinGrad;
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();

  // Coin border
  ctx.strokeStyle = won ? '#7A5C00' : '#303040'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke();

  // Inner ring
  ctx.strokeStyle = won ? 'rgba(255,255,200,0.4)' : 'rgba(200,200,220,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, cr - 12, 0, Math.PI * 2); ctx.stroke();

  // Coin text
  ctx.fillStyle = won ? '#5A3E00' : '#C8C8D8';
  ctx.font      = `bold 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(resultado === 'cara' ? 'CARA' : 'COROA', cx, cy + 8);

  // Result + badge
  const resText = won ? '✅  ACERTOU!' : '❌  ERROU';
  ctx.fillStyle = won ? '#3FB950' : '#F85149';
  ctx.font      = `bold 19px ${FONT}`;
  ctx.fillText(resText, W / 2, 310);

  ctx.fillStyle = '#888';
  ctx.font      = `13px ${FONT}`;
  ctx.fillText(`Aposta: ${fmt(bet)} 💰  •  ${won ? '+' : '-'}${fmt(bet)} 💰  •  Saldo: ${fmt(userBalance)} 💰`, W / 2, 338);

  return canvas.toBuffer('image/png');
}

// ─── Dice card (with pip dots) ────────────────────────────────────────────────

const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
};

function drawDie(ctx, x, y, size, value, highlight = false) {
  const r = 12;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  ctx.fillStyle = highlight ? '#F5F5FF' : '#FFFFFF';
  roundRect(ctx, x, y, size, size, r); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.strokeStyle = highlight ? '#9B4FD6' : '#DDDDDD'; ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, r); ctx.stroke();

  ctx.fillStyle = highlight ? '#6A1DA8' : '#222222';
  (PIPS[value] || []).forEach(([px, py]) => {
    const dot = size * 0.11;
    ctx.beginPath(); ctx.arc(x + px * size, y + py * size, dot, 0, Math.PI * 2); ctx.fill();
  });
}

export function generateDiceCard({ playerDie, botDie, won, tie, bet, payout, userBalance }) {
  const W = 700, H = 360;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#12121f';
  roundRect(ctx, 0, 0, W, H, 16); ctx.fill();

  ctx.fillStyle = '#0c0c18';
  roundRect(ctx, 0, 0, W, 44, 8); ctx.fill(); ctx.fillRect(0, 30, W, 14);
  ctx.fillStyle = '#8B949E';
  ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('🎲   J O G O  D E  D A D O S', W / 2, 27);

  // Labels
  ctx.fillStyle = '#8B949E'; ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('VOCÊ', W / 2 - 120, 100);
  ctx.fillText('BOT', W / 2 + 120, 100);

  const dSize = 130;
  const dY    = 118;

  drawDie(ctx, W / 2 - 180, dY, dSize, playerDie, won || tie);
  drawDie(ctx, W / 2 + 50,  dY, dSize, botDie,    false);

  // VS text
  ctx.fillStyle = '#C9A227'; ctx.font = `bold 28px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('VS', W / 2, dY + dSize / 2 + 10);

  const accentColor = won ? '#3FB950' : tie ? '#F5C518' : '#F85149';
  const resText     = won ? '✅  VOCÊ GANHOU' : tie ? '🤝  EMPATE' : '❌  BOT GANHOU';

  ctx.fillStyle = accentColor; ctx.font = `bold 19px ${FONT}`;
  ctx.fillText(resText, W / 2, 302);

  ctx.fillStyle = '#888'; ctx.font = `13px ${FONT}`;
  const change = tie ? 0 : won ? payout - bet : bet;
  const sign   = won ? '+' : tie ? '±' : '-';
  ctx.fillText(`Aposta: ${fmt(bet)} 💰  •  ${sign}${fmt(change)} 💰  •  Saldo: ${fmt(userBalance)} 💰`, W / 2, 330);

  return canvas.toBuffer('image/png');
}

// ─── Slots card ───────────────────────────────────────────────────────────────

export function generateSlotsCard({ reels, won, betAmount, changeAmount, userBalance, multiplier }) {
  const W = 700, H = 380;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const accent = won ? '#F5C518' : '#555555';

  ctx.fillStyle = '#12121f';
  roundRect(ctx, 0, 0, W, H, 16); ctx.fill();

  // Header
  ctx.fillStyle = '#0c0c18';
  roundRect(ctx, 0, 0, W, 44, 8); ctx.fill(); ctx.fillRect(0, 30, W, 14);

  // Slot machine chrome border
  ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 2;
  roundRect(ctx, 10, 10, W - 20, H - 20, 12); ctx.stroke();

  ctx.fillStyle = '#C9A227'; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('🎰   C A Ç A - N Í Q U E L', W / 2, 27);

  // Machine body
  ctx.fillStyle = '#1e1e2e';
  roundRect(ctx, 24, 60, W - 48, 190, 12); ctx.fill();
  ctx.strokeStyle = '#3a3a5a'; ctx.lineWidth = 1.5;
  roundRect(ctx, 24, 60, W - 48, 190, 12); ctx.stroke();

  // Slot highlight line (center)
  ctx.strokeStyle = won ? 'rgba(255,193,7,0.5)' : 'rgba(100,100,120,0.3)'; ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(30, 160); ctx.lineTo(W - 30, 160); ctx.stroke();
  ctx.setLineDash([]);

  // Reel boxes
  const reelW = 140, reelH = 140, gap = (W - 48 - 3 * reelW) / 4;
  const allMatch = reels.every(s => s === reels[0]);

  reels.forEach((sym, i) => {
    const rx = 24 + gap + i * (reelW + gap);
    const ry = 90;

    // Reel background
    ctx.fillStyle = allMatch ? '#1a3a27' : '#141426';
    roundRect(ctx, rx, ry, reelW, reelH, 10); ctx.fill();

    // Reel border
    ctx.strokeStyle = allMatch ? '#F5C518' : '#3a3a5a'; ctx.lineWidth = allMatch ? 2.5 : 1.5;
    roundRect(ctx, rx, ry, reelW, reelH, 10); ctx.stroke();

    // Symbol
    ctx.font = `62px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(sym, rx + reelW / 2, ry + reelH / 2 + 22);

    // Separator lines
    if (i < 2) {
      ctx.strokeStyle = '#2a2a3e'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx + reelW + gap / 2, ry + 10);
      ctx.lineTo(rx + reelW + gap / 2, ry + reelH - 10);
      ctx.stroke();
    }
  });

  // Multiplier badge
  if (won && multiplier) {
    ctx.fillStyle = '#F5C518';
    roundRect(ctx, W / 2 - 55, 258, 110, 28, 6); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(`${multiplier}×  MULTIPLICADOR`, W / 2, 277);
  }

  ctx.fillStyle = won ? '#3FB950' : '#F85149';
  ctx.font = `bold 22px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(`${won ? '+' : '-'}${fmt(changeAmount)} 💰`, W / 2, 322);

  ctx.fillStyle = '#888'; ctx.font = `13px ${FONT}`;
  ctx.fillText(`Aposta: ${fmt(betAmount)} 💰  •  Saldo: ${fmt(userBalance)} 💰`, W / 2, 350);

  return canvas.toBuffer('image/png');
}

// ─── Roulette card ────────────────────────────────────────────────────────────

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export function generateRouletteCard({ spin, escolha, won, bet, winAmt, userBalance, mult }) {
  const W = 700, H = 380;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const isRed   = RED_NUMS.has(spin);
  const isGreen = spin === 0;
  const spinCol = isGreen ? '#22863a' : isRed ? '#cc1111' : '#141414';

  ctx.fillStyle = '#12121f';
  roundRect(ctx, 0, 0, W, H, 16); ctx.fill();

  ctx.fillStyle = '#0c0c18';
  roundRect(ctx, 0, 0, W, 44, 8); ctx.fill(); ctx.fillRect(0, 30, W, 14);
  ctx.fillStyle = '#8B949E'; ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText('🎡   R O L E T A', W / 2, 27);

  // Roulette wheel bg (circular arc hint)
  const wx = W / 2, wy = 180, wr = 108;
  const wheelBg = ctx.createRadialGradient(wx, wy - 20, 20, wx, wy, wr);
  wheelBg.addColorStop(0, '#2a2a3a');
  wheelBg.addColorStop(1, '#0e0e1a');
  ctx.fillStyle = wheelBg;
  ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();

  // Gold rim
  ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(201,162,39,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(wx, wy, wr - 8, 0, Math.PI * 2); ctx.stroke();

  // Inner number disc
  ctx.fillStyle = spinCol;
  ctx.shadowColor = spinCol; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(wx, wy, 72, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 54px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(String(spin), wx, wy + 18);

  // Color label below disc
  const colLabel = isGreen ? '🟢 VERDE' : isRed ? '🔴 VERMELHO' : '⚫ PRETO';
  ctx.fillStyle = '#AAAAAA'; ctx.font = `14px ${FONT}`;
  ctx.fillText(colLabel, W / 2, wy + wr + 20);

  // Bet display
  ctx.fillStyle = '#666'; ctx.font = `13px ${FONT}`;
  ctx.fillText(`Você apostou em: ${escolha.toUpperCase()}`, W / 2, wy + wr + 44);

  // Result
  const resText = won ? `✅  GANHOU  (×${mult})` : '❌  PERDEU';
  ctx.fillStyle = won ? '#3FB950' : '#F85149'; ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(resText, W / 2, 322);

  ctx.fillStyle = '#888'; ctx.font = `13px ${FONT}`;
  const change = won ? winAmt - bet : bet;
  const sign   = won ? '+' : '-';
  ctx.fillText(`Aposta: ${fmt(bet)} 💰  •  ${sign}${fmt(change)} 💰  •  Saldo: ${fmt(userBalance)} 💰`, W / 2, 350);

  return canvas.toBuffer('image/png');
}
