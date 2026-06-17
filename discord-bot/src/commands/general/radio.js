import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} from 'discord.js';
import { PLAYLISTS, radioSessions } from '../../utils/radioManager.js';

const RADIO_COLOR = 0x9B4FD6;

export function buildControlPanel(session) {
  const track    = session.currentTrack;
  const playlist = session.playlist;

  const embed = new EmbedBuilder()
    .setColor(playlist.color)
    .setTitle(`${playlist.emoji} Rádio — ${playlist.name}`)
    .setDescription(
      track
        ? `🎵 **${track.title}**\n⏱️ Duração: \`${track.duration}\``
        : '🎵 Carregando próxima...'
    )
    .addFields(
      { name: '📻 Status', value: session.paused ? '⏸️ Pausado' : '▶️ Tocando', inline: true },
      { name: '🔁 Modo',   value: 'Loop Contínuo',                                inline: true },
    )
    .setFooter({ text: '🔒 Apenas administradores podem usar os controles' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('radio_toggle')
      .setLabel(session.paused ? 'Continuar' : 'Pausar')
      .setEmoji(session.paused ? '▶️' : '⏸️')
      .setStyle(session.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('radio_skip')
      .setLabel('Próxima')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('radio_stop')
      .setLabel('Parar')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

export default {
  data: new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Sistema de rádio — toca uma playlist em loop no canal de voz')
    .addSubcommand(sub =>
      sub
        .setName('entrar')
        .setDescription('Entra em um canal de voz e começa a tocar uma playlist em loop')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de voz onde o bot vai entrar (obrigatório)')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('sair').setDescription('Para o rádio e sai do canal de voz')
    )
    .addSubcommand(sub =>
      sub.setName('painel').setDescription('Reenvia o painel de controle do rádio no canal')
    ),
  name: 'radio',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    const notAdmin = !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (sub === 'sair') {
      if (notAdmin) return interaction.reply({ embeds: [errEmbed('❌ Apenas administradores podem parar o rádio.')], ephemeral: true });
      const session = radioSessions.get(interaction.guildId);
      if (!session) return interaction.reply({ embeds: [errEmbed('❌ O rádio não está ativo.')], ephemeral: true });
      session.stop();
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(RADIO_COLOR).setDescription('⏹️ Rádio encerrado.')], ephemeral: true });
    }

    if (sub === 'painel') {
      if (notAdmin) return interaction.reply({ embeds: [errEmbed('❌ Apenas administradores podem usar este comando.')], ephemeral: true });
      const session = radioSessions.get(interaction.guildId);
      if (!session) return interaction.reply({ embeds: [errEmbed('❌ O rádio não está ativo.')], ephemeral: true });
      return interaction.reply(buildControlPanel(session));
    }

    if (sub === 'entrar') {
      if (notAdmin) return interaction.reply({ embeds: [errEmbed('❌ Apenas administradores podem iniciar o rádio.')], ephemeral: true });

      const voiceChannel = interaction.options.getChannel('canal');

      const playlists = Object.entries(PLAYLISTS);
      const chunkSize = 10;
      const rows      = [];

      for (let i = 0; i < playlists.length; i += chunkSize) {
        const chunk = playlists.slice(i, i + chunkSize);
        const sel = new StringSelectMenuBuilder()
          .setCustomId(`radio_playlist_sel:${voiceChannel.id}`)
          .setPlaceholder('Escolha uma estação...')
          .addOptions(
            chunk.map(([key, p]) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${p.emoji} ${p.name}`)
                .setValue(key)
                .setDescription(`Toca músicas de ${p.name} em loop`)
            )
          );
        rows.push(new ActionRowBuilder().addComponents(sel));
      }

      const genreList = playlists.map(([, p]) => `${p.emoji} **${p.name}**`).join('\n');

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RADIO_COLOR)
            .setTitle('📻 Qual estação deseja tocar?')
            .setDescription(
              `O bot vai entrar em **${voiceChannel.name}** e tocar em loop.\n\n${genreList}`
            ),
        ],
        components: rows,
        ephemeral: true,
      });
    }
  },
};

function errEmbed(msg) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(msg);
}
