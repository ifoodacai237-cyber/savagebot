import { readdirSync, statSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { Collection, REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.join(__dirname, '../commands');

function walk(dir) {
  const entries = [];
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f);
    if (statSync(full).isDirectory()) entries.push(...walk(full));
    else if (f.endsWith('.js')) entries.push(full);
  }
  return entries;
}

function registerCmd(client, cmd) {
  if (!cmd?.data || !cmd?.name) return;
  client.commands.set(cmd.data.name, cmd);
  client.prefixCmds.set(cmd.name, cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) client.prefixCmds.set(alias, cmd);
  }
}

export async function loadCommands(client) {
  client.commands   = new Collection();
  client.prefixCmds = new Collection();

  for (const file of walk(COMMANDS_DIR)) {
    const mod = await import(pathToFileURL(file).href);
    const exp = mod.default;
    if (!exp) continue;
    if (Array.isArray(exp)) exp.forEach(cmd => registerCmd(client, cmd));
    else registerCmd(client, exp);
  }

  return client.commands;
}

export async function registerSlashCommands(client) {
  const body = [...client.commands.values()].map(c => c.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    // Registra GLOBALMENTE → funciona em todos os servidores
    await rest.put(Routes.applicationCommands(client.user.id), { body });
    console.log(`✅ ${body.length} slash commands registrados globalmente (todos os servidores).`);
    console.log(`   🔗 Link de convite (necessário ter scope "applications.commands"):`);
    console.log(`   https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
  } catch (err) {
    console.error('❌ Erro ao registrar slash commands:', err.message ?? err);
  }
}

export async function limparSlashCommands(botId, token) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(botId), { body: [] });
    console.log('🔴 Slash commands globais removidos (bot offline).');
  } catch (e) {
    console.error('[SHUTDOWN] Erro ao limpar commands:', e.message);
  }
}
