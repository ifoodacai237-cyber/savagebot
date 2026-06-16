import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getBanner } from './shopData.js';

const FONT = '"Noto Sans", "DejaVu Sans", Arial, sans-serif';
const W = 900, H = 340;

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

export async function generateProfileCard({ username, avatarUrl, balance, bank, activeBanner, purchases }) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const banner = activeBanner ? getBanner(activeBanner) : null;

  // ── Background ──────────────────────────────────────────────────────────────
  if (banner) {
    try {
      const img   = await loadUrl(banner.imageUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
    } catch {
      const g = ctx.createLinearGradient(0, 0, W, H);
      const [c1, c2] = banner.gradient ?? ['#1a0533', '#4a1a8a'];
      g.addColorStop(0, c1); g.addColorStop(1, c2);
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

  // ── Left accent bar ─────────────────────────────────────────────────────────
  const barGrad = ctx.createLinearGradient(0, 0, 0, H);
  barGrad.addColorStop(0, '#c084fc');
  barGrad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, 5, H);

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const AV_R = 70, AV_CX = 105, AV_CY = H / 2 - 14;

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(AV_CX, AV_CY, AV_R + 10, 0, Math.PI * 2); ctx.stroke();

  const ringGrad = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
  ringGrad.addColorStop(0, '#c084fc');
  ringGrad.addColorStop(1, '#7c3aed');
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

  // ── Text area ───────────────────────────────────────────────────────────────
  const TX = AV_CX + AV_R + 30;

  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur  = 8;

  ctx.fillStyle = '#FFFFFF';
  ctx.font      = `bold 34px ${FONT}`;
  ctx.fillText(username, TX, AV_CY - 28);

  ctx.shadowBlur = 0;

  const bannerLabel = banner ? `🖼️ ${banner.name}` : '🖼️ Sem banner';
  ctx.font = `12px ${FONT}`;
  const bw  = ctx.measureText(bannerLabel).width + 22;
  ctx.fillStyle = 'rgba(124,58,237,0.85)';
  roundRect(ctx, TX, AV_CY - 12, bw, 22, 11); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(bannerLabel, TX + 11, AV_CY + 4);

  // ── Stats row ───────────────────────────────────────────────────────────────
  const statsY = AV_CY + 34;
  const stats = [
    { icon: '💰', label: 'Carteira', value: `${fmt(balance)} SC` },
    { icon: '🏦', label: 'Banco',    value: `${fmt(bank)} SC`    },
    { icon: '🛍️', label: 'Itens',   value: `${purchases} itens`  },
  ];

  stats.forEach(({ icon, label, value }, i) => {
    const sx = TX + i * 210;

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, sx, statsY, 196, 68, 10); ctx.fill();

    ctx.strokeStyle = 'rgba(124,58,237,0.45)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, statsY, 196, 68, 10); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`${icon}  ${label}`, sx + 12, statsY + 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(value, sx + 12, statsY + 50);
  });

  // ── Footer ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font      = `11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Slow Bot • Perfil', W - 14, H - 12);

  return canvas.toBuffer('image/png');
}
