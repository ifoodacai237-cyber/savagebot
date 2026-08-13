import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import prisma from '../../database/client.js';

const MAX_BIO = 120;

export default {
  data: new SlashCommandBuilder()
    .setName('bio')
    .setDescription('✏️ Altere a frase exibida no seu perfil')
    .addStringOption(o =>
      o.setName('texto')
        .setDescription(`Sua nova bio (máx. ${MAX_BIO} caracteres)`)
        .setRequired(true)
        .setMaxLength(MAX_BIO),
    ),
  name: 'bio',

  async execute(interaction) {
    const texto = interaction.options.getString('texto').trim();

    await prisma.userProfile.upsert({
      where:  { userId: interaction.user.id },
      create: { userId: interaction.user.id, bio: texto },
      update: { bio: texto },
    });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9B4FD6)
          .setTitle('✅ Bio atualizada!')
          .setDescription(`> ${texto}`)
          .setFooter({ text: 'Use /perfil para visualizar.' }),
      ],
      ephemeral: true,
    });
  },

  async executePrefix(message, args) {
    const texto = args.join(' ').trim();

    if (!texto) {
      return message.reply('❌ Escreva o texto da bio. Exemplo: `savage bio Amo anime!`');
    }

    if (texto.length > MAX_BIO) {
      return message.reply(`❌ Bio muito longa. Máximo de ${MAX_BIO} caracteres (você usou ${texto.length}).`);
    }

    await prisma.userProfile.upsert({
      where:  { userId: message.author.id },
      create: { userId: message.author.id, bio: texto },
      update: { bio: texto },
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9B4FD6)
          .setTitle('✅ Bio atualizada!')
          .setDescription(`> ${texto}`)
          .setFooter({ text: 'Use /perfil ou savage perfil para visualizar.' }),
      ],
    });
  },
};
