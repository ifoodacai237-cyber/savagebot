import prisma from '../database/client.js';

export default {
  name: 'channelDelete',
  async execute(channel) {
    await prisma.ticket.updateMany({
      where: { channelId: channel.id, status: 'open' },
      data:  { status: 'closed' },
    }).catch(() => {});
  },
};
