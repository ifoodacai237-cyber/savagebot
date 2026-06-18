import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import prisma from '../../database/client.js';

const COIN = '<a:emoji_1:1516993823665033286>';

export default {
  data: new SlashCommandBuilder()
    .setName('criar-pet')
    .setDescription('🐾 Cria um pet para venda na loja (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('nome').setDescription('Nome do pet (ex: Gatinho, Dragão)').setRequired(true).setMaxLength(40)
    )
    .addStringOption(opt =>
      opt.setName('emoji').setDescription('Emoji do pet (unicode 🐱 ou emoji do servidor <:nome:id>)').setRequired(true).setMaxLength(100)
    )
    .addIntegerOption(opt =>
      opt.setName('preco').setDescription('Preço em FallenCoins').setRequired(true).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('descricao').setDescription('Descrição do pet (opcional)').setRequired(false).setMaxLength(200)
    ),
  name: 'criar-pet',

  async execute(interaction) {
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin)
      return interaction.reply({ content: '❌ Apenas administradores podem criar pets.', ephemeral: true });

    const nome     = interaction.options.getString('nome');
    const emoji    = interaction.options.getString('emoji');
    const preco    = interaction.options.getInteger('preco');
    const desc     = interaction.options.getString('descricao') ?? null;

    const existing = await prisma.pet.findUnique({ where: { guildId_name: { guildId: interaction.guildId, name: nome } } });
    if (existing)
      return interaction.reply({ content: `❌ Já existe um pet chamado **${nome}** neste servidor!`, ephemeral: true });

    const pet = await prisma.pet.create({
      data: { guildId: interaction.guildId, name: nome, emoji, description: desc, price: preco },
    });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🐾 Pet Criado com Sucesso!')
          .setDescription(`**${emoji} ${nome}** agora está disponível na loja!`)
          .addFields(
            { name: '💰 Preço',      value: `**${preco.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
            { name: '📝 Descrição',  value: desc ?? '—',                               inline: true },
            { name: '🆔 ID Interno', value: `\`${pet.id}\``,                           inline: false },
          )
          .setFooter({ text: 'Os membros já podem comprar esse pet em /loja painel' }),
      ],
      ephemeral: true,
    });
  },
};
