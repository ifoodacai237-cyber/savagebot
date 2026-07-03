import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from 'discord.js';
import prisma from '../../database/client.js';
import { BANNERS, buildBannerUrl } from '../../utils/shopData.js';
import { setPending } from '../../utils/dropSessions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('drop')
    .setDescription('🎁 Lança um drop no canal — a primeira pessoa a clicar ganha o prêmio')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt.setName('tipo')
        .setDescription('O que vai cair no drop')
        .setRequired(true)
        .addChoices(
          { name: '💰 Moedas',        value: 'coins'         },
          { name: '🎲 Aleatório',     value: 'aleatorio'     },
          { name: '👤 Cargo',         value: 'cargo'         },
          { name: '🖼️ Banner',        value: 'banner'        },
          { name: '🎀 Personalizado', value: 'personalizado' },
        ),
    )
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de moedas (apenas para tipo Moedas)')
        .setMinValue(1)
        .setMaxValue(1_000_000),
    )
    .addStringOption(opt =>
      opt.setName('descricao')
        .setDescription('Texto extra exibido no drop')
        .setMaxLength(300),
    )
    .addStringOption(opt =>
      opt.setName('titulo')
        .setDescription('Título personalizado (padrão: DROP!)')
        .setMaxLength(80),
    )
    .addStringOption(opt =>
      opt.setName('imagem')
        .setDescription('URL de imagem para exibir no drop'),
    ),
  name: 'drop',

  async execute(interaction) {
    const tipo      = interaction.options.getString('tipo');
    const quantidade = interaction.options.getInteger('quantidade');
    const descricao = interaction.options.getString('descricao');
    const titulo    = interaction.options.getString('titulo');
    const imagem    = interaction.options.getString('imagem');

    // ── Moedas: vai direto ────────────────────────────────────────────────────
    if (tipo === 'coins') {
      if (!quantidade) {
        return interaction.reply({ content: '❌ Informe a **quantidade** de moedas para este drop.', ephemeral: true });
      }
      const { buildDropEmbed } = await import('../../utils/dropHandlers.js');
      const { createDrop }     = await import('../../utils/dropSessions.js');

      const dropId = createDrop({ guildId: interaction.guildId, tipo: 'coins', quantidade, descricao, titulo, imagem });
      const payload = buildDropEmbed({ tipo: 'coins', quantidade, descricao, titulo, imagem, dropId });

      await interaction.reply({ content: '✅ Drop lançado!', ephemeral: true });
      return interaction.channel.send(payload);
    }

    // ── Aleatório: vai direto, prêmio sorteado na hora do resgate ────────────
    if (tipo === 'aleatorio') {
      const { buildDropEmbed } = await import('../../utils/dropHandlers.js');
      const { createDrop }     = await import('../../utils/dropSessions.js');

      const dropId = createDrop({
        guildId: interaction.guildId,
        tipo: 'aleatorio',
        quantidadeMax: quantidade ?? 1000,
        descricao,
        titulo,
        imagem,
      });
      const payload = buildDropEmbed({ tipo: 'aleatorio', descricao, titulo, imagem, dropId });

      await interaction.reply({ content: '✅ Drop aleatório lançado!', ephemeral: true });
      return interaction.channel.send(payload);
    }

    // ── Personalizado: vai direto ─────────────────────────────────────────────
    if (tipo === 'personalizado') {
      if (!descricao) {
        return interaction.reply({ content: '❌ Informe a **descrição** do prêmio para este drop.', ephemeral: true });
      }
      const { buildDropEmbed } = await import('../../utils/dropHandlers.js');
      const { createDrop }     = await import('../../utils/dropSessions.js');

      const dropId = createDrop({ guildId: interaction.guildId, tipo: 'personalizado', descricao, titulo, imagem });
      const payload = buildDropEmbed({ tipo: 'personalizado', descricao, titulo, imagem, dropId });

      await interaction.reply({ content: '✅ Drop lançado!', ephemeral: true });
      return interaction.channel.send(payload);
    }

    // ── Cargo / Banner: mostra gavetinha ─────────────────────────────────────
    await interaction.deferReply({ ephemeral: true });

    // Salva estado pendente (titulo, descricao, imagem, canal)
    setPending(interaction.guildId, interaction.user.id, {
      tipo, titulo, descricao, imagem,
      channelId: interaction.channelId,
    });

    let selectMenu;

    if (tipo === 'cargo') {
      await interaction.guild.roles.fetch();
      const botMember = await interaction.guild.members.fetchMe().catch(() => null);
      const botHighestPos = botMember?.roles?.highest?.position ?? 0;

      const cargos = interaction.guild.roles.cache
        .filter(r =>
          r.id !== interaction.guild.id &&
          !r.managed &&
          r.position < botHighestPos,
        )
        .sort((a, b) => b.position - a.position)
        .toJSON();

      if (!cargos.length) {
        return interaction.editReply({ content: '❌ Nenhum cargo disponível neste servidor.' });
      }

      selectMenu = new StringSelectMenuBuilder()
        .setCustomId('drop_item_sel')
        .setPlaceholder('Escolha o cargo do drop…')
        .addOptions(
          cargos.slice(0, 25).map(c =>
            new StringSelectMenuOptionBuilder()
              .setValue(`cargo:${c.id}:${c.name}`)
              .setLabel(c.name.slice(0, 100))
              .setDescription(`Cargo do servidor`)
              .setEmoji('👤'),
          ),
        );
    } else {
      // banner
      const customBanners = await prisma.customBanner.findMany({
        where: { guildId: interaction.guildId, active: true },
      });

      const allBanners = [
        ...BANNERS,
        ...customBanners.map(c => ({
          key: c.key, name: c.name, description: c.description || '',
          price: c.price, imageUrl: buildBannerUrl(c.imageUrl), emoji: c.emoji,
        })),
      ];

      if (!allBanners.length) {
        return interaction.editReply({ content: '❌ Nenhum banner disponível.' });
      }

      selectMenu = new StringSelectMenuBuilder()
        .setCustomId('drop_item_sel')
        .setPlaceholder('Escolha o banner do drop…')
        .addOptions(
          allBanners.slice(0, 25).map(b => {
            const opt = new StringSelectMenuOptionBuilder()
              .setValue(`banner:${b.key}:${b.name}`)
              .setLabel(b.name.slice(0, 100))
              .setDescription((b.description || `🖼️ Banner`).slice(0, 100));

            const match = String(b.emoji ?? '').match(/^<(a?):([^:>\s]+):(\d+)>$/);
            if (match) opt.setEmoji({ animated: match[1] === 'a', name: match[2], id: match[3] });
            else if (b.emoji) opt.setEmoji(b.emoji);

            return opt;
          }),
        );
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);
    return interaction.editReply({ content: `Escolha o item para o drop:`, components: [row] });
  },

  async executePrefix(message) {
    return message.reply('🎁 Use `/drop` para lançar um drop no canal.');
  },
};
