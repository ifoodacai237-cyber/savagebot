import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';

import { getEmoji } from '../../utils/emojiManager.js';
import { buildPetPanel, petDisplayName } from '../../utils/petComponents.js';
const COIN = () => getEmoji('futecoins');

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
      opt.setName('preco').setDescription('Preço em SavageCoins').setRequired(true).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('descricao').setDescription('Descrição do pet (opcional)').setRequired(false).setMaxLength(200)
    ),
  name: 'criar-pet',

  async execute(interaction) {
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin)
      return interaction.reply({ content: '❌ Apenas administradores podem criar pets.', ephemeral: true });

    const nome  = interaction.options.getString('nome');
    const emoji = interaction.options.getString('emoji');
    const preco = interaction.options.getInteger('preco');
    const desc  = interaction.options.getString('descricao') ?? null;

    const existing = await prisma.pet.findUnique({ where: { guildId_name: { guildId: interaction.guildId, name: nome } } });
    if (existing)
      return interaction.reply({ content: `❌ Já existe um pet chamado **${nome}** neste servidor!`, ephemeral: true });

    const pet = await prisma.pet.create({
      data: { guildId: interaction.guildId, name: nome, emoji, description: desc, price: preco },
    });

    return interaction.reply({
      ...buildPetPanel({
        title: '🐾 Pet criado com sucesso',
        body:
          `**${petDisplayName(pet)}** agora está disponível na loja!\n\n` +
          `💰 **Preço:** ${preco.toLocaleString('pt-BR')} ${COIN()}\n` +
          `📝 **Descrição:** ${desc ?? '—'}\n` +
          `🆔 **ID interno:** \`${pet.id}\`\n\n` +
          'Os membros já podem comprar este pet em `/loja painel enviar`.',
        pet,
        includeActions: false,
      }),
      ephemeral: true,
    });
  },

  async executePrefix(message) {
    return message.reply(buildPetPanel({
      title: '🐾 Criar pet',
      body: 'Use `/criar-pet` para adicionar um pet à loja.\nEste comando requer o slash command para configurar todos os campos.',
      includeActions: false,
    }));
  },
};
