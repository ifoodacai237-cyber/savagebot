import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import {
  createMsgSession,
  buildMsgPayload,
  buildMsgMainControls,
  parseMsgFromMessage,
} from '../../utils/messageSessions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('editar-mensagem')
    .setDescription('Edita uma mensagem já publicada pelo bot (embed/painel)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt.setName('message_id')
        .setDescription('ID da mensagem que você quer editar')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal onde está a mensagem (padrão: canal atual)')
        .setRequired(false)
    ),
  name: 'editar-mensagem',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString('message_id');
    const channel   = interaction.options.getChannel('canal') ?? interaction.channel;

    // Busca a mensagem alvo
    const targetMsg = await channel.messages.fetch(messageId).catch(() => null);
    if (!targetMsg) {
      return interaction.editReply({ content: `❌ Mensagem \`${messageId}\` não encontrada no canal <#${channel.id}>.` });
    }

    // Cria sessão a partir do conteúdo atual da mensagem
    const session = createMsgSession(interaction.user.id, interaction.guildId);
    session.editMode         = true;
    session.previewMessageId = targetMsg.id;
    session.previewChannelId = targetMsg.channelId;

    // Salva payload original para restaurar no caso de cancelamento
    session.originalPayload = {
      embeds:     targetMsg.embeds.map(e => e.toJSON()),
      components: targetMsg.components.map(c => c.toJSON()),
      flags:      targetMsg.flags.has('IsComponentsV2') ? MessageFlags.IsComponentsV2 : 0,
    };

    // Tenta parsear a mensagem de volta para blocos editáveis
    const parsed = parseMsgFromMessage(targetMsg);
    session.blocks      = parsed.blocks;
    session.accentColor = parsed.accentColor;
    session.thumbnail   = parsed.thumbnail;
    session.banner      = parsed.banner;
    // Botões e select menus não são reconstruídos (complexidade), mas o usuário pode adicionar novos

    const isV2     = targetMsg.flags.has('IsComponentsV2');
    const blockTip = isV2
      ? '\n⚠️ Mensagem usa layout sem cor lateral — blocos de texto foram importados.'
      : `\n📋 Blocos importados: **${session.blocks.length}**`;

    return interaction.editReply({
      content: [
        `**✏️ Editando Mensagem** — <#${channel.id}>`,
        `ID: \`${messageId}\``,
        blockTip,
        '',
        'Use os botões abaixo para editar. Clique em **✅ Publicar** para salvar as alterações.',
        '> Clique em **❌ Cancelar** para restaurar a versão original.',
      ].join('\n'),
      components: buildMsgMainControls(session),
    });
  },

  async executePrefix(message) {
    return message.reply({
      embeds: [{ color: 0x5865F2, description: '✏️ Use `/editar-mensagem` para editar um painel já publicado.' }],
    });
  },
};
