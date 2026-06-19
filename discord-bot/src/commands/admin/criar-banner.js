import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';

const COIN = '<a:emoji_1:1516993823665033286>';

export default {
  data: new SlashCommandBuilder()
    .setName('criar-banner')
    .setDescription('🖼️ [Admin] Cria um banner personalizado para a loja')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('nome').setDescription('Nome do banner (ex: Gang Angel)').setRequired(true).setMaxLength(50))
    .addStringOption(o => o.setName('imagem').setDescription('URL da imagem do banner').setRequired(true))
    .addIntegerOption(o => o.setName('preco').setDescription('Preço em coins').setRequired(true).setMinValue(1)),
  name: 'criar-banner',

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const nome   = interaction.options.getString('nome');
    const imagem = interaction.options.getString('imagem');
    const preco  = interaction.options.getInteger('preco');

    if (!/^https?:\/\/.+/.test(imagem))
      return interaction.editReply({ content: '❌ URL da imagem inválida. Use um link direto (http/https).' });

    // Chave gerada automaticamente a partir do nome
    const chave = nome.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 30);

    const existing = await prisma.customBanner.findUnique({
      where: { guildId_key: { guildId: interaction.guildId, key: chave } },
    });

    // Se já existe a chave, adiciona sufixo único
    const finalKey = existing ? `${chave}_${Date.now().toString(36)}` : chave;

    await prisma.customBanner.create({
      data: {
        guildId:     interaction.guildId,
        key:         finalKey,
        name:        nome,
        description: '',
        price:       preco,
        imageUrl:    imagem,
        gradient1:   '#1a0533',
        gradient2:   '#4a1a8a',
        emoji:       '🖼️',
        active:      true,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x9B4FD6)
      .setTitle('✅ Banner Criado!')
      .setDescription(`O banner **${nome}** foi adicionado à loja com sucesso!`)
      .setImage(imagem)
      .addFields(
        { name: '💰 Preço', value: `**${preco.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
        { name: '🔑 Chave', value: `\`${finalKey}\``,                              inline: true },
      )
      .setFooter({ text: 'Use /loja painel → Vitrine para ver o banner' });

    return interaction.editReply({ embeds: [embed] });
  },

  async executePrefix(message) {
    return message.reply({ content: '⚠️ Use o comando slash `/criar-banner` para criar banners personalizados.' });
  },
};
