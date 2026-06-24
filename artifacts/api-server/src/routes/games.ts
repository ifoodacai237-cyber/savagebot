import { Router } from "express";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIAMOND_PATH = path.join(__dirname, "../public/games/diamond.webp");
const BOMB_PATH    = path.join(__dirname, "../public/games/bomb.webp");

// ── Output grid settings ──────────────────────────────────────────────────
const GRID     = 4;
const O_CELL   = 126;
const O_GAP    = 8;
const O_PAD    = 14;
const O_RADIUS = 14;
const O_W      = O_PAD * 2 + GRID * O_CELL + (GRID - 1) * O_GAP;
const O_H      = O_W;

// ── Dark aesthetic colors ─────────────────────────────────────────────────
const BG_COLOR    = "#0d1117"; // very dark background
const CELL_FILL   = "#161b22"; // dark navy cell
const CELL_SHADOW = "#090d12"; // darker shadow
const CELL_SHINE  = "#21262d"; // subtle highlight edge
const GEM_BG      = "#0d1117"; // dark bg behind diamond
const BOMB_BG     = "#1a0a0a"; // dark red bg behind bomb

let diamondCache: Awaited<ReturnType<typeof loadImage>> | null = null;
let bombCache:    Awaited<ReturnType<typeof loadImage>> | null = null;

async function getDiamond() {
  if (!diamondCache) diamondCache = await loadImage(DIAMOND_PATH);
  return diamondCache;
}
async function getBomb() {
  if (!bombCache) bombCache = await loadImage(BOMB_PATH);
  return bombCache;
}

// ── Drawing helpers ───────────────────────────────────────────────────────
function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function drawHiddenCell(ctx: SKRSContext2D, x: number, y: number, size: number) {
  // Shadow layer (bottom-right offset)
  ctx.fillStyle = CELL_SHADOW;
  roundRect(ctx, x + 2, y + 3, size, size, O_RADIUS);
  ctx.fill();

  // Main face
  ctx.fillStyle = CELL_FILL;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.fill();

  // Shine edge (top + left inside border)
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

function drawGemCell(
  ctx: SKRSContext2D,
  diamond: Awaited<ReturnType<typeof loadImage>>,
  x: number,
  y: number,
  size: number,
) {
  // Dark background
  ctx.fillStyle = GEM_BG;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.fill();

  // Subtle border glow
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.stroke();

  // Diamond icon — centered, 76% of cell size
  const iconSize = Math.round(size * 0.76);
  const ix = x + Math.round((size - iconSize) / 2);
  const iy = y + Math.round((size - iconSize) / 2);

  ctx.drawImage(diamond, ix, iy, iconSize, iconSize);
}

function drawBombCell(
  ctx: SKRSContext2D,
  bomb: Awaited<ReturnType<typeof loadImage>>,
  x: number,
  y: number,
  size: number,
) {
  // Dark red background
  ctx.fillStyle = BOMB_BG;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.fill();

  // Red border
  ctx.strokeStyle = "#3d1010";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.stroke();

  // Bomb icon — centered, 76% of cell size
  const iconSize = Math.round(size * 0.76);
  const ix = x + Math.round((size - iconSize) / 2);
  const iy = y + Math.round((size - iconSize) / 2);
  ctx.drawImage(bomb, ix, iy, iconSize, iconSize);
}

const gamesRouter = Router();

gamesRouter.get("/games/mines-grid/:ts/:stateFile", async (req, res): Promise<void> => {
  const stateFile = req.params.stateFile as string | undefined;
  const stateParam = stateFile?.replace(/\.png$/, "");
  if (!stateParam) { res.status(400).send("Missing state"); return; }

  let grid: number[];
  let revealed: number[];
  let status: string;

  try {
    const parsed = JSON.parse(
      Buffer.from(stateParam, "base64url").toString("utf8"),
    ) as { g: number[]; r: number[]; s: string };
    grid     = parsed.g;
    revealed = parsed.r;
    status   = parsed.s;
  } catch {
    res.status(400).send("Invalid state");
    return;
  }

  try {
    const [diamond, bomb] = await Promise.all([getDiamond(), getBomb()]);
    const canvas = createCanvas(O_W, O_H);
    const ctx    = canvas.getContext("2d");
    const isDone = status !== "p";

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, O_W, O_H);

    for (let i = 0; i < GRID * GRID; i++) {
      const row = Math.floor(i / GRID);
      const col = i % GRID;
      const dx  = O_PAD + col * (O_CELL + O_GAP);
      const dy  = O_PAD + row * (O_CELL + O_GAP);

      const isRevealed = revealed[i] === 1;
      const isBomb     = grid[i] === 1;

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

    const buffer = canvas.toBuffer("image/png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "mines-grid generation failed");
    res.status(500).send("Error generating grid");
  }
});

export default gamesRouter;
