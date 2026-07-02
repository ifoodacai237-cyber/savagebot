#!/usr/bin/env node
/**
 * sync-futgg.js — Baixa fotos de jogadores da FUT.GG CDN (cdn.futgg.com)
 *
 * Usa o futggId como chave única de cada carta. Uma única requisição por
 * jogador fornece a foto diretamente do mesmo CDN que hospeda os dados da carta.
 * Resultado: arquivos salvos em src/assets/players/{futggId}.png
 *
 * Uso:
 *   node scripts/sync-futgg.js            — baixa todos os que faltam
 *   node scripts/sync-futgg.js --force    — re-baixa todos (mesmo os existentes)
 *
 * Executa automaticamente no Railway via start command se necessário,
 * mas pode ser rodado manualmente a qualquer momento.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';

const __dir    = dirname(fileURLToPath(import.meta.url));
const rootDir  = join(__dir, '..');
const playDir  = join(rootDir, 'src', 'assets', 'players');

// Garante que o diretório existe
mkdirSync(playDir, { recursive: true });

// ─── Importar lista de jogadores ──────────────────────────────────────────────
const { FUT_PLAYERS } = await import('../src/utils/futPlayers.js');

const FORCE   = process.argv.includes('--force');
const TIMEOUT = 12000;   // ms por requisição
const DELAY   = 300;     // ms entre downloads (evita rate limit)

// Threshold mínimo de bytes para aceitar como foto válida
const PHOTO_MIN_BYTES = 5000;

// ─── CDN FUT.GG ───────────────────────────────────────────────────────────────
function photoUrl(futggId) {
  return `https://cdn.futgg.com/images/players/${futggId}.png`;
}

// ─── Download com validação ───────────────────────────────────────────────────
async function downloadPhoto(futggId) {
  const url      = photoUrl(futggId);
  const localPath = join(playDir, `${futggId}.png`);

  if (!FORCE && existsSync(localPath)) {
    return { futggId, status: 'cached' };
  }

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.fut.gg/',
        'Accept': 'image/png,image/webp,*/*',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { futggId, status: 'http_error', code: res.status };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < PHOTO_MIN_BYTES) {
      return { futggId, status: 'too_small', bytes: buf.length };
    }

    await writeFile(localPath, buf);
    return { futggId, status: 'ok', bytes: buf.length };

  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError' ? 'timeout' : err.message;
    return { futggId, status: 'error', msg };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const players = FUT_PLAYERS.filter(p => p.futggId);

console.log(`\n🔄  FUT.GG Photo Sync — ${players.length} jogadores com futggId\n`);

let ok = 0, cached = 0, fail = 0;

for (const player of players) {
  const result = await downloadPhoto(player.futggId);

  if (result.status === 'ok') {
    console.log(`  ✅  [${player.futggId}] ${player.name} — ${(result.bytes / 1024).toFixed(1)} KB`);
    ok++;
  } else if (result.status === 'cached') {
    process.stdout.write('.');   // progresso silencioso para arquivos já existentes
    cached++;
  } else {
    console.log(`  ❌  [${player.futggId}] ${player.name} — ${result.status}: ${result.msg ?? result.code ?? result.bytes ?? ''}`);
    fail++;
  }

  await new Promise(r => setTimeout(r, DELAY));
}

console.log(`\n\n📊  Resultado:`);
console.log(`    Baixados:  ${ok}`);
console.log(`    Já tinham: ${cached}`);
console.log(`    Falhas:    ${fail}`);
console.log(`    Total:     ${players.length}\n`);

if (fail > 0) {
  console.log('⚠️  Alguns jogadores não têm foto disponível no CDN da FUT.GG.');
  console.log('    O bot exibirá avatar com iniciais nesses casos.\n');
}
