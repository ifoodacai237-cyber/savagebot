import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';

const DEFAULT_COLOR = 0x9B4FD6;
const DEFAULT_CONV  = '> `1000 mensagens` → **500 SC**\n> `1 hora em call` → **500 SC**';
const DEFAULT_TEXT  =
  'Deseja adquirir **cargos** e **banners de perfil** exclusivos?\n' +
  'Aqui você pode comprar tudo com as suas **SlowCoins**!';
const DEFAULT_FOOTER = 'Slow Bot · Loja';

export function buildShopMain(guild, cfg = {}) {
  const color     = cfg.lojaColor  ? parseInt(cfg.lojaColor, 16) : DEFAULT_COLOR;
  const title     = cfg.lojaTitle  ?? `🛒 Loja do ${guild.name}`;
  const conv      = cfg.lojaConversao ?? DEFAULT_CONV;
  const bodyText  = cfg.lojaText   ?? DEFAULT_TEXT;

  const desc =
    bodyText + '\n\n' +
    '**Conversão 🪙**\n' +
    conv + '\n\n' +
    '─────────────────────────────\n' +
    '*Dúvidas? Acesse o canal de suporte.*';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setFooter({ text: DEFAULT_FOOTER })
    .setTimestamp();

  if (cfg.lojaBanner) embed.setImage(cfg.lojaBanner);
  if (cfg.lojaThumb)  embed.setThumbnail(cfg.lojaThumb);
  else                embed.setThumbnail(guild.iconURL({ size: 128 }) ?? null);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop_comprar').setLabel('Comprar Algo').setEmoji('🛒').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('shop_vitrine').setLabel('Vitrine').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_converter').setLabel('Converter').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_saldo').setLabel('Meu Saldo').setEmoji('💰').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop_config').setLabel('Configurar Painel').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2] };
}

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

export default {
  name: 'loja',
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('🛒 Sistema de loja do servidor')
    .addSubcommand(s =>
      s.setName('painel').setDescription('📢 Envia o painel da loja no canal atual'))
    .addSubcommandGroup(g =>
      g.setName('admin').setDescription('⚙️ Gerenciar a loja (apenas admins)')
        .addSubcommand(s =>
          s.setName('cargo')
            .setDescription('Adicionar um cargo à loja para venda')
            .addRoleOption(o => o.setName('cargo').setDescription('Cargo a ser vendido').setRequired(true))
            .addIntegerOption(o => o.setName('preco').setDescription('Preço em SlowCoins').setRequired(true).setMinValue(1))
            .addStringOption(o => o.setName('descricao').setDescription('Descrição do cargo').setRequired(false))
        )
        .addSubcommand(s =>
          s.setName('remover')
            .setDescription('Remover um cargo da loja')
            .addStringOption(o => o.setName('id').setDescription('ID do cargo (use /loja admin listar)').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('listar')
            .setDescription('Ver todos os cargos cadastrados na loja')
        )
    ),

  async execute(interaction) {
    const sub   = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    // ── ADMIN ────────────────────────────────────────────────────────────────
    if (group === 'admin') {
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) {
        return interaction.reply({ content: '❌ Apenas administradores podem gerenciar a loja.', ephemeral: true });
      }

      if (sub === 'cargo') {
        const role  = interaction.options.getRole('cargo');
        const preco = interaction.options.getInteger('preco');
        const desc  = interaction.options.getString('descricao') ?? `Cargo ${role.name} exclusivo do servidor.`;

        const existing = await prisma.shopRole.findUnique({
          where: { guildId_roleId: { guildId: interaction.guildId, roleId: role.id } },
        });
        if (existing) {
          return interaction.reply({ content: `❌ O cargo **${role.name}** já está na loja!`, ephemeral: true });
        }

        await prisma.shopRole.create({
          data: { guildId: interaction.guildId, roleId: role.id, name: role.name, description: desc, price: preco },
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('✅ Cargo Adicionado à Loja!')
              .setDescription(`**${role.name}** agora está disponível por **${preco.toLocaleString('pt-BR')} SC**!`)
              .addFields({ name: '📝 Descrição', value: desc })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (sub === 'remover') {
        const id   = interaction.options.getString('id');
        const item = await prisma.shopRole.findUnique({ where: { id } });
        if (!item || item.guildId !== interaction.guildId) {
          return interaction.reply({ content: '❌ Item não encontrado. Use `/loja admin listar` para ver os IDs.', ephemeral: true });
        }
        await prisma.shopRole.delete({ where: { id } });
        return interaction.reply({ content: `✅ **${item.name}** foi removido da loja.`, ephemeral: true });
      }

      if (sub === 'listar') {
        const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId } });
        if (!roles.length) {
          return interaction.reply({
            content: '📭 Nenhum cargo cadastrado ainda.\nUse `/loja admin cargo` para adicionar.',
            ephemeral: true,
          });
        }
        const desc = roles.map(r =>
          `> <@&${r.roleId}> — **${r.price.toLocaleString('pt-BR')} SC**\n> \`ID: ${r.id}\``
        ).join('\n\n');
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(DEFAULT_COLOR)
              .setTitle('👑 Cargos na Loja')
              .setDescription(desc)
              .setFooter({ text: 'Use o ID para remover com /loja admin remover' }),
          ],
          ephemeral: true,
        });
      }
    }

    // ── PAINEL ───────────────────────────────────────────────────────────────
    if (sub === 'painel') {
      const cfg     = await getCfg(interaction.guildId);
      const payload = buildShopMain(interaction.guild, cfg);
      return interaction.reply(payload);
    }
  },
};
