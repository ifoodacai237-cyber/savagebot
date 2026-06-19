import { createCanvas, loadImage } from '@napi-rs/canvas';
import { resolveBanner, getRingColors } from './shopData.js';

const FONT = '"Noto Sans", "DejaVu Sans", Arial, sans-serif';
const W = 900, H = 340;

const COIN_EMOJI_ID = '1516993823665033286';
const COIN_URL      = `https://cdn.discordapp.com/emojis/${COIN_EMOJI_ID}.png`;

// ─── Badge definitions (exported for use in conquista command) ────────────────

export const BADGE_DEFS = [
  { key: 'vip',          defaultEmoji: '💎', name: 'VIP',          description: 'Saldo total ≥ 50.000',    color: 'rgba(88,166,255,0.85)'   },
  { key: 'rico',         defaultEmoji: '💰', name: 'Rico',         description: 'Saldo total ≥ 10.000',    color: 'rgba(253,224,71,0.85)'   },
  { key: 'poupador',     defaultEmoji: '🪙', name: 'Poupador',     description: 'Saldo total ≥ 5.000',     color: 'rgba(200,180,60,0.80)'   },
  { key: 'colecionador', defaultEmoji: '🏆', name: 'Colecionador', description: '10+ itens comprados',     color: 'rgba(157,78,221,0.85)'   },
  { key: 'comprador',    defaultEmoji: '🛍️', name: 'Comprador',    description: '5+ itens comprados',      color: 'rgba(130,60,200,0.80)'   },
  { key: 'mascote',      defaultEmoji: '🐾', name: 'Mascote',      description: 'Pet ativo equipado',      color: 'rgba(87,242,135,0.80)'   },
  { key: 'estiloso',     defaultEmoji: '🎨', name: 'Estiloso',     description: 'Banner equipado',         color: 'rgba(255,107,107,0.80)'  },
  { key: 'personalizado',defaultEmoji: '💠', name: 'Personalizado',description: 'Argola personalizada',    color: 'rgba(100,200,220,0.80)'  },
];

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

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Returns array of badge keys that are earned
export function computeEarnedBadgeKeys({ balance, bank, purchases, activePet, activeBanner, activeRing }) {
  const keys  = [];
  const total = (balance ?? 0) + (bank ?? 0);

  if      (total >= 50000) keys.push('vip');
  else if (total >= 10000) keys.push('rico');
  else if (total >= 5000)  keys.push('poupador');

  if      (purchases >= 10) keys.push('colecionador');
  else if (purchases >= 5)  keys.push('comprador');

  if (activePet)                          keys.push('mascote');
  if (activeBanner)                       keys.push('estiloso');
  if (activeRing && activeRing !== 'roxo') keys.push('personalizado');

  return keys;
}

export async function generateProfileCard({ username, avatarUrl, balance, bank, activeBanner, purchases, activeRing, activePet, guildBadgeEmojis = {}, guildId = null }) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner = await resolveBanner(activeBanner, guildId);
  const { c1, c2 } = getRingColors(activeRing ?? null);

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

  // ── Banner label (usa a cor da argola) ──────────────────────────────────────
  const bannerLabel = banner ? `${banner.name}` : 'Sem banner';
  ctx.font = `12px ${FONT}`;
  const bw = ctx.measureText(bannerLabel).width + 22;

  const ringColor = c1.startsWith('#') ? hexToRgba(c1, 0.85) : c1.replace(')', ',0.85)').replace('rgb(', 'rgba(');
  ctx.fillStyle = ringColor.startsWith('rgba') ? ringColor : `${c1}`;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, TX, AV_CY - 12, bw, 22, 11); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(bannerLabel, TX + 11, AV_CY + 4);

  // ── Stats row ───────────────────────────────────────────────────────────────
  const statsY = AV_CY + 34;

  const statsData = [
    { symbol: '◈', label: 'Carteira', value: `${fmt(balance)}`, hasCoin: true  },
    { symbol: '◉', label: 'Banco',    value: `${fmt(bank)}`,    hasCoin: true  },
    { symbol: '✦', label: 'Itens',    value: `${purchases}`,    hasCoin: false, suffix: ' itens' },
  ];

  for (let i = 0; i < statsData.length; i++) {
    const { symbol, label, value, hasCoin, suffix } = statsData[i];
    const sx = TX + i * 210;

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, sx, statsY, 196, 68, 10); ctx.fill();

    ctx.strokeStyle = `${c2}70`;
    ctx.lineWidth = 1;
    roundRect(ctx, sx, statsY, 196, 68, 10); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${symbol}  ${label}`, sx + 12, statsY + 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 19px ${FONT}`;

    if (hasCoin && coinImg) {
      const valueStr = value;
      ctx.fillText(valueStr, sx + 12, statsY + 50);
      const vw = ctx.measureText(valueStr).width;
      ctx.drawImage(coinImg, sx + 12 + vw + 5, statsY + 33, 18, 18);
    } else {
      ctx.fillText(`${value}${suffix ?? ''}`, sx + 12, statsY + 50);
    }
  }

  // ── Badges — apenas emojis em bolhas ────────────────────────────────────────
  const earnedKeys = computeEarnedBadgeKeys({ balance, bank, purchases, activePet, activeBanner, activeRing });
  if (earnedKeys.length > 0) {
    const BADGE_Y = statsY + 76;
    let bx = TX;
    const BUBBLE_R = 16;

    for (const key of earnedKeys.slice(0, 8)) {
      if (bx + BUBBLE_R * 2 + 6 > W - 14) break;

      const def = BADGE_DEFS.find(b => b.key === key);
      const emojiRaw = guildBadgeEmojis[key] ?? def?.defaultEmoji ?? '🏅';

      // Draw bubble
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(bx + BUBBLE_R, BADGE_Y + BUBBLE_R, BUBBLE_R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Try to render as custom Discord emoji image first
      const customUrl = parseCustomEmoji(emojiRaw);
      if (customUrl) {
        try {
          const emojiImg = await loadUrl(customUrl);
          const sz = BUBBLE_R * 1.5;
          ctx.drawImage(emojiImg, bx + BUBBLE_R - sz / 2, BADGE_Y + BUBBLE_R - sz / 2, sz, sz);
        } catch {
          ctx.font = `16px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText('🏅', bx + BUBBLE_R, BADGE_Y + BUBBLE_R + 6);
          ctx.textAlign = 'left';
        }
      } else {
        ctx.font = `18px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(emojiRaw, bx + BUBBLE_R, BADGE_Y + BUBBLE_R + 6);
        ctx.textAlign = 'left';
      }

      bx += BUBBLE_R * 2 + 8;
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font      = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Fallen Bot • Perfil', W - 14, H - 12);

  return canvas.toBuffer('image/png');
}
