import { Router } from "express";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITE_PATH = path.join(__dirname, "../public/games/mines-sprite.png");

// ── Sprite sheet: mines-1.png, 900×900, 4×4 cells of 225×225 each ─────────
// Gem cell  (0,0): sx=0,   sy=0   — bright gem; icon (blue area) at (106,92,118,118)
// Bomb cell (1,2): sx=450, sy=225 — bomb; icon fills most of cell centered

// Source rect of just the gem icon (blue diamond pixels determined by pixel scan)
const GEM_ICON  = { sx: 106, sy: 92,  sw: 118, sh: 118 };
const BOMB_CELL = { sx: 450, sy: 225, sw: 225, sh: 225 }; // full bomb cell (icon is centered)

// ── Output grid settings ──────────────────────────────────────────────────
const GRID     = 4;
const O_CELL   = 126;    // output cell size
const O_GAP    = 7;      // gap between cells
const O_PAD    = 13;     // outer padding
const O_RADIUS = 14;     // corner radius
const O_W      = O_PAD * 2 + GRID * O_CELL + (GRID - 1) * O_GAP; // 546
const O_H      = O_W;

// Colors matching the reference image
const BG_GREEN     = "#48B55A"; // outer background
const CELL_FILL    = "#3BA04A"; // hidden cell face
const CELL_SHADOW  = "#2D8238"; // hidden cell shadow
const CELL_SHINE   = "#50BF5F"; // hidden cell highlight edge
const GEM_BG       = "#46B85A"; // bright cell behind gem icon (close to sprite sample)

let spriteCache: Awaited<ReturnType<typeof loadImage>> | null = null;
async function getSprite() {
  if (!spriteCache) spriteCache = await loadImage(SPRITE_PATH);
  return spriteCache;
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

function drawGemCell(ctx: SKRSContext2D, sprite: Awaited<ReturnType<typeof loadImage>>, x: number, y: number, size: number) {
  // Background (bright green)
  ctx.fillStyle = GEM_BG;
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.fill();

  // Centered icon: scale 118×118 sprite crop to fit inside cell with ~10% padding
  const maxIcon  = Math.round(size * 0.82);
  const scale    = maxIcon / Math.max(GEM_ICON.sw, GEM_ICON.sh);
  const outW     = Math.round(GEM_ICON.sw * scale);
  const outH     = Math.round(GEM_ICON.sh * scale);
  const ix       = x + Math.round((size - outW) / 2);
  const iy       = y + Math.round((size - outH) / 2);

  ctx.drawImage(
    sprite,
    GEM_ICON.sx, GEM_ICON.sy, GEM_ICON.sw, GEM_ICON.sh,
    ix, iy, outW, outH,
  );
}

function drawBombCell(ctx: SKRSContext2D, sprite: Awaited<ReturnType<typeof loadImage>>, x: number, y: number, size: number) {
  // Clip to rounded rect then draw full bomb sprite cell
  ctx.save();
  roundRect(ctx, x, y, size, size, O_RADIUS);
  ctx.clip();
  ctx.drawImage(
    sprite,
    BOMB_CELL.sx, BOMB_CELL.sy, BOMB_CELL.sw, BOMB_CELL.sh,
    x, y, size, size,
  );
  ctx.restore();
}

const gamesRouter = Router();

gamesRouter.get("/games/mines-grid", async (req, res): Promise<void> => {
  const stateParam = req.query.state as string | undefined;
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
    const sprite = await getSprite();
    const canvas = createCanvas(O_W, O_H);
    const ctx    = canvas.getContext("2d");
    const isDone = status !== "p";

    // Background
    ctx.fillStyle = BG_GREEN;
    ctx.fillRect(0, 0, O_W, O_H);

    for (let i = 0; i < GRID * GRID; i++) {
      const row = Math.floor(i / GRID);
      const col = i % GRID;
      const dx  = O_PAD + col * (O_CELL + O_GAP);
      const dy  = O_PAD + row * (O_CELL + O_GAP);

      const isRevealed = revealed[i] === 1;
      const isBomb     = grid[i] === 1;

      if (isRevealed && isBomb) {
        drawBombCell(ctx, sprite, dx, dy, O_CELL);
      } else if (isRevealed) {
        drawGemCell(ctx, sprite, dx, dy, O_CELL);
      } else if (isDone && isBomb) {
        // Game over: expose hidden bombs
        drawBombCell(ctx, sprite, dx, dy, O_CELL);
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
