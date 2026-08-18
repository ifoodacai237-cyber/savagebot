import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';

import { getEmoji } from '../../utils/emojiManager.js';
import { buildPetPanel, petDisplayName } from '../../utils/petComponents.js';
const COIN = () => getEmoji('futecoins');

export default {
  data: new SlashCommandBuilder()
    .setName('editar-pet')
    .setDescription('🐾 Edita um pet já existente na loja (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('nome').setDescription('Nome do pet a editar').setRequired(true).setMaxLength(40)
    )
    .addStringOption(opt =>
      opt.setName('foto').setDescription('URL da foto do pet (PNG/JPG) — aparece grande na embed').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('emoji').setDescription('Novo emoji (unicode 🐱 ou custom <:nome:id>)').setRequired(false).setMaxLength(100)
    )
    .addIntegerOption(opt =>
      opt.setName('preco').setDescription('Novo preço em SavageCoins').setRequired(false).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('descricao').setDescription('Nova descrição').setRequired(false).setMaxLength(200)
    )
    .addBooleanOption(opt =>
      opt.setName('remover_foto').setDescription('Remove a foto cadastrada e volta a usar só o emoji').setRequired(false)
    ),
  name: 'editar-pet',

  async execute(interaction) {
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin)
      return interaction.reply({ content: '❌ Apenas administradores podem editar pets.', ephemeral: true });

    const nome        = interaction.options.getString('nome');
    const foto        = interaction.options.getString('foto') ?? undefined;
    const emoji       = interaction.options.getString('emoji') ?? undefined;
    const preco       = interaction.options.getInteger('preco') ?? undefined;
    const descricao   = interaction.options.getString('descricao') ?? undefined;
    const removerFoto = interaction.options.getBoolean('remover_foto') ?? false;

    const pet = await prisma.pet.findFirst({
      where: { guildId: interaction.guildId, name: { equals: nome, mode: 'insensitive' } },
    }).catch(() => null);

    if (!pet)
      return interaction.reply({ content: `❌ Nenhum pet chamado **${nome}** encontrado neste servidor.`, ephemeral: true });

    if (!foto && !emoji && preco === undefined && !descricao && !removerFoto)
      return interaction.reply({ content: '❌ Você precisa informar ao menos um campo para alterar.', ephemeral: true });

    const data = {};
    if (emoji)       data.emoji    = emoji;
    if (preco)       data.price    = preco;
    if (descricao)   data.description = descricao;
    if (removerFoto) data.imageUrl = null;
    else if (foto)   data.imageUrl = foto;

    const updated = await prisma.pet.update({ where: { id: pet.id }, data });

    const changes = [];
    if (emoji)       changes.push(`🐾 Emoji → ${emoji}`);
    if (preco)       changes.push(`💰 Preço → **${preco.toLocaleString('pt-BR')} ${COIN()}**`);
    if (descricao)   changes.push(`📝 Descrição → ${descricao}`);
    if (removerFoto) changes.push('🗑️ Foto removida — usando emoji');
    else if (foto)   changes.push(`🖼️ Foto → [ver imagem](${foto})`);

    return interaction.reply({
      ...buildPetPanel({
        title: `✏️ ${petDisplayName(updated, interaction.guild)} atualizado`,
        body:
          `${changes.join('\n')}\n\n` +
          `💰 **Preço atual:** ${updated.price.toLocaleString('pt-BR')} ${COIN()}\n` +
          `📝 **Descrição atual:** ${updated.description ?? '—'}\n` +
          `🆔 **ID:** \`${updated.id}\`\n\n` +
          'As alterações já estão ativas na loja.',
        pet: updated,
        includeActions: false,
      }),
      ephemeral: true,
    });
  },

  async executePrefix(message) {
    return message.reply(buildPetPanel({
      title: '✏️ Editar pet',
      body: 'Use `/editar-pet` para alterar foto, emoji, preço ou descrição de um pet existente.',
      includeActions: false,
    }));
  },
};
