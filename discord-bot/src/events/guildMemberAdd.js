import { EmbedBuilder } from 'discord.js';
import prisma from '../database/client.js';

const DEFAULT_TITLE = '👋 Bem-vindo(a) ao {server}!';
const DEFAULT_TEXT  = '> Seja bem-vindo(a), {user}!\n> Esperamos que você tenha uma ótima experiência aqui.\n> Você é o membro nº **{count}**!';

function replacePlaceholders(str, { user, username, server, count }) {
  return str
    .replace(/\{user\}/g,     user)
    .replace(/\{username\}/g, username)
    .replace(/\{server\}/g,   server)
    .replace(/\{count\}/g,    count);
}

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

      const color = cfg.welcomeColor ? (parseInt(cfg.welcomeColor, 16) || 0x5865F2) : 0x5865F2;
      const memberCount = member.guild.memberCount;

      const vars = {
        user:     `<@${member.id}>`,
        username: member.user.username,
        server:   member.guild.name,
        count:    memberCount.toLocaleString('pt-BR'),
      };

      const title = replacePlaceholders(cfg.welcomeTitle ?? DEFAULT_TITLE, vars);
      const desc  = replacePlaceholders(cfg.welcomeText  ?? DEFAULT_TEXT,  vars);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc)
        .setTimestamp();

      if (cfg.welcomeBanner) embed.setImage(cfg.welcomeBanner);
      if (cfg.welcomeThumb)  embed.setThumbnail(cfg.welcomeThumb);
      else                   embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
      if (cfg.welcomeFooter) embed.setFooter({ text: replacePlaceholders(cfg.welcomeFooter, vars) });

      const parts = [`<@${member.id}>`];
      if (cfg.welcomeRoles)    cfg.welcomeRoles.split(',').map(s => s.trim()).filter(Boolean).forEach(id => parts.push(`<@&${id}>`));
      if (cfg.welcomeChannels) cfg.welcomeChannels.split(',').map(s => s.trim()).filter(Boolean).forEach(id => parts.push(`<#${id}>`));

      await channel.send({ content: parts.join(' '), embeds: [embed] });
    } catch (err) {
      console.error('[WELCOME] Erro ao enviar boas-vindas:', err.message);
    }
  },
};
