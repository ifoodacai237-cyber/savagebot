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
  const rest  = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    if (process.env.GUILD_ID) {
      // Limpa comandos globais para evitar duplicatas/comandos antigos
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] }).catch(() => {});

      // Registra comandos no servidor específico (aparecem instantaneamente)
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
        { body }
      );
      console.log(`✅ ${body.length} slash commands registrados instantaneamente no servidor.`);
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body });
      console.log(`✅ ${body.length} slash commands registrados globalmente.`);
    }
  } catch (err) {
    console.error('❌ Erro ao registrar slash commands:', err);
  }
}
