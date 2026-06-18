import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';

// ─── Definição das Ações (nomes em inglês + aliases curtos) ──────────────────

export const ACTIONS = {
  kiss: {
    aliases:   ['k', 'bj', 'beijo', 'beijar'],
    emoji:     '💋',
    gif:       'kiss',
    color:     0xFF6B9D,
    desc:      '💋 Dá um beijo em alguém',
    msg:       (a, b) => `**${a}** beija **${b}** 💋`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'beijo' : 'beijos'}.*`,
    btnLabel:  'Beijar de volta',
    retribuir: 'kiss',
  },
  hug: {
    aliases:   ['h', 'abraco', 'abracar'],
    emoji:     '🤗',
    gif:       'hug',
    color:     0xFFB347,
    desc:      '🤗 Abraça alguém',
    msg:       (a, b) => `**${a}** abraça **${b}** 🤗`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'abraço' : 'abraços'}.*`,
    btnLabel:  'Abraçar de volta',
    retribuir: 'hug',
  },
  slap: {
    aliases:   ['s', 'tapa', 'esbofetear'],
    emoji:     '👋',
    gif:       'slap',
    color:     0xFF4444,
    desc:      '👋 Dá um tapa em alguém',
    msg:       (a, b) => `**${a}** esbofeteia **${b}** 👋`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'tapa' : 'tapas'}.*`,
    btnLabel:  'Dar tapa de volta',
    retribuir: 'slap',
  },
  punch: {
    aliases:   ['p', 'soco', 'murro'],
    emoji:     '👊',
    gif:       'punch',
    color:     0xFF6600,
    desc:      '👊 Dá um soco em alguém',
    msg:       (a, b) => `**${a}** soca **${b}** 👊`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'soco' : 'socos'}.*`,
    btnLabel:  'Dar soco de volta',
    retribuir: 'punch',
  },
  poke: {
    aliases:   ['pk', 'cutucar', 'cutuca'],
    emoji:     '👉',
    gif:       'poke',
    color:     0x7289DA,
    desc:      '👉 Cutuca alguém',
    msg:       (a, b) => `**${a}** cutuca **${b}** 👉`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'cutucada' : 'cutucadas'}.*`,
    btnLabel:  'Cutucar de volta',
    retribuir: 'poke',
  },
  bite: {
    aliases:   ['b', 'morder', 'morde'],
    emoji:     '😬',
    gif:       'bite',
    color:     0xAA0000,
    desc:      '😬 Morde alguém',
    msg:       (a, b) => `**${a}** morde **${b}** 😬`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'mordida' : 'mordidas'}.*`,
    btnLabel:  'Morder de volta',
    retribuir: 'bite',
  },
  pat: {
    aliases:   ['pa', 'carinho'],
    emoji:     '🥰',
    gif:       'pat',
    color:     0xFF69B4,
    desc:      '🥰 Faz carinho em alguém',
    msg:       (a, b) => `**${a}** faz carinho em **${b}** 🥰`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'carinho' : 'carinhos'}.*`,
    btnLabel:  'Dar carinho de volta',
    retribuir: 'pat',
  },
  push: {
    aliases:   ['pu', 'empurrar', 'empurra'],
    emoji:     '😤',
    gif:       'kick',
    color:     0x888888,
    desc:      '😤 Empurra alguém',
    msg:       (a, b) => `**${a}** empurra **${b}** 😤`,
    counter:   (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'empurrão' : 'empurrões'}.*`,
    btnLabel:  'Empurrar de volta',
    retribuir: 'push',
  },
};

// ─── Busca GIF animê (nekos.best) ─────────────────────────────────────────────

export async function fetchGif(category) {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${category}?amount=1`, {
      headers: { 'User-Agent': 'SlowBot/1.0', 'Accept': 'application/json' },
    });
    if (!res.ok) return { url: null, anime: null };
    const data   = await res.json();
    const result = data.results?.[0];
    return { url: result?.url ?? null, anime: result?.anime_name ?? null };
  } catch {
    return { url: null, anime: null };
  }
}

// ─── Incrementa contagem (direcional: from → to) ──────────────────────────────

async function incrementCount(type, fromId, toId, guildId) {
  const row = await prisma.interaction.upsert({
    where:  { type_fromId_toId_guildId: { type, fromId, toId, guildId } },
    update: { count: { increment: 1 } },
    create: { type, fromId, toId, guildId, count: 1 },
  });
  return row.count;
}

// ─── Constrói embed + botão de retribuição ────────────────────────────────────

export async function buildInteractionEmbed(type, fromUser, toUser, guildId) {
  const action   = ACTIONS[type];
  const fromName = fromUser.displayName ?? fromUser.username ?? 'Alguém';
  const toName   = toUser.displayName   ?? toUser.username   ?? 'Alguém';

  const [gifData, count] = await Promise.all([
    fetchGif(action.gif),
    incrementCount(type, fromUser.id, toUser.id, guildId),
  ]);

  const embed = new EmbedBuilder()
    .setColor(action.color)
    .setDescription(`${action.msg(fromName, toName)}\n${action.counter(toName, count)}`);

  if (gifData.url)   embed.setImage(gifData.url);
  if (gifData.anime) embed.setFooter({ text: `Anime: ${gifData.anime}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`int_r_${type}_${fromUser.id}`)
      .setEmoji(ACTIONS[type].emoji)
      .setLabel(action.btnLabel)
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

// ─── Handler genérico ─────────────────────────────────────────────────────────

async function runAction(type, actor, target, guildId, replyFn) {
  const actorId  = actor.id ?? actor.user?.id;
  const targetId = target.id ?? target.user?.id;

  if (target.bot ?? target.user?.bot)
    return replyFn({ embeds: [errorEmbed('Você não pode interagir com um bot.')], ephemeral: true });

  if (targetId === actorId)
    return replyFn({ embeds: [errorEmbed('Você não pode interagir consigo mesmo.')], ephemeral: true });

  const payload = await buildInteractionEmbed(type, actor, target, guildId);
  return replyFn(payload);
}

// ─── Fábrica de comandos ──────────────────────────────────────────────────────

function makeCommand(type) {
  const action = ACTIONS[type];
  return {
    data: new SlashCommandBuilder()
      .setName(type)
      .setDescription(action.desc)
      .addUserOption(o => o.setName('usuario').setDescription('Usuário alvo').setRequired(true)),
    name:    type,
    aliases: action.aliases,

    async execute(interaction) {
      await interaction.deferReply();
      const target = interaction.options.getUser('usuario');
      const member = await interaction.guild.members.fetch(target.id).catch(() => target);
      await runAction(
        type,
        interaction.member ?? interaction.user,
        member,
        interaction.guildId,
        opts => interaction.editReply(opts),
      );
    },

    async executePrefix(message, args) {
      const target = message.mentions.users.first();
      if (!target) {
        return message.reply({
          embeds: [errorEmbed(`Mencione o usuário. Ex: \`fallen ${type} @user\` ou \`fallen ${action.aliases[0]} @user\``)],
        });
      }
      const member = await message.guild.members.fetch(target.id).catch(() => target);
      await runAction(
        type,
        message.member ?? message.author,
        member,
        message.guildId,
        opts => message.reply(opts),
      );
    },
  };
}

export default Object.keys(ACTIONS).map(makeCommand);
