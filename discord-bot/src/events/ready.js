import { ActivityType } from 'discord.js';
import { registerSlashCommands } from '../utils/loader.js';
import { initEmojis } from '../utils/emojiManager.js';
import prisma from '../database/client.js';

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
        name: 'discord.gg/fallenn',
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/fallenn',
      }],
    });

    await Promise.all([
      registerSlashCommands(client),
      initEmojis(client),
    ]);
    console.log(`🟣 Status de Streaming ativo.`);

    await checkExpiredVips(client);
    setInterval(() => checkExpiredVips(client), 5 * 60 * 1000);
  },
};
