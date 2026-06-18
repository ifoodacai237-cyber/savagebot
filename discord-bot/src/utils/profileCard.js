import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getBanner, getRingColors } from './shopData.js';

const FONT = '"Noto Sans", "DejaVu Sans", Arial, sans-serif';
const W = 900, H = 340;

// ID do emoji de moeda personalizado
const COIN_EMOJI_ID = '1516993823665033286';
const COIN_URL      = `https://cdn.discordapp.com/emojis/${COIN_EMOJI_ID}.png`;

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

function fmt(n) { return Number(n).toLocaleString('pt-BR'); }

async function loadUrl(url) {
  const resp = await fetch(url);
  const buf  = Buffer.from(await resp.arrayBuffer());
  return loadImage(buf);
}

function parseCustomEmoji(emoji) {
  const match = emoji?.match(/<a?:\w+:(\d{10,20})>/);
  return match ? `https://cdn.discordapp.com/emojis/${match[1]}.png` : null;
}

export async function generateProfileCard({ username, avatarUrl, balance, bank, activeBanner, purchases, activeRing, activePet }) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner = activeBanner ? getBanner(activeBanner) : null;
  const { c1, c2 } = getRingColors(activeRing ?? null);

  // Pré-carrega coin emoji (falha silenciosa)
  let coinImg = null;
  try { coinImg = await loadUrl(COIN_URL); } catch {}

  // ── Background ──────────────────────────────────────────────────────────────
  if (banner) {
    try {
      const img   = await loadUrl(banner.imageUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
    } catch {
      const g = ctx.createLinearGradient(0, 0, W, H);
      const [bg1, bg2] = banner.gradient ?? ['#1a0533', '#4a1a8a'];
      g.addColorStop(0, bg1); g.addColorStop(1, bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0d1117');
    g.addColorStop(0.5, '#161b22');
    g.addColorStop(1, '#1a0533');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ── Dark overlay ────────────────────────────────────────────────────────────
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, 'rgba(0,0,0,0.30)');
  ov.addColorStop(0.45, 'rgba(0,0,0,0.52)');
  ov.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);

  // ── Left accent bar (uses ring color) ───────────────────────────────────────
  const barGrad = ctx.createLinearGradient(0, 0, 0, H);
  barGrad.addColorStop(0, c1);
  barGrad.addColorStop(1, c2);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, 5, H);

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const AV_R = 70, AV_CX = 105, AV_CY = H / 2 - 14;

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 10, 0, Math.PI * 2); ctx.stroke();

  const ringGrad = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
  ringGrad.addColorStop(0, c1);
  ringGrad.addColorStop(1, c2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 5, 0, Math.PI * 2); ctx.stroke();

  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    const img = await loadUrl(`${avatarUrl}?size=256`);
    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#5a5a8a'; ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // ── Pet badge (bottom-right of avatar) ──────────────────────────────────────
  if (activePet) {
    const petX = AV_CX + AV_R * 0.68;
    const petY = AV_CY + AV_R * 0.68;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(petX, petY, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c1;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const customEmojiUrl = parseCustomEmoji(activePet);
    if (customEmojiUrl) {
      try {
        const petImg = await loadUrl(customEmojiUrl);
        ctx.drawImage(petImg, petX - 14, petY - 14, 28, 28);
      } catch {
        ctx.font = `20px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('🐾', petX, petY + 7);
        ctx.textAlign = 'left';
      }
    } else {
      ctx.font = `20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(activePet, petX, petY + 7);
      ctx.textAlign = 'left';
    }
  }

  // ── Text area ───────────────────────────────────────────────────────────────
  const TX = AV_CX + AV_R + 30;

  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur  = 8;

  ctx.fillStyle = '#FFFFFF';
  ctx.font      = `bold 34px ${FONT}`;
  ctx.fillText(username, TX, AV_CY - 28);

  ctx.shadowBlur = 0;

  const bannerLabel = banner ? `${banner.name}` : 'Sem banner';
  ctx.font = `12px ${FONT}`;
  const bw  = ctx.measureText(bannerLabel).width + 22;
  ctx.fillStyle = 'rgba(124,58,237,0.85)';
  roundRect(ctx, TX, AV_CY - 12, bw, 22, 11); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(bannerLabel, TX + 11, AV_CY + 4);

  // ── Stats row ───────────────────────────────────────────────────────────────
  const statsY = AV_CY + 34;

  // Dados de cada card
  const statsData = [
    { symbol: '◈', label: 'Carteira', value: `${fmt(balance)}`, hasCoin: true  },
    { symbol: '◉', label: 'Banco',    value: `${fmt(bank)}`,    hasCoin: true  },
    { symbol: '✦', label: 'Itens',    value: `${purchases}`,    hasCoin: false, suffix: ' itens' },
  ];

  for (let i = 0; i < statsData.length; i++) {
    const { symbol, label, value, hasCoin, suffix } = statsData[i];
    const sx = TX + i * 210;

    // Card bg
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, sx, statsY, 196, 68, 10); ctx.fill();

    ctx.strokeStyle = `${c2}70`;
    ctx.lineWidth = 1;
    roundRect(ctx, sx, statsY, 196, 68, 10); ctx.stroke();

    // Label com símbolo Unicode (sem emoji — renderiza limpo)
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${symbol}  ${label}`, sx + 12, statsY + 22);

    // Valor em negrito
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 19px ${FONT}`;

    if (hasCoin && coinImg) {
      // Desenha valor + ícone de moeda
      const valueStr = value;
      ctx.fillText(valueStr, sx + 12, statsY + 50);
      const vw = ctx.measureText(valueStr).width;
      ctx.drawImage(coinImg, sx + 12 + vw + 5, statsY + 33, 18, 18);
    } else {
      ctx.fillText(`${value}${suffix ?? ''}`, sx + 12, statsY + 50);
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font      = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Fallen Bot • Perfil', W - 14, H - 12);

  return canvas.toBuffer('image/png');
}
