import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../../database/client.js';
import { BANNERS } from '../../utils/shopData.js';

const SHOP_COLOR = 0x9B4FD6;

export function buildShopMain(guild) {
  const embed = new EmbedBuilder()
    .setColor(SHOP_COLOR)
    .setTitle(`🛒 Loja do ${guild.name}`)
    .setDescription(
      'Deseja adquirir **cargos** e **banners de perfil** exclusivos?\n' +
      'Aqui você pode comprar tudo com as suas **SlowCoins** apenas interagindo no servidor!\n\n' +
      '**Conversão 🪙**\n' +
      '> `1000 mensagens` → **500 SC**\n' +
      '> `1 hora em call` → **500 SC**\n\n' +
      '─────────────────────────────\n' +
      '*Dúvidas ou denúncias? Acesse o canal de suporte.*'
    )
    .setThumbnail(guild.iconURL({ size: 128 }) ?? null)
    .setFooter({ text: `Slow Bot · Loja  •  ${BANNERS.length} banners disponíveis` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop_comprar').setLabel('Comprar Algo').setEmoji('🛒').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('shop_vitrine').setLabel('Vitrine').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_converter').setLabel('Converter').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_saldo').setLabel('Meu Saldo').setEmoji('💰').setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

export default {
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
            .addIntegerOption(o => o.setName('preco').setDescription('Preço em SlowCoins (SC)').setRequired(true).setMinValue(1))
            .addStringOption(o => o.setName('descricao').setDescription('Descrição do cargo').setRequired(false))
        )
        .addSubcommand(s =>
          s.setName('remover')
            .setDescription('Remover um cargo da loja')
            .addStringOption(o => o.setName('id').setDescription('ID do item na loja (use /loja admin listar para ver)').setRequired(true))
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

      // Adicionar cargo
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
              .setFooter({ text: `ID: em /loja admin listar` })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Remover item
      if (sub === 'remover') {
        const id   = interaction.options.getString('id');
        const item = await prisma.shopRole.findUnique({ where: { id } });
        if (!item || item.guildId !== interaction.guildId) {
          return interaction.reply({ content: '❌ Item não encontrado. Use `/loja admin listar` para ver os IDs.', ephemeral: true });
        }
        await prisma.shopRole.delete({ where: { id } });
        return interaction.reply({ content: `✅ **${item.name}** foi removido da loja.`, ephemeral: true });
      }

      // Listar itens
      if (sub === 'listar') {
        const roles = await prisma.shopRole.findMany({ where: { guildId: interaction.guildId } });
        if (!roles.length) {
          return interaction.reply({
            content: '📭 Nenhum cargo cadastrado na loja ainda.\nUse `/loja admin cargo` para adicionar.',
            ephemeral: true,
          });
        }
        const desc = roles.map(r =>
          `> <@&${r.roleId}> — **${r.price.toLocaleString('pt-BR')} SC**\n> \`ID: ${r.id}\``
        ).join('\n\n');
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SHOP_COLOR)
              .setTitle('👑 Cargos Cadastrados na Loja')
              .setDescription(desc)
              .setFooter({ text: 'Use o ID para remover com /loja admin remover' }),
          ],
          ephemeral: true,
        });
      }
    }

    // ── PAINEL ───────────────────────────────────────────────────────────────
    if (sub === 'painel') {
      const payload = buildShopMain(interaction.guild);
      return interaction.reply(payload);
    }
  },
};
