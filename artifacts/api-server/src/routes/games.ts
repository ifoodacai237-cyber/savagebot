import { Router } from "express";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITE_PATH = path.join(__dirname, "../public/games/mines-sprite.png");

// Sprite sheet layout (900×900, 4×4 grid)
const S_PAD  = 14;   // outer padding
const S_GAP  = 8;    // gap between cells
const S_CELL = 212;  // cell size in sprite sheet
const S_STEP = S_CELL + S_GAP; // 220

// Sprite crop coords in the reference image
// (0,0)  = bright revealed gem  →  top-left cell
// (0,1)  = hidden/faded gem     →  top row, second cell
// (1,3)  = bomb cell            →  second row, last column
function spriteRect(row: number, col: number) {
  return { sx: S_PAD + col * S_STEP, sy: S_PAD + row * S_STEP, sw: S_CELL, sh: S_CELL };
}
const SPRITE = {
  gem:    spriteRect(0, 0),   // bright colorful gem
  hidden: spriteRect(0, 1),   // faded/translucent gem (hidden cell)
  bomb:   spriteRect(1, 3),   // brown bomb
};

// Output image dimensions
const O_COLS = 4;
const O_ROWS = 4;
const O_CELL = 130;
const O_GAP  = 8;
const O_PAD  = 14;
const O_W    = O_PAD * 2 + O_COLS * O_CELL + (O_COLS - 1) * O_GAP;
const O_H    = O_PAD * 2 + O_ROWS * O_CELL + (O_ROWS - 1) * O_GAP;
const BG_COLOR = "#4aac4a";

let spriteCache: Awaited<ReturnType<typeof loadImage>> | null = null;
async function getSprite() {
  if (!spriteCache) spriteCache = await loadImage(SPRITE_PATH);
  return spriteCache;
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
    const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8")) as {
      g: number[];
      r: number[];
      s: string;
    };
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

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, O_W, O_H);

    for (let i = 0; i < O_ROWS * O_COLS; i++) {
      const row = Math.floor(i / O_COLS);
      const col = i % O_COLS;
      const dx  = O_PAD + col * (O_CELL + O_GAP);
      const dy  = O_PAD + row * (O_CELL + O_GAP);

      const isRevealed = revealed[i] === 1;
      const isBomb     = grid[i] === 1;

      let src: typeof SPRITE.gem;

      if (isRevealed && isBomb) {
        src = SPRITE.bomb;
      } else if (isRevealed && !isBomb) {
        src = SPRITE.gem;
      } else if (isDone && isBomb) {
        // Game over: show hidden bombs in bomb style
        src = SPRITE.bomb;
      } else {
        src = SPRITE.hidden;
      }

      ctx.drawImage(
        sprite,
        src.sx, src.sy, src.sw, src.sh,
        dx,     dy,     O_CELL,  O_CELL,
      );
    }

    const buffer = canvas.toBuffer("image/png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.send(buffer);
  } catch {
    res.status(500).send("Error generating grid");
  }
});

export default gamesRouter;
