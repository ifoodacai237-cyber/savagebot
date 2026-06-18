import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { successEmbed, errorEmbed, baseEmbed, Colors } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('instagram')
    .setDescription('Configura o módulo de feed automático do Instagram')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('ativar')
        .setDescription('Define este canal como feed do Instagram')
        .addChannelOption(o => o.setName('canal').setDescription('Canal do feed (padrão: atual)'))
    )
    .addSubcommand(sub =>
      sub.setName('desativar')
        .setDescription('Desativa o feed do Instagram neste servidor')
    )
    .addSubcommand(sub =>
      sub.setName('cor')
        .setDescription('Altera a cor da barra lateral dos posts')
        .addStringOption(o => o.setName('hex').setDescription('Cor hex, ex: E1306C ou #833AB4').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('emoji')
        .setDescription('Altera o emoji do botão de curtir')
        .addStringOption(o => o.setName('emoji').setDescription('Emoji para curtir (ex: ❤️ 🔥 👍)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('perfil')
        .setDescription('Exibe o perfil de um usuário no estilo Instagram')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário para ver o perfil (padrão: você)'))
    ),
  name: 'instagram',
  aliases: ['ig', 'insta'],

  async execute(interaction) {
    const sub   = interaction.options.getSubcommand();
    const canal = interaction.options.getChannel('canal') ?? interaction.channel;

    if (sub === 'ativar') {
      await prisma.guildConfig.upsert({
        where:  { guildId: interaction.guildId },
        create: { guildId: interaction.guildId, instaChannel: canal.id },
        update: { instaChannel: canal.id },
      });
      return interaction.reply({
        embeds: [successEmbed('Instagram Ativado', `📸 Feed ativado em ${canal}.\nToda imagem ou vídeo enviado lá será transformado em post automaticamente.`)],
        ephemeral: true,
      });
    }

    if (sub === 'desativar') {
      await prisma.guildConfig.upsert({
        where:  { guildId: interaction.guildId },
        create: { guildId: interaction.guildId },
        update: { instaChannel: null },
      });
      return interaction.reply({ embeds: [successEmbed('Instagram Desativado', 'O feed automático foi removido.')], ephemeral: true });
    }

    if (sub === 'cor') {
      const hex = interaction.options.getString('hex');
      const m   = /^#?([0-9A-Fa-f]{6})$/.exec(hex);
      if (!m) return interaction.reply({ embeds: [errorEmbed('Cor inválida. Use formato hex, ex: `E1306C` ou `#833AB4`.')], ephemeral: true });
      await prisma.guildConfig.upsert({
        where:  { guildId: interaction.guildId },
        create: { guildId: interaction.guildId, instaColor: m[1].toUpperCase() },
        update: { instaColor: m[1].toUpperCase() },
      });
      return interaction.reply({ embeds: [successEmbed('Cor Atualizada', `A cor dos posts foi alterada para **#${m[1].toUpperCase()}**.`)], ephemeral: true });
    }

    if (sub === 'emoji') {
      const emoji = interaction.options.getString('emoji').trim();
      await prisma.guildConfig.upsert({
        where:  { guildId: interaction.guildId },
        create: { guildId: interaction.guildId, instaEmoji: emoji },
        update: { instaEmoji: emoji },
      });
      return interaction.reply({ embeds: [successEmbed('Emoji Atualizado', `O botão de curtir agora usa **${emoji}**.`)], ephemeral: true });
    }

    if (sub === 'perfil') {
      await interaction.deferReply();

      const targetUser   = interaction.options.getUser('usuario') ?? interaction.user;
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const displayName  = targetMember?.displayName ?? targetUser.username;
      const joinedAt     = targetMember?.joinedAt;
      const createdAt    = targetUser.createdAt;
      const roles        = targetMember?.roles.cache
        .filter(r => r.id !== interaction.guildId)
        .sort((a, b) => b.position - a.position)
        .first(3)
        .map(r => `${r}`)
        .join(' ') || '*(nenhum)*';

      const cfg      = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
      const color    = parseInt(cfg?.instaColor ?? '833AB4', 16);
      const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `@${targetUser.username}`, iconURL: avatarUrl })
        .setThumbnail(avatarUrl)
        .setTitle(`📸 ${displayName}`)
        .addFields(
          { name: '🆔 ID',             value: `\`${targetUser.id}\``,                                inline: true },
          { name: '📅 Conta criada',   value: `<t:${Math.floor(createdAt.getTime() / 1000)}:R>`,    inline: true },
          { name: '📥 Entrou no servidor', value: joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:R>` : '*(desconhecido)*', inline: true },
          { name: '🏷️ Cargos',         value: roles,                                                inline: false },
        )
        .setFooter({ text: `Fallen Bot · Instagram • ${displayName}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'ativar') {
      await prisma.guildConfig.upsert({
        where:  { guildId: message.guildId },
        create: { guildId: message.guildId, instaChannel: message.channelId },
        update: { instaChannel: message.channelId },
      });
      return message.reply({ embeds: [successEmbed('Instagram Ativado', `📸 Feed ativado neste canal.`)] });
    }
    if (sub === 'perfil') {
      const targetUser   = message.mentions.users.first() ?? message.author;
      const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
      const displayName  = targetMember?.displayName ?? targetUser.username;
      const joinedAt     = targetMember?.joinedAt;
      const createdAt    = targetUser.createdAt;
      const roles        = targetMember?.roles.cache
        .filter(r => r.id !== message.guildId)
        .sort((a, b) => b.position - a.position)
        .first(3)
        .map(r => `${r}`)
        .join(' ') || '*(nenhum)*';

      const cfg      = await prisma.guildConfig.findUnique({ where: { guildId: message.guildId } });
      const color    = parseInt(cfg?.instaColor ?? '833AB4', 16);
      const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `@${targetUser.username}`, iconURL: avatarUrl })
        .setThumbnail(avatarUrl)
        .setTitle(`📸 ${displayName}`)
        .addFields(
          { name: '🆔 ID',             value: `\`${targetUser.id}\``,                                inline: true },
          { name: '📅 Conta criada',   value: `<t:${Math.floor(createdAt.getTime() / 1000)}:R>`,    inline: true },
          { name: '📥 Entrou no servidor', value: joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:R>` : '*(desconhecido)*', inline: true },
          { name: '🏷️ Cargos',         value: roles,                                                inline: false },
        )
        .setFooter({ text: `Fallen Bot · Instagram • ${displayName}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
    return message.reply({ embeds: [errorEmbed('Use: `fallen instagram ativar`, `fallen instagram desativar` ou `fallen instagram perfil [@user]`')] });
  },
};
