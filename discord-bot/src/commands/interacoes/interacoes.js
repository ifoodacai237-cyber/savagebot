import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import prisma from '../../database/client.js';
import { errorEmbed } from '../../utils/embed.js';

export const ACTIONS = {
  kiss: {
    aliases:      ['k', 'bj', 'beijo', 'beijar'],
    emoji:        '💋',
    gif:          'kiss',
    color:        0xFF6B9D,
    desc:         '💋 Dá um beijo em alguém',
    msg:          (a, b) => `**${a}** beija **${b}** 💋`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'beijo' : 'beijos'}.*`,
    btnLabel:     'Beijar de volta',
    retMsg:       (a, b) => `**${a}** beija **${b}** de volta! 💋`,
    mutualVerb:   (n) => `se beijaram **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
  hug: {
    aliases:      ['h', 'abraco', 'abracar'],
    emoji:        '🤗',
    gif:          'hug',
    color:        0xFFB347,
    desc:         '🤗 Abraça alguém',
    msg:          (a, b) => `**${a}** abraça **${b}** 🤗`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'abraço' : 'abraços'}.*`,
    btnLabel:     'Abraçar de volta',
    retMsg:       (a, b) => `**${a}** abraça **${b}** de volta! 🤗`,
    mutualVerb:   (n) => `se abraçaram **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
  slap: {
    aliases:      ['s', 'tapa', 'esbofetear'],
    emoji:        '👋',
    gif:          'slap',
    color:        0xFF4444,
    desc:         '👋 Dá um tapa em alguém',
    msg:          (a, b) => `**${a}** esbofeteia **${b}** 👋`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'tapa' : 'tapas'}.*`,
    btnLabel:     'Dar tapa de volta',
    retMsg:       (a, b) => `**${a}** esbofeteia **${b}** de volta! 👋`,
    mutualVerb:   (n) => `se esbofetearam **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
  punch: {
    aliases:      ['p', 'soco', 'murro'],
    emoji:        '👊',
    gif:          'punch',
    color:        0xFF6600,
    desc:         '👊 Dá um soco em alguém',
    msg:          (a, b) => `**${a}** soca **${b}** 👊`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'soco' : 'socos'}.*`,
    btnLabel:     'Dar soco de volta',
    retMsg:       (a, b) => `**${a}** soca **${b}** de volta! 👊`,
    mutualVerb:   (n) => `se socaram **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
  poke: {
    aliases:      ['pk', 'cutucar', 'cutuca'],
    emoji:        '👉',
    gif:          'poke',
    color:        0x7289DA,
    desc:         '👉 Cutuca alguém',
    msg:          (a, b) => `**${a}** cutuca **${b}** 👉`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'cutucada' : 'cutucadas'}.*`,
    btnLabel:     'Cutucar de volta',
    retMsg:       (a, b) => `**${a}** cutuca **${b}** de volta! 👉`,
    mutualVerb:   (n) => `se cutucaram **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
  bite: {
    aliases:      ['b', 'morder', 'morde'],
    emoji:        '😬',
    gif:          'bite',
    color:        0xAA0000,
    desc:         '😬 Morde alguém',
    msg:          (a, b) => `**${a}** morde **${b}** 😬`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'mordida' : 'mordidas'}.*`,
    btnLabel:     'Morder de volta',
    retMsg:       (a, b) => `**${a}** morde **${b}** de volta! 😬`,
    mutualVerb:   (n) => `se mordem **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
  pat: {
    aliases:      ['pa', 'carinho'],
    emoji:        '🥰',
    gif:          'pat',
    color:        0xFF69B4,
    desc:         '🥰 Faz carinho em alguém',
    msg:          (a, b) => `**${a}** faz carinho em **${b}** 🥰`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'carinho' : 'carinhos'}.*`,
    btnLabel:     'Dar carinho de volta',
    retMsg:       (a, b) => `**${a}** faz carinho em **${b}** de volta! 🥰`,
    mutualVerb:   (n) => `se fizeram carinho **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
  push: {
    aliases:      ['pu', 'empurrar', 'empurra'],
    emoji:        '😤',
    gif:          'kick',
    color:        0x888888,
    desc:         '😤 Empurra alguém',
    msg:          (a, b) => `**${a}** empurra **${b}** 😤`,
    counter:      (to, n) => `*${to} recebeu ${n} ${n === 1 ? 'empurrão' : 'empurrões'}.*`,
    btnLabel:     'Empurrar de volta',
    retMsg:       (a, b) => `**${a}** empurra **${b}** de volta! 😤`,
    mutualVerb:   (n) => `se empurraram **${n}** ${n === 1 ? 'vez' : 'vezes'}`,
  },
};

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

async function incrementCount(type, fromId, toId) {
  const row = await prisma.interaction.upsert({
    where:  { type_fromId_toId: { type, fromId, toId } },
    update: { count: { increment: 1 } },
    create: { type, fromId, toId, count: 1 },
  });
  return row.count;
}

async function getMutualCount(type, userAId, userBId) {
  const rows = await prisma.interaction.findMany({
    where: {
      type,
      OR: [
        { fromId: userAId, toId: userBId },
        { fromId: userBId, toId: userAId },
      ],
    },
  });
  return rows.reduce((sum, r) => sum + r.count, 0);
}

export async function buildInteractionEmbed(type, fromUser, toUser, isRetribution = false) {
  const action   = ACTIONS[type];
  const fromName = fromUser.displayName ?? fromUser.username ?? 'Alguém';
  const toName   = toUser.displayName   ?? toUser.username   ?? 'Alguém';
  const fromId   = fromUser.id ?? fromUser.user?.id;
  const toId     = toUser.id ?? toUser.user?.id;

  const [gifData, count, mutualCount] = await Promise.all([
    fetchGif(action.gif),
    incrementCount(type, fromId, toId),
    isRetribution ? getMutualCount(type, fromId, toId) : Promise.resolve(null),
  ]);

  let description;
  if (isRetribution) {
    description = `${action.retMsg(fromName, toName)}\n*${fromName} e ${toName} ${action.mutualVerb(mutualCount)}.*`;
  } else {
    description = `${action.msg(fromName, toName)}\n${action.counter(toName, count)}`;
  }

  const embed = new EmbedBuilder()
    .setColor(action.color)
    .setDescription(description);

  if (gifData.url)   embed.setImage(gifData.url);
  if (gifData.anime) embed.setFooter({ text: `Anime: ${gifData.anime}` });

  // Botões: voltar (só o alvo pode clicar) + Rejeitar
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`int_r_${type}_${fromId}_${toId}`)
      .setEmoji(action.emoji)
      .setLabel(action.btnLabel)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`int_rej_${type}_${toId}`)
      .setEmoji('✖️')
      .setLabel('Rejeitar')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

async function runAction(type, actor, target, replyFn) {
  const actorId  = actor.id ?? actor.user?.id;
  const targetId = target.id ?? target.user?.id;

  if (target.bot ?? target.user?.bot)
    return replyFn({ embeds: [errorEmbed('Você não pode interagir com um bot.')], ephemeral: true });

  if (targetId === actorId)
    return replyFn({ embeds: [errorEmbed('Você não pode interagir consigo mesmo.')], ephemeral: true });

  const payload = await buildInteractionEmbed(type, actor, target);
  return replyFn(payload);
}

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
        opts => message.reply(opts),
      );
    },
  };
}

export default Object.keys(ACTIONS).map(makeCommand);
