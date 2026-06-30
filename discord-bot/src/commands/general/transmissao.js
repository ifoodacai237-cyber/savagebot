import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { getStreamTrackInfo, createStreamSession, streamSessions, resolveStreamQuery } from '../../utils/streamManager.js';

const STREAM_COLOR = 0xFF6B35;

const PLATFORM_ICONS = {
  youtube:    '▶️ YouTube',
  soundcloud: '🟠 SoundCloud',
  spotify:    '💚 Spotify → SoundCloud',
  default:    '🎬 Transmissão',
};

export function buildStreamPanel(session) {
  const info = session.trackInfo;
  const platformLabel = PLATFORM_ICONS[info.platform] ?? PLATFORM_ICONS.default;

  const embed = new EmbedBuilder()
    .setColor(STREAM_COLOR)
    .setTitle('🎬 Transmitindo Agora')
    .setDescription(`**${info.title}**`)
    .addFields(
      { name: '👤 Canal / Artista', value: info.uploader || 'Desconhecido',                                inline: true },
      { name: '⏱️ Duração',        value: `\`${info.duration}\``,                                          inline: true },
      { name: '📢 Status',         value: session.paused ? '⏸️ Pausado' : '▶️ Transmitindo',               inline: true },
      { name: '🔗 Fonte',          value: platformLabel,                                                   inline: true },
    )
    .setFooter({ text: '🎌 Sistema de Transmissão — Animes, Filmes, Desenhos e mais' })
    .setTimestamp();

  if (info.thumbnail) embed.setThumbnail(info.thumbnail);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('stream_toggle')
      .setLabel(session.paused ? 'Continuar' : 'Pausar')
      .setEmoji(session.paused ? '▶️' : '⏸️')
      .setStyle(session.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('stream_stop')
      .setLabel('Parar')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

export default {
  data: new SlashCommandBuilder()
    .setName('transmissao')
    .setDescription('Sistema de transmissão — entra no canal de voz e transmite áudio de animes, filmes, desenhos etc.')
    .addSubcommand(sub =>
      sub
        .setName('tocar')
        .setDescription('Entra no canal de voz e começa a transmissão')
        .addStringOption(opt =>
          opt
            .setName('conteudo')
            .setDescription('Link do YouTube/SoundCloud/Spotify ou nome do anime/filme/desenho para pesquisar')
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de voz (deixe vazio para entrar no seu canal atual)')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('parar').setDescription('Para a transmissão e sai do canal de voz')
    )
    .addSubcommand(sub =>
      sub.setName('painel').setDescription('Reenvia o painel de controle da transmissão')
    ),
  name: 'transmissao',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'parar') {
      const session = streamSessions.get(interaction.guildId);
      if (!session) {
        return interaction.reply({
          embeds: [errEmbed('❌ Não há nenhuma transmissão ativa.')],
          flags: 64,
        });
      }
      session.stop();
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(STREAM_COLOR)
            .setTitle('⏹️ Transmissão Encerrada')
            .setDescription('A transmissão foi parada.'),
        ],
        flags: 64,
      });
    }

    if (sub === 'painel') {
      const session = streamSessions.get(interaction.guildId);
      if (!session) {
        return interaction.reply({
          embeds: [errEmbed('❌ Não há nenhuma transmissão ativa.')],
          flags: 64,
        });
      }
      return interaction.reply(buildStreamPanel(session));
    }

    // ── TOCAR ─────────────────────────────────────────────────────────────────
    const conteudo = interaction.options.getString('conteudo');

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

    const { isSearch, platform } = resolveStreamQuery(conteudo);
    const buscandoMsg = isSearch
      ? `🔍 Pesquisando **"${conteudo}"**...`
      : platform === 'spotify'
        ? '💚 Convertendo link do Spotify...'
        : '⏳ Carregando conteúdo...';

    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(STREAM_COLOR).setDescription(buscandoMsg)],
    });

    let info;
    try {
      info = await getStreamTrackInfo(conteudo);
    } catch (err) {
      console.error('[TRANSMISSAO] getStreamTrackInfo falhou:', err.message);

      let errText = '❌ Não foi possível carregar esse conteúdo.';
      if (err.message.includes('not available on this app')) {
        errText = '❌ Este conteúdo não está disponível. Tente pesquisar pelo nome do anime/filme.';
      } else if (err.message.includes('Private video')) {
        errText = '❌ Este vídeo é privado.';
      } else if (err.message.includes('age-restricted') || err.message.includes('age restricted')) {
        errText = '❌ Este conteúdo tem restrição de idade.';
      }

      return interaction.editReply({
        embeds: [errEmbed(errText + '\n\n💡 **Dica:** Pesquise pelo nome do anime ou filme, ex: `naruto op 1` ou `spirited away soundtrack`')],
      });
    }

    const session = await createStreamSession({ guild: interaction.guild, channelId: voiceChannel.id });
    if (!session) {
      return interaction.editReply({
        embeds: [errEmbed('❌ Falha ao conectar ao canal de voz. Tente novamente.')],
      });
    }

    const ok = await session.play(info.url, info).catch(err => {
      console.error('[TRANSMISSAO] play() falhou:', err.message);
      return false;
    });

    if (!ok) {
      session.stop();
      return interaction.editReply({
        embeds: [errEmbed('❌ Não foi possível transmitir esse conteúdo. Tente outro link ou pesquise pelo nome.')],
      });
    }

    const panel = buildStreamPanel(session);
    const msg = await interaction.editReply(panel);
    session.controlMessage = { channelId: msg.channelId, messageId: msg.id };
  },

  async executePrefix(message) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(STREAM_COLOR)
          .setDescription('🎬 Use `/transmissao tocar <nome ou link>` para iniciar uma transmissão.\nExemplos:\n• `/transmissao tocar naruto op 1`\n• `/transmissao tocar link do youtube`'),
      ],
    });
  },
};

function errEmbed(msg) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(msg);
}
