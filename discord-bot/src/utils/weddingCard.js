import {
  ActionRowBuilder,
  AttachmentBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import prisma from '../database/client.js';
import { v2Payload, v2Rich } from './embed.js';

const FONTS_DIR = path.join(process.cwd(), 'fonts');
const BACKGROUND_PATH = path.join(process.cwd(), 'assets', 'wedding-background.png');
const FONT = 'WeddingFont';

let fontsRegistered = false;

function registerWeddingFonts() {
  if (fontsRegistered) return;

  try {
    const regularPath = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
    const boldPath = path.join(FONTS_DIR, 'Roboto-Bold.ttf');
    if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
      throw new Error(`Fontes não encontradas em ${FONTS_DIR}`);
    }

    const regular = GlobalFonts.registerFromPath(
      regularPath,
      FONT,
    );
    const bold = GlobalFonts.registerFromPath(
      boldPath,
      FONT,
    );

    if (!regular || !bold) {
      console.error('[CASAMENTO FONT] Não foi possível registrar uma ou mais fontes personalizadas.');
    }
    fontsRegistered = true;
  } catch (error) {
    console.error('[CASAMENTO FONT] Falha ao registrar fontes personalizadas:', error);
    // O canvas continuará usando a fonte sans-serif do sistema como fallback.
  }
}

const WIDTH = 1000;
const HEIGHT = 768;
const PINK = '#f44598';
const DARK = '#351329';
const MUTED = '#87516b';

const imageCache = new Map();

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar imagem: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function loadWeddingBackground() {
  if (!fs.existsSync(BACKGROUND_PATH)) return null;

  try {
    return await loadImage(fs.readFileSync(BACKGROUND_PATH));
  } catch (error) {
    console.error('[CASAMENTO BACKGROUND] Falha ao carregar fundo local:', error);
    return null;
  }
}

function createFallbackAvatar() {
  const avatar = createCanvas(256, 256);
  const ctx = avatar.getContext('2d');

  ctx.fillStyle = '#e9a4c5';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#fff2f8';
  ctx.beginPath();
  ctx.arc(128, 92, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(128, 224, 86, Math.PI, Math.PI * 2);
  ctx.fill();

  return avatar;
}

async function fetchImage(url) {
  const fallback = createFallbackAvatar();
  if (!url) return fallback;
  if (imageCache.has(url)) return imageCache.get(url);

  try {
    const image = await loadImage(await fetchImageBuffer(url));
    if (imageCache.size >= 80) imageCache.delete(imageCache.keys().next().value);
    imageCache.set(url, image);
    return image;
  } catch (error) {
    console.error('[CASAMENTO AVATAR] Falha no download/carregamento do avatar:', error);
    return fallback;
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, fill, stroke = null) {
  const half = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, half * 0.92);
  ctx.bezierCurveTo(-size * 0.88, half * 0.18, -size * 0.52, -half, 0, -half * 0.34);
  ctx.bezierCurveTo(size * 0.52, -half, size * 0.88, half * 0.18, 0, half * 0.92);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCircleImage(ctx, image, centerX, centerY, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  const source = image ?? createFallbackAvatar();
  const scale = Math.max((radius * 2) / source.width, (radius * 2) / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  ctx.drawImage(source, centerX - width / 2, centerY - height / 2, width, height);
  ctx.restore();
}

function truncate(text, maxLength = 17) {
  const value = String(text ?? '');
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date instanceof Date ? date : new Date(date));
}

function drawStatBox(ctx, x, y, label, value, icon, iconColor = '#e93d73') {
  ctx.save();
  ctx.shadowColor = 'rgba(116, 39, 84, 0.09)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#fff9fc';
  roundRect(ctx, x, y, 260, 76, 22);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#efcfe0';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, 260, 76, 22);
  ctx.stroke();

  ctx.font = `24px ${FONT}, sans-serif`;
  ctx.fillStyle = iconColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x + 35, y + 28);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `16px ${FONT}, sans-serif`;
  ctx.fillStyle = '#a26b85';
  ctx.fillText(label, x + 66, y + 30);
  ctx.font = `bold 22px ${FONT}, sans-serif`;
  ctx.fillStyle = DARK;
  ctx.fillText(String(value), x + 66, y + 57);
}

async function renderWeddingCard({ left, right, stats }) {
  registerWeddingFonts();

  try {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    const [leftImage, rightImage, backgroundImage] = await Promise.all([
      fetchImage(left.avatarUrl),
      fetchImage(right.avatarUrl),
      loadWeddingBackground(),
    ]);

    ctx.fillStyle = '#f8c1db';
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, 34);
    ctx.fill();

    ctx.fillStyle = '#fff2f8';
    roundRect(ctx, 7, 7, WIDTH - 14, HEIGHT - 14, 30);
    ctx.fill();

    ctx.save();
    roundRect(ctx, 30, 28, WIDTH - 60, HEIGHT - 56, 28);
    ctx.clip();
    if (backgroundImage) {
      const backgroundScale = Math.max(
        (WIDTH - 60) / backgroundImage.width,
        (HEIGHT - 56) / backgroundImage.height,
      );
      const backgroundWidth = backgroundImage.width * backgroundScale;
      const backgroundHeight = backgroundImage.height * backgroundScale;
      ctx.globalAlpha = 0.18;
      ctx.drawImage(
        backgroundImage,
        WIDTH / 2 - backgroundWidth / 2,
        HEIGHT / 2 - backgroundHeight / 2,
        backgroundWidth,
        backgroundHeight,
      );
      ctx.globalAlpha = 1;
    }
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, 'rgba(255,255,255,0.18)');
    bg.addColorStop(0.5, 'rgba(255,216,237,0.20)');
    bg.addColorStop(1, 'rgba(255,193,222,0.42)');
    ctx.fillStyle = bg;
    ctx.fillRect(30, 28, WIDTH - 60, HEIGHT - 56);
    ctx.globalAlpha = 0.45;
    ctx.font = `28px ${FONT}, sans-serif`;
    ctx.fillStyle = '#f8cfe2';
    for (const [x, y] of [[95, 88], [850, 93], [75, 325], [900, 350], [500, 310]]) {
      ctx.fillText('♥', x, y);
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = DARK;
    ctx.font = `bold 30px ${FONT}, sans-serif`;
    ctx.fillText('💍  CASAMENTO  ✨', WIDTH / 2, 82);
    ctx.font = `18px ${FONT}, sans-serif`;
    ctx.fillStyle = MUTED;
    ctx.fillText('cartão do casal', WIDTH / 2, 110);

    const avatarY = 220;
    const avatarRadius = 92;
    for (const [member, image, x] of [[left, leftImage, 185], [right, rightImage, 815]]) {
      ctx.fillStyle = '#f65aa5';
      ctx.beginPath();
      ctx.arc(x, avatarY, avatarRadius + 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff9bc8';
      ctx.lineWidth = 4;
      ctx.stroke();
      drawCircleImage(ctx, image, x, avatarY, avatarRadius);
      drawHeart(ctx, x + 90, avatarY + 85, 32, '#e93377');

      ctx.fillStyle = DARK;
      ctx.font = `bold 32px ${FONT}, sans-serif`;
      ctx.fillText(truncate(member.displayName), x, 356);
      ctx.font = `19px ${FONT}, sans-serif`;
      ctx.fillStyle = MUTED;
      ctx.fillText(`@${truncate(member.username, 21)}`, x, 386);
    }

    const heartX = WIDTH / 2;
    const heartY = 218;
    ctx.shadowColor = 'rgba(218, 47, 125, 0.28)';
    ctx.shadowBlur = 20;
    drawHeart(ctx, heartX, heartY, 124, '#f34d9c', '#ff91c4');
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 15px ${FONT}, sans-serif`;
    ctx.fillText('NÍVEL', heartX, 202);
    ctx.font = `bold 44px ${FONT}, sans-serif`;
    ctx.fillText(String(stats.level), heartX, 246);
    ctx.fillStyle = DARK;
    ctx.font = `16px ${FONT}, sans-serif`;
    ctx.fillText('do casal', heartX, 295);

    const progressX = 95;
    const progressY = 418;
    const progressW = 810;
    ctx.fillStyle = '#fffafd';
    roundRect(ctx, progressX, progressY, progressW, 86, 25);
    ctx.fill();
    ctx.strokeStyle = '#efcfdf';
    ctx.lineWidth = 2;
    roundRect(ctx, progressX, progressY, progressW, 86, 25);
    ctx.stroke();

    drawHeart(ctx, 130, 451, 29, '#e73776', '#f48db3');
    ctx.textAlign = 'left';
    ctx.fillStyle = DARK;
    ctx.font = `bold 22px ${FONT}, sans-serif`;
    ctx.fillText(`${stats.xp} XP do casal`, 158, 449);
    ctx.font = `16px ${FONT}, sans-serif`;
    ctx.fillStyle = MUTED;
    ctx.fillText(`${stats.interactions} interações entre os dois`, 158, 475);
    ctx.textAlign = 'right';
    ctx.fillText(`${stats.progressPercent}% até o nível ${stats.level + 1}`, 872, 449);
    ctx.fillText(`${stats.xpMissing} XP faltando`, 872, 475);

    ctx.fillStyle = '#f0c0d8';
    roundRect(ctx, 118, 484, 764, 14, 7);
    ctx.fill();
    ctx.fillStyle = PINK;
    roundRect(ctx, 118, 484, Math.max(14, 764 * stats.progressPercent / 100), 14, 7);
    ctx.fill();

    drawStatBox(ctx, 95, 538, 'Desde', formatDate(stats.marriedAt), '📅');
    drawStatBox(ctx, 370, 538, 'Call juntos', `${stats.callMinutes}min`, '🎧', '#4f9fd1');
    drawStatBox(ctx, 645, 538, 'Interações', stats.interactions, '♥');
    drawStatBox(ctx, 95, 628, 'Beijos', stats.kisses, '😘', '#e58e16');
    drawStatBox(ctx, 370, 628, 'Abraços', stats.hugs, '🤗', '#ee9939');
    drawStatBox(ctx, 645, 628, 'GF', stats.gf, '💕');

    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error("ERRO DETALHADO NO CANVAS:", error);
    console.error('[CASAMENTO CANVAS] Falha durante o desenho do cartão:', error);
    throw error;
  }
}

export async function getMarriageStats(leftId, rightId, marriedAt = new Date()) {
  const rows = await prisma.interaction.findMany({
    where: {
      OR: [
        { fromId: leftId, toId: rightId },
        { fromId: rightId, toId: leftId },
      ],
    },
    select: { type: true, count: true },
  });

  const countType = type => rows
    .filter(row => row.type === type)
    .reduce((sum, row) => sum + row.count, 0);
  const kisses = countType('kiss');
  const hugs = countType('hug');
  const gf = countType('gf');
  const interactions = rows.reduce((sum, row) => sum + row.count, 0);
  const xp = interactions * 36;
  const level = Math.floor(xp / 180) + 1;
  const currentXp = xp % 180;

  return {
    kisses,
    hugs,
    gf,
    interactions,
    xp,
    level,
    progressPercent: Math.round((currentXp / 180) * 100),
    xpMissing: 180 - currentXp,
    callMinutes: 0,
    marriedAt: marriedAt ?? new Date(),
  };
}

export async function buildWeddingCardPayload({ left, right, stats }) {
  const image = await renderWeddingCard({ left, right, stats });
  const attachment = new AttachmentBuilder(image, { name: 'casamento-card.png' });
  const pair = `${left.id}_${right.id}`;

  const controls = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`casar_action_${pair}`)
      .setPlaceholder('Escolha uma ação para o casamento')
      .addOptions(
        {
          label: 'Gerenciar casamento',
          value: 'manage',
          description: 'Abrir as opções de gerenciamento',
        },
        {
          label: 'Atualizar cartão',
          value: 'refresh',
          description: 'Recalcular as estatísticas do casal',
        },
      ),
  );

  return {
    files: [attachment],
    ...v2Payload(
      v2Rich({
        text:
          `## 💍 Cartão de casamento\n` +
          `<@${left.id}> e <@${right.id}> · nível ${stats.level} · ${stats.xp} XP\n\n` +
          `*Use Atualizar para recalcular as estatísticas.*`,
        imageUrl: 'attachment://casamento-card.png',
      }),
      controls,
    ),
  };
}