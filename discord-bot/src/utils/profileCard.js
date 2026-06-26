import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { resolveBanner, getRingColors } from './shopData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const FONTS_DIR  = join(__dirname, '../../fonts');

GlobalFonts.register(readFileSync(join(FONTS_DIR, 'Roboto-Regular.ttf')), 'BotFont');
GlobalFonts.register(readFileSync(join(FONTS_DIR, 'Roboto-Bold.ttf')),    'BotFont');

const FONT = 'BotFont';
const W = 900, H = 510;

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
  if (activePet)                           keys.push('mascote');
  if (activeBanner)                        keys.push('estiloso');
  if (activeRing && activeRing !== 'roxo') keys.push('personalizado');
  return keys;
}

export function computeLevel(xp) {
  const XP_PER_LEVEL = 300;
  const level    = Math.floor((xp ?? 0) / XP_PER_LEVEL) + 1;
  const current  = (xp ?? 0) % XP_PER_LEVEL;
  const needed   = XP_PER_LEVEL;
  return { level, current, needed };
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

async function loadUrl(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    return loadImage(buf);
  } finally {
    clearTimeout(timer);
  }
}

function parseCustomEmoji(emoji) {
  const match = emoji?.match(/<a?:\w+:(\d{10,20})>/);
  return match ? `https://cdn.discordapp.com/emojis/${match[1]}.png` : null;
}

function twemojiUrl(emoji) {
  const codepoints = [...emoji]
    .map(ch => ch.codePointAt(0).toString(16).toLowerCase())
    .filter(cp => cp !== 'fe0f');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints.join('-')}.png`;
}

async function loadEmojiImg(emojiOrImg) {
  if (!emojiOrImg || emojiOrImg === '__coin__') return null;
  const customUrl = parseCustomEmoji(emojiOrImg);
  if (customUrl) {
    try { return await loadUrl(customUrl); } catch {}
  }
  try { return await loadUrl(twemojiUrl(emojiOrImg)); } catch {}
  return null;
}

function tokenizeBio(text) {
  const re = /<a?:\w+:\d{10,20}>|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?)*/gu;
  const tokens = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
    tokens.push({ type: 'emoji', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

async function drawBioWithEmojis(ctx, text, x, y, maxWidth, lineH, emojiSz) {
  const tokens = tokenizeBio(text);
  const cache = new Map();
  await Promise.all(
    tokens.filter(t => t.type === 'emoji').map(async t => {
      if (cache.has(t.value)) return;
      const img = await loadEmojiImg(t.value).catch(() => null);
      if (img) cache.set(t.value, img);
    }),
  );
  const SPACE_W = ctx.measureText(' ').width;
  const items = [];
  for (const tok of tokens) {
    if (tok.type === 'emoji') {
      items.push({ kind: 'emoji', value: tok.value, width: emojiSz + 2 });
    } else {
      for (const part of tok.value.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          items.push({ kind: 'space', value: part, width: SPACE_W * part.length });
        } else {
          items.push({ kind: 'word', value: part, width: ctx.measureText(part).width });
        }
      }
    }
  }
  const lines = [];
  let cur = [], curW = 0;
  for (const item of items) {
    if (item.kind === 'space') { cur.push(item); curW += item.width; continue; }
    if (curW + item.width > maxWidth && cur.length > 0) {
      while (cur.length && cur[cur.length - 1].kind === 'space') cur.pop();
      lines.push(cur); cur = []; curW = 0;
    }
    cur.push(item); curW += item.width;
  }
  if (cur.length) { while (cur.length && cur[cur.length - 1].kind === 'space') cur.pop(); lines.push(cur); }
  for (const line of lines) {
    let cx = x;
    for (const item of line) {
      if (item.kind === 'emoji') {
        const img = cache.get(item.value);
        if (img) ctx.drawImage(img, cx, y - emojiSz + 3, emojiSz, emojiSz);
        else ctx.fillText(item.value, cx, y);
        cx += item.width;
      } else if (item.kind === 'space') {
        cx += item.width;
      } else {
        ctx.fillText(item.value, cx, y);
        cx += item.width;
      }
    }
    y += lineH;
  }
  return y;
}

// ─── Icon drawers (new purple-themed style) ───────────────────────────────────

function drawIconBg(ctx, x, y, size, c1, c2) {
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, size, size, 11);
  ctx.fill();
}

// Coin icon — amber gradient bg, white coin
function drawCoinIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#FBB040', '#E67E22');
  const cx = x + sz / 2, cy = y + sz / 2, r = sz * 0.28;
  ctx.save();
  ctx.shadowColor = 'rgba(255,200,0,0.4)'; ctx.shadowBlur = 4;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(180,100,10,0.35)'; ctx.lineWidth = sz * 0.04;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#92400E';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2); ctx.fill();
}

// Level/Star icon — gold gradient bg, white star
function drawStarIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#FDD835', '#FFA000');
  const cx = x + sz / 2, cy = y + sz / 2;
  const R = sz * 0.28, r2 = R * 0.44;
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.4)'; ctx.shadowBlur = 3;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle  = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? R : r2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Badges/Medal icon — purple gradient bg, white medal
function drawMedalIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#AB47BC', '#7B1FA2');
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  // Ribbon
  ctx.beginPath();
  ctx.moveTo(cx - sz * 0.08, cy - sz * 0.28);
  ctx.lineTo(cx + sz * 0.08, cy - sz * 0.28);
  ctx.lineTo(cx + sz * 0.04, cy - sz * 0.05);
  ctx.lineTo(cx,             cy - sz * 0.10);
  ctx.lineTo(cx - sz * 0.04, cy - sz * 0.05);
  ctx.closePath(); ctx.fill();
  // Circle
  ctx.beginPath(); ctx.arc(cx, cy + sz * 0.06, sz * 0.18, 0, Math.PI * 2); ctx.fill();
  // Inner circle accent
  ctx.fillStyle = 'rgba(180,120,220,0.6)';
  ctx.beginPath(); ctx.arc(cx, cy + sz * 0.06, sz * 0.10, 0, Math.PI * 2); ctx.fill();
}

// Reps/Thumbs up — indigo gradient bg, white thumb
function drawThumbIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#7986CB', '#5C6BC0');
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  // Thumb body (rounded)
  roundRect(ctx, cx - sz * 0.06, cy - sz * 0.04, sz * 0.22, sz * 0.26, sz * 0.04);
  ctx.fill();
  // Thumb finger (upward curve)
  ctx.beginPath();
  ctx.arc(cx - sz * 0.01, cy - sz * 0.18, sz * 0.13, Math.PI * 0.8, Math.PI * 1.7, false);
  ctx.lineTo(cx - sz * 0.08, cy - sz * 0.04);
  ctx.lineTo(cx - sz * 0.06, cy - sz * 0.04);
  ctx.closePath(); ctx.fill();
  // Handle
  roundRect(ctx, cx - sz * 0.22, cy + sz * 0.00, sz * 0.16, sz * 0.26, sz * 0.04);
  ctx.fill();
}

// Married/Dove-heart — rose gradient bg, white heart
function drawHeartIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#F48FB1', '#E91E63');
  const cx = x + sz / 2, cy = y + sz / 2 + sz * 0.02;
  const hw = sz * 0.22;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, hw * 0.6);
  ctx.bezierCurveTo(hw * 1.2, -hw * 0.2, hw * 1.2, -hw * 1.0, 0, -hw * 0.4);
  ctx.bezierCurveTo(-hw * 1.2, -hw * 1.0, -hw * 1.2, -hw * 0.2, 0, hw * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// BestFriend — lilac gradient bg, white BFF star/heart
function drawBffIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#CE93D8', '#AB47BC');
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  // Small heart left
  ctx.save();
  ctx.translate(cx - sz * 0.10, cy);
  ctx.scale(0.65, 0.65);
  const hw = sz * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, hw * 0.6);
  ctx.bezierCurveTo(hw * 1.2, -hw * 0.2, hw * 1.2, -hw * 1.0, 0, -hw * 0.4);
  ctx.bezierCurveTo(-hw * 1.2, -hw * 1.0, -hw * 1.2, -hw * 0.2, 0, hw * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Small star right
  const rx = cx + sz * 0.10, ry = cy;
  const R = sz * 0.14, r2 = R * 0.44;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle  = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? R : r2;
    const px = rx + radius * Math.cos(angle);
    const py = ry + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

const ICON_DRAWERS = [drawCoinIcon, drawStarIcon, drawMedalIcon, drawThumbIcon, drawHeartIcon, drawBffIcon];

// ─── Main card generator ───────────────────────────────────────────────────────

export async function generateProfileCard({
  username, avatarUrl, balance, bank, activeBanner, purchases,
  activeRing, ringBorderColor = null, activePet, guildBadgeEmojis = {}, guildId = null,
  marriedToName = null, bestFriendName = null, bio = null,
  cardBg1 = null, cardBg2 = null, cardPanelColor = null,
  xp = 0, reps = 0,
}) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner      = await resolveBanner(activeBanner, guildId);
  const { c1, c2 } = getRingColors(activeRing ?? null);
  const { level, current: xpCurrent, needed: xpNeeded } = computeLevel(xp);

  // ── Card background ───────────────────────────────────────────────────────────
  if (cardBg1 && cardBg2) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cardBg1); g.addColorStop(1, cardBg2);
    ctx.fillStyle = g;
  } else if (cardBg1) {
    ctx.fillStyle = cardBg1;
  } else {
    ctx.fillStyle = '#f7f7fb';
  }
  ctx.fillRect(0, 0, W, H);

  // ── Banner ────────────────────────────────────────────────────────────────────
  const BANNER_H = 220;
  if (banner) {
    try {
      const img   = await loadUrl(banner.imageUrl);
      const scale = Math.max(W / img.width, BANNER_H / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, BANNER_H); ctx.clip();
      ctx.drawImage(img, (W - sw) / 2, (BANNER_H - sh) / 2, sw, sh);
      ctx.restore();
    } catch {
      const g = ctx.createLinearGradient(0, 0, W, BANNER_H);
      const [bg1, bg2] = banner.gradient ?? ['#6a1b9a', '#9c27b0'];
      g.addColorStop(0, bg1); g.addColorStop(1, bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, BANNER_H);
    g.addColorStop(0, '#6a1b9a'); g.addColorStop(1, '#ce93d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
  }

  // Soft fade at banner bottom
  const fade = ctx.createLinearGradient(0, BANNER_H - 50, 0, BANNER_H);
  fade.addColorStop(0, 'rgba(247,247,251,0)');
  fade.addColorStop(1, 'rgba(247,247,251,0.25)');
  ctx.fillStyle = fade; ctx.fillRect(0, BANNER_H - 50, W, 50);

  // ── Avatar ────────────────────────────────────────────────────────────────────
  const AV_CX = 718, AV_CY = BANNER_H, AV_R = 88;

  // White outer border
  const outerColor = ringBorderColor ?? '#ffffff';
  ctx.fillStyle = outerColor;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 13, 0, Math.PI * 2); ctx.fill();

  // Argola ring with glow
  const ringGrad = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
  ringGrad.addColorStop(0, c1); ringGrad.addColorStop(1, c2);
  ctx.save();
  ctx.shadowColor = c1; ctx.shadowBlur = 14;
  ctx.strokeStyle = ringGrad; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 7, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Avatar image
  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    const img = await loadUrl(avatarUrl);
    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#8e44ad'; ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // ── Pet badge ─────────────────────────────────────────────────────────────────
  if (activePet) {
    const petX = AV_CX + AV_R * 0.68, petY = AV_CY + AV_R * 0.68;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(petX, petY, 22, 0, Math.PI * 2); ctx.fill();
    const g2 = ctx.createLinearGradient(petX - 20, petY - 20, petX + 20, petY + 20);
    g2.addColorStop(0, c1); g2.addColorStop(1, c2);
    ctx.strokeStyle = g2; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(petX, petY, 20, 0, Math.PI * 2); ctx.stroke();
    const petImg = await loadEmojiImg(activePet);
    if (petImg) ctx.drawImage(petImg, petX - 13, petY - 13, 26, 26);
  }

  // ── Username pill below avatar ────────────────────────────────────────────────
  const PILL_Y   = AV_CY + AV_R + 16;
  const PILL_H   = 38;
  ctx.font = `bold 16px ${FONT}`;
  const nameW  = ctx.measureText(username).width;
  const PILL_W = Math.max(nameW + 40, 130);
  const PILL_X = AV_CX - PILL_W / 2;

  ctx.fillStyle   = '#e8e8f0';
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth   = 1;
  roundRect(ctx, PILL_X, PILL_Y, PILL_W, PILL_H, PILL_H / 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2c2c54';
  ctx.textAlign = 'center';
  ctx.fillText(username, AV_CX, PILL_Y + PILL_H / 2 + 6);
  ctx.textAlign = 'left';

  // ── Badge strip below username pill ──────────────────────────────────────────
  const earnedKeys = computeEarnedBadgeKeys({ balance, bank, purchases, activePet, activeBanner, activeRing });
  const BSTRIP_Y   = PILL_Y + PILL_H + 10;
  const BSTRIP_H   = 32;
  const BSTRIP_W   = 210;

  ctx.fillStyle   = '#f0f0f8';
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth   = 1;
  roundRect(ctx, AV_CX - BSTRIP_W / 2, BSTRIP_Y, BSTRIP_W, BSTRIP_H, BSTRIP_H / 2);
  ctx.fill(); ctx.stroke();

  const EMOJI_SZ = 20;
  const maxSlots = Math.min(earnedKeys.length, 7);
  if (maxSlots > 0) {
    const totalW = maxSlots * EMOJI_SZ + (maxSlots - 1) * 5;
    let bx = AV_CX - totalW / 2;
    const by = BSTRIP_Y + (BSTRIP_H - EMOJI_SZ) / 2;
    for (let i = 0; i < maxSlots; i++) {
      const key      = earnedKeys[i];
      const def      = BADGE_DEFS.find(b => b.key === key);
      const emojiRaw = guildBadgeEmojis[key] ?? def?.defaultEmoji ?? '🏅';
      const img      = await loadEmojiImg(emojiRaw);
      if (img) ctx.drawImage(img, bx, by, EMOJI_SZ, EMOJI_SZ);
      bx += EMOJI_SZ + 5;
    }
  }

  // ── Bio text (left side) ──────────────────────────────────────────────────────
  const LEFT_X = 28;
  let textY    = BANNER_H + 26;
  const MAX_BIO_W = 555;

  const bioText = bio ?? 'Utilize: fallen bio para alterar esta frase.';
  ctx.font      = `bold 13px ${FONT}`;
  ctx.fillStyle = '#555577';
  textY = await drawBioWithEmojis(ctx, bioText, LEFT_X, textY, MAX_BIO_W, 17, 15);

  // ── Stats panel (2×3 grid) ────────────────────────────────────────────────────
  const PANEL_Y = textY + 10;
  const CELL_W  = 267;
  const CELL_H  = 63;
  const GAP     = 8;
  const ICON_SZ = 42;

  const darkPanel  = false;
  const cellFill   = cardPanelColor ?? '#ffffff';
  const valueColor = '#1a1a2e';
  const labelColor = '#888899';
  const cellBorder = 'rgba(0,0,0,0.07)';

  const statsData = [
    { label: 'Coins',    value: fmtCompact(balance),                   sub: null },
    { label: 'Nível',    value: `${level}`,                            sub: `${xpCurrent}/${xpNeeded} XP` },
    { label: 'Badges',   value: `${earnedKeys.length}`,                sub: null },
    { label: 'Reps',     value: `${reps}`,                             sub: null },
    { label: 'Casado(a)',value: marriedToName ?? 'Nenhum',             sub: null },
    { label: 'Amigo(a)', value: bestFriendName ?? 'Nenhum',            sub: null },
  ];

  for (let i = 0; i < 6; i++) {
    const col   = i % 2;
    const row   = Math.floor(i / 2);
    const cellX = LEFT_X + col * (CELL_W + GAP);
    const cellY = PANEL_Y + row * (CELL_H + GAP);

    // Cell background
    ctx.fillStyle   = cellFill;
    ctx.strokeStyle = cellBorder;
    ctx.lineWidth   = 1;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    roundRect(ctx, cellX, cellY, CELL_W, CELL_H, 14);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = cellBorder; ctx.lineWidth = 1;
    roundRect(ctx, cellX, cellY, CELL_W, CELL_H, 14);
    ctx.stroke();

    // Icon
    const iconX = cellX + 10;
    const iconY = cellY + (CELL_H - ICON_SZ) / 2;
    ICON_DRAWERS[i](ctx, iconX, iconY, ICON_SZ);

    // Text
    const textX = iconX + ICON_SZ + 12;
    const midY  = cellY + CELL_H / 2;

    if (statsData[i].sub) {
      ctx.fillStyle = valueColor;
      ctx.font      = `bold 17px ${FONT}`;
      ctx.fillText(statsData[i].label + ': ' + statsData[i].value, textX, midY - 4);
      ctx.fillStyle = labelColor;
      ctx.font      = `13px ${FONT}`;
      ctx.fillText(statsData[i].sub, textX, midY + 13);
    } else {
      ctx.fillStyle = valueColor;
      ctx.font      = `bold 16px ${FONT}`;
      const labelStr = statsData[i].label;
      ctx.fillText(labelStr, textX, midY - 4);
      ctx.fillStyle = labelColor;
      ctx.font      = `13px ${FONT}`;
      // Truncate value if too long
      let valStr = statsData[i].value;
      const maxValW = CELL_W - ICON_SZ - 34;
      while (valStr.length > 0 && ctx.measureText(valStr).width > maxValW) {
        valStr = valStr.slice(0, -1);
      }
      ctx.fillText(valStr, textX, midY + 13);
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.font      = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Fallen Bot \u2022 Perfil', W - 14, H - 10);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}
