import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('copa')
    .setDescription('Sistema de palpites da Copa do Mundo 2026'),
  name: 'copa',

  async execute(interaction, client) {
    try {
      const { handleCopaCommand } = await import('../../utils/copaHandlers.js');
      await handleCopaCommand(interaction, client);
    } catch (err) {
      console.error('[COPA CMD]', err);
      const msg = '❌ Erro no sistema da Copa. Tente novamente.';
      if (interaction.deferred || interaction.replied)
        interaction.editReply({ content: msg }).catch(() => {});
      else
        interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  },

  async executePrefix(message) {
    message.reply('Use `/copa` para acessar o sistema de palpites da Copa 2026.');
  },
};
