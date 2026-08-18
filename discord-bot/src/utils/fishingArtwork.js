import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ASSET_DIR = fileURLToPath(new URL('../../assets/fishing/', import.meta.url));
const IMAGE_FILES = Object.freeze({
  common: 'fish-common.jpg',
  seal: 'seal.jpg',
  shark: 'shark-common.jpg',
  legendary: 'carp-legendary.png',
  angryShark: 'shark-angry.png',
  piranha: 'piranha-rubra.png',
  betta: 'betta-fogo.png',
  marlin: 'marlin-neon.png',
  treasure: 'treasure.jpg',
  lobster: 'lobster.jpg',
  starfish: 'starfish.jpg',
  octopus: 'octopus.jpg',
  turtle: 'turtle.jpg',
  orca: 'orca.jpg',
});

const animalCache = new Map();
const BACKGROUND_FILES = Object.freeze({
  default: 'background.jpg',
  lago: 'scene-lago.jpg',
  recife: 'scene-recife.jpg',
  mar_aberto: 'scene-mar-aberto.jpg',
  abismo: 'scene-abismo.jpg',
});
const backgroundCache = new Map();

function isWhite(pixel, threshold = 238) {
  const [r, g, b] = pixel;
  return r >= threshold && g >= threshold && b >= threshold && Math.max(r, g, b) - Math.min(r, g, b) < 38;
}

function removeConnectedWhiteBackground(source) {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext('2d');
  context.drawImage(source, 0, 0);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = image;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const addIfBackground = (x, y) => {
    const index = y * width + x;
    if (visited[index]) return;
    const offset = index * 4;
    if (!isWhite(data.subarray(offset, offset + 3))) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    addIfBackground(x, 0);
    addIfBackground(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    addIfBackground(0, y);
    addIfBackground(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    if (x > 0) addIfBackground(x - 1, y);
    if (x < width - 1) addIfBackground(x + 1, y);
    if (y > 0) addIfBackground(x, y - 1);
    if (y < height - 1) addIfBackground(x, y + 1);
  }

  context.putImageData(image, 0, 0);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return canvas;
  const trimmed = createCanvas(maxX - minX + 1, maxY - minY + 1);
  trimmed.getContext('2d').drawImage(
    canvas,
    minX,
    minY,
    trimmed.width,
    trimmed.height,
    0,
    0,
    trimmed.width,
    trimmed.height,
  );
  return trimmed;
}

async function getAnimal(assetKey) {
  if (!IMAGE_FILES[assetKey]) throw new Error(`Arte de pesca desconhecida: ${assetKey}`);
  if (!animalCache.has(assetKey)) {
    const promise = loadImage(path.join(ASSET_DIR, IMAGE_FILES[assetKey]))
      .then(removeConnectedWhiteBackground);
    animalCache.set(assetKey, promise);
  }
  return animalCache.get(assetKey);
}

async function getBackground(sceneKey = 'default') {
  const fileName = BACKGROUND_FILES[sceneKey] ?? BACKGROUND_FILES.default;
  if (!backgroundCache.has(fileName)) {
    backgroundCache.set(fileName, loadImage(path.join(ASSET_DIR, fileName)));
  }
  return backgroundCache.get(fileName);
}

function drawCover(context, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

export async function composeFishingScene(sceneKey = 'default') {
  const background = await getBackground(sceneKey);
  const canvas = createCanvas(736, 736);
  drawCover(canvas.getContext('2d'), background, canvas.width, canvas.height);
  return canvas.toBuffer('image/png');
}

export async function composeFishingArtwork(assetKey, sceneKey = 'default') {
  const [background, animal] = await Promise.all([getBackground(sceneKey), getAnimal(assetKey)]);
  const canvas = createCanvas(background.width, background.height);
  const context = canvas.getContext('2d');
  drawCover(context, background, canvas.width, canvas.height);

  const maxWidth = canvas.width * (assetKey === 'angryShark' ? 0.66 : 0.58);
  const maxHeight = canvas.height * (assetKey === 'angryShark' ? 0.66 : 0.58);
  const scale = Math.min(maxWidth / animal.width, maxHeight / animal.height);
  const width = Math.round(animal.width * scale);
  const height = Math.round(animal.height * scale);
  const x = Math.round((canvas.width - width) / 2);
  const y = Math.round((canvas.height - height) / 2 - canvas.height * 0.03);
  context.drawImage(animal, x, y, width, height);

  return canvas.toBuffer('image/png');
}