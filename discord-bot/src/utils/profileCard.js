import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { resolveBanner, getRingColors } from './shopData.js';

// ─── Carregar fontes ───────────────────────────────────────────────────────────
// Lê os arquivos TTF como buffer e registra diretamente no skia.
// Este método funciona em qualquer ambiente (Replit, Railway, Docker)
// sem depender de fontconfig, sistema operacional ou variáveis de ambiente.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const FONTS_DIR  = join(__dirname, '../../fonts');

GlobalFonts.register(readFileSync(join(FONTS_DIR, 'Roboto-Regular.ttf')), 'BotFont');
GlobalFonts.register(readFileSync(join(FONTS_DIR, 'Roboto-Bold.ttf')),    'BotFont');

const FONT = 'BotFont';
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
  if (activePet)                           keys.push('mascote');
  if (activeBanner)                        keys.push('estiloso');
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

// Convert a Unicode emoji string to Twemoji CDN URL
function twemojiUrl(emoji) {
  const codepoints = [...emoji]
    .map(ch => ch.codePointAt(0).toString(16).toLowerCase())
    .filter(cp => cp !== 'fe0f');   // strip variation selectors
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints.join('-')}.png`;
}

// Load any emoji (custom Discord or standard Unicode via Twemoji)
async function loadEmojiImg(emojiOrImg) {
  if (!emojiOrImg || emojiOrImg === '__coin__') return null;
  const customUrl = parseCustomEmoji(emojiOrImg);
  if (customUrl) {
    try { return await loadUrl(customUrl); } catch {}
  }
  try { return await loadUrl(twemojiUrl(emojiOrImg)); } catch {}
  return null;
}

// ── Bio tokenizer + inline-emoji renderer ────────────────────────────────────

// Splits a bio string into {type:'text'|'emoji', value} tokens.
// Handles Discord custom emojis <:name:id> / <a:name:id> and Unicode emoji.
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

// Draws bio with inline emoji images; returns updated Y after all lines.
async function drawBioWithEmojis(ctx, text, x, y, maxWidth, lineH, emojiSz) {
  const tokens = tokenizeBio(text);

  // Pre-load all emoji images in parallel
  const cache = new Map();
  await Promise.all(
    tokens.filter(t => t.type === 'emoji').map(async t => {
      if (cache.has(t.value)) return;
      const img = await loadEmojiImg(t.value).catch(() => null);
      if (img) cache.set(t.value, img);
    }),
  );

  // Flatten tokens → drawable items {kind, value, width}
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

  // Word-wrap into lines
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

  // Draw each line
  for (const line of lines) {
    let cx = x;
    for (const item of line) {
      if (item.kind === 'emoji') {
        const img = cache.get(item.value);
        if (img) {
          // Align emoji vertically: bottom ~2px below text baseline
          ctx.drawImage(img, cx, y - emojiSz + 3, emojiSz, emojiSz);
        } else {
          ctx.fillText(item.value, cx, y); // fallback: raw text
        }
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

// ── Modern stat icon drawers ──────────────────────────────────────────────────

function drawIconBg(ctx, x, y, size, bg1, bg2) {
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, bg1);
  g.addColorStop(1, bg2);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, size, size, 10);
  ctx.fill();
}

// Coins icon — amber/gold coin face
function drawCoinStatIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#FBBF24', '#B45309');
  const cx = x + sz / 2, cy = y + sz / 2, r = sz * 0.27;
  // Outer coin glow
  ctx.save();
  ctx.shadowColor = 'rgba(245,158,11,.5)';
  ctx.shadowBlur  = 4;
  ctx.fillStyle   = 'rgba(255,255,255,.93)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Inner ring
  ctx.strokeStyle = 'rgba(180,83,9,.45)';
  ctx.lineWidth   = sz * 0.035;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.70, 0, Math.PI * 2); ctx.stroke();
  // Center dot
  ctx.fillStyle = '#92400E';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2); ctx.fill();
}

// Bank icon — blue building
function drawBankStatIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#60A5FA', '#1D4ED8');
  const cx = x + sz / 2, cy = y + sz * 0.5;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  // Roof triangle
  ctx.beginPath();
  ctx.moveTo(cx, cy - sz * 0.27);
  ctx.lineTo(cx + sz * 0.24, cy - sz * 0.10);
  ctx.lineTo(cx - sz * 0.24, cy - sz * 0.10);
  ctx.closePath();
  ctx.fill();
  // 3 columns
  const colW = sz * 0.055, colH = sz * 0.20;
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(cx + i * sz * 0.095 - colW / 2, cy - sz * 0.10, colW, colH);
  }
  // Base slab
  ctx.fillRect(cx - sz * 0.26, cy + sz * 0.10, sz * 0.52, sz * 0.055);
}

// Badges icon — purple 5-point star
function drawBadgeStatIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#C084FC', '#7C3AED');
  const cx = x + sz / 2, cy = y + sz / 2;
  const R = sz * 0.27, r2 = R * 0.42;
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,.3)';
  ctx.shadowBlur  = 3;
  ctx.fillStyle   = 'rgba(255,255,255,.93)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle  = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? R : r2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Items icon — emerald shopping bag
function drawBagStatIcon(ctx, x, y, sz) {
  drawIconBg(ctx, x, y, sz, '#34D399', '#059669');
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  // Bag body (rounded rect)
  const bx = cx - sz * 0.20, by = cy - sz * 0.08, bw = sz * 0.40, bh = sz * 0.28;
  roundRect(ctx, bx, by, bw, bh, sz * 0.055);
  ctx.fill();
  // Handle arc
  ctx.strokeStyle = 'rgba(255,255,255,.92)';
  ctx.lineWidth   = sz * 0.07;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.arc(cx, by, sz * 0.12, Math.PI, 0);
  ctx.stroke();
}

const STAT_ICON_DRAWERS = [drawCoinStatIcon, drawBankStatIcon, drawBadgeStatIcon, drawBagStatIcon];

// ─── Main card generator ───────────────────────────────────────────────────────

// Returns true if a hex color (e.g. "#1a1a2e") is dark enough that white text is preferred
function isColorDark(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

export async function generateProfileCard({
  username, avatarUrl, balance, bank, activeBanner, purchases,
  activeRing, ringBorderColor = null, activePet, guildBadgeEmojis = {}, guildId = null,
  marriedToName = null, bio = null, cardBg1 = null, cardBg2 = null, cardPanelColor = null,
}) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner      = await resolveBanner(activeBanner, guildId);
  const { c1, c2 } = getRingColors(activeRing ?? null);

  // ── Card background ───────────────────────────────────────────────────────────
  if (cardBg1 && cardBg2) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cardBg1);
    g.addColorStop(1, cardBg2);
    ctx.fillStyle = g;
  } else if (cardBg1) {
    ctx.fillStyle = cardBg1;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillRect(0, 0, W, H);

  // ── Banner area ───────────────────────────────────────────────────────────────
  const BANNER_H = 230;
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
      const [bg1, bg2] = banner.gradient ?? ['#1a0533', '#4a1a8a'];
      g.addColorStop(0, bg1); g.addColorStop(1, bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, BANNER_H);
    g.addColorStop(0, '#1a0533'); g.addColorStop(1, '#3a0f7a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
  }

  // Soft fade at banner bottom into white content area
  const fade = ctx.createLinearGradient(0, BANNER_H - 60, 0, BANNER_H);
  fade.addColorStop(0, 'rgba(255,255,255,0)');
  fade.addColorStop(1, 'rgba(255,255,255,0.30)');
  ctx.fillStyle = fade; ctx.fillRect(0, BANNER_H - 60, W, 60);

  // ── Avatar ────────────────────────────────────────────────────────────────────
  const AV_CX = 730, AV_CY = BANNER_H, AV_R = 90;

  // Outer border ring (configurable, default white)
  const outerBorderColor = ringBorderColor ?? '#ffffff';
  ctx.fillStyle = outerBorderColor;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 13, 0, Math.PI * 2); ctx.fill();

  // Colored argola with glow effect
  const ringGrad = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
  ringGrad.addColorStop(0, c1); ringGrad.addColorStop(1, c2);
  ctx.save();
  ctx.shadowColor = c1;
  ctx.shadowBlur  = 12;
  ctx.strokeStyle = ringGrad; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 7, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Avatar image
  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    // avatarUrl já pode conter ?size=256 (passado pelo comando), não adicionar novamente
    const img = await loadUrl(avatarUrl);
    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#5a5a8a'; ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // ── Pet badge ─────────────────────────────────────────────────────────────────
  if (activePet) {
    const petX = AV_CX + AV_R * 0.68;
    const petY = AV_CY + AV_R * 0.68;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(petX, petY, 22, 0, Math.PI * 2); ctx.fill();
    const g2 = ctx.createLinearGradient(petX - 20, petY - 20, petX + 20, petY + 20);
    g2.addColorStop(0, c1); g2.addColorStop(1, c2);
    ctx.strokeStyle = g2; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(petX, petY, 20, 0, Math.PI * 2); ctx.stroke();
    const petImg = await loadEmojiImg(activePet);
    if (petImg) {
      ctx.drawImage(petImg, petX - 13, petY - 13, 26, 26);
    }
  }

  // ── Badge pill below avatar ───────────────────────────────────────────────────
  const earnedKeys   = computeEarnedBadgeKeys({ balance, bank, purchases, activePet, activeBanner, activeRing });
  const BPILL_Y      = AV_CY + AV_R + 18;
  const BPILL_H      = 38;
  const BPILL_W      = 220;

  ctx.fillStyle   = '#f2f2f5';
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth   = 1;
  roundRect(ctx, AV_CX - BPILL_W / 2, BPILL_Y, BPILL_W, BPILL_H, BPILL_H / 2);
  ctx.fill(); ctx.stroke();

  const EMOJI_SZ = 24;
  const maxSlots = Math.min(earnedKeys.length, 6);
  if (maxSlots > 0) {
    const totalW = maxSlots * EMOJI_SZ + (maxSlots - 1) * 6;
    let bx = AV_CX - totalW / 2;
    const by = BPILL_Y + (BPILL_H - EMOJI_SZ) / 2;
    for (let i = 0; i < maxSlots; i++) {
      const key      = earnedKeys[i];
      const def      = BADGE_DEFS.find(b => b.key === key);
      const emojiRaw = guildBadgeEmojis[key] ?? def?.defaultEmoji ?? '🏅';
      const img      = await loadEmojiImg(emojiRaw);
      if (img) {
        ctx.drawImage(img, bx, by, EMOJI_SZ, EMOJI_SZ);
      }
      bx += EMOJI_SZ + 6;
    }
  }

  // ── Name + bio ────────────────────────────────────────────────────────────────
  const LEFT_X = 28;
  let textY    = BANNER_H + 28;

  ctx.fillStyle = '#1a1a2e';
  ctx.font      = `bold 28px ${FONT}`;
  ctx.fillText(username, LEFT_X, textY);
  textY += 24;

  if (marriedToName) {
    ctx.font      = `13px ${FONT}`;
    ctx.fillStyle = '#c05080';
    ctx.fillText(`\u2665 Casado(a) com ${marriedToName}`, LEFT_X, textY);
    textY += 20;
  }

  const bioText = bio ?? 'Utilize: fallen bio para alterar esta frase.';
  ctx.font      = `13px ${FONT}`;
  ctx.fillStyle = '#555';
  textY = await drawBioWithEmojis(ctx, bioText, LEFT_X, textY, 560, 17, 16);

  // ── Stats panel ───────────────────────────────────────────────────────────────
  const PANEL_Y = textY + 12;
  const PANEL_W = 565;
  const CELL_H  = 72;
  const GAP     = 8;
  const PANEL_H = CELL_H * 2 + GAP + 24;
  const ICON_SZ = 48;

  // Panel color theme
  const darkPanel   = cardPanelColor ? isColorDark(cardPanelColor) : false;
  const panelOuter  = cardPanelColor
    ? (darkPanel ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.06)')
    : '#f0f0f4';
  const cellFill    = cardPanelColor ?? '#ffffff';
  const valueColor  = darkPanel ? '#f0f0f0' : '#1a1a2e';
  const labelColor  = darkPanel ? 'rgba(240,240,240,0.65)' : '#999999';
  const cellBorder  = darkPanel ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  // Outer panel container
  ctx.fillStyle   = panelOuter;
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth   = 1;
  roundRect(ctx, LEFT_X, PANEL_Y, PANEL_W, PANEL_H, 18);
  ctx.fill(); ctx.stroke();

  const CELL_W    = (PANEL_W - GAP - 24) / 2;
  const statsData = [
    { label: 'Coins',  value: fmtCompact(balance)        },
    { label: 'Banco',  value: fmtCompact(bank)           },
    { label: 'Badges', value: String(earnedKeys.length)  },
    { label: 'Itens',  value: `${purchases} itens`       },
  ];

  for (let i = 0; i < 4; i++) {
    const col   = i % 2;
    const row   = Math.floor(i / 2);
    const cellX = LEFT_X + 12 + col * (CELL_W + GAP);
    const cellY = PANEL_Y + 12 + row * (CELL_H + GAP);

    // Cell background
    ctx.fillStyle   = cellFill;
    ctx.strokeStyle = cellBorder;
    ctx.lineWidth   = 1;
    roundRect(ctx, cellX, cellY, CELL_W, CELL_H, 12);
    ctx.fill(); ctx.stroke();

    // Icon (modern distinct icon per stat)
    const iconX = cellX + 10;
    const iconY = cellY + (CELL_H - ICON_SZ) / 2;
    STAT_ICON_DRAWERS[i](ctx, iconX, iconY, ICON_SZ);

    // Value text
    const textX = iconX + ICON_SZ + 12;
    ctx.fillStyle = valueColor;
    ctx.font      = `bold 20px ${FONT}`;
    ctx.fillText(statsData[i].value, textX, cellY + CELL_H / 2 - 2);

    // Label text
    ctx.fillStyle = labelColor;
    ctx.font      = `12px ${FONT}`;
    ctx.fillText(statsData[i].label, textX, cellY + CELL_H / 2 + 16);
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.font      = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Fallen Bot \u2022 Perfil', W - 14, H - 12);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}
