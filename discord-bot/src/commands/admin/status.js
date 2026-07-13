import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActivityType,
} from 'discord.js';

// Mapa de tipos legíveis → ActivityType
const TIPOS = {
  streaming:   { type: ActivityType.Streaming,  label: '🔴 Transmitindo' },
  jogando:     { type: ActivityType.Playing,    label: '🎮 Jogando' },
  assistindo:  { type: ActivityType.Watching,   label: '📺 Assistindo' },
  ouvindo:     { type: ActivityType.Listening,  label: '🎧 Ouvindo' },
  competindo:  { type: ActivityType.Competing,  label: '🏆 Competindo' },
  personalizado:{ type: ActivityType.Custom,    label: '✨ Personalizado' },
};

// Referência ao intervalo de rotação ativo (por client)
const KEY = Symbol('statusInterval');

function aplicarStatus(client, tipo, mensagem, url, emoji) {
  const cfg = TIPOS[tipo] ?? TIPOS.jogando;

  const activity = { name: mensagem, type: cfg.type };
  if (tipo === 'streaming' && url) activity.url = url;
  if (tipo === 'personalizado' && emoji) activity.state = mensagem, activity.name = emoji + ' ' + mensagem;

  client.user.setPresence({ status: 'online', activities: [activity] });
}

function pararRotacao(client) {
  if (client[KEY]) {
    clearInterval(client[KEY]);
    client[KEY] = null;
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Gerencia o status/presença do bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── Subcomando: definir ────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('definir')
        .setDescription('Define um status fixo para o bot')
        .addStringOption(o =>
          o.setName('tipo')
            .setDescription('Tipo de atividade')
            .setRequired(true)
            .addChoices(
              { name: '🔴 Transmitindo',   value: 'streaming' },
              { name: '🎮 Jogando',         value: 'jogando' },
              { name: '📺 Assistindo',      value: 'assistindo' },
              { name: '🎧 Ouvindo',         value: 'ouvindo' },
              { name: '🏆 Competindo',      value: 'competindo' },
              { name: '✨ Personalizado',   value: 'personalizado' },
            ))
        .addStringOption(o =>
          o.setName('mensagem')
            .setDescription('Texto do status (ex: discord.gg/savagge)')
            .setRequired(true))
        .addStringOption(o =>
          o.setName('url')
            .setDescription('URL da stream (obrigatório para Transmitindo)')
            .setRequired(false))
        .addStringOption(o =>
          o.setName('emoji')
            .setDescription('Emoji para tipo Personalizado (ex: 🔥)')
            .setRequired(false)))

    // ── Subcomando: automatico ─────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('automatico')
        .setDescription('Ativa rotação automática de status (separe as mensagens com |)')
        .addStringOption(o =>
          o.setName('mensagens')
            .setDescription('Mensagens separadas por | — ex: discord.gg/savagge | savage #700 | em breve...')
            .setRequired(true))
        .addStringOption(o =>
          o.setName('tipo')
            .setDescription('Tipo de atividade para todas as mensagens')
            .setRequired(true)
            .addChoices(
              { name: '🔴 Transmitindo',   value: 'streaming' },
              { name: '🎮 Jogando',         value: 'jogando' },
              { name: '📺 Assistindo',      value: 'assistindo' },
              { name: '🎧 Ouvindo',         value: 'ouvindo' },
              { name: '🏆 Competindo',      value: 'competindo' },
              { name: '✨ Personalizado',   value: 'personalizado' },
            ))
        .addIntegerOption(o =>
          o.setName('intervalo')
            .setDescription('Segundos entre cada troca (mínimo 10, padrão 30)')
            .setRequired(false)
            .setMinValue(10)))

    // ── Subcomando: parar ──────────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('parar')
        .setDescription('Para a rotação automática e restaura o status padrão')),

  name: 'status',

  async execute(interaction, client) {
    // Só o dono do bot (ou admins do servidor)
    const sub = interaction.options.getSubcommand();

    // ── /status definir ────────────────────────────────────────────────────
    if (sub === 'definir') {
      const tipo      = interaction.options.getString('tipo');
      const mensagem  = interaction.options.getString('mensagem');
      const url       = interaction.options.getString('url') ?? 'https://www.twitch.tv/savagge';
      const emoji     = interaction.options.getString('emoji') ?? '';

      pararRotacao(client);
      aplicarStatus(client, tipo, mensagem, url, emoji);

      const cfg = TIPOS[tipo] ?? TIPOS.jogando;
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x9B4FD6)
            .setTitle('✅ Status atualizado')
            .addFields(
              { name: 'Tipo',     value: cfg.label,    inline: true },
              { name: 'Mensagem', value: `\`${mensagem}\``, inline: true },
              url && tipo === 'streaming' ? { name: 'URL', value: url, inline: true } : { name: '\u200b', value: '\u200b', inline: true },
            )
            .setFooter({ text: 'Rotação automática: desativada' }),
        ],
        flags: 64,
      });
    }

    // ── /status automatico ─────────────────────────────────────────────────
    if (sub === 'automatico') {
      const raw       = interaction.options.getString('mensagens');
      const tipo      = interaction.options.getString('tipo');
      const intervalo = (interaction.options.getInteger('intervalo') ?? 30) * 1_000;

      const msgs = raw.split('|').map(m => m.trim()).filter(Boolean);
      if (msgs.length < 2) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Coloque pelo menos **2 mensagens** separadas por `|`.')],
          flags: 64,
        });
      }

      pararRotacao(client);

      let idx = 0;
      const trocar = () => {
        aplicarStatus(client, tipo, msgs[idx], 'https://www.twitch.tv/savagge', '');
        idx = (idx + 1) % msgs.length;
      };
      trocar(); // aplica imediatamente
      client[KEY] = setInterval(trocar, intervalo);

      const cfg = TIPOS[tipo] ?? TIPOS.jogando;
      const lista = msgs.map((m, i) => `\`${i + 1}.\` ${m}`).join('\n');

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔄 Rotação automática ativada')
            .addFields(
              { name: 'Tipo',      value: cfg.label,                       inline: true },
              { name: 'Intervalo', value: `${intervalo / 1000}s`,          inline: true },
              { name: 'Mensagens', value: lista },
            ),
        ],
        flags: 64,
      });
    }

    // ── /status parar ──────────────────────────────────────────────────────
    if (sub === 'parar') {
      pararRotacao(client);

      // Restaura o padrão
      client.user.setPresence({
        status: 'online',
        activities: [{
          name: 'discord.gg/savagge',
          type: ActivityType.Streaming,
          url:  'https://www.twitch.tv/savagge',
        }],
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription('⏹️ Rotação parada. Status padrão restaurado (`discord.gg/savagge`).'),
        ],
        flags: 64,
      });
    }
  },
};
