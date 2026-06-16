import { createCanvas, loadImage } from '@napi-rs/canvas';

const W  = 680;
const P  = 24;
const AV = 48;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line    = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

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

export async function generateTellonymCard({ authorName, authorUsername, message, taggedTo, avatarUrl, isAnon }) {
  const LH       = 22;
  const MSG_W    = W - P * 2;
  const FONT     = '"Noto Sans", "DejaVu Sans", Arial, sans-serif';

  // Measure text lines using a temp canvas
  const tmp     = createCanvas(W, 50);
  const tCtx    = tmp.getContext('2d');
  tCtx.font     = `15px ${FONT}`;
  const lines   = wrapText(tCtx, message, MSG_W);
  const msgH    = lines.length * LH;

  const H = P + AV + 18 + msgH + 20 + 1 + 14 + 22 + P;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 0, 0, W, H, 12);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#E7E7E7';
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 12);
  ctx.stroke();

  let y = P;

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const ax = P, ay = y, ar = AV / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax + ar, ay + ar, ar, 0, Math.PI * 2);
  ctx.clip();
  try {
    const buf = Buffer.from(await (await fetch(`${avatarUrl}?size=64`)).arrayBuffer());
    const img = await loadImage(buf);
    ctx.drawImage(img, ax, ay, AV, AV);
  } catch {
    ctx.fillStyle = '#9CA3AF';
    ctx.fillRect(ax, ay, AV, AV);
  }
  ctx.restore();

  // ── Author text ────────────────────────────────────────────────────────────
  const tx = ax + AV + 12;
  ctx.fillStyle = '#0F1419';
  ctx.font      = `bold 15px ${FONT}`;
  ctx.fillText(authorName, tx, y + 17);

  ctx.fillStyle = '#71767B';
  ctx.font      = `13px ${FONT}`;
  ctx.fillText(authorUsername, tx, y + 35);

  // ── Marcados (top right) ───────────────────────────────────────────────────
  if (taggedTo) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#71767B';
    ctx.font      = `12px ${FONT}`;
    ctx.fillText('Marcados', W - P, y + 15);

    // Pill badge
    const pill  = taggedTo.replace(/^@/, '');
    ctx.font    = `bold 12px ${FONT}`;
    const pw    = ctx.measureText(pill).width + 16;
    const px    = W - P - pw;
    const py    = y + 22;
    const ph    = 22;
    ctx.textAlign = 'left';

    ctx.fillStyle = '#EFF3F4';
    roundRect(ctx, px, py, pw, ph, 11);
    ctx.fill();

    ctx.fillStyle = '#0F1419';
    ctx.fillText(pill, px + 8, py + 15);
  }

  y += AV + 18;

  // ── Message ────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0F1419';
  ctx.font      = `15px ${FONT}`;
  ctx.textAlign = 'left';
  for (const l of lines) {
    ctx.fillText(l, P, y);
    y += LH;
  }

  y += 16;

  // ── Separator ─────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#EFF3F4';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(P, y);
  ctx.lineTo(W - P, y);
  ctx.stroke();

  y += 14;

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#71767B';
  ctx.font      = `13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('💬', P, y + 14);
  ctx.textAlign = 'right';
  ctx.fillText('há poucos segundos', W - P, y + 14);

  return canvas.toBuffer('image/png');
}
