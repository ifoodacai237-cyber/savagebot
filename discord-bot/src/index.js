import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { loadCommands, limparSlashCommands } from './utils/loader.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands   = new Collection();
client.prefixCmds = new Collection();
client.voiceConns = new Map();

// ─── Desligar limpo ───────────────────────────────────────────────────────────

async function desligar(sinal) {
  // Guarda os dados necessários antes de destruir o client
  const botId = client.user?.id;
  const token = process.env.DISCORD_TOKEN;

  // 1. Desconecta imediatamente → bot fica offline no Discord na hora
  try { client.destroy(); } catch {}
  console.log(`⏹️  Bot offline (${sinal}).`);

  // 2. Limpa os slash commands globais via REST (até 5s de prazo)
  if (botId && token) {
    await Promise.race([
      limparSlashCommands(botId, token),
      new Promise(r => setTimeout(r, 5000)),
    ]);
  }

  process.exit(0);
}

process.on('SIGTERM', () => desligar('SIGTERM'));
process.on('SIGINT',  () => desligar('SIGINT'));

// ─── Handlers globais de erro — evitam crash do bot ──────────────────────────

client.on('error', err => console.error('[CLIENT ERROR]', err));

process.on('unhandledRejection', reason => console.error('[UNHANDLED REJECTION]', reason));
process.on('uncaughtException',  err    => console.error('[UNCAUGHT EXCEPTION]', err));

// ─── Boot ─────────────────────────────────────────────────────────────────────

(async () => {
  await loadCommands(client);

  const eventsDir = path.join(__dirname, 'events');
  for (const file of readdirSync(eventsDir).filter(f => f.endsWith('.js'))) {
    const { default: ev } = await import(pathToFileURL(path.join(eventsDir, file)).href);
    if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
    else          client.on(ev.name,   (...args) => ev.execute(...args, client));
  }

  await client.login(process.env.DISCORD_TOKEN);
})();
