import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
} from '@discordjs/voice';
import { baseEmbed, errorEmbed, Colors } from '../../utils/embed.js';
import { radioSessions } from '../../utils/radioManager.js';

async function setupConnection(client, guild, channelId) {
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return null;

  // Para qualquer sessão de rádio ativa antes de entrar
  const radioSess = radioSessions.get(guild.id);
  if (radioSess) {
    try { radioSess.stop(); } catch {}
    await new Promise(r => setTimeout(r, 300));
  }

  // Destrói qualquer conexão de voz existente
  const anyConn = getVoiceConnection(guild.id);
  if (anyConn) {
    try { anyConn.destroy(); } catch {}
    await new Promise(r => setTimeout(r, 300));
  }

  const connection = joinVoiceChannel({
    channelId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true,
  });

  client.voiceConns.set(guild.id, { connection, channelId });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      try { connection.destroy(); } catch {}
      setTimeout(() => setupConnection(client, guild, channelId), 8_000);
    }
  });

  connection.on('error', err => {
    console.error(`[VOICE] Erro na guild ${guild.id}:`, err.message);
  });

  return connection;
}

export default {
  data: new SlashCommandBuilder()
    .setName('call')
    .setDescription('Faz o bot entrar no seu canal de voz e ficar 24/7')
    .addSubcommand(sub =>
      sub.setName('entrar').setDescription('Entra no canal de voz')
    )
    .addSubcommand(sub =>
      sub.setName('sair').setDescription('Sai do canal de voz')
    ),
  name: 'call',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'sair') {
      const entry = interaction.client.voiceConns.get(interaction.guildId);
      if (!entry) return interaction.reply({ embeds: [errorEmbed('Não estou em nenhum canal de voz.')], ephemeral: true });
      try { entry.connection.destroy(); } catch {}
      interaction.client.voiceConns.delete(interaction.guildId);
      return interaction.reply({ embeds: [baseEmbed(Colors.SUCCESS).setDescription('👋 Saí do canal de voz.')], ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ embeds: [errorEmbed('Você precisa estar em um canal de voz.')], ephemeral: true });
    }

    const existing = interaction.client.voiceConns.get(interaction.guildId);
    if (existing) {
      try { existing.connection.destroy(); } catch {}
    }

    await setupConnection(interaction.client, interaction.guild, voiceChannel.id);

    return interaction.reply({
      embeds: [
        baseEmbed(Colors.SUCCESS)
          .setTitle('📞 Call 24/7 Ativada')
          .setDescription(`Entrei em **${voiceChannel.name}** e vou ficar online com reconexão automática.`)
          .setFooter({ text: 'Use /call sair para remover' }),
      ],
    });
  },

  async executePrefix(message, args, client) {
    const sub = args[0]?.toLowerCase();

    if (sub === 'sair') {
      const entry = client.voiceConns.get(message.guildId);
      if (!entry) return message.reply({ embeds: [errorEmbed('Não estou em nenhum canal de voz.')] });
      try { entry.connection.destroy(); } catch {}
      client.voiceConns.delete(message.guildId);
      return message.reply({ embeds: [baseEmbed(Colors.SUCCESS).setDescription('👋 Saí do canal de voz.')] });
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [errorEmbed('Você precisa estar em um canal de voz.')] });

    const existing = client.voiceConns.get(message.guildId);
    if (existing) { try { existing.connection.destroy(); } catch {} }

    await setupConnection(client, message.guild, voiceChannel.id);

    return message.reply({
      embeds: [
        baseEmbed(Colors.SUCCESS)
          .setTitle('📞 Call 24/7 Ativada')
          .setDescription(`Entrei em **${voiceChannel.name}** com reconexão automática.`),
      ],
    });
  },
};
