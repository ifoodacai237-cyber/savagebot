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
  const rest    = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.GUILD_ID;

  // ── Serializa e valida cada comando individualmente ──────────────────────
  const body = [];
  console.log('📋 Comandos carregados:');
  for (const cmd of client.commands.values()) {
    try {
      const json = cmd.data.toJSON();
      body.push(json);
      console.log(`   ✓ /${json.name}`);
    } catch (e) {
      console.error(`   ✗ /${cmd.data?.name ?? '?'} — ERRO: ${e.message}`);
    }
  }

  // ── Registro: guild (instantâneo) se GUILD_ID definido, senão global ─────
  // Mantém os comandos em apenas um escopo. Comandos globais antigos e os do
  // servidor aparecem juntos no Discord e causam a duplicação visual.
  if (guildId) {
    try {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body });
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] }).catch(() => {});
      const guild = client.guilds.cache.get(guildId)
        ?? await client.guilds.fetch(guildId).catch(() => null);
      console.log(`⚡ ${body.length} comandos registrados em "${guild?.name ?? guildId}" (instantâneo).`);
    } catch (err) {
      console.error('❌ Registro por servidor falhou; os comandos anteriores foram preservados:', err.message);
    }
  } else {
    // Sem GUILD_ID → registra globalmente (pode levar até 1h para propagar)
    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body });
      console.log(`🌐 ${body.length} comandos registrados globalmente.`);
    } catch (err) {
      console.error('❌ Erro no registro global:', err.message);
      if (err.rawError) console.error('   Detalhes:', JSON.stringify(err.rawError, null, 2));
    }
  }
}

export async function limparSlashCommands(botId, token) {
  const rest    = new REST({ version: '10' }).setToken(token);
  const guildId = process.env.GUILD_ID;

  const ops = [rest.put(Routes.applicationCommands(botId), { body: [] }).catch(() => {})];
  if (guildId) ops.push(rest.put(Routes.applicationGuildCommands(botId, guildId), { body: [] }).catch(() => {}));

  await Promise.all(ops);
  console.log('🔴 Slash commands removidos (bot offline).');
}
