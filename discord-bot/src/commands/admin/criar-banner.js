import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';

const COIN = '<a:emoji_1:1516993823665033286>';

function hexValid(v) { return /^#?[0-9A-Fa-f]{6}$/.test(v); }
function normalizeHex(v) { return v.startsWith('#') ? v : `#${v}`; }

export default {
  data: new SlashCommandBuilder()
    .setName('criar-banner')
    .setDescription('🖼️ [Admin] Cria um banner personalizado para a loja')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('nome').setDescription('Nome do banner (ex: ✨ Estrelas)').setRequired(true).setMaxLength(50))
    .addStringOption(o => o.setName('chave').setDescription('Chave única (ex: estrelas) — sem espaços').setRequired(true).setMaxLength(30))
    .addStringOption(o => o.setName('imagem').setDescription('URL da imagem do banner').setRequired(true))
    .addIntegerOption(o => o.setName('preco').setDescription('Preço em coins').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji do banner (ex: ✨)').setRequired(true).setMaxLength(10))
    .addStringOption(o => o.setName('descricao').setDescription('Descrição do banner').setRequired(false).setMaxLength(200))
    .addStringOption(o => o.setName('cor1').setDescription('Cor 1 do gradiente (hex, ex: 1a0533)').setRequired(false).setMaxLength(7))
    .addStringOption(o => o.setName('cor2').setDescription('Cor 2 do gradiente (hex, ex: 4a1a8a)').setRequired(false).setMaxLength(7)),
  name: 'criar-banner',

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const nome    = interaction.options.getString('nome');
    const chave   = interaction.options.getString('chave').toLowerCase().replace(/\s+/g, '_');
    const imagem  = interaction.options.getString('imagem');
    const preco   = interaction.options.getInteger('preco');
    const emoji   = interaction.options.getString('emoji');
    const desc    = interaction.options.getString('descricao') ?? '';
    const cor1Raw = interaction.options.getString('cor1') ?? '1a0533';
    const cor2Raw = interaction.options.getString('cor2') ?? '4a1a8a';

    if (!hexValid(cor1Raw)) return interaction.editReply({ content: '❌ **Cor 1** inválida! Use formato hex (ex: `1a0533` ou `#1a0533`).' });
    if (!hexValid(cor2Raw)) return interaction.editReply({ content: '❌ **Cor 2** inválida! Use formato hex (ex: `4a1a8a` ou `#4a1a8a`).' });

    if (!/^https?:\/\/.+/.test(imagem)) return interaction.editReply({ content: '❌ URL da imagem inválida.' });

    const cor1 = normalizeHex(cor1Raw);
    const cor2 = normalizeHex(cor2Raw);

    const existing = await prisma.customBanner.findUnique({
      where: { guildId_key: { guildId: interaction.guildId, key: chave } },
    });
    if (existing) return interaction.editReply({ content: `❌ Já existe um banner com a chave \`${chave}\` neste servidor. Escolha outra chave.` });

    await prisma.customBanner.create({
      data: {
        guildId:     interaction.guildId,
        key:         chave,
        name:        nome,
        description: desc,
        price:       preco,
        imageUrl:    imagem,
        gradient1:   cor1,
        gradient2:   cor2,
        emoji:       emoji,
        active:      true,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(parseInt(cor1.slice(1), 16) || 0x9B4FD6)
      .setTitle('✅ Banner Criado!')
      .setDescription(`O banner **${nome}** foi adicionado à loja com sucesso!`)
      .setImage(imagem)
      .addFields(
        { name: '🔑 Chave',    value: `\`${chave}\``,                          inline: true },
        { name: '💰 Preço',    value: `**${preco.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
        { name: '🎨 Gradiente', value: `\`${cor1}\` → \`${cor2}\``,            inline: true },
        { name: '📝 Descrição', value: desc || '—',                             inline: false },
      )
      .setFooter({ text: 'Use /loja painel → Vitrine para ver o banner' });

    return interaction.editReply({ embeds: [embed] });
  },

  async executePrefix(message) {
    return message.reply({ content: '⚠️ Use o comando slash `/criar-banner` para criar banners personalizados.' });
  },
};
