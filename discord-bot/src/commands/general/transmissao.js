import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import {
  getStreamTrackInfo,
  createStreamSession,
  streamSessions,
  resolveStreamQuery,
} from '../../utils/streamManager.js';

const STREAM_COLOR = 0xFF6B35;

const PLATFORM_ICONS = {
  youtube:    '▶️ YouTube',
  soundcloud: '🟠 SoundCloud',
  spotify:    '💚 Spotify',
  direct:     '🔗 Link direto',
  default:    '🎬 Transmissão',
};

export function buildStreamPanel(session) {
  const info          = session.trackInfo;
  const platformLabel = PLATFORM_ICONS[info?.platform] ?? PLATFORM_ICONS.default;
  const title         = info?.title    ?? 'Desconhecido';
  const uploader      = info?.uploader ?? 'Desconhecido';
  const duration      = info?.duration ?? '—';

  const embed = new EmbedBuilder()
    .setColor(STREAM_COLOR)
    .setTitle('🎬 Transmitindo Agora')
    .setDescription(`**${title}**`)
    .addFields(
      { name: '👤 Canal',    value: uploader,                                             inline: true },
      { name: '⏱️ Duração',  value: `\`${duration}\``,                                    inline: true },
      { name: '📢 Status',   value: session.paused ? '⏸️ Pausado' : '▶️ Transmitindo',    inline: true },
      { name: '🔗 Fonte',    value: platformLabel,                                        inline: true },
    )
    .setFooter({ text: '🎌 Sistema de Transmissão — Animes · Filmes · Desenhos' })
    .setTimestamp();

  if (info?.thumbnail) embed.setThumbnail(info.thumbnail);

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
    .setDescription('Entra no canal de voz e transmite áudio de animes, filmes, desenhos etc.')
    .addSubcommand(sub =>
      sub
        .setName('tocar')
        .setDescription('Inicia a transmissão no canal de voz')
        .addStringOption(opt =>
          opt
            .setName('conteudo')
            .setDescription('Nome do anime/filme/desenho ou link do YouTube')
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de voz (deixe vazio para usar o seu canal atual)')
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

    // ── PARAR ──────────────────────────────────────────────────────────────────
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

    // ── PAINEL ─────────────────────────────────────────────────────────────────
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

    // ── TOCAR ──────────────────────────────────────────────────────────────────
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

    const { isSearch } = resolveStreamQuery(conteudo);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(STREAM_COLOR)
          .setDescription(
            isSearch
              ? `🔍 Pesquisando no YouTube: **"${conteudo}"**...`
              : `⏳ Carregando conteúdo...`
          ),
      ],
    });

    // Busca info via yt-dlp
    let info;
    try {
      info = await getStreamTrackInfo(conteudo);
    } catch (err) {
      console.error('[TRANSMISSAO] getStreamTrackInfo falhou:', err.message);
      return interaction.editReply({
        embeds: [errEmbed(
          `❌ ${err.message}\n\n💡 **Dica:** Use o nome do anime/episódio como pesquisa, ex:\n\`naruto abertura 1\`, \`attack on titan ost\`, \`studio ghibli music\``
        )],
      });
    }

    // Conecta ao canal de voz
    const session = await createStreamSession({ guild: interaction.guild, channelId: voiceChannel.id });
    if (!session) {
      return interaction.editReply({
        embeds: [errEmbed('❌ Falha ao conectar ao canal de voz. Tente novamente.')],
      });
    }

    // Inicia o stream
    const ok = await session.play(info.url, info).catch(err => {
      console.error('[TRANSMISSAO] play() falhou:', err.message);
      return false;
    });

    if (!ok) {
      session.stop();
      return interaction.editReply({
        embeds: [errEmbed('❌ Não foi possível transmitir esse conteúdo. Tente outro link ou pesquisa.')],
      });
    }

    const panel = buildStreamPanel(session);
    const msg   = await interaction.editReply(panel);
    session.controlMessage = { channelId: msg.channelId, messageId: msg.id };
  },

  async executePrefix(message) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(STREAM_COLOR)
          .setTitle('🎬 Sistema de Transmissão')
          .setDescription(
            'Use os comandos abaixo:\n\n' +
            '`/transmissao tocar <nome ou link>` — Inicia a transmissão\n' +
            '`/transmissao parar` — Para a transmissão\n' +
            '`/transmissao painel` — Reenvia o painel\n\n' +
            '**Exemplos:**\n' +
            '• `/transmissao tocar naruto abertura 1`\n' +
            '• `/transmissao tocar attack on titan ost`\n' +
            '• `/transmissao tocar https://youtube.com/...`'
          ),
      ],
    });
  },
};

function errEmbed(msg) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(msg);
}
