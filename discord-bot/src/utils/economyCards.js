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

// ─── Sparkle decoration ───────────────────────────────────────────────────────

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

// ─── Playing card (cute pastel style) ────────────────────────────────────────

function drawCard(ctx, x, y, rank, suit, scale = 1) {
  const cw = Math.round(70 * scale), ch = Math.round(98 * scale), cr = Math.round(10 * scale);
  const isRed = suit === '♥' || suit === '♦';
  const col   = isRed ? '#E84393' : '#5A4AE3';

  ctx.shadowColor   = 'rgba(180,120,200,0.35)';
  ctx.shadowBlur    = 12;
  ctx.shadowOffsetY = 5;

  const cardGrad = ctx.createLinearGradient(x, y, x, y + ch);
  cardGrad.addColorStop(0, '#FFFEF8');
  cardGrad.addColorStop(1, '#F7F0FF');
  ctx.fillStyle = cardGrad;
  roundRect(ctx, x, y, cw, ch, cr);
  ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  ctx.strokeStyle = isRed ? 'rgba(232,67,147,0.4)' : 'rgba(90,74,227,0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, cw, ch, cr); ctx.stroke();

  ctx.fillStyle = col;
  ctx.font = `bold ${Math.round(13 * scale)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(rank, x + Math.round(5 * scale), y + Math.round(16 * scale));
  ctx.font = `${Math.round(12 * scale)}px ${FONT}`;
  ctx.fillText(suit, x + Math.round(5 * scale), y + Math.round(29 * scale));

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
  ctx.font = `${Math.round(12 * scale)}px ${FONT}`;
  ctx.fillText(suit, Math.round(5 * scale), Math.round(29 * scale));
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

// ─── Blackjack card ───────────────────────────────────────────────────────────

export function generateBlackjackCard({ playerCards, dealerCards, pTotal, dTotal, won, tie, bust, bet, payout, userBalance }) {
  const W = 920, H = 510;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  drawCuteBg(ctx, W, H, ['#2D1B4E', '#4B2E7A', '#6B3FA0']);

  // Subtle star sparkles
  const sparklePositions = [[60,40],[840,60],[100,440],[820,430],[500,60],[200,100],[680,400]];
  for (const [sx, sy] of sparklePositions) {
    drawSparkle(ctx, sx, sy, 10, 'rgba(255,200,255,0.3)');
  }

  drawCuteHeader(ctx, W, '🃏  B L A C K J A C K  🃏', '#F0C0FF', '#3A1A6A');

  // Felt table — soft rounded oval
  const ox = W / 2, oy = H / 2 + 28, rx = 400, ry = 185;

  const feltGrad = ctx.createRadialGradient(ox, oy - 40, 40, ox, oy, rx);
  feltGrad.addColorStop(0, '#3A7F5A');
  feltGrad.addColorStop(1, '#1F5A3A');
  ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = feltGrad; ctx.fill();

  const feltShine = ctx.createRadialGradient(ox, oy - 60, 60, ox, oy, rx);
  feltShine.addColorStop(0, 'rgba(255,255,255,0.07)');
  feltShine.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = feltShine; ctx.fill();

  ctx.strokeStyle = 'rgba(255,180,255,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,180,255,0.2)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(ox, oy, rx - 12, ry - 12, 0, 0, Math.PI * 2); ctx.stroke();

  // Score labels
  function drawScorePill(cx, y, text) {
    ctx.font = `bold 13px ${FONT}`;
    const tw = ctx.measureText(text).width;
    const pw = tw + 30, ph = 26;
    const g = ctx.createLinearGradient(cx - pw/2, y, cx + pw/2, y + ph);
    g.addColorStop(0, 'rgba(80,40,120,0.9)');
    g.addColorStop(1, 'rgba(50,20,80,0.9)');
    ctx.fillStyle = g;
    roundRect(ctx, cx - pw/2, y, pw, ph, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(200,150,255,0.5)'; ctx.lineWidth = 1;
    roundRect(ctx, cx - pw/2, y, pw, ph, 13); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    ctx.fillText(text, cx, y + 17);
  }

  const dZoneY = oy - ry + 18;
  drawScorePill(ox, dZoneY, `DEALER  •  ${dTotal}`);
  const dCount = dealerCards.length;
  const dGap   = Math.min(78, (rx * 1.4) / dCount);
  const dStart = ox - ((dCount - 1) * dGap) / 2 - 35;
  dealerCards.forEach((c, i) => drawCard(ctx, dStart + i * dGap, dZoneY + 34, c.rank, c.suit));

  // Center result
  if (won) drawResultBanner(ctx, W, oy - 32, '✨  VITÓRIA!', '#1E8A4A', '#15B85A', '#FFFFFF');
  else if (tie) drawResultBanner(ctx, W, oy - 32, '🤝  EMPATE', '#2A5AA0', '#3A7AE0', '#FFFFFF');
  else if (bust) drawResultBanner(ctx, W, oy - 32, '💥  BUST!', '#A02828', '#D03030', '#FFFFFF');
  else drawResultBanner(ctx, W, oy - 32, '❌  DERROTA', '#8A2020', '#B83030', '#FFFFFF');

  const pZoneY = oy + 34;
  const bustLabel = bust ? ` 💥` : '';
  drawScorePill(ox, pZoneY, `VOCÊ  •  ${pTotal}${bustLabel}`);
  const pCount = playerCards.length;
  const pGap   = Math.min(78, (rx * 1.4) / pCount);
  const pStart = ox - ((pCount - 1) * pGap) / 2 - 35;
  playerCards.forEach((c, i) => drawCard(ctx, pStart + i * pGap, pZoneY + 34, c.rank, c.suit));

  const sign   = won ? '+' : tie ? '±' : '-';
  const change = tie ? 0 : won ? payout - bet : bet;
  const color  = won ? '#88FFB0' : tie ? '#A0C8FF' : '#FFB0B0';
  drawFooterStats(ctx, W, H,
    `${sign}${fmt(change)} 💰  •  Saldo: ${fmt(userBalance)} 💰`,
    `Aposta: ${fmt(bet)} 💰`
  );

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

// ─── Balance card ─────────────────────────────────────────────────────────────

export async function generateBalanceCard({ username, avatarUrl, balance, bank }) {
  const W   = 480, H = 610;
  const PAD = 18;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#E8E8E8';
  roundRect(ctx, 0, 0, W, H, 26); ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 8, 8, W - 16, H - 16, 20); ctx.fill();

  const AV_R  = 90;
  const AV_CX = W / 2, AV_CY = AV_R + 24;

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

  const PILL_Y = AV_CY + AV_R + 18;
  ctx.font = `bold 22px ${FONT}`;
  const nameW = ctx.measureText(username).width;
  const pillW = Math.max(nameW + 52, 120), pillH = 40;
  const pillX = W / 2 - pillW / 2;

  ctx.fillStyle = '#EBEBEB';
  roundRect(ctx, pillX, PILL_Y, pillW, pillH, pillH / 2); ctx.fill();

  ctx.fillStyle = '#111111'; ctx.textAlign = 'center';
  ctx.fillText(username, W / 2, PILL_Y + 28);

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

    ctx.fillStyle = '#EBEBEB';
    roundRect(ctx, PAD, ry, rw, ROW_H, ROW_H / 2); ctx.fill();

    const circleCx = PAD + CIRCLE_R + 5;
    const circleCy = ry + ROW_H / 2;

    const grad = ctx.createRadialGradient(circleCx - 8, circleCy - 8, 5, circleCx, circleCy, CIRCLE_R);
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(circleCx, circleCy, CIRCLE_R, 0, Math.PI * 2); ctx.fill();

    drawEconomyIcon(ctx, circleCx, circleCy, iconType);

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
