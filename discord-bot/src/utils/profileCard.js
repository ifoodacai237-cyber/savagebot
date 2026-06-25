import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { resolveBanner, getRingColors } from './shopData.js';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ─── Carregar fontes ───────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Caminhos específicos de arquivos TTF conhecidos (Railway/apt instala em subpastas
//    que loadFontsFromDir NÃO escaneia recursivamente — por isso carregamos direto).
const SPECIFIC_FONTS = [
  // Railway railpack: apt install fonts-dejavu-core
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
  // Railway railpack: apt install fonts-liberation
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  // Nixpacks: fontes copiadas para /var/fonts pelo build phase
  '/var/fonts/DejaVuSans.ttf',
  '/var/fonts/DejaVuSans-Bold.ttf',
  '/var/fonts/LiberationSans-Regular.ttf',
  '/var/fonts/LiberationSans-Bold.ttf',
];
for (const fp of SPECIFIC_FONTS) {
  try { if (existsSync(fp)) GlobalFonts.registerFromPath(fp); } catch {}
}

// 2. Fallback: varrer diretórios de nível superior (funciona se /var/fonts tiver TTFs diretos)
const FONT_DIRS = ['/var/fonts', '/usr/share/fonts', '/usr/local/share/fonts'];
for (const dir of FONT_DIRS) {
  try { if (existsSync(dir)) GlobalFonts.loadFontsFromDir(dir); } catch {}
}

// 3. Detectar qual fonte foi carregada
// getFamilies() pode retornar Buffer, Array ou string dependendo da versão
let FONT_FAMILIES = [];
try {
  const raw = GlobalFonts.getFamilies();
  if (Buffer.isBuffer(raw)) {
    FONT_FAMILIES = JSON.parse(raw.toString('utf8'));
  } else if (Array.isArray(raw)) {
    FONT_FAMILIES = raw;
  } else if (typeof raw === 'string') {
    FONT_FAMILIES = JSON.parse(raw);
  }
} catch {}

const familyName = f => (typeof f === 'string' ? f : f?.family ?? '');
const HAS_DEJAVU     = FONT_FAMILIES.some(f => /dejavu/i.test(familyName(f)));
const HAS_LIBERATION = FONT_FAMILIES.some(f => /liberation/i.test(familyName(f)));
const HAS_NOTO       = FONT_FAMILIES.some(f => /noto/i.test(familyName(f)));

// 4. Seleciona a melhor fonte disponível (DejaVu como padrão — sempre instalado)
const BEST_FONT = HAS_DEJAVU ? 'DejaVu Sans' : HAS_LIBERATION ? 'Liberation Sans' : HAS_NOTO ? 'Noto Sans' : 'DejaVu Sans';
const FONT = `"${BEST_FONT}", "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
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

// Draw purple rounded icon background, then the emoji image centered inside
async function drawStatIcon(ctx, x, y, size, emojiOrImg, coinImg) {
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, '#c45ef5');
  g.addColorStop(1, '#8b2fc9');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  const innerSize = size * 0.60;
  const cx = x + size / 2 - innerSize / 2;
  const cy = y + size / 2 - innerSize / 2;

  if (emojiOrImg === '__coin__' && coinImg) {
    ctx.drawImage(coinImg, cx, cy, innerSize, innerSize);
    return;
  }
  const img = await loadEmojiImg(emojiOrImg);
  if (img) {
    ctx.drawImage(img, cx, cy, innerSize, innerSize);
  }
}

// ─── Main card generator ───────────────────────────────────────────────────────

export async function generateProfileCard({
  username, avatarUrl, balance, bank, activeBanner, purchases,
  activeRing, ringBorderColor = null, activePet, guildBadgeEmojis = {}, guildId = null,
  marriedToName = null, bio = null, cardBg1 = null, cardBg2 = null,
}) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner      = await resolveBanner(activeBanner, guildId);
  const { c1, c2 } = getRingColors(activeRing ?? null);
  let coinImg = null;
  try { coinImg = await loadUrl(COIN_URL); } catch {}

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

  // Outer panel (light gray container)
  ctx.fillStyle   = '#f0f0f4';
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth   = 1;
  roundRect(ctx, LEFT_X, PANEL_Y, PANEL_W, PANEL_H, 18);
  ctx.fill(); ctx.stroke();

  const CELL_W    = (PANEL_W - GAP - 24) / 2;
  const statsData = [
    { icon: '__coin__', label: 'Coins',  value: fmtCompact(balance)     },
    { icon: '🏦',       label: 'Banco',  value: fmtCompact(bank)        },
    { icon: '🏅',       label: 'Badges', value: String(earnedKeys.length) },
    { icon: '🛍️',      label: 'Itens',  value: `${purchases} itens`    },
  ];

  for (let i = 0; i < 4; i++) {
    const col   = i % 2;
    const row   = Math.floor(i / 2);
    const cellX = LEFT_X + 12 + col * (CELL_W + GAP);
    const cellY = PANEL_Y + 12 + row * (CELL_H + GAP);

    // White cell bg
    ctx.fillStyle   = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth   = 1;
    roundRect(ctx, cellX, cellY, CELL_W, CELL_H, 12);
    ctx.fill(); ctx.stroke();

    // Icon (purple rounded square)
    const iconX = cellX + 10;
    const iconY = cellY + (CELL_H - ICON_SZ) / 2;
    await drawStatIcon(ctx, iconX, iconY, ICON_SZ, statsData[i].icon, coinImg);

    // Value text
    const textX = iconX + ICON_SZ + 12;
    ctx.fillStyle = '#1a1a2e';
    ctx.font      = `bold 20px ${FONT}`;
    ctx.fillText(statsData[i].value, textX, cellY + CELL_H / 2 - 2);

    // Label text
    ctx.fillStyle = '#999';
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
