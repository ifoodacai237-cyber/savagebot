export default {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    const id = interaction.customId ?? '';
    if (!id.startsWith('copa_')) return;

    try {
      const { handleCopaInteraction } = await import('../utils/copaHandlers.js');
      await handleCopaInteraction(interaction, client);
    } catch (err) {
      console.error('[COPA INTERACTION]', err);
      try {
        const msg = '❌ Erro no sistema da Copa. Tente novamente.';
        if (interaction.deferred || interaction.replied)
          await interaction.followUp({ content: msg, ephemeral: true });
        else if (interaction.isRepliable?.())
          await interaction.reply({ content: msg, ephemeral: true });
      } catch {}
    }
  },
};
