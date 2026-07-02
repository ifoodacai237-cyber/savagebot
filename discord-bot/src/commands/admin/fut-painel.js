import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('fut-painel-fotos')
    .setDescription('🖼️ Painel admin: personalize nome/foto de uma carta FUT manualmente')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  name: 'fut-painel-fotos',

  async execute(interaction) {
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isAdmin)
      return interaction.reply({ content: '❌ Apenas administradores podem usar o painel de cartas.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x9B4FD6)
      .setTitle('🖼️ Painel de Cartas FUT — Personalização Manual')
      .setDescription(
        'Use este painel apenas quando a foto ou o nome de uma carta estiver **errado** e a correção automática não resolver.\n\n' +
        '**✏️ Editar Carta** — define nome e/ou foto customizados para um jogador pelo ID.\n' +
        '**🗑️ Resetar Carta** — remove a personalização e volta ao padrão automático.\n' +
        '**📋 Listar Personalizações** — mostra todas as cartas já customizadas.\n\n' +
        '💡 Para achar o **ID** do jogador, use `/fut colecao` ou `/fut time` — o ID aparece ao passar o mouse ou pode ser pedido a mim.',
      )
      .setFooter({ text: 'Alterações feitas aqui têm prioridade sobre a foto automática' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('futadm_editar').setLabel('Editar Carta').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('futadm_resetar').setLabel('Resetar Carta').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('futadm_listar').setLabel('Listar Personalizações').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },

  async executePrefix(message) {
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x9B4FD6).setDescription('🖼️ Use `/fut-painel-fotos` para abrir o painel de personalização de cartas.')],
    });
  },
};
