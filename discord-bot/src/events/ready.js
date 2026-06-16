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
        name: 'slow.gg · Transmissão ao vivo',
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/slowbot',
      }],
    });

    await registerSlashCommands(client);
    console.log(`🟣 Status de Streaming ativo.`);
  },
};
