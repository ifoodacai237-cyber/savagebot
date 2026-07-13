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

// ── Streaming fixo — SEMPRE fica na presença do bot ──────────────────────────
export const STREAMING_FIXO = {
  name: 'discord.gg/savagge',
  type: ActivityType.Streaming,
  url:  'https://www.twitch.tv/savagge',
};

// Referência ao intervalo de rotação ativo
const KEY = Symbol('statusInterval');

/**
 * Aplica presença: streaming fixo embaixo + custom status em cima.
 * O emoji vai embutido na string state (forma que funciona de verdade em bots).
 */
export function aplicarCustomStatus(client, emoji, mensagem) {
  const state = emoji ? `${emoji} ${mensagem}` : mensagem;
  client.user.setPresence({
    status: 'online',
    activities: [
      // streaming PRIMEIRO → Discord mantém ele visível
      STREAMING_FIXO,
      { type: ActivityType.Custom, name: 'Custom Status', state },
    ],
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
    .setDescription('Gerencia o status personalizado do bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── definir: abre modal igual ao editor de status do Discord ──────────
    .addSubcommand(sub =>
      sub.setName('definir')
        .setDescription('Abre o editor de status — emoji + mensagem'))

    // ── automatico: rotação ───────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('automatico')
        .setDescription('Rotação automática de status (separe com |)')
        .addStringOption(o =>
          o.setName('mensagens')
            .setDescription('Ex: 💋 Minha riqueza, yas.|🌙 savage #700|🔥 discord.gg/savagge')
            .setRequired(true))
        .addIntegerOption(o =>
          o.setName('intervalo')
            .setDescription('Segundos entre cada troca (mínimo 10, padrão 30)')
            .setRequired(false)
            .setMinValue(10)))

    // ── parar ─────────────────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('parar')
        .setDescription('Para a rotação e restaura só o Transmitindo padrão')),

  name: 'status',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── /status definir → abre Modal ──────────────────────────────────────
    if (sub === 'definir') {
      const modal = new ModalBuilder()
        .setCustomId('status_modal')
        .setTitle('✨ Status Personalizado');

      const emojiInput = new TextInputBuilder()
        .setCustomId('status_emoji')
        .setLabel('Emoji (opcional — cole um emoji aqui)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('💋')
        .setRequired(false)
        .setMaxLength(8);

      const msgInput = new TextInputBuilder()
        .setCustomId('status_mensagem')
        .setLabel('Mensagem')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Minha riqueza, yas.')
        .setRequired(true)
        .setMaxLength(128);

      modal.addComponents(
        new ActionRowBuilder().addComponents(emojiInput),
        new ActionRowBuilder().addComponents(msgInput),
      );

      return interaction.showModal(modal);
    }

    // ── /status automatico ────────────────────────────────────────────────
    if (sub === 'automatico') {
      const raw       = interaction.options.getString('mensagens');
      const intervalo = (interaction.options.getInteger('intervalo') ?? 30) * 1_000;

      const msgs = raw.split('|').map(m => m.trim()).filter(Boolean);
      if (msgs.length < 2) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245)
            .setDescription('❌ Coloque pelo menos **2 mensagens** separadas por `|`.')],
          flags: 64,
        });
      }

      pararRotacao(client);

      let idx = 0;
      const trocar = () => {
        // Cada mensagem pode já vir com emoji na frente — aplica direto
        const txt = msgs[idx];
        client.user.setPresence({
          status: 'online',
          activities: [
            STREAMING_FIXO,
            { type: ActivityType.Custom, name: 'Custom Status', state: txt },
          ],
        });
        idx = (idx + 1) % msgs.length;
      };
      trocar();
      client[KEY] = setInterval(trocar, intervalo);

      const lista = msgs.map((m, i) => `\`${i + 1}.\` ${m}`).join('\n');
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔄 Rotação automática ativada')
            .addFields(
              { name: 'Intervalo', value: `${intervalo / 1000}s`, inline: true },
              { name: 'Mensagens', value: lista },
            ),
        ],
        flags: 64,
      });
    }

    // ── /status parar ─────────────────────────────────────────────────────
    if (sub === 'parar') {
      pararRotacao(client);
      client.user.setPresence({ status: 'online', activities: [STREAMING_FIXO] });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription('⏹️ Rotação parada. Voltou para `Transmitindo discord.gg/savagge`.'),
        ],
        flags: 64,
      });
    }
  },
};
