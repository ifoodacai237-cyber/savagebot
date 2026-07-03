import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import prisma from '../../database/client.js';
import { setGuildBotProfile } from '../../utils/botProfile.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

function previewEmbed(cfg, botName, botAvatar) {
  const embed = new EmbedBuilder()
    .setColor(0x9B4FD6)
    .setTitle(`🎨 Personalização — ${botName}`)
    .setDescription(cfg.botBio || '*Nenhuma bio definida para este servidor.*')
    .setThumbnail(cfg.botIconUrl || botAvatar)
    .setFooter({ text: 'Identidade visual do bot neste servidor' });
  if (cfg.botBannerUrl) embed.setImage(cfg.botBannerUrl);
  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('personalizar')
    .setDescription('🎨 Personalize a aparência do bot neste servidor (ícone, banner e bio)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('icone')
        .setDescription('Define o ícone/avatar do bot exclusivo deste servidor')
        .addAttachmentOption(opt => opt.setName('imagem').setDescription('Imagem para usar como ícone').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('banner')
        .setDescription('Define o banner do bot exclusivo deste servidor')
        .addAttachmentOption(opt => opt.setName('imagem').setDescription('Imagem para usar como banner').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('bio')
        .setDescription('Define a bio do bot exclusiva deste servidor')
        .addStringOption(opt => opt.setName('texto').setDescription('Texto da bio (máx. 190 caracteres)').setRequired(true).setMaxLength(190))
    )
    .addSubcommand(sub =>
      sub.setName('resetar')
        .setDescription('Remove uma personalização e volta ao padrão global do bot')
        .addStringOption(opt =>
          opt.setName('campo').setDescription('O que deseja resetar').setRequired(true)
            .addChoices(
              { name: 'Ícone', value: 'icone' },
              { name: 'Banner', value: 'banner' },
              { name: 'Bio', value: 'bio' },
              { name: 'Tudo', value: 'tudo' },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('ver')
        .setDescription('Mostra a personalização atual do bot neste servidor')
    ),
  name: 'personalizar',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (sub === 'icone') {
        const attachment = interaction.options.getAttachment('imagem');
        await setGuildBotProfile(interaction.client, interaction.guildId, { avatarUrl: attachment.url });
        await prisma.guildConfig.upsert({
          where: { guildId: interaction.guildId },
          create: { guildId: interaction.guildId, botIconUrl: attachment.url },
          update: { botIconUrl: attachment.url },
        });
        return interaction.editReply({ embeds: [successEmbed('Ícone atualizado!', 'O bot agora usa esse ícone exclusivamente neste servidor.')] });
      }

      if (sub === 'banner') {
        const attachment = interaction.options.getAttachment('imagem');
        await setGuildBotProfile(interaction.client, interaction.guildId, { bannerUrl: attachment.url });
        await prisma.guildConfig.upsert({
          where: { guildId: interaction.guildId },
          create: { guildId: interaction.guildId, botBannerUrl: attachment.url },
          update: { botBannerUrl: attachment.url },
        });
        return interaction.editReply({ embeds: [successEmbed('Banner atualizado!', 'O bot agora usa esse banner exclusivamente neste servidor.')] });
      }

      if (sub === 'bio') {
        const texto = interaction.options.getString('texto');
        await setGuildBotProfile(interaction.client, interaction.guildId, { bio: texto });
        await prisma.guildConfig.upsert({
          where: { guildId: interaction.guildId },
          create: { guildId: interaction.guildId, botBio: texto },
          update: { botBio: texto },
        });
        return interaction.editReply({ embeds: [successEmbed('Bio atualizada!', 'A bio do bot foi atualizada exclusivamente neste servidor.')] });
      }

      if (sub === 'resetar') {
        const campo = interaction.options.getString('campo');
        const clear = {};
        const data = {};
        if (campo === 'icone' || campo === 'tudo') { clear.clearAvatar = true; data.botIconUrl = null; }
        if (campo === 'banner' || campo === 'tudo') { clear.clearBanner = true; data.botBannerUrl = null; }
        if (campo === 'bio' || campo === 'tudo') { clear.clearBio = true; data.botBio = null; }

        await setGuildBotProfile(interaction.client, interaction.guildId, clear);
        await prisma.guildConfig.upsert({
          where: { guildId: interaction.guildId },
          create: { guildId: interaction.guildId, ...data },
          update: data,
        });
        return interaction.editReply({ embeds: [successEmbed('Resetado!', 'A personalização foi removida e o bot voltou ao padrão global neste servidor.')] });
      }

      if (sub === 'ver') {
        const cfg = await getCfg(interaction.guildId);
        return interaction.editReply({ embeds: [previewEmbed(cfg, interaction.client.user.username, interaction.client.user.displayAvatarURL())] });
      }
    } catch (err) {
      console.error('[PERSONALIZAR]', err);
      return interaction.editReply({ embeds: [errorEmbed(err.message || 'Não foi possível aplicar a personalização.')] });
    }
  },

  async executePrefix(message) {
    return message.reply('🎨 Use `/personalizar` para configurar o ícone, banner e bio do bot neste servidor.');
  },
};
