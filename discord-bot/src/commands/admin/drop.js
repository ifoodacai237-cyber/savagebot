import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { createDrop } from '../../utils/dropSessions.js';

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
          { name: '💰 Moedas',       value: 'coins'         },
          { name: '👤 Cargo',        value: 'cargo'         },
          { name: '🎀 Personalizado', value: 'personalizado' },
        ),
    )
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de moedas (apenas para tipo Moedas)')
        .setMinValue(1)
        .setMaxValue(1_000_000),
    )
    .addRoleOption(opt =>
      opt.setName('cargo')
        .setDescription('Cargo a ser dado (apenas para tipo Cargo)'),
    )
    .addStringOption(opt =>
      opt.setName('descricao')
        .setDescription('Descrição do prêmio — aparece no drop e no anúncio')
        .setMaxLength(300),
    )
    .addStringOption(opt =>
      opt.setName('titulo')
        .setDescription('Título personalizado do drop (padrão: DROP!)')
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
    const cargo     = interaction.options.getRole('cargo');
    const descricao = interaction.options.getString('descricao');
    const titulo    = interaction.options.getString('titulo');
    const imagem    = interaction.options.getString('imagem');

    // ── Validações ────────────────────────────────────────────────────────────
    if (tipo === 'coins' && !quantidade) {
      return interaction.reply({ content: '❌ Informe a **quantidade** de moedas para este drop.', ephemeral: true });
    }
    if (tipo === 'cargo' && !cargo) {
      return interaction.reply({ content: '❌ Selecione o **cargo** a ser dado neste drop.', ephemeral: true });
    }
    if (tipo === 'personalizado' && !descricao) {
      return interaction.reply({ content: '❌ Informe a **descrição** do prêmio para este drop.', ephemeral: true });
    }

    // ── Texto do prêmio ───────────────────────────────────────────────────────
    let premioLinha;
    if (tipo === 'coins') {
      premioLinha = `🪙 **Prêmio:** 💰 ${Number(quantidade).toLocaleString('pt-BR')} moedas`;
    } else if (tipo === 'cargo') {
      premioLinha = `🪙 **Prêmio:** 👤 ${cargo.name}`;
    } else {
      premioLinha = `🎀 **Prêmio:** ${descricao}`;
    }

    // ── Criar sessão ─────────────────────────────────────────────────────────
    const dropId = createDrop({
      guildId:  interaction.guildId,
      tipo,
      quantidade,
      roleId:   cargo?.id   ?? null,
      roleName: cargo?.name ?? null,
      descricao: descricao  ?? premioLinha,
      titulo,
    });

    // ── Montar embed V2 (ContainerBuilder sem cor = sem barra lateral) ────────
    const tituloFinal = titulo ? `## 🎁 ${titulo}` : '## 🎁 DROP!';

    const bodyLines = [
      tituloFinal,
      '',
      premioLinha,
    ];
    if (descricao && tipo !== 'personalizado') {
      bodyLines.push('', `> ${descricao}`);
    }
    bodyLines.push('', '-# Seja o primeiro a clicar no botão para resgatar!');

    const container = new ContainerBuilder();

    // Imagem opcional no topo
    if (imagem) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(imagem),
        ),
      );
    }

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(bodyLines.join('\n')),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`drop_claim_${dropId}`)
            .setLabel('Resgatar')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎁'),
        ),
      );

    await interaction.reply({ content: '✅ Drop lançado!', ephemeral: true });

    await interaction.channel.send({
      components: [container],
      flags:      MessageFlags.IsComponentsV2,
    });
  },

  async executePrefix(message) {
    return message.reply('🎁 Use `/drop` para lançar um drop no canal.');
  },
};
