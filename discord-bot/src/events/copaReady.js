export default {
  name: 'clientReady',
  once: true,

  async execute(client) {
    try {
      const { startCopaScheduler } = await import('../utils/copaHandlers.js');
      startCopaScheduler(client);
      console.log('✅ Copa 2026 scheduler started.');
    } catch (err) {
      console.error('[COPA READY]', err);
    }
  },
};
