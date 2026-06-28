import { handleCopaInteraction } from '../utils/copaHandlers.js';

export default {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    try {
      const customId = interaction.customId ?? '';

      const isCopa =
        (interaction.isButton() && customId.startsWith('copa_')) ||
        (interaction.isStringSelectMenu() && customId.startsWith('copa_')) ||
        (interaction.isModalSubmit() && customId.startsWith('copa_modal_'));

      if (!isCopa) return;

      await handleCopaInteraction(interaction, client);
    } catch (err) {
      console.error('[COPA INTERACTION ERROR]', err);
      try {
        const msg = { content: '❌ Erro interno no sistema de palpites.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
      } catch {}
    }
  },
};
