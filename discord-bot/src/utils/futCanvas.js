import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { getPlayerById } from './futPlayers.js';

// ─── Fontes ───────────────────────────────────────────────────────────────────
const __dir   = dirname(fileURLToPath(import.meta.url));
const fontDir = join(__dir, '..', '..', 'fonts');
const assDir  = join(__dir, '..', 'assets');
const playDir = join(assDir, 'players');

try {
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Bold.ttf'),    'Roboto');
  GlobalFonts.registerFromPath(join(fontDir, 'Roboto-Regular.ttf'), 'RobotoReg');
} catch {}

// ─── Dimensões do campo ───────────────────────────────────────────────────────
const FIELD_W  = 760;
const FIELD_H  = 960;
const CARD_W   = 100;
const CARD_H   = 136;

// ─── Dimensões cards ──────────────────────────────────────────────────────────
const PC_W = 210;   // pack reveal
const PC_H = 286;
const CC_W = 168;   // collection
const CC_H = 228;

// ─── Raridades EA FC 26 — cores autênticas FutBin ────────────────────────────
const RARITY = {
  black: {
    bg1: '#1a0035', bg2: '#0d0022', bg3: '#060010',
    cardGrad1: '#2a0055', cardGrad2: '#150030',
    leftBg: 'rgba(30,0,70,0.85)',
    accent: '#c040ff',
    ovrColor: '#ffffff',
    posColor: '#ee99ff',
    nameBg: 'rgba(12,0,35,0.96)',
    statBg: 'rgba(10,0,30,0.98)',
    border1: '#bb44ff',
    border2: '#7711bb',
    glow: 20,
    strip: '#9922cc',
    shimmer: 'rgba(180,80,255,0.12)',
    pattern: 'rgba(180,80,255,0.06)',
    badge: '#c040ff',
    badgeText: '#ffffff',
  },
  gold: {
    bg1: '#c8920a', bg2: '#8a6000', bg3: '#503800',
    cardGrad1: '#d4a020', cardGrad2: '#7a5000',
    leftBg: 'rgba(100,60,0,0.80)',
    accent: '#ffd700',
    ovrColor: '#1a0a00',
    posColor: '#2a1200',
    nameBg: 'rgba(14,8,0,0.96)',
    statBg: 'rgba(20,12,0,0.98)',
    border1: '#ffe566',
    border2: '#cc9900',
    glow: 14,
    strip: '#d4aa00',
    shimmer: 'rgba(255,220,50,0.15)',
    pattern: 'rgba(255,210,0,0.07)',
    badge: '#ffd700',
    badgeText: '#1a0a00',
  },
  silver: {
    bg1: '#7890b0', bg2: '#3a4e6a', bg3: '#1e2e40',
    cardGrad1: '#8098b8', cardGrad2: '#2a3a50',
    leftBg: 'rgba(30,44,65,0.82)',
    accent: '#c0ccdd',
    ovrColor: '#080e18',
    posColor: '#10202e',
    nameBg: 'rgba(8,14,24,0.97)',
    statBg: 'rgba(10,18,30,0.98)',
    border1: '#99aacc',
    border2: '#556688',
    glow: 10,
    strip: '#6688aa',
    shimmer: 'rgba(160,190,230,0.12)',
    pattern: 'rgba(150,180,220,0.06)',
    badge: '#aabbcc',
    badgeText: '#080e18',
  },
  bronze: {
    bg1: '#c07838', bg2: '#804a18', bg3: '#4a2400',
    cardGrad1: '#cc8040', cardGrad2: '#703808',
    leftBg: 'rgba(70,36,0,0.83)',
    accent: '#e09040',
    ovrColor: '#1a0800',
    posColor: '#2a1000',
    nameBg: 'rgba(12,4,0,0.97)',
    statBg: 'rgba(16,6,0,0.98)',
    border1: '#dd8833',
    border2: '#995522',
    glow: 8,
    strip: '#b06020',
    shimmer: 'rgba(200,120,40,0.13)',
    pattern: 'rgba(200,110,30,0.06)',
    badge: '#e09040',
    badgeText: '#1a0800',
  },
};

// ─── Formações ────────────────────────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'MC', x:.20,y:.50 },{ pos:'MC', x:.50,y:.50 },{ pos:'MC', x:.80,y:.50 },
    { pos:'PE', x:.12,y:.22 },{ pos:'CA', x:.50,y:.13 },{ pos:'PD', x:.88,y:.22 },
  ],
  '4-4-2': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'PE', x:.10,y:.50 },{ pos:'MC', x:.36,y:.50 },{ pos:'MC', x:.64,y:.50 },{ pos:'PD',x:.90,y:.50 },
    { pos:'CA', x:.35,y:.18 },{ pos:'CA', x:.65,y:.18 },
  ],
  '4-2-4': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'MC', x:.34,y:.52 },{ pos:'MC', x:.66,y:.52 },
    { pos:'PE', x:.10,y:.20 },{ pos:'CA', x:.36,y:.13 },{ pos:'CA', x:.64,y:.13 },{ pos:'PD',x:.90,y:.20 },
  ],
  '3-3-4': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'ZAG',x:.22,y:.73 },{ pos:'ZAG',x:.50,y:.73 },{ pos:'ZAG',x:.78,y:.73 },
    { pos:'MC', x:.22,y:.51 },{ pos:'MC', x:.50,y:.51 },{ pos:'MC', x:.78,y:.51 },
    { pos:'PE', x:.10,y:.20 },{ pos:'CA', x:.36,y:.13 },{ pos:'CA', x:.64,y:.13 },{ pos:'PD',x:.90,y:.20 },
  ],
  '5-3-2': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.07,y:.72 },{ pos:'ZAG',x:.27,y:.75 },{ pos:'ZAG',x:.50,y:.75 },{ pos:'ZAG',x:.73,y:.75 },{ pos:'LD',x:.93,y:.72 },
    { pos:'MC', x:.23,y:.51 },{ pos:'MC', x:.50,y:.51 },{ pos:'MC', x:.77,y:.51 },
    { pos:'CA', x:.35,y:.18 },{ pos:'CA', x:.65,y:.18 },
  ],
  '4-5-1': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'LE', x:.10,y:.73 },{ pos:'ZAG',x:.35,y:.73 },{ pos:'ZAG',x:.65,y:.73 },{ pos:'LD',x:.90,y:.73 },
    { pos:'PE', x:.10,y:.50 },{ pos:'MC', x:.30,y:.50 },{ pos:'MC', x:.50,y:.50 },{ pos:'MC', x:.70,y:.50 },{ pos:'PD',x:.90,y:.50 },
    { pos:'CA', x:.50,y:.15 },
  ],
  '3-4-3': [
    { pos:'GOL',x:.50,y:.90 },
    { pos:'ZAG',x:.22,y:.73 },{ pos:'ZAG',x:.50,y:.73 },{ pos:'ZAG',x:.78,y:.73 },
    { pos:'LE', x:.10,y:.50 },{ pos:'MC', x:.36,y:.50 },{ pos:'MC', x:.64,y:.50 },{ pos:'LD',x:.90,y:.50 },
    { pos:'PE', x:.12,y:.20 },{ pos:'CA', x:.50,y:.13 },{ pos:'PD', x:.88,y:.20 },
  ],
};

// ─── Nationalidades → ISO ──────────────────────────────────────────────────────
const NAT_ISO = {
  BRA:'br',ARG:'ar',FRA:'fr',ESP:'es',POR:'pt',ALE:'de',ING:'gb',ITA:'it',
  HOL:'nl',BEL:'be',MAR:'ma',SEN:'sn',NOR:'no',POL:'pl',CRO:'hr',AUT:'at',
  EGI:'eg',NIG:'ng',CMR:'cm',SVN:'si',CAN:'ca',EUA:'us',URU:'uy',CHI:'cl',
  MLT:'mt',IRL:'ie',AUS:'au',GUI:'gn',SER:'rs',SUI:'ch',VEN:'ve',CIV:'ci',
};

// ─── Série → label para o card ─────────────────────────────────────────────────
const SERIES_LABEL = {
  copa2026:      'COPA 26',
  europe2526:    'UEFA',
  brasileirao26: 'BRAS',
  base:          'BASE',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w / 2), Math.abs(h / 2));
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '.' : str;
}

function statColor(val) {
  if (val >= 85) return '#22e855';
  if (val >= 75) return '#aadd00';
  if (val >= 65) return '#ffcc00';
  if (val >= 50) return '#ff8800';
  return '#ff3333';
}

// ─── Padrão diagonal tipo FutBin ─────────────────────────────────────────────
function drawDiagonalPattern(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 0.7;
  const spacing = 10;
  for (let i = -h; i < w + h; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Cache de fotos e bandeiras ────────────────────────────────────────────────
const _photoCache = new Map();
const _flagCache  = new Map();

// ─── Buscar foto: local → FUT.GG CDN ─────────────────────────────────────────
// FUT.GG CDN fornece foto e dados do jogador da mesma carta (futggId = chave primária).
// Fotos reais têm >= 5KB. Silhuetas/placeholders têm < 2KB.
const PHOTO_MIN_BYTES = 5000;

// Foto customizada via painel admin (URL direta) — sempre prioritária.
async function fetchCustomPhoto(url) {
  if (!url) return null;
  const cacheKey = `custom:${url}`;
  if (_photoCache.has(cacheKey)) return _photoCache.get(cacheKey);
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res   = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timer);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const img = await loadImage(buf);
      if (img.width >= 10 && img.height >= 10) {
        _photoCache.set(cacheKey, img);
        return img;
      }
    }
  } catch { /* continua */ }
  _photoCache.set(cacheKey, null);
  return null;
}

// Monta URL do SoFIFA CDN (sofifa IDs = mesmos IDs já no futPlayers.js).
// Tenta EA FC 25 primeiro; se não disponível, cai para EA FC 24.
function sofifaUrl(id, year) {
  const s = String(id).padStart(6, '0');
  return `https://cdn.sofifa.net/players/${s.slice(0, 3)}/${s.slice(3)}/${year}_120.png`;
}

// Busca foto pelo sofifa player ID.
// Prioridade: 1) override do painel admin  2) arquivo local  3) SoFIFA CDN (FC25 → FC24)
async function fetchPlayerPhoto(futggId, customPhotoUrl) {
  if (customPhotoUrl) {
    const custom = await fetchCustomPhoto(customPhotoUrl);
    if (custom) return custom;
  }
  if (!futggId) return null;
  const cacheKey = `sofa:${futggId}`;
  if (_photoCache.has(cacheKey)) return _photoCache.get(cacheKey);

  // ── 1. Arquivo local (mais rápido e confiável) ─────────────────────────────
  const localPath = join(playDir, `${futggId}.png`);
  if (existsSync(localPath)) {
    try {
      const buf = await readFile(localPath);
      if (buf.length >= PHOTO_MIN_BYTES) {
        const img = await loadImage(buf);
        if (img.width >= 20 && img.height >= 20) {
          _photoCache.set(cacheKey, img);
          return img;
        }
      }
    } catch { /* continua */ }
  }

  // ── 2. SoFIFA CDN — EA FC 25, fallback EA FC 24 ───────────────────────────
  for (const year of [25, 24]) {
    try {
      const url  = sofifaUrl(futggId, year);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res  = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://sofifa.com/',
          'Accept': 'image/png,image/webp,*/*',
        },
      });
      clearTimeout(timer);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length >= PHOTO_MIN_BYTES) {
          const img = await loadImage(buf);
          if (img.width >= 20 && img.height >= 20) {
            try {
              const { writeFile } = await import('fs/promises');
              await writeFile(localPath, buf);
            } catch { /* sem erro */ }
            _photoCache.set(cacheKey, img);
            return img;
          }
        }
      }
    } catch { /* tenta próximo ano */ }
  }

  // Sem foto disponível → exibe avatar com iniciais
  _photoCache.set(cacheKey, null);
  return null;
}

// ─── Buscar bandeira ──────────────────────────────────────────────────────────
async function fetchFlag(nat) {
  if (_flagCache.has(nat)) return _flagCache.get(nat);
  const iso = NAT_ISO[nat];
  if (!iso) { _flagCache.set(nat, null); return null; }
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res   = await fetch(`https://flagcdn.com/w40/${iso}.png`, {
      signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timer);
    if (!res.ok) { _flagCache.set(nat, null); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) { _flagCache.set(nat, null); return null; }
    const img = await loadImage(buf);
    _flagCache.set(nat, img);
    return img;
  } catch { _flagCache.set(nat, null); return null; }
}

// ─── Nome limpo para exibição ─────────────────────────────────────────────────
function cardDisplayName(name) {
  return (name ?? '').replace(/\s+(Copa|Base|Europeu|BRL|UCL)\s*$/i, '').trim();
}

// ─── Batch fetch fotos (FUT.GG CDN, por futggId) ──────────────────────────────
async function batchFetchPhotos(players) {
  const out = [];
  for (let i = 0; i < players.length; i++) {
    const p    = players[i]?.player ?? players[i];
    out.push(await fetchPlayerPhoto(p?.futggId ?? null, p?.customPhotoUrl ?? null));
    if (i < players.length - 1) await new Promise(r => setTimeout(r, 60));
  }
  return out;
}

// ─── Silhueta / avatar fallback ───────────────────────────────────────────────
function drawAvatar(ctx, x, y, w, h, r, name) {
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, r.bg1); bg.addColorStop(0.6, r.bg2); bg.addColorStop(1, r.bg3);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);

  // Silhueta genérica (círculo + corpo)
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  const headR = Math.round(Math.min(w, h) * 0.22);
  const headX = Math.round(x + w * 0.55);
  const headY = Math.round(y + h * 0.30);
  ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2); ctx.fill();
  // Corpo
  ctx.beginPath();
  ctx.ellipse(headX, y + h * 0.70, headR * 1.2, headR * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Iniciais no canto esquerdo
  const parts    = (name ?? '?').trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : (parts[0]??'?').slice(0,2).toUpperCase();
  const fs = Math.round(Math.min(w * 0.32, h * 0.28));
  ctx.save();
  ctx.font         = `bold ${fs}px Roboto`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = 'rgba(255,255,255,0.55)';
  ctx.fillText(initials, x + 8, y + 8);
  ctx.restore();
}

// ─── CARD EA FC 26 — design autêntico FutBin ──────────────────────────────────
//
//  ┌────────────────────────────────────┐  ← borda brilhante
//  │ ░░░░ padrão diagonal ░░░░░░░░░░░░░ │
//  │  [OVR]  foto do jogador            │
//  │  [POS]                             │
//  │  [FLG]      (photo full-bleed)     │
//  │                                    │
//  │─── linha accent ───────────────────│
//  │       NOME JOGADOR                 │
//  │────────────────────────────────────│
//  │ PAC  SHO  PAS  DRI  DEF  PHY      │
//  └────────────────────────────────────┘
function drawEACard(ctx, x, y, w, h, player, photo, flag) {
  const R  = Math.round(w * 0.07);
  const r  = RARITY[player.rarity] ?? RARITY.bronze;

  const STATS_H = Math.round(h * 0.21);
  const NAME_H  = Math.round(h * 0.11);
  const photoH  = h - STATS_H - NAME_H;

  // ── 1. Sombra exterior ─────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor   = r.border2;
  ctx.shadowBlur    = r.glow + 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bgGrad.addColorStop(0, r.cardGrad1);
  bgGrad.addColorStop(0.5, r.bg2);
  bgGrad.addColorStop(1, r.bg3);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, w, h, R); ctx.fill();
  ctx.restore();

  // ── 2. Foto e efeitos visuais (clipped) ───────────────────────────────────
  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();

  if (photo) {
    // Foto preenche a área de foto com crop inteligente
    const scale = Math.max(w / photo.width, (photoH * 1.05) / photo.height);
    const drawW = photo.width  * scale;
    const drawH = photo.height * scale;
    // Centraliza horizontalmente, alinha pelo topo da foto (não corta a cabeça)
    const drawX = x + (w - drawW) / 2;
    const drawY = y - drawH * 0.04; // sobe ligeiramente para mostrar o rosto
    ctx.drawImage(photo, drawX, drawY, drawW, drawH);
  } else {
    drawAvatar(ctx, x, y, w, photoH, r, player.name);
  }

  // Padrão diagonal (efeito FutBin) sobre a foto
  drawDiagonalPattern(ctx, x, y, w, photoH, r.pattern);

  // Shimmer diagonal
  const shim = ctx.createLinearGradient(x, y + h, x + w, y);
  shim.addColorStop(0, 'transparent');
  shim.addColorStop(0.35, r.shimmer);
  shim.addColorStop(0.65, r.shimmer);
  shim.addColorStop(1, 'transparent');
  ctx.fillStyle = shim; ctx.fillRect(x, y, w, h);

  // Fade inferior da foto (smooth transition para o nome)
  const fadeH = photoH * 0.42;
  const fade  = ctx.createLinearGradient(x, y + photoH - fadeH, x, y + photoH);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.68)');
  ctx.fillStyle = fade; ctx.fillRect(x, y + photoH - fadeH, w, fadeH);

  ctx.restore();

  // ── 3. Painel esquerdo: OVR / POS / Bandeira ──────────────────────────────
  const PANEL_W = Math.round(w * 0.42);
  const padL    = Math.round(w * 0.07);
  const topPad  = Math.round(h * 0.04);

  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();

  // Gradiente semi-transparente no painel esquerdo
  const panelGrad = ctx.createLinearGradient(x, y, x + PANEL_W, y);
  panelGrad.addColorStop(0,   r.leftBg);
  panelGrad.addColorStop(0.65,'rgba(0,0,0,0.18)');
  panelGrad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = panelGrad; ctx.fillRect(x, y, PANEL_W, photoH);
  ctx.restore();

  // OVR (grande, em cima)
  const ovrSize = Math.round(h * 0.175);
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.98)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
  ctx.fillStyle    = r.ovrColor;
  ctx.font         = `bold ${ovrSize}px Roboto`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(player.ovr), x + padL, y + topPad);
  ctx.restore();

  // Posição
  const posSize = Math.round(h * 0.075);
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 6;
  ctx.fillStyle    = r.posColor;
  ctx.font         = `bold ${posSize}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  const posX = x + padL + Math.round(ovrSize * 0.40);
  ctx.fillText(player.pos, posX, y + topPad + ovrSize + 1);
  ctx.restore();

  // Bandeira
  const flagY = y + topPad + ovrSize + posSize + 5;
  const flagW = Math.round(w * 0.24);
  const flagH = Math.round(flagW * 0.62);
  const flagX = x + padL - 1;

  if (flag) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4;
    roundRect(ctx, flagX, flagY, flagW, flagH, 2); ctx.clip();
    ctx.drawImage(flag, flagX, flagY, flagW, flagH);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.8;
    roundRect(ctx, flagX, flagY, flagW, flagH, 2); ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    roundRect(ctx, flagX, flagY, flagW, flagH, 2); ctx.fill();
    ctx.fillStyle    = 'rgba(255,255,255,0.88)';
    ctx.font         = `bold ${Math.round(flagH * 0.55)}px Roboto`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((player.nat ?? '').slice(0, 3), flagX + flagW / 2, flagY + flagH / 2);
    ctx.restore();
  }

  // Badge de série (canto superior direito)
  const serLabel = SERIES_LABEL[player.series ?? ''] ?? '';
  if (serLabel) {
    const bdgW = Math.round(w * 0.34);
    const bdgH = Math.round(h * 0.056);
    const bdgX = x + w - bdgW - Math.round(w * 0.06);
    const bdgY = y + Math.round(h * 0.03);
    ctx.save();
    ctx.fillStyle = r.badge + 'cc';
    roundRect(ctx, bdgX, bdgY, bdgW, bdgH, 3); ctx.fill();
    ctx.fillStyle    = r.badgeText;
    ctx.font         = `bold ${Math.round(bdgH * 0.60)}px Roboto`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(serLabel, bdgX + bdgW / 2, bdgY + bdgH / 2);
    ctx.restore();
  }

  // ── 4. Barra de nome ──────────────────────────────────────────────────────
  const ny = y + photoH;
  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();

  // Fundo do nome
  ctx.fillStyle = r.nameBg; ctx.fillRect(x, ny, w, NAME_H);

  // Linha de accent colorida no topo do nome
  const accG = ctx.createLinearGradient(x, ny, x + w, ny);
  accG.addColorStop(0, 'transparent');
  accG.addColorStop(0.08, r.accent);
  accG.addColorStop(0.92, r.accent);
  accG.addColorStop(1, 'transparent');
  ctx.fillStyle = accG; ctx.fillRect(x, ny, w, 2);

  const nameStr  = trunc(cardDisplayName(player.name).toUpperCase(), 12);
  const nameSize = Math.max(8, Math.round(w * 0.093));
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.98)'; ctx.shadowBlur = 5;
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold ${nameSize}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameStr, x + w / 2, ny + NAME_H / 2);
  ctx.restore();

  ctx.restore();

  // ── 5. Barra de stats ─────────────────────────────────────────────────────
  const sy    = ny + NAME_H;
  // EA FC 26 stats — mesmos rótulos do FUT.GG
  // Linha: PAC SHO PAS DRI DEF PHY
  // Goleiro: DIV HAN KIC REF SPD POS
  const isGK  = player.pos === 'GOL';
  const stats = isGK
    ? [
        { l:'DIV', v: player.def },
        { l:'HAN', v: player.fis },
        { l:'KIC', v: player.pas },
        { l:'REF', v: player.dri },
        { l:'SPD', v: player.pac },
        { l:'POS', v: player.fin },
      ]
    : [
        { l:'PAC', v: player.pac },
        { l:'SHO', v: player.fin },
        { l:'PAS', v: player.pas },
        { l:'DRI', v: player.dri },
        { l:'DEF', v: player.def },
        { l:'PHY', v: player.fis },
      ];

  ctx.save();
  roundRect(ctx, x, y, w, h, R); ctx.clip();
  ctx.fillStyle = r.statBg; ctx.fillRect(x, sy, w, STATS_H);

  // Linha accent no topo dos stats
  const statLineG = ctx.createLinearGradient(x, sy, x + w, sy);
  statLineG.addColorStop(0, 'transparent');
  statLineG.addColorStop(0.08, r.border2 + '80');
  statLineG.addColorStop(0.92, r.border2 + '80');
  statLineG.addColorStop(1, 'transparent');
  ctx.fillStyle = statLineG; ctx.fillRect(x, sy, w, 1);

  const cellW  = w / 6;
  const labSz  = Math.max(5, Math.round(w * 0.048));
  const valSz  = Math.max(7, Math.round(w * 0.085));
  const valY   = sy + STATS_H * 0.52;
  const labY   = sy + STATS_H * 0.88;

  for (let i = 0; i < 6; i++) {
    const cx = x + cellW * i + cellW / 2;

    // Separador vertical
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x + cellW * i, sy + STATS_H * 0.12, 1, STATS_H * 0.76);
    }

    // Valor numérico (colorido por performance)
    ctx.fillStyle    = statColor(stats[i].v ?? 0);
    ctx.font         = `bold ${valSz}px Roboto`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(stats[i].v ?? 0), cx, valY);

    // Label (abaixo, muted)
    ctx.fillStyle    = 'rgba(200,200,200,0.55)';
    ctx.font         = `${labSz}px RobotoReg`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stats[i].l, cx, labY);
  }

  // Tira inferior colorida (ID da raridade)
  ctx.fillStyle = r.strip;
  ctx.fillRect(x + R, y + h - 2.5, w - R * 2, 2.5);
  ctx.restore();

  // ── 6. Borda brilhante dupla ──────────────────────────────────────────────
  // Borda interna
  ctx.save();
  ctx.strokeStyle = r.border1 + '55';
  ctx.lineWidth   = 1;
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, R - 1); ctx.stroke();
  ctx.restore();
  // Borda externa com glow
  ctx.save();
  ctx.shadowColor = r.border1;
  ctx.shadowBlur  = r.glow;
  ctx.strokeStyle = r.border1;
  ctx.lineWidth   = 1.5;
  roundRect(ctx, x, y, w, h, R); ctx.stroke();
  ctx.restore();
}

// ─── Slot vazio no campo ──────────────────────────────────────────────────────
function drawEmptySlot(ctx, cx, cy, slotPos) {
  const x = Math.round(cx - CARD_W / 2);
  const y = Math.round(cy - CARD_H / 2);
  const R = 7;

  ctx.save();
  ctx.globalAlpha = 0.50;

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.fill();

  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
  roundRect(ctx, x, y, CARD_W, CARD_H, R); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle    = 'rgba(255,255,255,0.45)';
  ctx.font         = `bold ${Math.round(CARD_H * 0.24)}px Roboto`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', cx, cy - CARD_H * 0.10);

  ctx.font      = `bold ${Math.round(CARD_H * 0.08)}px Roboto`;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText(slotPos, cx, cy + CARD_H * 0.20);

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Card no campo (versão compacta) ─────────────────────────────────────────
function drawFieldCard(ctx, cx, cy, player, slotPos, photo, flag) {
  if (!player) { drawEmptySlot(ctx, cx, cy, slotPos); return; }

  const x = Math.round(cx - CARD_W / 2);
  const y = Math.round(cy - CARD_H / 2);
  drawEACard(ctx, x, y, CARD_W, CARD_H, player, photo, flag);

  // Label da posição do slot abaixo do card
  const lblW  = Math.round(CARD_W * 0.58);
  const lblH  = 13;
  const lblY  = y + CARD_H + 2;
  const match = player.pos === slotPos;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  roundRect(ctx, cx - lblW/2, lblY, lblW, lblH, 3); ctx.fill();
  ctx.fillStyle    = match ? '#33ff77' : '#ffcc33';
  ctx.font         = 'bold 7px Roboto';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slotPos, cx, lblY + lblH / 2);
  ctx.restore();
}

// ─── Fundo de campo futebol ───────────────────────────────────────────────────
function drawPitch(ctx, fx, fy, fw, fh) {
  // Grama com gradiente e listras alternadas
  const grass = ctx.createLinearGradient(fx, fy, fx, fy + fh);
  grass.addColorStop(0,    '#2d9630');
  grass.addColorStop(0.25, '#268928');
  grass.addColorStop(0.50, '#1e7020');
  grass.addColorStop(0.75, '#268928');
  grass.addColorStop(1,    '#1e7020');
  ctx.fillStyle = grass;
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.fill();

  // Listras horizontais de grama
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip();
  const strH = fh / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(fx, fy + i * strH, fw, strH);
  }
  // Vignette radial
  const vig = ctx.createRadialGradient(fx+fw/2, fy+fh/2, fh*0.10, fx+fw/2, fy+fh/2, fh*0.92);
  vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig; ctx.fillRect(fx, fy, fw, fh);
  ctx.restore();

  // Linhas brancas do campo
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = 1.8;

  roundRect(ctx, fx + 4, fy + 4, fw - 8, fh - 8, 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx, fy+fh/2); ctx.lineTo(fx+fw, fy+fh/2); ctx.stroke();

  // Círculo central
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 54, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.60)';
  ctx.beginPath(); ctx.arc(fx+fw/2, fy+fh/2, 3.5, 0, Math.PI*2); ctx.fill();

  // Área grande superior e inferior
  const pW = fw * 0.54, pH = fh * 0.165;
  const gW = fw * 0.25, gH = fh * 0.062;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(fx+(fw-pW)/2, fy+4, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy+4, gW, gH);
  ctx.strokeRect(fx+(fw-pW)/2, fy+fh-pH-4, pW, pH);
  ctx.strokeRect(fx+(fw-gW)/2, fy+fh-gH-4, gW, gH);

  // Pontos de pênalti
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  [fh*0.132, fh*0.868].forEach(yo => {
    ctx.beginPath(); ctx.arc(fx+fw/2, fy+yo, 3.2, 0, Math.PI*2); ctx.fill();
  });

  // Arcos de canto
  const cr = 12;
  [[fx+4,fy+4,0,Math.PI/2],[fx+fw-4,fy+4,Math.PI/2,Math.PI],[fx+4,fy+fh-4,3*Math.PI/2,2*Math.PI],[fx+fw-4,fy+fh-4,Math.PI,3*Math.PI/2]].forEach(([ax,ay,sa,ea]) => {
    ctx.beginPath(); ctx.arc(ax, ay, cr, sa, ea); ctx.stroke();
  });
  ctx.restore();
}

// ─── Imagem do campo (visão do time) ─────────────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  const seen     = new Set();
  const photoMap = new Map();
  const flagMap  = new Map();

  for (const l of lineup) {
    const p    = l.player;
    if (!p || (!p.futggId && !p.customPhotoUrl)) continue;
    const key  = `id:${p.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const img = await fetchPlayerPhoto(p.futggId, p.customPhotoUrl);
    if (img) photoMap.set(key, img);
    const flag = await fetchFlag(p.nat);
    if (flag) flagMap.set(p.nat, flag);
    await new Promise(r => setTimeout(r, 40));
  }

  const canvas = createCanvas(FIELD_W, FIELD_H);
  const ctx    = canvas.getContext('2d');

  // Fundo escuro estilo estádio
  const bg = ctx.createLinearGradient(0, 0, 0, FIELD_H);
  bg.addColorStop(0, '#040810'); bg.addColorStop(1, '#040a06');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  // ── Header bar ───────────────────────────────────────────────────────────
  const HDR_H = 62;
  const hdrBg = ctx.createLinearGradient(0, 0, FIELD_W, HDR_H);
  hdrBg.addColorStop(0, 'rgba(0,0,0,0.98)');
  hdrBg.addColorStop(1, 'rgba(10,10,20,0.92)');
  ctx.fillStyle = hdrBg;
  roundRect(ctx, 14, 4, FIELD_W - 28, HDR_H, 10); ctx.fill();

  // Linha verde (estilo FutBin) à esquerda
  const barG = ctx.createLinearGradient(14, 4, 14, 4 + HDR_H);
  barG.addColorStop(0, '#22dd55'); barG.addColorStop(1, '#11aa33');
  ctx.fillStyle = barG; ctx.fillRect(14, 4, 4, HDR_H);

  // Logo "EA FC 26" à esquerda
  ctx.save();
  ctx.fillStyle   = '#22dd55';
  ctx.font        = 'bold 11px Roboto';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EA FC 26', 26, 8);
  ctx.restore();

  // Nome do time
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.80)'; ctx.shadowBlur = 5;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 22px Roboto';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(trunc(teamName ?? 'Meu Time', 24), 26, 4 + HDR_H * 0.65);
  ctx.restore();

  // ELO (direita, dourado)
  ctx.save();
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
  ctx.fillStyle   = '#FFD700';
  ctx.font        = 'bold 17px Roboto';
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`${elo ?? 0} ELO`, FIELD_W - 24, 10);
  ctx.restore();

  // Formação (direita, menor)
  ctx.fillStyle    = 'rgba(255,255,255,0.50)';
  ctx.font         = '13px RobotoReg';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(formation ?? '4-3-3', FIELD_W - 24, 4 + HDR_H - 10);

  // ── Campo de futebol ─────────────────────────────────────────────────────
  const FX = 18, FY = 72, FW = FIELD_W - 36, FH = FIELD_H - 115;
  drawPitch(ctx, FX, FY, FW, FH);

  // ── Cards dos jogadores ──────────────────────────────────────────────────
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];
  for (let i = 0; i < slots.length; i++) {
    const s   = slots[i];
    const ent = lineup.find(l => l.slot === i + 1);
    const p   = ent?.player ?? null;
    const key   = p ? `id:${p.id}` : null;
    const photo = key ? (photoMap.get(key) ?? null) : null;
    const flag  = p ? (flagMap.get(p.nat) ?? null) : null;
    drawFieldCard(
      ctx,
      Math.round(FX + s.x * FW),
      Math.round(FY + s.y * FH),
      p, s.pos, photo, flag,
    );
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footY = FY + FH + 4;
  const footH = FIELD_H - footY - 4;
  ctx.fillStyle = 'rgba(0,0,0,0.96)';
  roundRect(ctx, FX, footY, FW, footH, 8); ctx.fill();

  const validOvrs = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr    = validOvrs.length
    ? (validOvrs.reduce((a, b) => a + b, 0) / validOvrs.length).toFixed(1)
    : '--';

  ctx.fillStyle    = '#22dd55';
  ctx.font         = 'bold 13px Roboto';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⚽ OVR Médio: ${avgOvr}`, FX + 14, footY + footH / 2);

  ctx.fillStyle    = 'rgba(255,255,255,0.45)';
  ctx.font         = '12px RobotoReg';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Formação: ${formation ?? '4-3-3'}`, FX + FW - 14, footY + footH / 2);

  return canvas.toBuffer('image/png');
}

// ─── Pack reveal image ────────────────────────────────────────────────────────
export async function generatePackRevealImage(players) {
  if (!players?.length) {
    const c = createCanvas(400, 100);
    const cx = c.getContext('2d');
    cx.fillStyle = '#111'; cx.fillRect(0,0,400,100);
    cx.fillStyle = '#fff'; cx.font = 'bold 18px Roboto';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('Nenhuma carta encontrada!', 200, 50);
    return c.toBuffer('image/png');
  }

  const GAP  = 16;
  const PAD  = 20;
  const COLS = Math.min(players.length, 4);
  const ROWS = Math.ceil(players.length / COLS);
  const CW   = PAD * 2 + COLS * PC_W + (COLS - 1) * GAP;
  const CH   = 60 + PAD + ROWS * PC_H + (ROWS - 1) * GAP + PAD;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Fundo escuro
  const bg = ctx.createLinearGradient(0, 0, CW, CH);
  bg.addColorStop(0, '#07071a'); bg.addColorStop(1, '#04040e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

  // Header FutBin-style
  const hG = ctx.createLinearGradient(0, 0, CW, 0);
  hG.addColorStop(0, 'rgba(30,8,80,0.98)');
  hG.addColorStop(0.5, 'rgba(70,20,140,0.98)');
  hG.addColorStop(1, 'rgba(30,8,80,0.98)');
  ctx.fillStyle = hG; ctx.fillRect(0, 0, CW, 56);

  // Linha accent
  const hLine = ctx.createLinearGradient(0, 54, CW, 54);
  hLine.addColorStop(0, 'transparent');
  hLine.addColorStop(0.15, '#aa44ff');
  hLine.addColorStop(0.85, '#aa44ff');
  hLine.addColorStop(1, 'transparent');
  ctx.fillStyle = hLine; ctx.fillRect(0, 54, CW, 2);

  ctx.save();
  ctx.shadowColor = '#cc77ff'; ctx.shadowBlur = 18;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 22px Roboto';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚽  NOVAS CARTAS', CW / 2, 30);
  ctx.restore();

  const photos = await batchFetchPhotos(players);
  const flags  = await Promise.all(players.map(p => fetchFlag(p.nat)));

  for (let i = 0; i < players.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    drawEACard(
      ctx,
      PAD + col * (PC_W + GAP),
      60 + PAD + row * (PC_H + GAP),
      PC_W, PC_H,
      players[i], photos[i], flags[i],
    );
  }

  return canvas.toBuffer('image/png');
}

// ─── Collection image ─────────────────────────────────────────────────────────
export async function generateCollectionImage(playerCards) {
  const COLS = 4, GAP = 14, PAD = 16;
  const rows = Math.ceil(playerCards.length / COLS) || 1;
  const CW   = PAD * 2 + COLS * CC_W + (COLS - 1) * GAP;
  const CH   = PAD * 2 + rows * CC_H + (rows - 1) * GAP;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Fundo verde escuro estilo campo
  const field = ctx.createLinearGradient(0, 0, 0, CH);
  field.addColorStop(0, '#142e16'); field.addColorStop(0.5, '#0c1e0e'); field.addColorStop(1, '#060c06');
  ctx.fillStyle = field; ctx.fillRect(0, 0, CW, CH);

  const stripeH = 24;
  for (let i = 0; i < Math.ceil(CH / stripeH); i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, i * stripeH, CW, stripeH);
  }
  const vig = ctx.createRadialGradient(CW/2, CH/2, CH*0.08, CW/2, CH/2, CH*0.72);
  vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.40)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);

  if (!playerCards.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font      = 'bold 18px Roboto';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Nenhuma carta ainda!', CW/2, CH/2);
    return canvas.toBuffer('image/png');
  }

  const photos = await batchFetchPhotos(playerCards);
  const flags  = await Promise.all(playerCards.map(c => fetchFlag(c.player?.nat)));

  for (let i = 0; i < playerCards.length; i++) {
    const p = playerCards[i].player;
    if (!p) continue;
    const col = i % COLS, row = Math.floor(i / COLS);
    drawEACard(
      ctx,
      PAD + col * (CC_W + GAP),
      PAD + row * (CC_H + GAP),
      CC_W, CC_H,
      p, photos[i], flags[i],
    );
  }

  return canvas.toBuffer('image/png');
}

// ─── Pacotes banner ───────────────────────────────────────────────────────────
function drawPitchBg(ctx, w, h) {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#0e2410'); base.addColorStop(0.5, '#091808'); base.addColorStop(1, '#040e04');
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < Math.ceil(h / 26); i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, i * 26, w, 26);
  }
  const vig = ctx.createRadialGradient(w/2, h/2, h*0.10, w/2, h/2, h*0.88);
  vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
}

// ─── Pack card (visual de pacote fechado) ─────────────────────────────────────
function drawPackCard(ctx, x, y, w, h, packName, price, photo, guaranteed) {
  const topIn = w * 0.10, botIn = w * 0.05;

  function packPath() {
    const tl = x + topIn, tr = x + w - topIn;
    ctx.beginPath();
    ctx.moveTo(tl + 4, y); ctx.lineTo(tr - 4, y);
    ctx.quadraticCurveTo(tr, y, tr, y + 4);
    ctx.bezierCurveTo(tr + (x+w-tr)*0.5, y+h*0.08*0.4, x+w, y+h*0.08*0.9, x+w, y+h*0.08);
    ctx.lineTo(x+w, y+h-8); ctx.quadraticCurveTo(x+w, y+h, x+w-botIn, y+h);
    ctx.lineTo(x+botIn, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-8);
    ctx.lineTo(x, y+h*0.08);
    ctx.bezierCurveTo(x, y+h*0.08*0.9, tl-(tl-x)*0.5, y+h*0.08*0.4, tl, y+4);
    ctx.quadraticCurveTo(tl, y, tl+4, y); ctx.closePath();
  }

  const rarColors = {
    gold:   { g1:'#c8920a', g2:'#7a5a00', g3:'#3a2800', accent:'#ffd700', shadow:'rgba(255,200,0,0.55)' },
    black:  { g1:'#2a0060', g2:'#140030', g3:'#080018', accent:'#aa44ff', shadow:'rgba(150,40,255,0.62)' },
    silver: { g1:'#6888a8', g2:'#384868', g3:'#182838', accent:'#aabbd0', shadow:'rgba(150,180,220,0.40)' },
    bronze: { g1:'#c07838', g2:'#7a4818', g3:'#3a2008', accent:'#e09040', shadow:'rgba(200,120,40,0.45)' },
  };
  const rc = rarColors[guaranteed] ?? rarColors.gold;

  ctx.save();
  ctx.shadowColor = rc.shadow; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  const bodyG = ctx.createLinearGradient(x, y, x+w, y+h);
  bodyG.addColorStop(0, rc.g1); bodyG.addColorStop(0.45, rc.g2); bodyG.addColorStop(1, rc.g3);
  ctx.fillStyle = bodyG; packPath(); ctx.fill();
  ctx.restore();

  ctx.save(); packPath(); ctx.clip();

  // Padrão diagonal
  drawDiagonalPattern(ctx, x, y, w, h, 'rgba(255,255,255,0.05)');

  // Brilho lateral esquerdo
  const shine = ctx.createLinearGradient(x, y, x+w*0.38, y);
  shine.addColorStop(0, 'rgba(255,255,255,0.28)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(x, y, w*0.38, h);

  // Foto do jogador
  const photoTop = y + h * 0.20;
  const photoH2  = h * 0.52;
  if (photo) {
    const scale = Math.max(w / photo.width, photoH2 / photo.height);
    const dw = photo.width * scale, dh = photo.height * scale;
    ctx.save(); ctx.rect(x, photoTop, w, photoH2); ctx.clip();
    ctx.drawImage(photo, x + (w-dw)/2, photoTop, dw, dh);
    const fadeT = ctx.createLinearGradient(x, photoTop, x, photoTop+photoH2*0.28);
    fadeT.addColorStop(0, 'rgba(0,0,0,0.75)'); fadeT.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fadeT; ctx.fillRect(x, photoTop, w, photoH2*0.30);
    const fadeB = ctx.createLinearGradient(x, photoTop+photoH2*0.58, x, photoTop+photoH2);
    fadeB.addColorStop(0, 'rgba(0,0,0,0)'); fadeB.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = fadeB; ctx.fillRect(x, photoTop+photoH2*0.58, w, photoH2*0.42);
    ctx.restore();
  }

  // Barra de título
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x, y, w, h*0.18);
  const accLine = ctx.createLinearGradient(x, y, x+w, y);
  accLine.addColorStop(0,'transparent');
  accLine.addColorStop(0.20,rc.accent);
  accLine.addColorStop(0.80,rc.accent);
  accLine.addColorStop(1,'transparent');
  ctx.fillStyle = accLine; ctx.fillRect(x, y+h*0.18-2, w, 2);

  // "EA FC 26"
  ctx.fillStyle = rc.accent;
  ctx.font      = `bold ${Math.round(w*0.13)}px Roboto`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('EA FC 26', x + w*0.08, y + h*0.04);

  // Nome do pacote
  const nameY = y + h * 0.73;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x, nameY, w, h*0.14);
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold ${Math.round(w*0.093)}px Roboto`;
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(packName.toUpperCase(), x+w/2, nameY+h*0.07);

  // Preço
  const priceY = nameY + h * 0.14;
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(x, priceY, w, h*0.13);
  ctx.fillStyle    = '#ffd700';
  ctx.font         = `bold ${Math.round(w*0.082)}px Roboto`;
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`🪙 ${typeof price === 'number' ? price.toLocaleString('pt-BR') : price}`, x+w/2, priceY+h*0.065);

  ctx.restore();

  ctx.save();
  ctx.shadowColor = rc.accent; ctx.shadowBlur = 12;
  ctx.strokeStyle = `${rc.accent}88`; ctx.lineWidth = 1.5;
  packPath(); ctx.stroke();
  ctx.restore();
}

// ─── Loja image ────────────────────────────────────────────────────────────────
export async function generateLojaImage(balance) {
  const packDefs = [
    { name:'Padrão',  playerId: 11, price: 500,  guaranteed:'bronze' }, // Bellingham
    { name:'Ouro',    playerId: 17, price: 2000, guaranteed:'gold'   }, // Salah
    { name:'Premium', playerId: 14, price: 5000, guaranteed:'black'  }, // Mbappé
    { name:'Europeu', playerId: 25, price: 2800, guaranteed:'gold'   }, // Lamine Yamal
  ];

  const photos = [];
  for (const d of packDefs) {
    const pl = getPlayerById(d.playerId);
    photos.push(await fetchPlayerPhoto(pl?.futggId ?? null, null));
    await new Promise(r => setTimeout(r, 100));
  }

  const PW = 180, PH = 308, GAP = 16, PAD = 22;
  const CW = PAD*2 + packDefs.length*PW + (packDefs.length-1)*GAP;
  const CH = PH + 82;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawPitchBg(ctx, CW, CH);

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  roundRect(ctx, PAD, 10, CW-PAD*2, 34, 8); ctx.fill();

  const lineG = ctx.createLinearGradient(PAD, 10, PAD+4, 44);
  lineG.addColorStop(0, '#22dd55'); lineG.addColorStop(1, '#11aa33');
  ctx.fillStyle = lineG; ctx.fillRect(PAD, 10, 4, 34);

  ctx.fillStyle    = '#4ddd4d';
  ctx.font         = 'bold 16px Roboto';
  ctx.textAlign    = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('⚽  FUT LOJA', PAD+16, 27);
  ctx.fillStyle    = '#ffd700';
  ctx.font         = 'bold 14px Roboto';
  ctx.textAlign    = 'right';
  ctx.fillText(`🪙 ${(balance ?? 0).toLocaleString('pt-BR')} FuteCoins`, CW-PAD-14, 27);

  for (let i = 0; i < packDefs.length; i++) {
    drawPackCard(ctx, PAD+i*(PW+GAP), 52, PW, PH, packDefs[i].name, packDefs[i].price, photos[i], packDefs[i].guaranteed);
  }

  return canvas.toBuffer('image/png');
}

// ─── Pacotes image (seleção de pacotes) ───────────────────────────────────────
export async function generatePacksImage(packsInfo) {
  const defaults = [
    { name:'Padrão',  playerId: 11, price: 500,  guaranteed:'bronze' },
    { name:'Ouro',    playerId: 17, price: 2000, guaranteed:'gold'   },
    { name:'Premium', playerId: 14, price: 5000, guaranteed:'black'  },
    { name:'Copa 26', playerId: 26, price: 3000, guaranteed:'gold'   },
    { name:'Europeu', playerId: 25, price: 2800, guaranteed:'gold'   },
  ];
  const defs = packsInfo ?? defaults;

  const photos = [];
  for (const d of defs) {
    const pl = d.playerId != null ? getPlayerById(d.playerId) : null;
    photos.push(await fetchPlayerPhoto(pl?.futggId ?? d.futggId ?? null, null));
    await new Promise(r => setTimeout(r, 100));
  }

  const PW = 152, PH = 268, GAP = 12, PAD = 16;
  const CW = PAD*2 + defs.length*PW + (defs.length-1)*GAP;
  const CH = PH + 74;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');
  drawPitchBg(ctx, CW, CH);

  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  roundRect(ctx, PAD, 10, CW-PAD*2, 32, 8); ctx.fill();

  const lineG2 = ctx.createLinearGradient(PAD, 10, PAD+4, 42);
  lineG2.addColorStop(0, '#22dd55'); lineG2.addColorStop(1, '#11aa33');
  ctx.fillStyle = lineG2; ctx.fillRect(PAD, 10, 4, 32);

  ctx.fillStyle    = '#4ddd4d';
  ctx.font         = 'bold 15px Roboto';
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('📦  PACOTES DISPONÍVEIS', CW/2, 26);

  for (let i = 0; i < defs.length; i++) {
    drawPackCard(ctx, PAD+i*(PW+GAP), 50, PW, PH, defs[i].name, defs[i].price, photos[i], defs[i].guaranteed);
  }

  return canvas.toBuffer('image/png');
}

// ─── Partida result image ─────────────────────────────────────────────────────
export async function generatePartidaImage({ result, myScore, oppScore, myOvr, oppOvr, oppName, eloChange, newElo }) {
  const BW = 720, BH = 265;
  const canvas = createCanvas(BW, BH);
  const ctx    = canvas.getContext('2d');

  const isWin  = result === 'win', isDraw = result === 'draw';
  const rc     = isWin ? '#22dd55' : isDraw ? '#ffcc00' : '#dd2222';
  const dark   = isWin ? '#040f06' : isDraw ? '#101006' : '#100404';
  const deep   = isWin ? '#020804' : isDraw ? '#0a0a02' : '#0c0202';

  const bg = ctx.createLinearGradient(0, 0, BW, BH);
  bg.addColorStop(0, dark); bg.addColorStop(1, deep);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, BW, BH);

  // Glow central
  const glow = ctx.createRadialGradient(BW/2, BH/2, 20, BW/2, BH/2, BW*0.60);
  glow.addColorStop(0, `${rc}1e`); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, BW, BH);

  // Barra lateral colorida
  const barG = ctx.createLinearGradient(0, 0, 0, BH);
  barG.addColorStop(0, rc); barG.addColorStop(1, `${rc}55`);
  ctx.fillStyle = barG; ctx.fillRect(0, 0, 5, BH);

  // Linhas decorativas (campo)
  ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, BH/2); ctx.lineTo(BW, BH/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(BW/2, BH/2, 60, 0, Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.restore();

  // Resultado label
  const label = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
  ctx.save();
  ctx.shadowColor = rc; ctx.shadowBlur = 30;
  ctx.fillStyle   = rc;
  ctx.font        = 'bold 56px Roboto';
  ctx.textAlign   = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, 22, 78);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.font      = '14px RobotoReg';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`vs ${oppName ?? 'Adversário'}`, 24, 100);

  // Placar
  ctx.save();
  ctx.shadowColor = rc; ctx.shadowBlur = 22;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 80px Roboto';
  ctx.textAlign   = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${myScore}  ×  ${oppScore}`, BW/2, 158);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.font      = '13px RobotoReg';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`OVR: ${myOvr ?? '--'} vs ${oppOvr ?? '--'}`, BW/2, 178);

  const eloSign  = (eloChange ?? 0) >= 0 ? '+' : '';
  const eloColor = (eloChange ?? 0) >= 0 ? '#33ee88' : '#ee4444';
  ctx.fillStyle    = eloColor;
  ctx.font         = 'bold 23px Roboto';
  ctx.textAlign    = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`ELO: ${newElo ?? '--'} (${eloSign}${eloChange ?? 0})`, BW-22, 72);

  const botG = ctx.createLinearGradient(0, BH-3, BW, BH-3);
  botG.addColorStop(0, `${rc}55`); botG.addColorStop(0.5, rc); botG.addColorStop(1, `${rc}55`);
  ctx.fillStyle = botG; ctx.fillRect(0, BH-3, BW, 3);

  return canvas.toBuffer('image/png');
}

// ─── Carta individual (grande, para /fut carta) ───────────────────────────────
export async function generateSingleCardImage(player) {
  const CARD_W = 380, CARD_H = 520;
  const PAD    = 28;
  const CW     = CARD_W + PAD * 2;
  const CH     = CARD_H + PAD * 2 + 44;

  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext('2d');

  // Fundo escuro estilo FutBin
  const bg = ctx.createLinearGradient(0, 0, CW, CH);
  bg.addColorStop(0, '#07071a');
  bg.addColorStop(1, '#04040e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  // Brilho central suave atrás da carta
  const glow = ctx.createRadialGradient(CW / 2, CH / 2 - 20, 0, CW / 2, CH / 2 - 20, 280);
  const r    = RARITY[player.rarity] ?? RARITY.bronze;
  glow.addColorStop(0, r.accent + '18');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CW, CH);

  const [photo, flag] = await Promise.all([
    fetchPlayerPhoto(player.futggId, player.customPhotoUrl),
    fetchFlag(player.nat),
  ]);

  drawEACard(ctx, PAD, PAD, CARD_W, CARD_H, player, photo, flag);

  // Rodapé
  ctx.fillStyle    = 'rgba(255,255,255,0.18)';
  ctx.font         = '12px RobotoReg';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚽  FALLEN ANGELS FUT  ·  EA FC 25', CW / 2, CARD_H + PAD + 22);

  return canvas.toBuffer('image/png');
}
