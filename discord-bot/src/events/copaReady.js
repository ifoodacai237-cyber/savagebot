import { startCopaScheduler } from '../utils/copaHandlers.js';

export default {
  name: 'clientReady',
  once: true,

  async execute(client) {
    startCopaScheduler(client);
  },
};
