import { createCanvas, loadImage } from '@napi-rs/canvas';

// ─── Dimensões ────────────────────────────────────────────────────────────────
const W      = 720;
const H      = 920;
const CARD_W = 86;
const CARD_H = 110;

// Área da foto dentro do card (topo)
const PHOTO_H   = 58;   // altura do bloco da foto (53% do card)
const STATS_Y   = PHOTO_H + 14; // onde começam as stats
const NAME_Y    = PHOTO_H + 11; // nome do jogador

// ─── Temas por raridade (estilo FIFA) ─────────────────────────────────────────
const THEME = {
  black: {
    bg1:    '#08001a', bg2:    '#1a0038',
    accent: '#c060ff', border: '#9030dd',
    ovr:    '#f0d0ff', pos:    '#c080ff',
    num:    '#ffffff', label:  '#cc99ff',
    stat_bg:'rgba(20,0,50,0.85)',
    shimmer:'rgba(180,80,255,0.18)',
  },
  gold: {
    bg1:    '#5c3200', bg2:    '#2a1800',
    accent: '#e8a800', border: '#c88a00',
    ovr:    '#ffffff', pos:    '#ffe080',
    num:    '#ffffff', label:  '#ffd060',
    stat_bg:'rgba(30,15,0,0.88)',
    shimmer:'rgba(255,195,0,0.18)',
  },
  silver: {
    bg1:    '#3a4555', bg2:    '#1a2030',
    accent: '#b0c0d0', border: '#7090a8',
    ovr:    '#ffffff', pos:    '#c8d8e8',
    num:    '#ffffff', label:  '#a0bcd0',
    stat_bg:'rgba(15,22,35,0.88)',
    shimmer:'rgba(140,180,210,0.15)',
  },
  bronze: {
    bg1:    '#5a2800', bg2:    '#2a1000',
    accent: '#c87030', border: '#9a5018',
    ovr:    '#ffffff', pos:    '#f0c090',
    num:    '#ffffff', label:  '#e8b070',
    stat_bg:'rgba(25,10,0,0.88)',
    shimmer:'rgba(200,120,40,0.15)',
  },
};

// ─── Layouts de formação ──────────────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': [
    { pos: 'GOL', x: 0.50, y: 0.91 },
    { pos: 'LE',  x: 0.10, y: 0.74 }, { pos: 'ZAG', x: 0.35, y: 0.74 },
    { pos: 'ZAG', x: 0.65, y: 0.74 }, { pos: 'LD',  x: 0.90, y: 0.74 },
    { pos: 'MC',  x: 0.20, y: 0.51 }, { pos: 'MC',  x: 0.50, y: 0.51 }, { pos: 'MC', x: 0.80, y: 0.51 },
    { pos: 'PE',  x: 0.12, y: 0.23 }, { pos: 'CA',  x: 0.50, y: 0.14 }, { pos: 'PD', x: 0.88, y: 0.23 },
  ],
  '4-4-2': [
    { pos: 'GOL', x: 0.50, y: 0.91 },
    { pos: 'LE',  x: 0.10, y: 0.74 }, { pos: 'ZAG', x: 0.35, y: 0.74 },
    { pos: 'ZAG', x: 0.65, y: 0.74 }, { pos: 'LD',  x: 0.90, y: 0.74 },
    { pos: 'PE',  x: 0.10, y: 0.51 }, { pos: 'MC',  x: 0.36, y: 0.51 },
    { pos: 'MC',  x: 0.64, y: 0.51 }, { pos: 'PD',  x: 0.90, y: 0.51 },
    { pos: 'CA',  x: 0.35, y: 0.18 }, { pos: 'CA',  x: 0.65, y: 0.18 },
  ],
  '4-2-4': [
    { pos: 'GOL', x: 0.50, y: 0.91 },
    { pos: 'LE',  x: 0.10, y: 0.74 }, { pos: 'ZAG', x: 0.35, y: 0.74 },
    { pos: 'ZAG', x: 0.65, y: 0.74 }, { pos: 'LD',  x: 0.90, y: 0.74 },
    { pos: 'MC',  x: 0.34, y: 0.53 }, { pos: 'MC',  x: 0.66, y: 0.53 },
    { pos: 'PE',  x: 0.10, y: 0.21 }, { pos: 'CA',  x: 0.36, y: 0.14 },
    { pos: 'CA',  x: 0.64, y: 0.14 }, { pos: 'PD',  x: 0.90, y: 0.21 },
  ],
  '3-3-4': [
    { pos: 'GOL', x: 0.50, y: 0.91 },
    { pos: 'ZAG', x: 0.22, y: 0.74 }, { pos: 'ZAG', x: 0.50, y: 0.74 }, { pos: 'ZAG', x: 0.78, y: 0.74 },
    { pos: 'MC',  x: 0.22, y: 0.52 }, { pos: 'MC',  x: 0.50, y: 0.52 }, { pos: 'MC',  x: 0.78, y: 0.52 },
    { pos: 'PE',  x: 0.10, y: 0.21 }, { pos: 'CA',  x: 0.36, y: 0.14 },
    { pos: 'CA',  x: 0.64, y: 0.14 }, { pos: 'PD',  x: 0.90, y: 0.21 },
  ],
  '5-3-2': [
    { pos: 'GOL', x: 0.50, y: 0.91 },
    { pos: 'LE',  x: 0.07, y: 0.73 }, { pos: 'ZAG', x: 0.27, y: 0.76 },
    { pos: 'ZAG', x: 0.50, y: 0.76 }, { pos: 'ZAG', x: 0.73, y: 0.76 }, { pos: 'LD', x: 0.93, y: 0.73 },
    { pos: 'MC',  x: 0.23, y: 0.52 }, { pos: 'MC',  x: 0.50, y: 0.52 }, { pos: 'MC', x: 0.77, y: 0.52 },
    { pos: 'CA',  x: 0.35, y: 0.18 }, { pos: 'CA',  x: 0.65, y: 0.18 },
  ],
  '4-5-1': [
    { pos: 'GOL', x: 0.50, y: 0.91 },
    { pos: 'LE',  x: 0.10, y: 0.74 }, { pos: 'ZAG', x: 0.35, y: 0.74 },
    { pos: 'ZAG', x: 0.65, y: 0.74 }, { pos: 'LD',  x: 0.90, y: 0.74 },
    { pos: 'PE',  x: 0.10, y: 0.51 }, { pos: 'MC',  x: 0.30, y: 0.51 },
    { pos: 'MC',  x: 0.50, y: 0.51 }, { pos: 'MC',  x: 0.70, y: 0.51 }, { pos: 'PD', x: 0.90, y: 0.51 },
    { pos: 'CA',  x: 0.50, y: 0.15 },
  ],
  '3-4-3': [
    { pos: 'GOL', x: 0.50, y: 0.91 },
    { pos: 'ZAG', x: 0.22, y: 0.74 }, { pos: 'ZAG', x: 0.50, y: 0.74 }, { pos: 'ZAG', x: 0.78, y: 0.74 },
    { pos: 'LE',  x: 0.10, y: 0.51 }, { pos: 'MC',  x: 0.36, y: 0.51 },
    { pos: 'MC',  x: 0.64, y: 0.51 }, { pos: 'LD',  x: 0.90, y: 0.51 },
    { pos: 'PE',  x: 0.12, y: 0.20 }, { pos: 'CA',  x: 0.50, y: 0.13 }, { pos: 'PD', x: 0.88, y: 0.20 },
  ],
};

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

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ─── Carrega foto do SofaScore com timeout ────────────────────────────────────
async function fetchPlayerPhoto(sofascoreId) {
  if (!sofascoreId) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.sofascore.com/api/v1/player/${sofascoreId}/image`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; bot)',
          'Accept': 'image/webp,image/*',
        },
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await loadImage(buf);
  } catch {
    return null;
  }
}

// ─── Marcações do campo ───────────────────────────────────────────────────────
function drawFieldMarkings(ctx, fx, fy, fw, fh) {
  ctx.strokeStyle = 'rgba(255,255,255,0.40)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(fx, fy, fw, fh);

  // Linha do meio
  ctx.beginPath();
  ctx.moveTo(fx, fy + fh / 2);
  ctx.lineTo(fx + fw, fy + fh / 2);
  ctx.stroke();

  // Círculo central
  ctx.beginPath();
  ctx.arc(fx + fw / 2, fy + fh / 2, 52, 0, Math.PI * 2);
  ctx.stroke();

  // Ponto central
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(fx + fw / 2, fy + fh / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Área de ataque (topo)
  const paW = fw * 0.52, paH = fh * 0.17;
  ctx.strokeRect(fx + (fw - paW) / 2, fy, paW, paH);
  const gaW = fw * 0.26, gaH = fh * 0.065;
  ctx.strokeRect(fx + (fw - gaW) / 2, fy, gaW, gaH);

  // Área de defesa (base)
  ctx.strokeRect(fx + (fw - paW) / 2, fy + fh - paH, paW, paH);
  ctx.strokeRect(fx + (fw - gaW) / 2, fy + fh - gaH, gaW, gaH);

  // Pênaltis
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  [fh * 0.135, fh * 0.865].forEach(yOff => {
    ctx.beginPath();
    ctx.arc(fx + fw / 2, fy + yOff, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ─── Desenha uma carta estilo FIFA ───────────────────────────────────────────
function drawPlayerCard(ctx, cx, cy, player, slotPos, photo) {
  const x = Math.round(cx - CARD_W / 2);
  const y = Math.round(cy - CARD_H / 2);

  if (!player) {
    // Slot vazio
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, y, CARD_W, CARD_H, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(slotPos, cx, cy + 4);
    return;
  }

  const t = THEME[player.rarity] ?? THEME.bronze;

  // ── Sombra ──────────────────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur  = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  // ── Fundo do card (gradiente) ────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(x, y, x, y + CARD_H);
  bgGrad.addColorStop(0, t.bg1);
  bgGrad.addColorStop(1, t.bg2);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, x, y, CARD_W, CARD_H, 7);
  ctx.fill();

  ctx.shadowColor    = 'transparent';
  ctx.shadowBlur     = 0;
  ctx.shadowOffsetX  = 0;
  ctx.shadowOffsetY  = 0;

  // ── Shimmer diagonal (estilo FIFA) ───────────────────────────────────────────
  const shim = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
  shim.addColorStop(0,   'transparent');
  shim.addColorStop(0.4, t.shimmer);
  shim.addColorStop(0.6, t.shimmer);
  shim.addColorStop(1,   'transparent');
  ctx.save();
  roundRect(ctx, x, y, CARD_W, CARD_H, 7);
  ctx.clip();
  ctx.fillStyle = shim;
  ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.restore();

  // ── Foto do jogador (clippada ao card) ───────────────────────────────────────
  ctx.save();
  roundRect(ctx, x, y, CARD_W, PHOTO_H + 4, 7);
  ctx.clip();

  if (photo) {
    // Escala a foto para preencher a largura do card mantendo proporção
    const scale  = CARD_W / photo.width;
    const drawH  = photo.height * scale;
    const drawY  = y + (PHOTO_H - drawH) / 2;   // centra verticalmente
    ctx.drawImage(photo, x, drawY, CARD_W, drawH);
  } else {
    // Silhueta de placeholder
    drawSilhouette(ctx, x, y, CARD_W, PHOTO_H, t);
  }
  ctx.restore();

  // ── Gradiente de fade no fundo da foto ───────────────────────────────────────
  const fadeGrad = ctx.createLinearGradient(x, y + PHOTO_H - 18, x, y + PHOTO_H + 2);
  fadeGrad.addColorStop(0, 'transparent');
  fadeGrad.addColorStop(1, t.bg2);
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(x, y + PHOTO_H - 18, CARD_W, 20);

  // ── OVR e POS (canto superior esquerdo sobre a foto) ────────────────────────
  ctx.textAlign = 'left';

  // Sombra de texto para legibilidade
  ctx.shadowColor   = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur    = 5;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = t.ovr;
  ctx.font      = 'bold 19px Arial';
  ctx.fillText(player.ovr, x + 5, y + 18);

  ctx.fillStyle = t.pos;
  ctx.font      = 'bold 8px Arial';
  ctx.fillText(player.pos, x + 5, y + 28);

  // ── NAT badge (canto superior direito) ───────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x + CARD_W - 22, y + 3, 20, 10);
  ctx.fillStyle = '#ffffff';
  ctx.font      = '6px Arial';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.fillText(player.nat, x + CARD_W - 12, y + 11);

  ctx.shadowColor   = 'transparent';
  ctx.shadowBlur    = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // ── Nome do jogador ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(truncate(player.name, 11), cx, y + NAME_Y);

  // ── Bloco de stats (parte inferior do card) ───────────────────────────────────
  const statsTop = y + PHOTO_H + 16;

  // Fundo dos stats
  ctx.fillStyle = t.stat_bg;
  roundRect(ctx, x + 3, statsTop - 2, CARD_W - 6, CARD_H - PHOTO_H - 18, 4);
  ctx.fill();

  // Linha separadora (accent color)
  ctx.fillStyle = t.accent;
  ctx.fillRect(x + 3, y + PHOTO_H + 13, CARD_W - 6, 1);

  // Stats em 2 colunas (PAC/SHO/PAS | DRI/DEF/FIS)
  const leftStats  = [
    { label: 'RIT', val: player.pac },
    { label: 'FIN', val: player.fin },
    { label: 'PAS', val: player.pas },
  ];
  const rightStats = [
    { label: 'DRI', val: player.dri },
    { label: 'DEF', val: player.def },
    { label: 'FIS', val: player.fis },
  ];

  const rowH   = (CARD_H - statsTop + y - 4) / 3;
  const colMid = CARD_W / 4;

  for (let i = 0; i < 3; i++) {
    const ry = statsTop + i * rowH + rowH / 2 - 1;

    // Coluna esquerda
    ctx.fillStyle = t.num;
    ctx.font      = 'bold 9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(leftStats[i].val, x + 7, ry + 4);
    ctx.fillStyle = t.label;
    ctx.font      = '6px Arial';
    ctx.fillText(leftStats[i].label, x + 7, ry + 11);

    // Coluna direita
    ctx.fillStyle = t.num;
    ctx.font      = 'bold 9px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(rightStats[i].val, x + CARD_W - 7, ry + 4);
    ctx.fillStyle = t.label;
    ctx.font      = '6px Arial';
    ctx.fillText(rightStats[i].label, x + CARD_W - 7, ry + 11);
  }

  // ── Borda do card (glow accent) ──────────────────────────────────────────────
  ctx.strokeStyle = t.border;
  ctx.lineWidth   = player.rarity === 'black' ? 1.8 : 1.2;
  roundRect(ctx, x, y, CARD_W, CARD_H, 7);
  ctx.stroke();

  // Rótulo de posição abaixo do card (no campo)
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, cx - 14, y + CARD_H + 2, 28, 12, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 7px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(slotPos, cx, y + CARD_H + 11);
}

// ─── Silhueta de placeholder ─────────────────────────────────────────────────
function drawSilhouette(ctx, x, y, w, h, theme) {
  // Fundo degradê
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, theme.bg1);
  g.addColorStop(1, theme.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Iniciais do jogador (será sobrescritas pelo OVR/POS)
  ctx.fillStyle = `${theme.accent}30`;
  ctx.beginPath();
  // Cabeça
  ctx.arc(x + w / 2, y + h * 0.30, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Corpo
  ctx.fillStyle = `${theme.accent}20`;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.68, w * 0.30, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Função principal: gera a imagem do campo ─────────────────────────────────
export async function generateFieldImage({ lineup, formation, teamName, elo }) {
  // Pré-carrega todas as fotos em paralelo
  const photoMap = new Map();
  const photoPromises = lineup
    .filter(l => l.player?.sofascoreId)
    .map(async l => {
      const img = await fetchPlayerPhoto(l.player.sofascoreId);
      if (img) photoMap.set(l.player.sofascoreId, img);
    });
  await Promise.all(photoPromises);

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Fundo escuro ─────────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0a1a0a');
  bgGrad.addColorStop(1, '#111f11');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Campo ────────────────────────────────────────────────────────────────────
  const fx = 22, fy = 68, fw = W - 44, fh = H - 100;

  // Gramado com listras horizontais
  const fieldGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    fieldGrad.addColorStop(t, i % 2 === 0 ? '#1d6b1d' : '#196019');
  }
  ctx.fillStyle = fieldGrad;
  roundRect(ctx, fx, fy, fw, fh, 10);
  ctx.fill();

  // Marcações do campo
  drawFieldMarkings(ctx, fx, fy, fw, fh);

  // ── Header ───────────────────────────────────────────────────────────────────
  const headerGrad = ctx.createLinearGradient(fx, 6, fx, 60);
  headerGrad.addColorStop(0, 'rgba(0,0,0,0.80)');
  headerGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, fx, 6, fw, 56, 8);
  ctx.fill();

  // Linha accent no header
  ctx.fillStyle = '#2ecc40';
  ctx.fillRect(fx, 6, 4, 56);

  // Nome do time
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 22px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`⚽ ${truncate(teamName, 20)}`, fx + 16, 42);

  // ELO
  ctx.fillStyle = '#FFD700';
  ctx.font      = 'bold 14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${elo} ELO`, fx + fw - 14, 36);

  // Formação
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font      = '11px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(formation, fx + fw - 14, 52);

  // ── Jogadores ────────────────────────────────────────────────────────────────
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3'];

  for (let i = 0; i < slots.length; i++) {
    const slot        = slots[i];
    const lineupEntry = lineup.find(l => l.slot === i + 1);
    const player      = lineupEntry?.player ?? null;
    const photo       = player?.sofascoreId ? (photoMap.get(player.sofascoreId) ?? null) : null;

    const cx = Math.round(fx + slot.x * fw);
    const cy = Math.round(fy + slot.y * fh);

    drawPlayerCard(ctx, cx, cy, player, slot.pos, photo);
  }

  // ── Footer (OVR médio) ───────────────────────────────────────────────────────
  const ovrs   = lineup.map(l => l.player?.ovr ?? 0).filter(v => v > 0);
  const avgOvr = ovrs.length
    ? (ovrs.reduce((a, b) => a + b, 0) / ovrs.length).toFixed(2)
    : '—';

  const footerY = fy + fh + 5;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  roundRect(ctx, fx, footerY, fw, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 13px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`OVR Efetivo: ${avgOvr}`, fx + 14, footerY + 18);

  ctx.fillStyle = '#aaaaaa';
  ctx.font      = '11px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Formação: ${formation}`, fx + fw - 14, footerY + 18);

  return canvas.toBuffer('image/png');
}
