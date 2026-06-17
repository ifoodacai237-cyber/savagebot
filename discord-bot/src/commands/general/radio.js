import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { PLAYLISTS, radioSessions, createRadioSession } from '../../utils/radioManager.js';

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
        : '🎵 Carregando...'
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
      sub.setName('entrar').setDescription('Entra no canal de voz e começa a tocar uma playlist')
    )
    .addSubcommand(sub =>
      sub.setName('sair').setDescription('Para o rádio e sai do canal de voz')
    )
    .addSubcommand(sub =>
      sub.setName('painel').setDescription('Reenvia o painel de controle do rádio')
    ),
  name: 'radio',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'sair') {
      const session = radioSessions.get(interaction.guildId);
      if (!session) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ O rádio não está ativo.')],
          ephemeral: true,
        });
      }
      session.stop();
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(RADIO_COLOR).setDescription('⏹️ Rádio encerrado. Até mais!')],
        ephemeral: true,
      });
    }

    if (sub === 'painel') {
      const session = radioSessions.get(interaction.guildId);
      if (!session) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ O rádio não está ativo.')],
          ephemeral: true,
        });
      }
      return interaction.reply(buildControlPanel(session));
    }

    if (sub === 'entrar') {
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
      if (!isAdmin) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Apenas administradores podem iniciar o rádio.')],
          ephemeral: true,
        });
      }

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Você precisa estar em um canal de voz para iniciar o rádio.')],
          ephemeral: true,
        });
      }

      const sel = new StringSelectMenuBuilder()
        .setCustomId('radio_playlist_sel')
        .setPlaceholder('Escolha uma estação...')
        .addOptions(
          Object.entries(PLAYLISTS).map(([key, p]) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`${p.emoji} ${p.name}`)
              .setValue(key)
              .setDescription(`Toca músicas de ${p.name} em loop`)
          )
        );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RADIO_COLOR)
            .setTitle('📻 Qual estação deseja tocar?')
            .setDescription('Selecione a playlist abaixo. O bot vai entrar no seu canal e tocar em loop.')
            .addFields(
              Object.entries(PLAYLISTS).map(([, p]) => ({
                name: `${p.emoji} ${p.name}`,
                value: '\u200b',
                inline: true,
              }))
            ),
        ],
        components: [new ActionRowBuilder().addComponents(sel)],
        ephemeral: true,
      });
    }
  },
};
