import prisma from '../database/client.js';

export default {
  name: 'guildMemberRemove',
  once: false,

  async execute(member) {
    const cfg = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
    if (!cfg?.partnerRemoveOnLeave) return;

    await prisma.partnership.deleteMany({
      where: {
        guildId:          member.guild.id,
        representativeId: member.id,
      },
    }).catch(() => {});
  },
};
