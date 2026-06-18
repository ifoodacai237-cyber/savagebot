import { ActivityType } from 'discord.js';
import { registerSlashCommands } from '../utils/loader.js';

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

    await registerSlashCommands(client);
    console.log(`🟣 Status de Streaming ativo.`);
  },
};
