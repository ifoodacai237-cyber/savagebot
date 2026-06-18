import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { baseEmbed, Colors } from '../../utils/embed.js';

const SERVER_INVITE = 'https://discord.gg/fallenn';

function buildEmbed() {
  return baseEmbed(Colors.PRIMARY)
    .setTitle('📖 Comandos Disponíveis')
    .setDescription('Use `/comando` ou `fallen comando`\n\u200b')
    .addFields(
      {
        name: '⚙️ Geral',
        value: '`ping` — Latência\n`call` — Entrar em call 24/7\n`ajuda` — Esta mensagem',
      },
      {
        name: '🎫 Tickets',
        value: '`ticket painel` — Painel de suporte\n`ticket config` — Configurar tickets',
      },
      {
        name: '💑 Família',
        value: '`casar @user` — Propor casamento\n`divorciar` — Divorciar\n`adotar @user` — Adotar\n`arvore` — Ver família',
      },
      {
        name: '📸 Instagram',
        value: '`instagram config` — Configurar feed\n`instagram perfil [user]` — Ver perfil\n`instagram post` — Simular post',
      },
      {
        name: '🤫 Tellonym',
        value: '`tellonym set [link]` — Salvar link\n`tellonym ver [@user]` — Ver link\n`tell @user [msg]` — Mensagem anônima',
      },
    )
    .setFooter({ text: 'Fallen Bot · Sistema de Ajuda' });
}

function buildRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Entrar no Servidor')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Link)
      .setURL(SERVER_INVITE),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Lista todos os comandos disponíveis'),
  name: 'ajuda',
  aliases: ['help', 'comandos'],

  async execute(interaction) {
    return interaction.reply({ embeds: [buildEmbed()], components: [buildRow()] });
  },

  async executePrefix(message) {
    return message.reply({ embeds: [buildEmbed()], components: [buildRow()] });
  },
};
