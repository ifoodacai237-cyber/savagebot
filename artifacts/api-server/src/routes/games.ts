import { Router } from "express";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITE_PATH = path.join(__dirname, "../public/games/mines-sprite.png");

// ── Sprite sheet (mines-1.png, 900×900, 4×4 grid) ───────────────────────────
// S_PAD=14, S_GAP=8, S_CELL=212, S_STEP=220
const S_PAD  = 14;
const S_GAP  = 8;
const S_CELL = 212;
const S_STEP = S_CELL + S_GAP; // 220

function spriteRect(row: number, col: number) {
  return { sx: S_PAD + col * S_STEP, sy: S_PAD + row * S_STEP, sw: S_CELL, sh: S_CELL };
}

// Only two sprites needed: revealed gem (row 0, col 0) and bomb (row 1, col 3)
const SPRITE = {
  gem:  spriteRect(0, 0),  // bright colorful gem
  bomb: spriteRect(1, 3),  // brown bomb
};

// ── Output image settings ────────────────────────────────────────────────────
const GRID       = 4;
const O_CELL     = 126;
const O_GAP      = 6;
const O_PAD      = 14;
const O_RADIUS   = 12;
const O_W        = O_PAD * 2 + GRID * O_CELL + (GRID - 1) * O_GAP; // 546
const O_H        = O_PAD * 2 + GRID * O_CELL + (GRID - 1) * O_GAP; // 546

// Colors matching the reference image
const BG_COLOR       = "#4CAF50"; // bright green background
const HIDDEN_FILL    = "#3E9E42"; // darker green for hidden cells
const HIDDEN_BORDER  = "#2E7D32"; // border/shadow edge
const HIDDEN_SHINE   = "#56C45A"; // top-left highlight

let spriteCache: Awaited<ReturnType<typeof loadImage>> | null = null;
async function getSprite() {
  if (!spriteCache) spriteCache = await loadImage(SPRITE_PATH);
  return spriteCache;
}

function drawRoundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawHiddenCell(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  size: number,
) {
  const r = O_RADIUS;
  // Shadow (bottom-right offset)
  ctx.fillStyle = HIDDEN_BORDER;
  drawRoundRect(ctx, x + 2, y + 3, size, size, r);
  ctx.fill();

  // Main face
  ctx.fillStyle = HIDDEN_FILL;
  drawRoundRect(ctx, x, y, size, size, r);
  ctx.fill();

  // Shine line (top-left inner highlight)
  ctx.strokeStyle = HIDDEN_SHINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y + 2);
  ctx.lineTo(x + size - r, y + 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 2, y + r);
  ctx.lineTo(x + 2, y + size - r);
  ctx.stroke();
}

const gamesRouter = Router();

// GET /api/games/mines-grid?state=BASE64&t=TIMESTAMP
gamesRouter.get("/games/mines-grid", async (req, res): Promise<void> => {
  const stateParam = req.query.state as string | undefined;
  if (!stateParam) {
    res.status(400).send("Missing state");
    return;
  }

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
    const sprite  = await getSprite();
    const canvas  = createCanvas(O_W, O_H);
    const ctx     = canvas.getContext("2d");
    const isDone  = status !== "p";

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, O_W, O_H);

    for (let i = 0; i < GRID * GRID; i++) {
      const row = Math.floor(i / GRID);
      const col = i % GRID;
      const dx  = O_PAD + col * (O_CELL + O_GAP);
      const dy  = O_PAD + row * (O_CELL + O_GAP);

      const isRevealed = revealed[i] === 1;
      const isBomb     = grid[i] === 1;

      if (!isRevealed && !(isDone && isBomb)) {
        // ── Hidden cell ── draw plain tile
        drawHiddenCell(ctx, dx, dy, O_CELL);
      } else {
        // ── Revealed cell ── draw sprite (gem or bomb)
        const src = isBomb ? SPRITE.bomb : SPRITE.gem;

        // Round-clip the sprite to match cell shape
        ctx.save();
        drawRoundRect(ctx, dx, dy, O_CELL, O_CELL, O_RADIUS);
        ctx.clip();
        ctx.drawImage(sprite, src.sx, src.sy, src.sw, src.sh, dx, dy, O_CELL, O_CELL);
        ctx.restore();
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
