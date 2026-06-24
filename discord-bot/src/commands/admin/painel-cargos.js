import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createRPSession, buildRPPayload, buildRPControls } from '../../utils/rolePanelSessions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('painel-cargos')
    .setDescription('Cria um painel de seleção de cargos com botões (Components V2)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  name: 'painel-cargos',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ Você precisa da permissão **Gerenciar Cargos** para usar este comando.', ephemeral: true });
    }

    const session = createRPSession(interaction.user.id, interaction.guildId);

    const previewMsg = await interaction.channel.send(buildRPPayload(session));
    session.previewMessageId = previewMsg.id;
    session.previewChannelId = previewMsg.channelId;

    return interaction.reply({
      content: [
        '**👤 Painel de Cargos — Editor**',
        'Use os botões abaixo para personalizar o painel. Clique em **✅ Publicar** quando terminar.',
        '',
        `📋 Cargos: **${session.roles.length}** | Divisória: **${session.useSeparator ? 'Sim' : 'Não'}** | Borda: **${session.accentColor !== null ? 'Verde' : 'Nenhuma'}**`,
      ].join('\n'),
      components: buildRPControls(session),
      ephemeral: true,
    });
  },

  async executePrefix(message) {
    return message.reply({
      embeds: [{ color: 0x57F287, description: '👤 Use `/painel-cargos` para abrir o editor de painel de cargos.' }],
    });
  },
};
