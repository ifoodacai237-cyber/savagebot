import {
  SlashCommandBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../database/client.js';
import { generateBalanceCard } from '../../utils/economyCards.js';

function parseDuration(str) {
  const match = str.match(/^(\d+)(d|h|m)$/i);
  if (!match) return null;
  const val  = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'm') return val * 60 * 1000;
  return null;
}

function humanDuration(ms) {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d} dia${d > 1 ? 's' : ''}${h > 0 ? ` e ${h}h` : ''}`;
  if (h > 0) return `${h}h${m > 0 ? ` e ${m}m` : ''}`;
  return `${m} minuto${m !== 1 ? 's' : ''}`;
}

async function showBalance(userId, guildId, guild, avatarUrl) {
  const eco     = await prisma.economy.findFirst({ where: { userId, guildId } });
  const member  = await guild.members.fetch(userId).catch(() => null);
  const username = member?.displayName ?? 'Usuario';
  const balance  = eco?.balance ?? 0;
  const bank     = eco?.bank    ?? 0;
  const buf = await generateBalanceCard({ username, avatarUrl, balance, bank });
  return new AttachmentBuilder(buf, { name: 'saldo.png' });
}

export default {
  name: 'pf',
  data: new SlashCommandBuilder()
    .setName('pf')
    .setDescription('Perfil economico e VIP temporario')
    .addSubcommand(s => s
      .setName('saldo')
      .setDescription('Ver saldo de economia')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario (padrao: voce)')))
    .addSubcommand(s => s
      .setName('vip')
      .setDescription('Dar VIP temporario a um membro')
      .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
      .addStringOption(o => o.setName('tempo').setDescription('Duracao (ex: 30d, 12h, 60m)').setRequired(true))
      .addRoleOption(o => o.setName('cargo').setDescription('Cargo VIP a dar').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'saldo') {
      await interaction.deferReply();
      const target   = interaction.options.getUser('usuario') ?? interaction.user;
      const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
      const file = await showBalance(target.id, interaction.guildId, interaction.guild, avatarUrl);
      return interaction.editReply({ files: [file] });
    }

    if (sub === 'vip') {
      const target   = interaction.options.getUser('usuario');
      const tempoStr = interaction.options.getString('tempo');
      const role     = interaction.options.getRole('cargo');
      const ms       = parseDuration(tempoStr);

      if (!ms) return interaction.reply({ content: '❌ Formato invalido. Use: 30d, 12h, 60m', ephemeral: true });

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ Membro nao encontrado no servidor.', ephemeral: true });

      const expiresAt = new Date(Date.now() + ms);

      await member.roles.add(role.id).catch(() => {});
      await prisma.vipGrant.upsert({
        where:  { guildId_userId_roleId: { guildId: interaction.guildId, userId: target.id, roleId: role.id } },
        create: { guildId: interaction.guildId, userId: target.id, roleId: role.id, expiresAt },
        update: { expiresAt },
      });

      const ts = Math.floor(expiresAt.getTime() / 1000);
      return interaction.reply({
        content: `✅ **${member.displayName}** recebeu o cargo **${role.name}** por **${humanDuration(ms)}**!\nExpira: <t:${ts}:F> (<t:${ts}:R>)`,
      });
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();

    // fallen pf vip @user 30d @cargo
    if (sub === 'vip') {
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('❌ Voce precisa da permissao **Gerenciar Servidor** para usar esse comando.');
      }

      const target     = message.mentions.users.first();
      const roleTarget = message.mentions.roles.first();
      const tempoStr   = args.find(a => /^\d+[dhm]$/i.test(a));

      if (!target || !roleTarget) {
        return message.reply('❌ Use: `fallen pf vip @user 30d @cargo`');
      }
      const ms = parseDuration(tempoStr ?? '');
      if (!ms) return message.reply('❌ Formato invalido. Use: 30d, 12h, 60m');

      const member = await message.guild.members.fetch(target.id).catch(() => null);
      if (!member) return message.reply('❌ Membro nao encontrado.');

      const expiresAt = new Date(Date.now() + ms);

      await member.roles.add(roleTarget.id).catch(() => {});
      await prisma.vipGrant.upsert({
        where:  { guildId_userId_roleId: { guildId: message.guildId, userId: target.id, roleId: roleTarget.id } },
        create: { guildId: message.guildId, userId: target.id, roleId: roleTarget.id, expiresAt },
        update: { expiresAt },
      });

      const ts = Math.floor(expiresAt.getTime() / 1000);
      return message.reply(
        `✅ **${member.displayName}** recebeu o cargo **${roleTarget.name}** por **${humanDuration(ms)}**!\nExpira: <t:${ts}:F> (<t:${ts}:R>)`,
      );
    }

    // fallen pf [@user]  →  balance card
    const target    = message.mentions.users.first() ?? message.author;
    const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
    const file      = await showBalance(target.id, message.guildId, message.guild, avatarUrl);
    return message.reply({ files: [file] });
  },
};
