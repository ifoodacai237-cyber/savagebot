import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../../public/games');

const GRID     = 4;
const O_CELL   = 126;
const O_GAP    = 8;
const O_PAD    = 14;
const O_RADIUS = 14;
const O_W      = O_PAD * 2 + GRID * O_CELL + (GRID - 1) * O_GAP;
const O_H      = O_W;

const BG_COLOR    = '#0d1117';
const CELL_FILL   = '#161b22';
const CELL_SHADOW = '#090d12';
const CELL_SHINE  = '#21262d';
const GEM_BG      = '#0d1117';
const BOMB_BG     = '#1a0a0a';

let diamondCache = null;
let bombCache    = null;

async function getDiamond() {
  if (!diamondCache) diamondCache = await loadImage(readFileSync(join(PUBLIC_DIR, 'diamond.webp')));
  return diamondCache;
}
async function getBomb() {
  if (!bombCache) bombCache = await loadImage(readFileSync(join(PUBLIC_DIR, 'bomb.webp')));
  return bombCache;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h,     x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y,         x + r, y,          r);
  ctx.closePath();
}

function drawHiddenCell(ctx, x, y, size) {
  ctx.fillStyle = CELL_SHADOW;
  roundRect(ctx, x + 2, y + 3, size, size, O_RADIUS);
  ctx.fill();

  ctx.fillStyle = CELL_FILL;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.fill();

  ctx.strokeStyle = CELL_SHINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + O_RADIUS, y + 2);
  ctx.lineTo(x + size - O_RADIUS, y + 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 2, y + O_RADIUS);
  ctx.lineTo(x + 2, y + size - O_RADIUS);
  ctx.stroke();
}

function drawGemCell(ctx, diamond, x, y, size) {
  ctx.fillStyle = GEM_BG;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.fill();

  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.stroke();

  const iconSize = Math.round(size * 0.76);
  const ix = x + Math.round((size - iconSize) / 2);
  const iy = y + Math.round((size - iconSize) / 2);
  ctx.drawImage(diamond, ix, iy, iconSize, iconSize);
}

function drawBombCell(ctx, bomb, x, y, size) {
  ctx.fillStyle = BOMB_BG;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.fill();

  ctx.strokeStyle = '#3d1010';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.stroke();

  const iconSize = Math.round(size * 0.76);
  const ix = x + Math.round((size - iconSize) / 2);
  const iy = y + Math.round((size - iconSize) / 2);
  ctx.drawImage(bomb, ix, iy, iconSize, iconSize);
}

export async function generateDarkMinesGrid({ grid, revealed, status }) {
  const [diamond, bomb] = await Promise.all([getDiamond(), getBomb()]);
  const canvas = createCanvas(O_W, O_H);
  const ctx    = canvas.getContext('2d');
  const isDone = status !== 'playing';

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, O_W, O_H);

  for (let i = 0; i < GRID * GRID; i++) {
    const row = Math.floor(i / GRID);
    const col = i % GRID;
    const dx  = O_PAD + col * (O_CELL + O_GAP);
    const dy  = O_PAD + row * (O_CELL + O_GAP);

    const isRevealed = revealed[i];
    const isBomb     = grid[i];

    if (isRevealed && isBomb) {
      drawBombCell(ctx, bomb, dx, dy, O_CELL);
    } else if (isRevealed) {
      drawGemCell(ctx, diamond, dx, dy, O_CELL);
    } else if (isDone && isBomb) {
      drawBombCell(ctx, bomb, dx, dy, O_CELL);
    } else {
      drawHiddenCell(ctx, dx, dy, O_CELL);
    }
  }

  return canvas.toBuffer('image/png');
}
