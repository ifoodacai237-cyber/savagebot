import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { isAIConfigured } from '../../utils/aiManager.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ia')
    .setDescription('🤖 Mostra como conversar com a IA do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'ia',

  async execute(interaction) {
    if (!isAIConfigured()) {
      return interaction.reply({ embeds: [errorEmbed('A IA está temporariamente indisponível.')], ephemeral: true });
    }

    return interaction.reply({
      embeds: [successEmbed(
        'IA pronta!',
        'Qualquer pessoa pode me marcar em qualquer canal e fazer uma pergunta, pedir ajuda com o servidor ou puxar conversa. Eu respondo de forma descontraída, brincalhona e inteligente.',
      )],
      ephemeral: true,
    });
  },

  async executePrefix(message) {
    return message.reply('🤖 É só me marcar em qualquer canal e dizer o que você precisa. Posso conversar, ajudar com assuntos gerais e explicar os recursos do servidor!');
  },
};
