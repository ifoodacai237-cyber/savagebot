import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, REST, Routes } from 'discord.js';
import { loadCommands } from './utils/loader.js';
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

// ─── Desligar limpo: remove slash commands do servidor ao ficar offline ────────

async function limparComandos() {
  const guildId = process.env.GUILD_ID;
  const token   = process.env.DISCORD_TOKEN;
  if (!guildId || !token || !client.user) return;

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
    console.log('🔴 Slash commands removidos do servidor (bot offline).');
  } catch (e) {
    console.error('[SHUTDOWN] Erro ao limpar commands:', e.message);
  }
}

async function desligar(sinal) {
  console.log(`⏹️  Recebeu ${sinal} — removendo slash commands e encerrando...`);
  await Promise.race([
    limparComandos(),
    new Promise(r => setTimeout(r, 8000)), // timeout de segurança: 8s
  ]);
  process.exit(0);
}

process.on('SIGTERM', () => desligar('SIGTERM'));
process.on('SIGINT',  () => desligar('SIGINT'));

// ─── Handlers globais de erro — evitam crash do bot ──────────────────────────

client.on('error', err => console.error('[CLIENT ERROR]', err));

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', err => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

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
