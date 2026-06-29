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
const W = 900, H = 520;

// ─── Badge definitions ────────────────────────────────────────────────────────
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

function twemojiUrl(emoji) {
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(c => c !== 'fe0f');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cp.join('-')}.png`;
}

async function loadEmojiImg(e) {
  if (!e) return null;
  const cu = parseCustomEmoji(e);
  if (cu) try { return await loadUrl(cu); } catch {}
  try { return await loadUrl(twemojiUrl(e)); } catch {}
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
      } else if (item.kind !== 'space') ctx.fillText(item.value, cx, y);
      if (item.kind !== 'space') cx += item.width; else cx += item.width;
    }
    y += lineH;
  }
  return y;
}

// ─── Ícones canvas (sempre funcionam, sem CDN) ────────────────────────────────

function iconBg(ctx, x, y, sz, c1, c2) {
  const g = ctx.createLinearGradient(x, y, x + sz, y + sz);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, sz, sz, 10);
  ctx.fill();
}

// 🪙 Coins — fundo âmbar + moeda branca
function iconCoins(ctx, x, y, sz) {
  iconBg(ctx, x, y, sz, '#FBB040', '#E67E22');
  const cx = x + sz / 2, cy = y + sz / 2, r = sz * 0.26;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(180,100,10,0.30)'; ctx.lineWidth = sz * 0.04;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(146,64,14,0.7)';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.17, 0, Math.PI * 2); ctx.fill();
}

// ⭐ Nível — fundo dourado + estrela branca
function iconStar(ctx, x, y, sz) {
  iconBg(ctx, x, y, sz, '#FDD835', '#FFA000');
  const cx = x + sz / 2, cy = y + sz / 2, R = sz * 0.27, r2 = R * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rl = i % 2 === 0 ? R : r2;
    i === 0 ? ctx.moveTo(cx + rl * Math.cos(a), cy + rl * Math.sin(a))
            : ctx.lineTo(cx + rl * Math.cos(a), cy + rl * Math.sin(a));
  }
  ctx.closePath(); ctx.fill();
}

// 🏅 Badges — fundo roxo + medalha branca
function iconMedal(ctx, x, y, sz) {
  iconBg(ctx, x, y, sz, '#AB47BC', '#7B1FA2');
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(cx - sz * 0.08, cy - sz * 0.28); ctx.lineTo(cx + sz * 0.08, cy - sz * 0.28);
  ctx.lineTo(cx + sz * 0.04, cy - sz * 0.06); ctx.lineTo(cx, cy - sz * 0.10);
  ctx.lineTo(cx - sz * 0.04, cy - sz * 0.06); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy + sz * 0.07, sz * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(180,120,220,0.55)';
  ctx.beginPath(); ctx.arc(cx, cy + sz * 0.07, sz * 0.09, 0, Math.PI * 2); ctx.fill();
}

// 👍 Reps — fundo índigo + polegar branco
function iconThumb(ctx, x, y, sz) {
  iconBg(ctx, x, y, sz, '#7986CB', '#5C6BC0');
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, cx - sz * 0.06, cy - sz * 0.03, sz * 0.22, sz * 0.25, sz * 0.04); ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - sz * 0.01, cy - sz * 0.18, sz * 0.12, Math.PI * 0.8, Math.PI * 1.7, false);
  ctx.lineTo(cx - sz * 0.08, cy - sz * 0.03); ctx.lineTo(cx - sz * 0.06, cy - sz * 0.03);
  ctx.closePath(); ctx.fill();
  roundRect(ctx, cx - sz * 0.22, cy + sz * 0.01, sz * 0.16, sz * 0.25, sz * 0.04); ctx.fill();
}

// 💕 Casado — fundo rosa + coração branco
function iconHeart(ctx, x, y, sz) {
  iconBg(ctx, x, y, sz, '#F48FB1', '#E91E63');
  const cx = x + sz / 2, cy = y + sz / 2 + sz * 0.02, hw = sz * 0.22;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.save(); ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, hw * 0.6);
  ctx.bezierCurveTo(hw * 1.2, -hw * 0.2, hw * 1.2, -hw * 1.0, 0, -hw * 0.4);
  ctx.bezierCurveTo(-hw * 1.2, -hw * 1.0, -hw * 1.2, -hw * 0.2, 0, hw * 0.6);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// 💝 Amigo — fundo lilás + coração+estrela brancos
function iconBff(ctx, x, y, sz) {
  iconBg(ctx, x, y, sz, '#CE93D8', '#AB47BC');
  const cx = x + sz / 2, cy = y + sz / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.save(); ctx.translate(cx - sz * 0.10, cy); ctx.scale(0.62, 0.62);
  const hw = sz * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, hw * 0.6);
  ctx.bezierCurveTo(hw * 1.2, -hw * 0.2, hw * 1.2, -hw * 1.0, 0, -hw * 0.4);
  ctx.bezierCurveTo(-hw * 1.2, -hw * 1.0, -hw * 1.2, -hw * 0.2, 0, hw * 0.6);
  ctx.closePath(); ctx.fill(); ctx.restore();
  const rx = cx + sz * 0.10, ry = cy, Rs = sz * 0.13, rs = Rs * 0.44;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2, rl = i % 2 === 0 ? Rs : rs;
    i === 0 ? ctx.moveTo(rx + rl * Math.cos(a), ry + rl * Math.sin(a))
            : ctx.lineTo(rx + rl * Math.cos(a), ry + rl * Math.sin(a));
  }
  ctx.closePath(); ctx.fill();
}

const ICON_FNS = [iconCoins, iconStar, iconMedal, iconThumb, iconHeart, iconBff];

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
    // Fundo branco com micro-gradiente lilás
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const bodyTint = ctx.createLinearGradient(0, 220, 0, H);
    bodyTint.addColorStop(0, 'rgba(245,242,255,0.55)');
    bodyTint.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bodyTint;
    ctx.fillRect(0, 220, W, H - 220);
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
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

  // Fade suave base do banner
  const fade = ctx.createLinearGradient(0, BANNER_H - 60, 0, BANNER_H);
  fade.addColorStop(0, 'rgba(255,255,255,0)');
  fade.addColorStop(1, 'rgba(255,255,255,0.18)');
  ctx.fillStyle = fade; ctx.fillRect(0, BANNER_H - 60, W, 60);

  // ── Avatar (lado direito, sobrepondo o banner) ─────────────────────────────
  const AV_CX = 718, AV_CY = BANNER_H, AV_R = 88;

  // Borda branca externa
  ctx.fillStyle = ringBorderColor ?? '#ffffff';
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 14, 0, Math.PI * 2); ctx.fill();

  // Argola colorida com brilho
  const rg = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
  rg.addColorStop(0, rc1); rg.addColorStop(1, rc2);
  ctx.save();
  ctx.shadowColor = rc1; ctx.shadowBlur = 16;
  ctx.strokeStyle = rg; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Foto do avatar
  ctx.save();
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    ctx.drawImage(await loadUrl(avatarUrl), AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#8e44ad'; ctx.fillRect(AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  // Pet badge
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

  // ── Pílula do username ─────────────────────────────────────────────────────
  const PY = AV_CY + AV_R + 16, PH = 38;
  ctx.font = `bold 16px ${FONT}`;
  const nw  = ctx.measureText(username).width;
  const PW  = Math.max(nw + 44, 130);
  const PX  = AV_CX - PW / 2;
  ctx.fillStyle = '#e8e8f0'; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
  roundRect(ctx, PX, PY, PW, PH, PH / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2c2c54'; ctx.textAlign = 'center';
  ctx.fillText(username, AV_CX, PY + PH / 2 + 6); ctx.textAlign = 'left';

  // ── Tira de conquistas/badges ──────────────────────────────────────────────
  const earnedKeys = computeEarnedBadgeKeys({ balance, bank, purchases, activePet, activeBanner, activeRing });
  const BSY = PY + PH + 10, BSH = 32, BSW = 210;
  ctx.fillStyle = '#f0f0f8'; ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
  roundRect(ctx, AV_CX - BSW / 2, BSY, BSW, BSH, BSH / 2); ctx.fill(); ctx.stroke();
  const ESZI = 20, maxSlots = Math.min(earnedKeys.length, 7);
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

  // ── Bio (esquerda) ─────────────────────────────────────────────────────────
  const LEFT_X = 28;
  let textY    = BANNER_H + 26;
  const bioText = bio ?? 'Utilize: fallen bio para alterar esta frase.';
  ctx.font = `bold 14px ${FONT}`; ctx.fillStyle = '#3a3a5c';
  textY = await drawBioWithEmojis(ctx, bioText, LEFT_X, textY, 555, 19, 16);

  // ── Painel de stats ────────────────────────────────────────────────────────
  //  Container externo cinza-claro → 3 linhas de 2 pílulas brancas cada
  const OP   = 10;  // outer padding
  const CG   = 8;   // cell gap
  const CH   = 66;  // cell height
  const CW   = 262; // cell width  (2 colunas)
  const OW   = OP * 2 + CW * 2 + CG;
  const OH   = OP * 2 + CH * 3 + CG * 2;
  const PNX  = LEFT_X;
  const PNY  = textY + 10;
  const ISZ  = 46;  // ícone tamanho

  // Container externo — gradiente sutil + borda fina
  ctx.save();
  ctx.shadowColor = 'rgba(100,80,160,0.13)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  const outerG = ctx.createLinearGradient(PNX, PNY, PNX, PNY + OH);
  outerG.addColorStop(0, '#e8e6f2');
  outerG.addColorStop(1, '#dddbe8');
  ctx.fillStyle = outerG;
  roundRect(ctx, PNX, PNY, OW, OH, 22); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(180,170,210,0.50)'; ctx.lineWidth = 1;
  roundRect(ctx, PNX, PNY, OW, OH, 22); ctx.stroke();

  const statsData = [
    { label: 'Coins',     topText: fmtCompact(balance),          botText: 'Coins'        },
    { label: 'Nível',     topText: `Nível: ${level}`,             botText: `${xpCurrent}/${xpNeeded}` },
    { label: 'Badges',    topText: 'Badges',                      botText: `${earnedKeys.length}`      },
    { label: 'Reps',      topText: 'Reps',                        botText: `${reps}`                   },
    { label: 'Casado(a)', topText: 'Casado(a)',                   botText: marriedToName  ?? 'Nenhum'  },
    { label: 'Amigo(a)',  topText: 'Amigo(a)',                    botText: bestFriendName ?? 'Nenhum'  },
  ];

  for (let i = 0; i < 6; i++) {
    const col  = i % 2;
    const row  = Math.floor(i / 2);
    const cX   = PNX + OP + col * (CW + CG);
    const cY   = PNY + OP + row * (CH + CG);

    // Pílula branca (radius = CH/2 → forma de pílula real)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = cardPanelColor ?? '#ffffff';
    roundRect(ctx, cX, cY, CW, CH, CH / 2); ctx.fill();
    ctx.restore();

    // Ícone: fundo colorido arredondado + shape branca desenhada
    const iX = cX + 11;
    const iY = cY + (CH - ISZ) / 2;
    ICON_FNS[i](ctx, iX, iY, ISZ);

    // Textos: topText (bold/escuro) acima, botText (cinza) abaixo
    const tX   = iX + ISZ + 13;
    const midY = cY + CH / 2;
    const maxW = CW - ISZ - 38;

    ctx.font      = `bold 16px ${FONT}`;
    ctx.fillStyle = '#1a1a2e';
    let top = statsData[i].topText;
    while (top.length > 1 && ctx.measureText(top).width > maxW) top = top.slice(0, -1);
    ctx.fillText(top, tX, midY - 5);

    ctx.font      = `13px ${FONT}`;
    ctx.fillStyle = '#888899';
    let bot = statsData[i].botText;
    while (bot.length > 1 && ctx.measureText(bot).width > maxW) bot = bot.slice(0, -1);
    ctx.fillText(bot, tX, midY + 13);
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.font = `11px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText('Fallen Bot \u2022 Perfil', W - 14, H - 10);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}
