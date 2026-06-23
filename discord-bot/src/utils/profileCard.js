import { createCanvas, loadImage } from '@napi-rs/canvas';
import { resolveBanner, getRingColors } from './shopData.js';

const FONT = '"Noto Sans", "DejaVu Sans", Arial, sans-serif';
const W = 900, H = 510;

const COIN_EMOJI_ID = '1516993823665033286';
const COIN_URL      = `https://cdn.discordapp.com/emojis/${COIN_EMOJI_ID}.png`;

// ─── Badge definitions ────────────────────────────────────────────────────────

export const BADGE_DEFS = [
  { key: 'vip',           defaultEmoji: '💎', name: 'VIP',           description: 'Saldo total ≥ 50.000',    color: 'rgba(88,166,255,0.85)'  },
  { key: 'rico',          defaultEmoji: '💰', name: 'Rico',          description: 'Saldo total ≥ 10.000',    color: 'rgba(253,224,71,0.85)'  },
  { key: 'poupador',      defaultEmoji: '🪙', name: 'Poupador',      description: 'Saldo total ≥ 5.000',     color: 'rgba(200,180,60,0.80)'  },
  { key: 'colecionador',  defaultEmoji: '🏆', name: 'Colecionador',  description: '10+ itens comprados',     color: 'rgba(157,78,221,0.85)'  },
  { key: 'comprador',     defaultEmoji: '🛍️', name: 'Comprador',     description: '5+ itens comprados',      color: 'rgba(130,60,200,0.80)'  },
  { key: 'mascote',       defaultEmoji: '🐾', name: 'Mascote',       description: 'Pet ativo equipado',      color: 'rgba(87,242,135,0.80)'  },
  { key: 'estiloso',      defaultEmoji: '🎨', name: 'Estiloso',      description: 'Banner equipado',         color: 'rgba(255,107,107,0.80)' },
  { key: 'personalizado', defaultEmoji: '💠', name: 'Personalizado', description: 'Argola personalizada',    color: 'rgba(100,200,220,0.80)' },
];

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmtCompact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

async function loadUrl(url) {
  const resp = await fetch(url);
  const buf  = Buffer.from(await resp.arrayBuffer());
  return loadImage(buf);
}

function parseCustomEmoji(emoji) {
  const match = emoji?.match(/<a?:\w+:(\d{10,20})>/);
  return match ? `https://cdn.discordapp.com/emojis/${match[1]}.png` : null;
}

// Draw a rounded square with purple gradient + emoji/image centered inside
async function drawStatIcon(ctx, x, y, size, emojiOrImg, coinImg) {
  // Purple gradient pill background
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, '#c45ef5');
  g.addColorStop(1, '#8b2fc9');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  const innerSize = size * 0.58;
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (emojiOrImg === '__coin__' && coinImg) {
    ctx.drawImage(coinImg, cx - innerSize / 2, cy - innerSize / 2, innerSize, innerSize);
    return;
  }

  const customUrl = parseCustomEmoji(emojiOrImg);
  if (customUrl) {
    try {
      const img = await loadUrl(customUrl);
      ctx.drawImage(img, cx - innerSize / 2, cy - innerSize / 2, innerSize, innerSize);
      return;
    } catch {}
  }

  ctx.font = `${Math.round(size * 0.48)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(emojiOrImg, cx, cy + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ─── Main card generator ───────────────────────────────────────────────────────

export async function generateProfileCard({
  username, avatarUrl, balance, bank, activeBanner, purchases,
  activeRing, activePet, guildBadgeEmojis = {}, guildId = null,
  marriedToName = null, bio = null,
}) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner        = await resolveBanner(activeBanner, guildId);
  const { c1, c2 }   = getRingColors(activeRing ?? null);
  let coinImg = null;
  try { coinImg = await loadUrl(COIN_URL); } catch {}

  // ── Card background (light gray) ─────────────────────────────────────────────
  ctx.fillStyle = '#ebebee';
  ctx.fillRect(0, 0, W, H);

  // ── Banner area ──────────────────────────────────────────────────────────────
  const BANNER_H = 245;
  if (banner) {
    try {
      const img   = await loadUrl(banner.imageUrl);
      const scale = Math.max(W / img.width, BANNER_H / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.save();
      roundRect(ctx, 0, 0, W, BANNER_H, 0);
      ctx.clip();
      ctx.drawImage(img, (W - sw) / 2, (BANNER_H - sh) / 2, sw, sh);
      ctx.restore();
    } catch {
      const g = ctx.createLinearGradient(0, 0, W, BANNER_H);
      const [bg1, bg2] = banner.gradient ?? ['#1a0533', '#4a1a8a'];
      g.addColorStop(0, bg1); g.addColorStop(1, bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, BANNER_H);
    g.addColorStop(0, '#1a0533');
    g.addColorStop(1, '#3a0f7a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
  }

  // Soft shadow overlay at banner bottom for text readability
  const ov = ctx.createLinearGradient(0, BANNER_H - 80, 0, BANNER_H);
  ov.addColorStop(0, 'rgba(235,235,238,0)');
  ov.addColorStop(1, 'rgba(235,235,238,0.55)');
  ctx.fillStyle = ov;
  ctx.fillRect(0, BANNER_H - 80, W, 80);

  // ── Avatar ───────────────────────────────────────────────────────────────────
  const AV_CX = 730, AV_CY = BANNER_H, AV_R = 88;

  // White border
  ctx.fillStyle = '#ebebee';
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 10, 0, Math.PI * 2); ctx.fill();

  // Ring gradient
  const ringGrad = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
  ringGrad.addColorStop(0, c1); ringGrad.addColorStop(1, c2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth   = 5;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 6, 0, Math.PI * 2); ctx.stroke();

  // Avatar image
  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    const img = await loadUrl(`${avatarUrl}?size=256`);
    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#5a5a8a';
    ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // ── Pet badge (bottom-right of avatar) ───────────────────────────────────────
  if (activePet) {
    const petX = AV_CX + AV_R * 0.68;
    const petY = AV_CY + AV_R * 0.68;
    ctx.fillStyle = '#ebebee';
    ctx.beginPath(); ctx.arc(petX, petY, 22, 0, Math.PI * 2); ctx.fill();
    const ringG2 = ctx.createLinearGradient(petX - 20, petY - 20, petX + 20, petY + 20);
    ringG2.addColorStop(0, c1); ringG2.addColorStop(1, c2);
    ctx.strokeStyle = ringG2; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(petX, petY, 20, 0, Math.PI * 2); ctx.stroke();
    const customPetUrl = parseCustomEmoji(activePet);
    if (customPetUrl) {
      try {
        const petImg = await loadUrl(customPetUrl);
        ctx.drawImage(petImg, petX - 14, petY - 14, 28, 28);
      } catch {
        ctx.font = `18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#333'; ctx.fillText('🐾', petX, petY + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
    } else {
      ctx.font = `18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333'; ctx.fillText(activePet, petX, petY + 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }

  // ── Earned badges pill below avatar ──────────────────────────────────────────
  const earnedKeys = computeEarnedBadgeKeys({ balance, bank, purchases, activePet, activeBanner, activeRing });
  const BADGE_PILL_Y = AV_CY + AV_R + 18;
  const BPILL_H      = 38;
  const BPILL_MAX_W  = 220;

  // Background pill
  ctx.fillStyle   = 'rgba(255,255,255,0.80)';
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth   = 1;
  roundRect(ctx, AV_CX - BPILL_MAX_W / 2, BADGE_PILL_Y, BPILL_MAX_W, BPILL_H, BPILL_H / 2);
  ctx.fill(); ctx.stroke();

  if (earnedKeys.length > 0) {
    const maxSlots  = Math.min(earnedKeys.length, 6);
    const emojiSize = 22;
    const totalW    = maxSlots * emojiSize + (maxSlots - 1) * 6;
    let bx = AV_CX - totalW / 2;
    const by = BADGE_PILL_Y + BPILL_H / 2;

    for (let i = 0; i < maxSlots; i++) {
      const key      = earnedKeys[i];
      const def      = BADGE_DEFS.find(b => b.key === key);
      const emojiRaw = guildBadgeEmojis[key] ?? def?.defaultEmoji ?? '🏅';
      const customUrl = parseCustomEmoji(emojiRaw);
      if (customUrl) {
        try {
          const img = await loadUrl(customUrl);
          ctx.drawImage(img, bx, by - emojiSize / 2, emojiSize, emojiSize);
        } catch {
          ctx.font = `${emojiSize}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#333'; ctx.fillText('🏅', bx + emojiSize / 2, by + 1);
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
      } else {
        ctx.font = `${emojiSize}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#333'; ctx.fillText(emojiRaw, bx + emojiSize / 2, by + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      bx += emojiSize + 6;
    }
  } else {
    // No badges yet — show placeholder
    ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Sem conquistas', AV_CX, BADGE_PILL_Y + BPILL_H / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ── Bio / name area ───────────────────────────────────────────────────────────
  const LEFT_X = 28;
  let textY    = BANNER_H + 30;

  // Username
  ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#1a1a2e';
  ctx.font      = `bold 28px ${FONT}`;
  ctx.fillText(username, LEFT_X, textY);
  ctx.shadowBlur = 0;

  textY += 24;

  // Marriage line
  if (marriedToName) {
    ctx.font      = `13px ${FONT}`;
    ctx.fillStyle = '#c05080';
    ctx.fillText(`♥ Casado(a) com ${marriedToName}`, LEFT_X, textY);
    textY += 20;
  }

  // Bio
  const bioText = bio ?? 'Utilize: fallen bio para alterar esta frase.';
  ctx.font      = `13px ${FONT}`;
  ctx.fillStyle = '#555';
  // wrap at ~560px
  const words   = bioText.split(' ');
  let line      = '';
  const maxW    = 560;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, LEFT_X, textY);
      textY += 17;
      line   = word;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, LEFT_X, textY); textY += 17; }

  // ── Stats panel (2×2 grid) ────────────────────────────────────────────────────
  const PANEL_Y = textY + 10;
  const PANEL_W = 570;
  const CELL_H  = 72;
  const GAP     = 8;
  const PANEL_H = CELL_H * 2 + GAP + 20;

  // Panel bg
  ctx.fillStyle   = 'rgba(255,255,255,0.88)';
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth   = 1;
  roundRect(ctx, LEFT_X, PANEL_Y, PANEL_W, PANEL_H, 16);
  ctx.fill(); ctx.stroke();

  const CELL_W  = (PANEL_W - GAP - 24) / 2;
  const ICON_SZ = 46;
  const ICON_PAD = 10;

  const statsData = [
    { icon: '__coin__', label: 'Coins',   value: fmtCompact(balance) },
    { icon: '🏦',       label: 'Banco',   value: fmtCompact(bank)    },
    { icon: '🏅',       label: 'Badges',  value: String(earnedKeys.length) },
    { icon: '🛍️',      label: 'Itens',   value: `${purchases} itens` },
  ];

  for (let i = 0; i < 4; i++) {
    const col   = i % 2;
    const row   = Math.floor(i / 2);
    const cellX = LEFT_X + 12 + col * (CELL_W + GAP);
    const cellY = PANEL_Y + 10 + row * (CELL_H + GAP);

    // Cell background
    ctx.fillStyle   = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth   = 1;
    roundRect(ctx, cellX, cellY, CELL_W, CELL_H, 12);
    ctx.fill(); ctx.stroke();

    // Icon
    const iconX = cellX + ICON_PAD;
    const iconY = cellY + (CELL_H - ICON_SZ) / 2;
    await drawStatIcon(ctx, iconX, iconY, ICON_SZ, statsData[i].icon, coinImg);

    // Value
    const textX = iconX + ICON_SZ + 12;
    ctx.fillStyle = '#1a1a2e';
    ctx.font      = `bold 19px ${FONT}`;
    ctx.fillText(statsData[i].value, textX, cellY + CELL_H / 2 - 2);

    // Label
    ctx.fillStyle = '#888';
    ctx.font      = `12px ${FONT}`;
    ctx.fillText(statsData[i].label, textX, cellY + CELL_H / 2 + 16);
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.font      = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Fallen Bot • Perfil', W - 14, H - 12);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}
