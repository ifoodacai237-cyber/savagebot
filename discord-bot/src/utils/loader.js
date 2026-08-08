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
  const configuredGuildId = process.env.GUILD_ID?.trim();
  const cachedGuilds = [...client.guilds.cache.values()];

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

  // ── Registro por servidor (instantâneo) ─────────────────────────────────
  // Um GUILD_ID antigo pode causar "Missing Access". Nesse caso, tenta os
  // servidores que o bot realmente enxerga antes de cair no registro global.
  const candidates = [];
  if (configuredGuildId) {
    const configuredGuild = client.guilds.cache.get(configuredGuildId)
      ?? await client.guilds.fetch(configuredGuildId).catch(() => null);
    if (configuredGuild) candidates.push(configuredGuild);
    else console.warn(`[SLASH] GUILD_ID=${configuredGuildId} não está acessível ao bot.`);
  }
  for (const guild of cachedGuilds) {
    if (!candidates.some(candidate => candidate.id === guild.id)) candidates.push(guild);
  }

  const failures = [];
  for (const guild of candidates) {
    try {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body });
      console.log(`⚡ ${body.length} comandos registrados em "${guild.name}" (instantâneo).`);
      // Mantém o escopo limpo: os comandos globais antigos não ficam duplicados.
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] }).catch(() => {});
      return;
    } catch (err) {
      failures.push({ guild, err });
      console.error(`❌ Registro falhou em "${guild.name}" (${guild.id}):`, err.message);
      if (err.rawError) console.error('   Detalhes:', JSON.stringify(err.rawError, null, 2));
    }
  }

  // Se o registro por servidor falhar (por exemplo, o bot foi instalado sem
  // o escopo applications.commands), ainda registra globalmente. O Discord
  // pode levar até uma hora para propagar comandos globais, mas o bot não
  // fica sem nenhuma rota de registro.
  const lastFailure = failures.at(-1)?.err;
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body });
    console.warn(
      `🌐 ${body.length} comandos registrados globalmente após falha em ` +
      `${failures.length} servidor(es). A propagação pode levar até 1 hora.`,
    );
    return;
  } catch (err) {
    console.error('❌ Erro no registro global:', err.message);
    if (err.rawError) console.error('   Detalhes:', JSON.stringify(err.rawError, null, 2));
    throw lastFailure ?? err;
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
