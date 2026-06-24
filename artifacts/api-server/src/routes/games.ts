import { Router } from "express";
import { createCanvas } from "@napi-rs/canvas";

const gamesRouter = Router();

type Ctx2D = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
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

// GET /api/games/mines-grid?state=BASE64&t=TIMESTAMP
gamesRouter.get("/games/mines-grid", (req, res): void => {
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

  const COLS = 4;
  const ROWS = 4;
  const CELL = 72;
  const GAP  = 6;
  const PAD  = 12;
  const W    = PAD * 2 + COLS * CELL + (COLS - 1) * GAP;
  const H    = PAD * 2 + ROWS * CELL + (ROWS - 1) * GAP;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0f0f1a";
  ctx.fillRect(0, 0, W, H);

  const isDone = status !== "p";

  for (let i = 0; i < ROWS * COLS; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const x   = PAD + col * (CELL + GAP);
    const y   = PAD + row * (CELL + GAP);

    const isRevealed = revealed[i] === 1;
    const isBomb     = grid[i] === 1;

    let bg: string;
    let symbol: string;
    let symbolColor: string;

    if (isRevealed && isBomb) {
      bg          = "#7f1d1d";
      symbol      = "\u2715";
      symbolColor = "#fca5a5";
    } else if (isRevealed && !isBomb) {
      bg          = "#14532d";
      symbol      = "\u25C6";
      symbolColor = "#4ade80";
    } else if (isDone && isBomb) {
      bg          = "#450a0a";
      symbol      = "\u2715";
      symbolColor = "#ef4444";
    } else {
      bg          = "#1e293b";
      symbol      = "";
      symbolColor = "";
    }

    ctx.fillStyle = bg;
    roundRect(ctx, x, y, CELL, CELL, 10);
    ctx.fill();

    ctx.strokeStyle = isDone && isBomb && !isRevealed ? "#ef444460" : "#ffffff12";
    ctx.lineWidth   = 1.5;
    roundRect(ctx, x, y, CELL, CELL, 10);
    ctx.stroke();

    if (symbol) {
      ctx.fillStyle    = symbolColor;
      ctx.font         = `bold 30px sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(symbol, x + CELL / 2, y + CELL / 2 + 1);
    }
  }

  const buffer = canvas.toBuffer("image/png");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(buffer);
});

export default gamesRouter;
