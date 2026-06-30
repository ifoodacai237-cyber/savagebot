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
const W = 950, H = 555;

// ─── Badges ───────────────────────────────────────────────────────────────────
export const BADGE_DEFS = [
  { key: 'vip',           defaultEmoji: '💎', name: 'VIP',           description: 'Saldo total ≥ 50.000',  color: 'rgba(88,166,255,0.85)'  },
  { key: 'rico',          defaultEmoji: '💰', name: 'Rico',          description: 'Saldo total ≥ 10.000',  color: 'rgba(253,224,71,0.85)'  },
  { key: 'poupador',      defaultEmoji: '🪙', name: 'Poupador',      description: 'Saldo total ≥ 5.000',   color: 'rgba(200,180,60,0.80)'  },
  { key: 'colecionador',  defaultEmoji: '🏆', name: 'Colecionador',  description: '10+ itens comprados',   color: 'rgba(157,78,221,0.85)'  },
  { key: 'comprador',     defaultEmoji: '🛍️', name: 'Comprador',     description: '5+ itens comprados',    color: 'rgba(130,60,200,0.80)'  },
  { key: 'mascote',       defaultEmoji: '🐾', name: 'Mascote',       description: 'Pet ativo equipado',    color: 'rgba(87,242,135,0.80)'  },
  { key: 'estiloso',      defaultEmoji: '🎨', name: 'Estiloso',      description: 'Banner equipado',       color: 'rgba(255,107,107,0.80)' },
  { key: 'personalizado', defaultEmoji: '💠', name: 'Personalizado', description: 'Argola personalizada',  color: 'rgba(100,200,220,0.80)' },
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
  const level   = Math.floor((xp ?? 0) / XP_PER_LEVEL) + 1;
  const current = (xp ?? 0) % XP_PER_LEVEL;
  return { level, current, needed: XP_PER_LEVEL };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);          ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);          ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fmtCompact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// Retorna true se a cor for escura (luminância < 128)
// Suporta: hex (#000, #000000, #00000088), rgb(...), rgba(...), named (black/white)
function isColorDark(color) {
  if (!color) return false;
  try {
    const s = String(color).trim().toLowerCase();
    // Named colors
    if (s === 'black' || s === 'transparent') return true;
    if (s === 'white') return false;
    let r, g, b;
    // rgb() / rgba()
    const rgbM = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbM) {
      [r, g, b] = [Number(rgbM[1]), Number(rgbM[2]), Number(rgbM[3])];
      return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
    }
    // Hex
    const hex = s.replace(/^#/, '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else { return false; }
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  } catch { return false; }
}

async function loadUrl(url, timeoutMs = 7000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return loadImage(Buffer.from(await r.arrayBuffer()));
  } finally { clearTimeout(timer); }
}

function parseCustomEmoji(e) {
  const m = e?.match(/<a?:\w+:(\d{10,20})>/);
  return m ? `https://cdn.discordapp.com/emojis/${m[1]}.png` : null;
}

// Tenta múltiplos CDNs para máxima confiabilidade
async function loadEmojiImg(emoji) {
  if (!emoji) return null;
  const cu = parseCustomEmoji(emoji);
  if (cu) try { return await loadUrl(cu, 5000); } catch {}
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(c => c !== 'fe0f').join('-');
  const cdns = [
    `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${cp}.png`,
    `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cp}.png`,
  ];
  for (const url of cdns) {
    try { return await loadUrl(url, 5000); } catch {}
  }
  return null;
}

function tokenizeBio(text) {
  const re = /<a?:\w+:\d{10,20}>|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?)*/gu;
  const tokens = []; let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
    tokens.push({ type: 'emoji', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

async function drawBioWithEmojis(ctx, text, x, y, maxW, lineH, emojiSz) {
  const tokens = tokenizeBio(text);
  const cache  = new Map();
  await Promise.all(tokens.filter(t => t.type === 'emoji').map(async t => {
    const img = await loadEmojiImg(t.value).catch(() => null);
    if (img) cache.set(t.value, img);
  }));
  const SW = ctx.measureText(' ').width;
  const items = [];
  for (const tok of tokens) {
    if (tok.type === 'emoji') { items.push({ kind: 'emoji', value: tok.value, width: emojiSz + 2 }); continue; }
    for (const p of tok.value.split(/(\s+)/)) {
      if (!p) continue;
      items.push(/^\s+$/.test(p)
        ? { kind: 'space', value: p, width: SW * p.length }
        : { kind: 'word',  value: p, width: ctx.measureText(p).width });
    }
  }
  const lines = []; let cur = [], curW = 0;
  for (const item of items) {
    if (item.kind === 'space') { cur.push(item); curW += item.width; continue; }
    if (curW + item.width > maxW && cur.length) {
      while (cur.length && cur.at(-1).kind === 'space') cur.pop();
      lines.push(cur); cur = []; curW = 0;
    }
    cur.push(item); curW += item.width;
  }
  if (cur.length) { while (cur.length && cur.at(-1).kind === 'space') cur.pop(); lines.push(cur); }
  for (const line of lines) {
    let cx = x;
    for (const item of line) {
      if (item.kind === 'emoji') {
        const img = cache.get(item.value);
        if (img) ctx.drawImage(img, cx, y - emojiSz + 3, emojiSz, emojiSz);
        else ctx.fillText(item.value, cx, y);
        cx += item.width;
      } else if (item.kind === 'space') { cx += item.width; }
      else { ctx.fillText(item.value, cx, y); cx += item.width; }
    }
    y += lineH;
  }
  return y;
}

// ─── Ícone: fundo gradiente + emoji por cima ──────────────────────────────────

function drawIconBg(ctx, x, y, sz, c1, c2) {
  const g = ctx.createLinearGradient(x, y, x + sz, y + sz);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, sz, sz, 12);
  ctx.fill();
}

// Ícones canvas de fallback (usados se o emoji não carregar)
function fallbackCoin(ctx, x, y, sz) {
  const cx = x + sz / 2, cy = y + sz / 2;
  for (let i = 2; i >= 0; i--) {
    const off = i * sz * 0.06;
    ctx.fillStyle = i === 0 ? '#FFD700' : `rgba(255,200,50,${0.6 + i * 0.15})`;
    ctx.beginPath(); ctx.ellipse(cx, cy - off, sz * 0.28, sz * 0.10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,130,0,0.4)'; ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.floor(sz * 0.32)}px BotFont`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy + sz * 0.06);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function fallbackStar(ctx, x, y, sz) {
  const cx = x + sz / 2, cy = y + sz / 2, R = sz * 0.30, r2 = R * 0.42;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rl = i % 2 === 0 ? R : r2;
    i === 0 ? ctx.moveTo(cx + rl * Math.cos(a), cy + rl * Math.sin(a))
            : ctx.lineTo(cx + rl * Math.cos(a), cy + rl * Math.sin(a));
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(220,160,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
}

function fallbackMedal(ctx, x, y, sz) {
  const cx = x + sz / 2, cy = y + sz / 2;
  // Ribbon
  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath();
  ctx.moveTo(cx - sz * 0.10, cy - sz * 0.30);
  ctx.lineTo(cx + sz * 0.10, cy - sz * 0.30);
  ctx.lineTo(cx + sz * 0.06, cy - sz * 0.04);
  ctx.lineTo(cx, cy - sz * 0.10);
  ctx.lineTo(cx - sz * 0.06, cy - sz * 0.04);
  ctx.closePath(); ctx.fill();
  // Gold circle
  const grad = ctx.createRadialGradient(cx, cy + sz * 0.08, 0, cx, cy + sz * 0.08, sz * 0.20);
  grad.addColorStop(0, '#FFD700'); grad.addColorStop(1, '#F59E0B');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy + sz * 0.08, sz * 0.20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold ${Math.floor(sz * 0.22)}px BotFont`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy + sz * 0.08);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function fallbackThumb(ctx, x, y, sz) {
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, cx - sz * 0.06, cy - sz * 0.04, sz * 0.24, sz * 0.26, sz * 0.05); ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - sz * 0.17, sz * 0.14, Math.PI * 0.75, Math.PI * 1.75);
  ctx.lineTo(cx - sz * 0.08, cy - sz * 0.04); ctx.lineTo(cx - sz * 0.06, cy - sz * 0.04);
  ctx.closePath(); ctx.fill();
  roundRect(ctx, cx - sz * 0.24, cy + sz * 0.02, sz * 0.18, sz * 0.24, sz * 0.04); ctx.fill();
  // Stars
  ctx.fillStyle = '#FFD700';
  for (let i = 0; i < 3; i++) {
    const sx = cx - sz * 0.15 + i * sz * 0.14, sy = cy - sz * 0.32;
    ctx.font = `${Math.floor(sz * 0.18)}px BotFont`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★', sx, sy);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function fallbackDove(ctx, x, y, sz) {
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  // Body
  ctx.beginPath(); ctx.ellipse(cx - sz * 0.04, cy + sz * 0.05, sz * 0.22, sz * 0.14, -0.2, 0, Math.PI * 2); ctx.fill();
  // Wing
  ctx.beginPath();
  ctx.moveTo(cx - sz * 0.20, cy);
  ctx.bezierCurveTo(cx - sz * 0.10, cy - sz * 0.28, cx + sz * 0.18, cy - sz * 0.22, cx + sz * 0.12, cy + sz * 0.02);
  ctx.closePath(); ctx.fill();
  // Head
  ctx.beginPath(); ctx.arc(cx + sz * 0.14, cy - sz * 0.04, sz * 0.09, 0, Math.PI * 2); ctx.fill();
  // Heart
  ctx.fillStyle = '#FF6B9D';
  ctx.font = `${Math.floor(sz * 0.22)}px BotFont`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('♥', cx - sz * 0.06, cy + sz * 0.30);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function fallbackBff(ctx, x, y, sz) {
  const cx = x + sz / 2, cy = y + sz / 2;
  // BFF charm/pendant
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy - sz * 0.12, sz * 0.10, 0, Math.PI * 2); ctx.stroke();
  // Chain
  ctx.beginPath(); ctx.moveTo(cx, cy - sz * 0.22); ctx.lineTo(cx, cy - sz * 0.30); ctx.stroke();
  // Heart
  const hw = sz * 0.19;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.save(); ctx.translate(cx, cy + sz * 0.10);
  ctx.beginPath();
  ctx.moveTo(0, hw * 0.6);
  ctx.bezierCurveTo(hw * 1.1, -hw * 0.2, hw * 1.1, -hw * 0.9, 0, -hw * 0.35);
  ctx.bezierCurveTo(-hw * 1.1, -hw * 0.9, -hw * 1.1, -hw * 0.2, 0, hw * 0.6);
  ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#CE93D8';
  ctx.font = `bold ${Math.floor(sz * 0.14)}px BotFont`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('BF', cx, cy + sz * 0.10);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// Config de cada stat: emoji para tentar carregar + cores do bg + fallback canvas
const STAT_ICON_CONFIGS = [
  { emoji: '💰', c1: '#F59E0B', c2: '#D97706', fallback: fallbackCoin   }, // Coins
  { emoji: '⭐', c1: '#9333EA', c2: '#7C3AED', fallback: fallbackStar   }, // Nível
  { emoji: '🏅', c1: '#F59E0B', c2: '#D97706', fallback: fallbackMedal  }, // Badges
  { emoji: '👍', c1: '#9333EA', c2: '#7C3AED', fallback: fallbackThumb  }, // Reps
  { emoji: '🕊️', c1: '#EC4899', c2: '#9333EA', fallback: fallbackDove   }, // Casado
  { emoji: '💝', c1: '#9333EA', c2: '#7C3AED', fallback: fallbackBff    }, // Amigo
];

// ─── Gerador principal ────────────────────────────────────────────────────────

export async function generateProfileCard({
  username, avatarUrl, balance, bank, activeBanner, purchases,
  activeRing, ringBorderColor = null, activePet, guildBadgeEmojis = {}, guildId = null,
  marriedToName = null, bestFriendName = null, bio = null,
  cardBg1 = null, cardBg2 = null, cardPanelColor = null,
  xp = 0, reps = 0,
}) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner = await resolveBanner(activeBanner, guildId);
  const { c1: rc1, c2: rc2 } = getRingColors(activeRing ?? null);
  const { level, current: xpCurrent, needed: xpNeeded } = computeLevel(xp);

  // Detecta fundos escuros para adaptar cores de texto
  const darkCard  = isColorDark(cardBg1);
  const darkPanel = isColorDark(cardPanelColor);

  // Pré-carrega ícones dos stats (em paralelo)
  const statIconImgs = await Promise.all(
    STAT_ICON_CONFIGS.map(ic => loadEmojiImg(ic.emoji).catch(() => null)),
  );

  // ── Fundo do card ──────────────────────────────────────────────────────────
  if (cardBg1 && cardBg2) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cardBg1); g.addColorStop(1, cardBg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (cardBg1) {
    ctx.fillStyle = cardBg1;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    // Micro-tint lilás suave no corpo
    const tint = ctx.createLinearGradient(0, 220, 0, H);
    tint.addColorStop(0, 'rgba(240,235,255,0.50)');
    tint.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = tint; ctx.fillRect(0, 220, W, H - 220);
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
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
      const [bg1, bg2] = banner.gradient ?? ['#6a1b9a', '#9c27b0'];
      const g = ctx.createLinearGradient(0, 0, W, BANNER_H);
      g.addColorStop(0, bg1); g.addColorStop(1, bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, BANNER_H);
    g.addColorStop(0, '#6a1b9a'); g.addColorStop(1, '#ce93d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, BANNER_H);
  }
  // Fade base
  const fade = ctx.createLinearGradient(0, BANNER_H - 60, 0, BANNER_H);
  fade.addColorStop(0, 'rgba(255,255,255,0)');
  fade.addColorStop(1, 'rgba(255,255,255,0.15)');
  ctx.fillStyle = fade; ctx.fillRect(0, BANNER_H - 60, W, 60);

  // ── Avatar (direita, sobrepondo o banner) ──────────────────────────────────
  const AV_CX = 755, AV_CY = BANNER_H, AV_R = 92;

  ctx.fillStyle = ringBorderColor ?? '#ffffff';
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 14, 0, Math.PI * 2); ctx.fill();

  const rg = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
  rg.addColorStop(0, rc1); rg.addColorStop(1, rc2);
  ctx.save();
  ctx.shadowColor = rc1; ctx.shadowBlur = 18;
  ctx.strokeStyle = rg; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    ctx.drawImage(await loadUrl(avatarUrl), AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#8e44ad'; ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // Pet
  if (activePet) {
    const px = AV_CX + AV_R * 0.68, py = AV_CY + AV_R * 0.68;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI * 2); ctx.fill();
    const pg = ctx.createLinearGradient(px - 20, py - 20, px + 20, py + 20);
    pg.addColorStop(0, rc1); pg.addColorStop(1, rc2);
    ctx.strokeStyle = pg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, py, 20, 0, Math.PI * 2); ctx.stroke();
    const pi = await loadEmojiImg(activePet);
    if (pi) ctx.drawImage(pi, px - 13, py - 13, 26, 26);
  }

  // ── Username pill ──────────────────────────────────────────────────────────
  const PY = AV_CY + AV_R + 18, PH = 42;
  ctx.font = `bold 18px ${FONT}`;
  const nw = ctx.measureText(username).width;
  const PW = Math.max(nw + 50, 140), PX = AV_CX - PW / 2;
  ctx.fillStyle = '#e8e8f0'; ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
  roundRect(ctx, PX, PY, PW, PH, PH / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2c2c54'; ctx.textAlign = 'center';
  ctx.fillText(username, AV_CX, PY + PH / 2 + 7); ctx.textAlign = 'left';

  // ── Badge strip ────────────────────────────────────────────────────────────
  const earnedKeys = computeEarnedBadgeKeys({ balance, bank, purchases, activePet, activeBanner, activeRing });
  const BSY = PY + PH + 10, BSH = 34, BSW = 220;
  ctx.fillStyle = '#f2f2f8'; ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1;
  roundRect(ctx, AV_CX - BSW / 2, BSY, BSW, BSH, BSH / 2); ctx.fill(); ctx.stroke();
  const ESZI = 22, maxSlots = Math.min(earnedKeys.length, 7);
  if (maxSlots > 0) {
    const tw = maxSlots * ESZI + (maxSlots - 1) * 5;
    let bx = AV_CX - tw / 2;
    const by = BSY + (BSH - ESZI) / 2;
    for (let i = 0; i < maxSlots; i++) {
      const key = earnedKeys[i];
      const def = BADGE_DEFS.find(b => b.key === key);
      const img = await loadEmojiImg(guildBadgeEmojis[key] ?? def?.defaultEmoji ?? '🏅');
      if (img) ctx.drawImage(img, bx, by, ESZI, ESZI);
      bx += ESZI + 5;
    }
  }

  // ── Bio ────────────────────────────────────────────────────────────────────
  const LEFT_X = 30;
  let textY    = BANNER_H + 28;
  const bioText = bio ?? 'Utilize: fallen bio para alterar esta frase.';
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = darkCard ? '#ffffff' : '#2c2c54';
  textY = await drawBioWithEmojis(ctx, bioText, LEFT_X, textY, 575, 20, 16);

  // ── Painel de stats ────────────────────────────────────────────────────────
  //  ┌─────────────────── container ─────────────────────┐
  //  │  ╭──── pill ────╮  ╭──── pill ────╮             │
  //  │  │ [icon] texto │  │ [icon] texto │             │
  //  │  ╰──────────────╯  ╰──────────────╯             │
  //  └───────────────────────────────────────────────────┘
  const OP   = 14;   // padding externo
  const CG   = 8;    // gap entre células
  const CH   = 70;   // altura da pílula
  const CW   = 268;  // largura da pílula
  const OW   = OP * 2 + CW * 2 + CG;
  const OH   = OP * 2 + CH * 3 + CG * 2;
  const PNX  = LEFT_X;
  const PNY  = textY + 10;
  const ISZ  = 50;   // tamanho do ícone

  // Container externo
  ctx.save();
  ctx.shadowColor = 'rgba(100,80,160,0.12)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
  const outerG = ctx.createLinearGradient(PNX, PNY, PNX, PNY + OH);
  outerG.addColorStop(0, '#eceaf4');
  outerG.addColorStop(1, '#e2e0ec');
  ctx.fillStyle = outerG;
  roundRect(ctx, PNX, PNY, OW, OH, 24); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(170,160,205,0.45)'; ctx.lineWidth = 1;
  roundRect(ctx, PNX, PNY, OW, OH, 24); ctx.stroke();

  const statsData = [
    { topText: fmtCompact(balance),         botText: 'Coins'                          },
    { topText: `Nível: ${level}`,            botText: `${xpCurrent}/${xpNeeded}`       },
    { topText: 'Badges',                     botText: String(earnedKeys.length)         },
    { topText: 'Reps',                       botText: String(reps)                      },
    { topText: 'Casado(a)',                  botText: marriedToName  ?? 'Nenhum'        },
    { topText: 'Amigo(a)',                   botText: bestFriendName ?? 'Nenhum'        },
  ];

  for (let i = 0; i < 6; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const cX  = PNX + OP + col * (CW + CG);
    const cY  = PNY + OP + row * (CH + CG);

    // Pílula branca (radius = CH/2 → forma de pílula perfeita)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.07)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = cardPanelColor ?? '#ffffff';
    roundRect(ctx, cX, cY, CW, CH, CH / 2); ctx.fill();
    ctx.restore();

    // Ícone: bg colorido + emoji (ou fallback canvas)
    const icCfg  = STAT_ICON_CONFIGS[i];
    const iX     = cX + 12;
    const iY     = cY + (CH - ISZ) / 2;
    drawIconBg(ctx, iX, iY, ISZ, icCfg.c1, icCfg.c2);

    const emojiImg = statIconImgs[i];
    if (emojiImg) {
      // Emoji carregou — exibe na área do ícone com clip para não vazar
      ctx.save();
      roundRect(ctx, iX, iY, ISZ, ISZ, 12); ctx.clip();
      const pad = ISZ * 0.12;
      ctx.drawImage(emojiImg, iX + pad, iY + pad, ISZ - pad * 2, ISZ - pad * 2);
      ctx.restore();
    } else {
      // Fallback: ícone desenhado em canvas
      ctx.save(); icCfg.fallback(ctx, iX, iY, ISZ); ctx.restore();
    }

    // Texto — cores adaptáveis ao painel (escuro → branco)
    const tX   = iX + ISZ + 14;
    const midY = cY + CH / 2;
    const maxW = CW - ISZ - 40;
    const topColor = darkPanel ? '#ffffff'                : '#1a1a2e';
    const botColor = darkPanel ? 'rgba(255,255,255,0.92)' : '#888899';

    // Linha de cima: bold
    ctx.save();
    if (darkPanel) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3; }
    ctx.font = `bold 18px ${FONT}`; ctx.fillStyle = topColor;
    let top = statsData[i].topText;
    while (top.length > 1 && ctx.measureText(top).width > maxW) top = top.slice(0, -1);
    ctx.fillText(top, tX, midY - 5);

    // Linha de baixo: regular
    ctx.font = `14px ${FONT}`; ctx.fillStyle = botColor;
    let bot = statsData[i].botText;
    while (bot.length > 1 && ctx.measureText(bot).width > maxW) bot = bot.slice(0, -1);
    ctx.fillText(bot, tX, midY + 15);
    ctx.restore();
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = darkCard ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.18)';
  ctx.font = `11px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText('Fallen Bot \u2022 Perfil', W - 16, H - 10);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}
