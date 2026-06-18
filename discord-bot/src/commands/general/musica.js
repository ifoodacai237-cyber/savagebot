import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { getTrackInfo, createMusicSession, musicSessions } from '../../utils/musicManager.js';

const MUSIC_COLOR = 0x1DB954;

export function buildMusicPanel(session) {
  const info = session.trackInfo;

  const embed = new EmbedBuilder()
    .setColor(MUSIC_COLOR)
    .setTitle('🎶 Tocando Agora')
    .setDescription(`**${info.title}**`)
    .addFields(
      { name: '👤 Canal', value: info.uploader || 'Desconhecido', inline: true },
      { name: '⏱️ Duração', value: `\`${info.duration}\``, inline: true },
      { name: '📢 Status', value: session.paused ? '⏸️ Pausado' : '▶️ Tocando', inline: true },
    )
    .setFooter({ text: 'Use os botões abaixo para controlar a música' })
    .setTimestamp();

  if (info.thumbnail) embed.setThumbnail(info.thumbnail);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_toggle')
      .setLabel(session.paused ? 'Continuar' : 'Pausar')
      .setEmoji(session.paused ? '▶️' : '⏸️')
      .setStyle(session.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Parar')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

export default {
  data: new SlashCommandBuilder()
    .setName('musica')
    .setDescription('Toca uma música a partir de um link do YouTube no canal de voz')
    .addStringOption(opt =>
      opt
        .setName('link')
        .setDescription('Link do YouTube da música que deseja tocar')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt
        .setName('canal')
        .setDescription('Canal de voz (deixe vazio para entrar no seu canal atual)')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)
    ),
  name: 'musica',

  async execute(interaction) {
    const url = interaction.options.getString('link');

    const isYouTube = /youtube\.com|youtu\.be/.test(url);
    if (!isYouTube) {
      return interaction.reply({
        embeds: [errEmbed('❌ Por enquanto apenas links do YouTube são suportados.\nExemplo: `https://www.youtube.com/watch?v=...`')],
        flags: 64,
      });
    }

    let voiceChannel = interaction.options.getChannel('canal');
    if (!voiceChannel) {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      voiceChannel = member?.voice?.channel;
    }

    if (!voiceChannel) {
      return interaction.reply({
        embeds: [errEmbed('❌ Entre em um canal de voz ou especifique um canal no comando.')],
        flags: 64,
      });
    }

    const botMember = interaction.guild.members.me
      ?? await interaction.guild.members.fetch(interaction.client.user.id).catch(() => null);
    const perms = voiceChannel.permissionsFor(botMember);
    if (!perms?.has('Connect') || !perms?.has('Speak')) {
      return interaction.reply({
        embeds: [errEmbed(`❌ Sem permissão para entrar em **${voiceChannel.name}**.\nVerifique as permissões **Conectar** e **Falar**.`)],
        flags: 64,
      });
    }

    await interaction.deferReply();

    let info;
    try {
      info = await getTrackInfo(url);
    } catch (err) {
      console.error('[MUSICA] getTrackInfo falhou:', err.message);
      return interaction.editReply({
        embeds: [errEmbed('❌ Não foi possível carregar essa música.\nVerifique se o link é válido e se a música está disponível.')],
      });
    }

    const session = await createMusicSession({ guild: interaction.guild, channelId: voiceChannel.id });
    if (!session) {
      return interaction.editReply({
        embeds: [errEmbed('❌ Falha ao conectar ao canal de voz. Tente novamente.')],
      });
    }

    const ok = await session.play(url, info).catch(err => {
      console.error('[MUSICA] play() falhou:', err.message);
      return false;
    });

    if (!ok) {
      session.stop();
      return interaction.editReply({
        embeds: [errEmbed('❌ Não foi possível reproduzir essa música. Tente outro link.')],
      });
    }

    const panel = buildMusicPanel(session);
    const msg = await interaction.editReply(panel);
    session.controlMessage = { channelId: msg.channelId, messageId: msg.id };
  },
};

function errEmbed(msg) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(msg);
}
