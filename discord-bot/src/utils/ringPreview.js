import { createCanvas, loadImage } from '@napi-rs/canvas';
import { drawAvatarRing } from './shopData.js';

const SIZE = 260;
const AV_R = 90;
const CX   = SIZE / 2;
const CY   = SIZE / 2;

async function fetchBuffer(url, timeoutMs = 7000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(timer); }
}

/**
 * Renderiza uma prévia (avatar + argola/moldura) sem persistir nada no banco.
 * Usado pelos painéis de argola do /perfil e /carteira para mostrar como vai
 * ficar antes do usuário confirmar o equipamento.
 */
export async function renderRingPreview(avatarUrl, ringValue, borderColor) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = borderColor ?? '#ffffff';
  ctx.beginPath(); ctx.arc(CX, CY, AV_R + 14, 0, Math.PI * 2); ctx.fill();

  await drawAvatarRing(ctx, CX, CY, AV_R + 8, ringValue ?? null);

  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, AV_R, 0, Math.PI * 2); ctx.clip();
  try {
    const img = await loadImage(await fetchBuffer(avatarUrl));
    ctx.drawImage(img, CX - AV_R, CY - AV_R, AV_R * 2, AV_R * 2);
  } catch {
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(CX - AV_R, CY - AV_R, AV_R * 2, AV_R * 2);
  }
  ctx.restore();

  return canvas.toBuffer('image/png');
}
