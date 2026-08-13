import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import { getEmoji } from '../../utils/emojiManager.js';

const MOD_HEART = () => getEmoji('mod_heart');
const pendingModeration = new Map();
const PENDING_TTL = 10 * 60 * 1000;
const MAX_TIMEOUT_MINUTES = 28 * 24 * 60;

const ACTIONS = {
  ban: {
    title: 'Banir membro?',
    confirm: 'Confirmar ban',
    permission: PermissionFlagsBits.BanMembers,
    past: 'banido',
  },
  kick: {
    title: 'Expulsar membro?',
    confirm: 'Confirmar kick',
    permission: PermissionFlagsBits.KickMembers,
    past: 'expulso',
  },
  mute: {
    title: 'Silenciar membro?',
    confirm: 'Confirmar mute',
    permission: PermissionFlagsBits.ModerateMembers,
    past: 'silenciado',
  },
};

function panel(text, { ephemeral = true, rows = [] } = {}) {
  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(text),
  );
  return {
    components: [container, ...rows],
    flags: MessageFlags.IsComponentsV2,
    ephemeral,
  };
}

function displayName(user, member) {
  return member?.displayName ?? user.globalName ?? user.username;
}

function reasonText(reason) {
  return reason?.trim() || '—';
}

function createPending(data) {
  const token = randomUUID().replaceAll('-', '');
  pendingModeration.set(token, { ...data, createdAt: Date.now() });
  const timer = setTimeout(() => pendingModeration.delete(token), PENDING_TTL);
  timer.unref?.();
  return token;
}

function confirmationPayload({ action, token, target, member, reason, deleteDays, durationMinutes }) {
  const details = [
    `**${target}** — ${displayName(target, member)}`,
    `**Motivo:** ${reasonText(reason)}`,
  ];

  if (action === 'ban') {
    details.push(`**Mensagens:** apagar os últimos ${deleteDays} dias`);
  } else if (action === 'mute') {
    details.push(`**Duração:** ${durationMinutes} minutos`);
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mod_confirm:${token}`)
      .setLabel(ACTIONS[action].confirm)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`mod_cancel:${token}`)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );

  return panel(`## ${MOD_HEART()} ${ACTIONS[action].title}\n\n${details.join('\n')}`, {
    rows: [buttons],
  });
}

function actionError(text) {
  return panel(`## ${MOD_HEART()} Moderação\n\n${text}`);
}

function permissionDenied(interaction, action) {
  return !interaction.memberPermissions?.has(ACTIONS[action].permission);
}

function hierarchyError(interaction, member, action) {
  if (!member) {
    return action === 'ban'
      ? null
      : 'Esse membro não está no servidor.';
  }

  if (member.id === interaction.user.id) return 'Você não pode aplicar essa ação em si mesmo.';
  if (member.id === interaction.client.user.id) return 'Eu não posso aplicar essa ação em mim mesmo.';
  if (member.id === interaction.guild.ownerId) return 'O dono do servidor não pode ser moderado.';

  const actor = interaction.member;
  if (actor?.id !== interaction.guild.ownerId && actor?.roles?.highest?.comparePositionTo(member.roles.highest) <= 0) {
    return 'O cargo desse membro é igual ou superior ao seu.';
  }

  const manageable = {
    ban: member.bannable,
    kick: member.kickable,
    mute: member.moderatable,
  }[action];
  if (!manageable) return 'Meu cargo precisa estar acima do cargo desse membro.';
  return null;
}

async function findMember(interaction, user) {
  return interaction.guild.members.fetch(user.id).catch(() => null);
}

async function startModeration(interaction, action, options) {
  if (permissionDenied(interaction, action)) {
    return interaction.reply(actionError('Você não tem permissão para usar este comando.'));
  }

  const target = options.getUser('usuario');
  const member = await findMember(interaction, target);
  const hierarchy = hierarchyError(interaction, member, action);
  if (hierarchy) return interaction.reply(actionError(hierarchy));

  const reason = options.getString('motivo');
  const deleteDays = options.getInteger('mensagens') ?? 0;
  const durationMinutes = options.getInteger('duracao') ?? 10;
  const token = createPending({
    action,
    guildId: interaction.guildId,
    moderatorId: interaction.user.id,
    targetId: target.id,
    reason: reasonText(reason),
    deleteDays,
    durationMinutes,
  });

  return interaction.reply(confirmationPayload({
    action,
    token,
    target,
    member,
    reason,
    deleteDays,
    durationMinutes,
  }));
}

async function executeModeration(interaction, session) {
  const { action, targetId, reason, deleteDays, durationMinutes } = session;
  const target = await interaction.client.users.fetch(targetId).catch(() => null);
  const member = await findMember(interaction, target ?? { id: targetId });
  const hierarchy = hierarchyError(interaction, member, action);
  if (hierarchy) throw new Error(hierarchy);

  const auditReason = reason === '—' ? `Moderação por ${interaction.user.tag}` : reason;
  if (action === 'ban') {
    await interaction.guild.members.ban(targetId, {
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
      reason: auditReason,
    });
  } else if (action === 'kick') {
    await member.kick(auditReason);
  } else {
    await member.timeout(durationMinutes * 60 * 1000, auditReason);
  }
}

export async function handleModerationButton(interaction) {
  const [kind, token] = interaction.customId.split(':');
  const session = pendingModeration.get(token);

  if (!session) return interaction.reply(actionError('Essa confirmação expirou. Execute o comando novamente.'));
  if (session.guildId !== interaction.guildId || session.moderatorId !== interaction.user.id) {
    return interaction.reply(actionError('Apenas quem iniciou esta ação pode confirmá-la.'));
  }

  pendingModeration.delete(token);
  if (kind === 'mod_cancel') {
    return interaction.update(actionError('Ação cancelada.'));
  }

  await interaction.deferUpdate();
  try {
    await executeModeration(interaction, session);
    return interaction.editReply(panel(
      `## ${MOD_HEART()} Moderação concluída\n\n` +
      `<@${session.targetId}> foi **${ACTIONS[session.action].past}** com sucesso.`,
    ));
  } catch (error) {
    return interaction.editReply(actionError(`Não foi possível concluir a ação.\n\n> ${error.message}`));
  }
}

const banCommand = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um membro do servidor após confirmação')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option.setName('usuario').setDescription('Membro que será banido').setRequired(true))
    .addStringOption(option =>
      option.setName('motivo').setDescription('Motivo da punição').setMaxLength(400))
    .addIntegerOption(option =>
      option.setName('mensagens').setDescription('Dias de mensagens para apagar (0 a 7)')
        .setMinValue(0).setMaxValue(7)),
  name: 'ban',
  async execute(interaction) {
    return startModeration(interaction, 'ban', interaction.options);
  },
};

const kickCommand = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um membro do servidor após confirmação')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option.setName('usuario').setDescription('Membro que será expulso').setRequired(true))
    .addStringOption(option =>
      option.setName('motivo').setDescription('Motivo da punição').setMaxLength(400)),
  name: 'kick',
  async execute(interaction) {
    return startModeration(interaction, 'kick', interaction.options);
  },
};

const muteCommand = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia um membro temporariamente após confirmação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName('usuario').setDescription('Membro que será silenciado').setRequired(true))
    .addIntegerOption(option =>
      option.setName('duracao').setDescription('Duração em minutos (1 a 40320)')
        .setRequired(true).setMinValue(1).setMaxValue(MAX_TIMEOUT_MINUTES))
    .addStringOption(option =>
      option.setName('motivo').setDescription('Motivo da punição').setMaxLength(400)),
  name: 'mute',
  async execute(interaction) {
    return startModeration(interaction, 'mute', interaction.options);
  },
};

export default [banCommand, kickCommand, muteCommand];