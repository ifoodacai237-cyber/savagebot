import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActivityType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

// URL padrão do streaming
const STREAM_URL = 'https://www.twitch.tv/savagge';

// Intervalo de rotação
const KEY = Symbol('statusInterval');

/** Define a presença como Streaming — único tipo que permanece visível em bots */
export function setStreamingPresence(client, texto) {
  client.user.setPresence({
    status: 'online',
    activities: [{
      type: ActivityType.Streaming,
      name: texto,
      url:  STREAM_URL,
    }],
  });
}

export function pararRotacao(client) {
  if (client[KEY]) {
    clearInterval(client[KEY]);
    client[KEY] = null;
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Gerencia o status (Transmitindo) do bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── definir: modal com emoji + texto ──────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('definir')
        .setDescription('Abre editor — emoji + mensagem que aparece em Transmitindo'))

    // ── automatico: rotação de textos ─────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('automatico')
        .setDescription('Rotação automática (separe com |)')
        .addStringOption(o =>
          o.setName('textos')
            .setDescription('Ex: 💋 Minha riqueza|🌙 savage #700|🔥 discord.gg/savagge')
            .setRequired(true))
        .addIntegerOption(o =>
          o.setName('intervalo')
            .setDescription('Segundos entre cada troca (mínimo 10, padrão 30)')
            .setRequired(false)
            .setMinValue(10)))

    // ── parar ─────────────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('parar')
        .setDescription('Para rotação e restaura discord.gg/savagge')),

  name: 'status',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── /status definir → abre Modal ──────────────────────────────────────
    if (sub === 'definir') {
      const modal = new ModalBuilder()
        .setCustomId('status_modal')
        .setTitle('✨ Editar Status (Transmitindo)');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('status_texto')
            .setLabel('Emoji + Mensagem (aparece em Transmitindo)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('💋 Minha riqueza, yas.')
            .setRequired(true)
            .setMaxLength(128),
        ),
      );

      return interaction.showModal(modal);
    }

    // ── /status automatico ────────────────────────────────────────────────
    if (sub === 'automatico') {
      const raw       = interaction.options.getString('textos');
      const intervalo = (interaction.options.getInteger('intervalo') ?? 30) * 1_000;

      const textos = raw.split('|').map(t => t.trim()).filter(Boolean);
      if (textos.length < 2) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245)
            .setDescription('❌ Coloque pelo menos **2 textos** separados por `|`.')],
          flags: 64,
        });
      }

      pararRotacao(client);

      let idx = 0;
      const trocar = () => {
        setStreamingPresence(client, textos[idx]);
        idx = (idx + 1) % textos.length;
      };
      trocar();
      client[KEY] = setInterval(trocar, intervalo);

      const lista = textos.map((t, i) => `\`${i + 1}.\` ${t}`).join('\n');
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔄 Rotação automática ativada')
            .addFields(
              { name: 'Intervalo', value: `${intervalo / 1000}s`, inline: true },
              { name: 'Textos', value: lista },
            ),
        ],
        flags: 64,
      });
    }

    // ── /status parar ─────────────────────────────────────────────────────
    if (sub === 'parar') {
      pararRotacao(client);
      setStreamingPresence(client, 'discord.gg/savagge');
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFEE75C)
          .setDescription('⏹️ Rotação parada. Voltou para `Transmitindo discord.gg/savagge`.')],
        flags: 64,
      });
    }
  },
};
