import { ActivityType, EmbedBuilder } from 'discord.js';
import { registerSlashCommands } from '../utils/loader.js';
import { initEmojis } from '../utils/emojiManager.js';
import { startMonitor } from '../utils/usernameMonitor.js';
import prisma from '../database/client.js';

// ─── Publisher automático ─────────────────────────────────────────────────────
// Publica APENAS usernames novos (encontrados após a última publicação deste canal)

const PUBLISH_INTERVAL_MS   = 5 * 60 * 1000; // publica a cada 5 minutos
const USERNAMES_PER_MESSAGE = 80;            // limite por embed (evita embed enorme)

async function publishAvailableUsernames(client) {
  try {
    const configs = await prisma.publishChannel.findMany({});
    if (!configs.length) return;

    for (const cfg of configs) {
      try {
        const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel) continue;

        // Pega só usernames NOVOS (detectados após a última publicação deste canal)
        const since = cfg.lastRunAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

        const targets = await prisma.sniperTarget.findMany({
          where:   { category: cfg.category, postedAt: { not: null, gt: since } },
          orderBy: { postedAt: 'asc' },
          take:    USERNAMES_PER_MESSAGE,
        });

        if (!targets.length) continue;

        const lista = targets.map(t => `✅ \`${t.username}\``).join('\n');

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle(`🎁 Usernames Disponíveis — ${cfg.category.toUpperCase()}`)
              .setDescription(lista)
              .setFooter({ text: `${targets.length} novos | Fallen Angels Sniper` })
              .setTimestamp(),
          ],
        });

        // Atualiza o timestamp desta publicação
        await prisma.publishChannel.update({
          where: { id: cfg.id },
          data:  { lastRunAt: new Date() },
        });
      } catch (err) {
        console.error(`[PUBLISH] Erro no canal ${cfg.channelId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[PUBLISH] Erro na publicação:', err.message);
  }
}

// ─── VIP expirado ─────────────────────────────────────────────────────────────

async function checkExpiredVips(client) {
  try {
    const now     = new Date();
    const expired = await prisma.vipGrant.findMany({ where: { expiresAt: { lte: now } } });
    if (!expired.length) return;

    for (const grant of expired) {
      try {
        const guild  = client.guilds.cache.get(grant.guildId)
          ?? await client.guilds.fetch(grant.guildId).catch(() => null);
        if (!guild) continue;
        const member = await guild.members.fetch(grant.userId).catch(() => null);
        if (member) await member.roles.remove(grant.roleId).catch(() => {});
      } catch {}
    }

    await prisma.vipGrant.deleteMany({ where: { expiresAt: { lte: now } } });
    console.log(`[VIP] ${expired.length} VIP(s) expirado(s) removidos.`);
  } catch (err) {
    console.error('[VIP] Erro ao checar VIPs expirados:', err);
  }
}

// ─── Ready ────────────────────────────────────────────────────────────────────

export default {
  name: 'clientReady',
  once: true,

  async execute(client) {
    console.log(`🤖 Bot online como ${client.user.tag}`);

    client.user.setPresence({
      status: 'online',
      activities: [{
        name: 'discord.gg/savagge',
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/savagge',
      }],
    });

    // Monitor e publisher iniciam imediatamente — não dependem de registro de comandos
    startMonitor(client);

    await checkExpiredVips(client);
    setInterval(() => checkExpiredVips(client), 5 * 60 * 1000);
    setInterval(() => publishAvailableUsernames(client), PUBLISH_INTERVAL_MS);
    console.log('📡 Publisher automático ativo (a cada 5 min, só novos).');

    // Registro de comandos e emojis em background (não bloqueia o monitor)
    Promise.all([
      registerSlashCommands(client),
      initEmojis(client),
    ]).then(() => {
      console.log('🟣 Comandos e emojis prontos.');
    }).catch(err => {
      console.error('[SETUP] Erro no registro:', err.message);
    });
  },
};
