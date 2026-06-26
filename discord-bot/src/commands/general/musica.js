import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { getTrackInfo, createMusicSession, musicSessions, resolveQuery } from '../../utils/musicManager.js';

const MUSIC_COLOR = 0x1DB954;

const PLATFORM_ICONS = {
  youtube:    '▶️ YouTube',
  soundcloud: '🟠 SoundCloud',
  spotify:    '💚 Spotify → SoundCloud',
  default:    '🎵 Música',
};

export function buildMusicPanel(session) {
  const info = session.trackInfo;
  const platformLabel = PLATFORM_ICONS[info.platform] ?? PLATFORM_ICONS.default;

  const embed = new EmbedBuilder()
    .setColor(MUSIC_COLOR)
    .setTitle('🎶 Tocando Agora')
    .setDescription(`**${info.title}**`)
    .addFields(
      { name: '👤 Canal / Artista', value: info.uploader || 'Desconhecido', inline: true },
      { name: '⏱️ Duração',        value: `\`${info.duration}\``,           inline: true },
      { name: '📢 Status',         value: session.paused ? '⏸️ Pausado' : '▶️ Tocando', inline: true },
      { name: '🔗 Fonte',          value: platformLabel, inline: true },
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
    .setDescription('Toca uma música no canal de voz via link ou pesquisa')
    .addStringOption(opt =>
      opt
        .setName('consulta')
        .setDescription('Nome da música, artista, ou link (YouTube, SoundCloud, Spotify)')
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
    const consulta = interaction.options.getString('consulta');

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

    const { isSearch, platform } = resolveQuery(consulta);
    const buscandoMsg = isSearch
      ? `🔍 Pesquisando **"${consulta}"** no YouTube...`
      : platform === 'spotify'
        ? '💚 Convertendo link do Spotify para YouTube...'
        : '⏳ Carregando música...';

    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(MUSIC_COLOR).setDescription(buscandoMsg)],
    });

    let info;
    try {
      info = await getTrackInfo(consulta);
    } catch (err) {
      console.error('[MUSICA] getTrackInfo falhou:', err.message);

      let errText = '❌ Não foi possível carregar essa música.';
      if (err.message.includes('not available on this app')) {
        errText = '❌ Este vídeo não está disponível. Tente outro link ou pesquise pelo nome da música.';
      } else if (err.message.includes('Private video')) {
        errText = '❌ Este vídeo é privado.';
      } else if (err.message.includes('age-restricted') || err.message.includes('age restricted')) {
        errText = '❌ Este vídeo tem restrição de idade e não pode ser reproduzido.';
      } else if (err.message.includes('No video formats found')) {
        errText = '❌ Nenhum formato de áudio disponível para este vídeo.';
      }

      return interaction.editReply({
        embeds: [errEmbed(errText + '\n\nDica: Tente pesquisar pelo **nome da música** em vez do link.')],
      });
    }

    const session = await createMusicSession({ guild: interaction.guild, channelId: voiceChannel.id });
    if (!session) {
      return interaction.editReply({
        embeds: [errEmbed('❌ Falha ao conectar ao canal de voz. Tente novamente.')],
      });
    }

    const ok = await session.play(info.url, info).catch(err => {
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

  async executePrefix(message) {
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x9B4FD6).setDescription('🎵 Use `/musica tocar <link>` para tocar músicas.\nEste comando requer o menu interativo do slash command.')],
    });
  },
};

function errEmbed(msg) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(msg);
}
