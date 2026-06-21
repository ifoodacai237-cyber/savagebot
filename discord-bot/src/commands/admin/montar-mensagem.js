import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import {
  createMsgSession,
  buildMsgPayload,
  buildMsgMainControls,
} from '../../utils/messageSessions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('montar-mensagem')
    .setDescription('Cria uma mensagem com lista de cargos e texto estilo embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  name: 'montar-mensagem',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }

    const session = createMsgSession(interaction.user.id, interaction.guildId);

    const previewMsg = await interaction.channel.send(buildMsgPayload(session));
    session.previewMessageId = previewMsg.id;
    session.previewChannelId  = previewMsg.channelId;

    return interaction.reply({
      content: '**💬 Montador de Mensagem**\nUse os botões abaixo para construir sua mensagem. Clique em **Publicar** quando terminar.',
      components: buildMsgMainControls(session),
      ephemeral: true,
    });
  },

  async executePrefix(message) {
    return message.reply({
      embeds: [{ color: 0x5865F2, description: '💬 Use `/montar-mensagem` para abrir o editor interativo.' }],
    });
  },
};
