import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { askAI, generateAIImage, resetSession, isAIConfigured } from '../../utils/aiManager.js';
import { errorEmbed } from '../../utils/embed.js';

const IMAGE_SIZES = {
  quadrada: '1024x1024',
  paisagem: '1536x1024',
  retrato: '1024x1536',
};

export default {
  data: new SlashCommandBuilder()
    .setName('ia')
    .setDescription('🤖 Converse com a IA do bot ou peça para ela criar imagens')
    .addSubcommand(sub =>
      sub.setName('perguntar')
        .setDescription('Faça uma pergunta ou peça algo para a IA')
        .addStringOption(opt => opt.setName('mensagem').setDescription('O que você quer perguntar ou pedir?').setRequired(true).setMaxLength(1500))
    )
    .addSubcommand(sub =>
      sub.setName('imagem')
        .setDescription('Peça para a IA criar uma imagem')
        .addStringOption(opt => opt.setName('descricao').setDescription('Descreva a imagem que você quer criar').setRequired(true).setMaxLength(1000))
        .addStringOption(opt =>
          opt.setName('formato').setDescription('Formato da imagem').setRequired(false)
            .addChoices(
              { name: 'Quadrada (1:1)', value: 'quadrada' },
              { name: 'Paisagem (16:9)', value: 'paisagem' },
              { name: 'Retrato (9:16)', value: 'retrato' },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('resetar')
        .setDescription('Limpa a memória da sua conversa atual com a IA')
    ),
  name: 'ia',

  async execute(interaction) {
    if (!isAIConfigured()) {
      return interaction.reply({ embeds: [errorEmbed('A IA ainda não está configurada neste bot. Peça a um administrador para configurar a chave da OpenAI.')], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'resetar') {
      resetSession(interaction.guildId, interaction.user.id);
      return interaction.reply({ content: '🧹 Sua conversa com a IA foi resetada!', ephemeral: true });
    }

    if (sub === 'perguntar') {
      await interaction.deferReply();
      const mensagem = interaction.options.getString('mensagem');
      try {
        const resposta = await askAI({ guildId: interaction.guildId, userId: interaction.user.id, prompt: mensagem });
        const embed = new EmbedBuilder()
          .setColor(0x9B4FD6)
          .setAuthor({ name: `${interaction.client.user.username} · IA`, iconURL: interaction.client.user.displayAvatarURL() })
          .addFields({ name: '💬 Você perguntou', value: mensagem.length > 1024 ? mensagem.slice(0, 1021) + '…' : mensagem })
          .setDescription(resposta.length > 4096 ? resposta.slice(0, 4093) + '…' : resposta)
          .setFooter({ text: 'IA do Fallen Bot · use /ia resetar para começar do zero' });
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('[IA PERGUNTAR]', err);
        return interaction.editReply({ embeds: [errorEmbed('Não consegui falar com a IA agora. Tente novamente em instantes.')] });
      }
    }

    if (sub === 'imagem') {
      await interaction.deferReply();
      const descricao = interaction.options.getString('descricao');
      const formato = interaction.options.getString('formato') ?? 'quadrada';
      try {
        const buffer = await generateAIImage({ prompt: descricao, size: IMAGE_SIZES[formato] });
        const file = new AttachmentBuilder(buffer, { name: 'ia-imagem.png' });
        const embed = new EmbedBuilder()
          .setColor(0x9B4FD6)
          .setAuthor({ name: `${interaction.client.user.username} · IA`, iconURL: interaction.client.user.displayAvatarURL() })
          .setTitle('🖼️ Imagem gerada')
          .setDescription(`**Prompt:** ${descricao}`)
          .setImage('attachment://ia-imagem.png')
          .setFooter({ text: 'Gerado com IA · gpt-image-1' });
        return interaction.editReply({ embeds: [embed], files: [file] });
      } catch (err) {
        console.error('[IA IMAGEM]', err);
        return interaction.editReply({ embeds: [errorEmbed('Não consegui gerar a imagem agora. Tente novamente com outra descrição.')] });
      }
    }
  },

  async executePrefix(message) {
    return message.reply('🤖 Use `/ia perguntar`, `/ia imagem` ou `/ia resetar` para falar com a IA do bot.');
  },
};
