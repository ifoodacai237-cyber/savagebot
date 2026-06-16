import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import {
  createSession,
  getSession,
  buildContainerPayload,
  buildMainControls,
} from '../../utils/containerSessions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('container')
    .setDescription('Crie e edite mensagens com Containers (Discord v2)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(s => s.setName('criar').setDescription('Abrir o editor de container interativo')),
  name: 'container',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      const existing = getSession(interaction.user.id, interaction.guildId);
      const session  = existing ?? createSession(interaction.user.id, interaction.guildId);
      session.previewChannelId = interaction.channelId;

      // Send or update the preview message
      let previewMsg;
      if (session.previewMessageId) {
        try {
          const ch = interaction.guild.channels.cache.get(session.previewChannelId) ?? interaction.channel;
          previewMsg = await ch.messages.fetch(session.previewMessageId);
          await previewMsg.edit(buildContainerPayload(session));
        } catch {
          session.previewMessageId = null;
        }
      }

      if (!session.previewMessageId) {
        previewMsg = await interaction.channel.send(buildContainerPayload(session));
        session.previewMessageId = previewMsg.id;
        session.previewChannelId = previewMsg.channelId;
      }

      return interaction.reply({
        content: '**🛠️ Editor de Container**\nUse os botões abaixo para montar seu container. Clique em **Publicar** quando terminar.',
        components: buildMainControls(),
        ephemeral: true,
      });
    }
  },
};
