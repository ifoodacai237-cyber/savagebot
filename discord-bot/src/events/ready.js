import { ActivityType, EmbedBuilder } from 'discord.js';
import { registerSlashCommands } from '../utils/loader.js';
import { initEmojis } from '../utils/emojiManager.js';
import prisma from '../database/client.js';

const PUBLISH_INTERVAL_MS  = 1 * 60 * 1000; // 1 minuto
const USERNAMES_PER_MESSAGE = 500;

async function publishAvailableUsernames(client) {
  try {
    const configs = await prisma.publishChannel.findMany({});
    if (!configs.length) return;

    // Usernames encontrados disponíveis nas últimas 24h agrupados por categoria
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const cfg of configs) {
      try {
        const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel) continue;

        const targets = await prisma.sniperTarget.findMany({
          where:   { category: cfg.category, postedAt: { not: null, gte: since } },
          orderBy: { postedAt: 'desc' },
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
              .setFooter({ text: `Total: ${targets.length} | Fallen Angels Sniper` }),
          ],
        });
      } catch (err) {
        console.error(`[PUBLISH] Erro no canal ${cfg.channelId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[PUBLISH] Erro na publicação:', err.message);
  }
}

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

    await Promise.all([
      registerSlashCommands(client),
      initEmojis(client),
    ]);
    console.log(`🟣 Status de Streaming ativo.`);

    await checkExpiredVips(client);
    setInterval(() => checkExpiredVips(client), 5 * 60 * 1000);

    // Publicação automática de usernames disponíveis nos canais configurados
    setInterval(() => publishAvailableUsernames(client), PUBLISH_INTERVAL_MS);
    console.log('📡 Publisher automático ativo (a cada 5 min).');
  },
};
