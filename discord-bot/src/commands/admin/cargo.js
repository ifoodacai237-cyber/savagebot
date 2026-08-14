import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

function usage() {
  return 'Uso: `s cargo add @cargo @membro`';
}

function hasManageRoles(context) {
  return context.memberPermissions?.has(PermissionFlagsBits.ManageRoles)
    ?? context.member?.permissions?.has(PermissionFlagsBits.ManageRoles)
    ?? false;
}

function hierarchyError(message, role, member) {
  if (role.managed) return 'Esse cargo é gerenciado pelo Discord e não pode ser atribuído manualmente.';

  const botMember = message.guild.members.me;
  if (botMember && role.position >= botMember.roles.highest.position) {
    return 'Meu cargo precisa estar acima do cargo que você quer atribuir.';
  }

  const actor = message.member;
  if (
    actor?.id !== message.guild.ownerId
    && actor?.roles?.highest?.position <= role.position
  ) {
    return 'Seu cargo precisa estar acima do cargo que você quer atribuir.';
  }

  if (member.user.bot && member.id === message.client.user.id) {
    return 'Eu não posso atribuir cargos a mim mesmo.';
  }

  return null;
}

async function addRole(context, role, member) {
  if (!hasManageRoles(context)) {
    return context.reply('❌ Você precisa da permissão **Gerenciar Cargos** para usar este comando.');
  }

  const hierarchy = hierarchyError(context, role, member);
  if (hierarchy) return context.reply(`❌ ${hierarchy}`);

  if (member.roles.cache.has(role.id)) {
    return context.reply(`ℹ️ ${member} já possui o cargo ${role}.`);
  }

  try {
    await member.roles.add(role, `Cargo atribuído por ${context.user?.tag ?? context.author.tag}`);
    return context.reply(`✅ O cargo ${role} foi atribuído a ${member}.`);
  } catch (error) {
    console.error('[CARGO ADD]', error);
    return context.reply('❌ Não consegui atribuir esse cargo. Verifique minhas permissões e a hierarquia dos cargos.');
  }
}

async function executeSlashAdd(interaction) {
  const role = interaction.options.getRole('cargo');
  const user = interaction.options.getUser('membro');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.reply({ content: '❌ Esse membro não está neste servidor.', ephemeral: true });
  return addRole(interaction, role, member);
}

export default {
  data: new SlashCommandBuilder()
    .setName('cargo')
    .setDescription('Gerencia cargos do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Atribui um cargo a um membro')
        .addRoleOption(option =>
          option.setName('cargo').setDescription('Cargo que será atribuído').setRequired(true),
        )
        .addUserOption(option =>
          option.setName('membro').setDescription('Membro que receberá o cargo').setRequired(true),
        ),
    ),
  name: 'cargo',
  aliases: ['cargos', 'role'],

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== 'add') return;
    return executeSlashAdd(interaction);
  },

  async executePrefix(message, args) {
    if (args[0]?.toLowerCase() !== 'add') return message.reply(usage());

    const role = message.mentions.roles.first();
    const member = message.mentions.members.first()
      ?? (message.mentions.users.first()
        ? await message.guild.members.fetch(message.mentions.users.first().id).catch(() => null)
        : null);

    if (!role || !member) return message.reply(usage());
    return addRole(message, role, member);
  },
};