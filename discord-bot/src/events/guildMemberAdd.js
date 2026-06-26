import prisma from '../database/client.js';
import { buildWelcomeV2 } from '../utils/configPanels.js';

export default {
  name: 'guildMemberAdd',
  once: false,

  async execute(member) {
    try {
      const cfg = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
      if (!cfg?.welcomeChannel) return;
      if (cfg.welcomeEnabled === false) return;

      const channel = member.guild.channels.cache.get(cfg.welcomeChannel)
        ?? await member.guild.channels.fetch(cfg.welcomeChannel).catch(() => null);
      if (!channel) return;

      const memberCount = member.guild.memberCount;
      const vars = {
        user:      `<@${member.id}>`,
        username:  member.user.username,
        server:    member.guild.name,
        count:     memberCount.toLocaleString('pt-BR'),
        avatarUrl: member.user.displayAvatarURL({ size: 256 }),
      };

      const parts = [`<@${member.id}>`];
      if (cfg.welcomeRoles)    cfg.welcomeRoles.split(',').map(s => s.trim()).filter(Boolean).forEach(id => parts.push(`<@&${id}>`));
      if (cfg.welcomeChannels) cfg.welcomeChannels.split(',').map(s => s.trim()).filter(Boolean).forEach(id => parts.push(`<#${id}>`));

      const payload = buildWelcomeV2(cfg, vars);
      await channel.send({ content: parts.join(' '), ...payload });
    } catch (err) {
      console.error('[WELCOME] Erro ao enviar boas-vindas:', err.message);
    }
  },
};
