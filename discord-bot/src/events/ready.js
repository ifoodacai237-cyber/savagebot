import { ActivityType } from 'discord.js';
import { registerSlashCommands } from '../utils/loader.js';
import { initEmojis } from '../utils/emojiManager.js';
import { startCopaScheduler } from '../utils/copaHandlers.js';

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

    startCopaScheduler(client);

    console.log(`🟣 Status de Streaming ativo.`);
  },
};
