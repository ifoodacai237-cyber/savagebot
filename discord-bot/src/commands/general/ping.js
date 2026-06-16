import { SlashCommandBuilder } from 'discord.js';
import { baseEmbed, Colors } from '../../utils/embed.js';

function buildEmbed(latency, apiLatency) {
  return baseEmbed(Colors.PRIMARY)
    .setTitle('🏓 Pong!')
    .addFields(
      { name: 'WebSocket', value: `\`${latency}ms\``, inline: true },
      { name: 'API',       value: `\`${apiLatency}ms\``, inline: true },
    )
    .setFooter({ text: 'Slow Bot · Latência' });
}

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica a latência do bot'),
  name: 'ping',
  aliases: ['latencia'],

  async execute(interaction) {
    const sent = await interaction.reply({ content: '…', fetchReply: true });
    const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({ content: null, embeds: [buildEmbed(interaction.client.ws.ping, apiLatency)] });
  },

  async executePrefix(message) {
    const sent = await message.reply('…');
    const apiLatency = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit({ content: null, embeds: [buildEmbed(message.client.ws.ping, apiLatency)] });
  },
};
