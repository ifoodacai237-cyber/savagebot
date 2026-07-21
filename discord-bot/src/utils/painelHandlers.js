import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../database/client.js';
import { buildWelcomeConfigPayload } from './configPanels.js';
import { buildTicketConfigPayload } from './configPanels.js';
import { buildTellonymConfigPayload } from './configPanels.js';
import { buildPartnerConfigPayload } from './partnershipPanels.js';
import { buildLojaAdminPayload } from './shopHandlers.js';
import { buildVipConfigPayload } from '../commands/loja/vip.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

function statusDot(active) {
  return active ? '🟢' : '🔴';
}

// Botão de voltar ao painel de funções
function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painel_voltar')
      .setLabel('← Voltar ao Painel')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ─── Painel Principal ─────────────────────────────────────────────────────────

export function buildPainelMain(guild, cfg) {
  const container = new ContainerBuilder().setAccentColor(0x5865F2);

  const iconUrl = guild.iconURL({ size: 128 }) || null;
  const moduleSummary = [
    '🎉 **Boas-Vindas**', '🎫 **Ticket**', '💌 **Tellonym**',
    '📸 **Instagram**', '🤝 **Parceria**', '🛒 **Loja**',
    '⭐ **VIP**', '⚙️ **Status**',
  ].join('  ·  ');

  const mainText =
    `## ⚙️ Painel — ${guild.name}\n\n` +
    `Configure todos os módulos do seu servidor em um só lugar.\n\n` +
    `**Módulos disponíveis:**\n${moduleSummary}`;

  if (iconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(mainText))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl)),
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(mainText));
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# Clique em **Abrir Funções** para configurar cada módulo.'),
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painel_funcoes')
      .setLabel('Abrir Funções')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('painel_refresh')
      .setLabel('Atualizar')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
  );

  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}

// ─── Lista de Funções ─────────────────────────────────────────────────────────

export function buildPainelFuncoes(guild, cfg) {
  const container = new ContainerBuilder().setAccentColor(0x5865F2);

  // Status de cada módulo
  const boasVindasOk = !!(cfg.welcomeChannel);
  const ticketOk     = !!(cfg.ticketCategory);
  const tellonymOk   = !!(cfg.tellonymChannel);
  const instaOk      = !!(cfg.instaChannel);
  const parceiraOk   = !!(cfg.partnerEnabled && cfg.partnerChannel);
  const lojaOk       = true;
  const vipOk        = true;
  const statusOk     = true;

  const lines = [
    `## ⚙️ Funções — ${guild.name}\n`,
    `**Boas-Vindas**`,
    `${statusDot(boasVindasOk)} **Boas-Vindas** — Mensagem ao entrar no servidor`,
    boasVindasOk
      ? `-# Canal: <#${cfg.welcomeChannel}>`
      : `-# ⚠️ Canal de boas-vindas não configurado`,
    ``,
    `**Suporte**`,
    `${statusDot(ticketOk)} **Ticket** — Sistema de suporte via threads privadas`,
    ticketOk
      ? `-# Categoria: <#${cfg.ticketCategory}>`
      : `-# ⚠️ Sem categoria definida — não está funcionando`,
    ``,
    `**Engajamento**`,
    `${statusDot(instaOk)} **Instagram** — Feed automático de fotos e vídeos`,
    instaOk
      ? `-# Canal: <#${cfg.instaChannel}>`
      : `-# ⚠️ Módulo desativado`,
    `${statusDot(tellonymOk)} **Tellonym** — Mensagens anônimas entre membros`,
    tellonymOk
      ? `-# Canal: <#${cfg.tellonymChannel}>`
      : `-# ⚠️ Canal não configurado`,
    `${statusDot(parceiraOk)} **Parceria** — Sistema de parcerias do servidor`,
    parceiraOk
      ? `-# Canal: <#${cfg.partnerChannel}>`
      : `-# ⚠️ Sistema ${cfg.partnerEnabled ? 'ativo mas sem canal' : 'desativado'}`,
    ``,
    `**Loja & VIP**`,
    `${statusDot(lojaOk)} **Loja** — Loja do servidor com cargos e banners`,
    `-# Sempre disponível — configure via botão`,
    `${statusDot(vipOk)} **VIP** — Plano VIP com benefícios na economia`,
    `-# Sempre disponível — configure via botão`,
    ``,
    `**Ferramentas**`,
    `${statusDot(statusOk)} **Status** — Streaming exibido no perfil do bot`,
    `-# Sempre disponível — configure via botão`,
  ].join('\n');

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# Selecione um módulo no menu abaixo para configurá-lo.'),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('painel_modulo_sel')
    .setPlaceholder('🔧 Selecione um módulo para configurar...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('🎉 Boas-Vindas')
        .setValue('boasvindas')
        .setDescription('Mensagem de entrada no servidor'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🎫 Ticket')
        .setValue('ticket')
        .setDescription('Sistema de suporte via threads'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📸 Instagram')
        .setValue('instagram')
        .setDescription('Feed automático de fotos e vídeos'),
      new StringSelectMenuOptionBuilder()
        .setLabel('💌 Tellonym')
        .setValue('tellonym')
        .setDescription('Mensagens anônimas entre membros'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🤝 Parceria')
        .setValue('parceria')
        .setDescription('Sistema de parcerias do servidor'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🛒 Loja')
        .setValue('loja')
        .setDescription('Loja do servidor com cargos e banners'),
      new StringSelectMenuOptionBuilder()
        .setLabel('⭐ VIP')
        .setValue('vip')
        .setDescription('Plano VIP com benefícios na economia'),
      new StringSelectMenuOptionBuilder()
        .setLabel('⚙️ Status')
        .setValue('status')
        .setDescription('Streaming exibido no perfil do bot'),
    );

  const selectRow = new ActionRowBuilder().addComponents(select);

  return { components: [container, selectRow], flags: MessageFlags.IsComponentsV2 };
}

// ─── Mini config do Instagram (aberto via painel) ─────────────────────────────

export function buildInstaConfigPayload(cfg) {
  const ativo  = !!(cfg.instaChannel);
  const cor    = cfg.instaColor ? `#${cfg.instaColor}` : 'Sem cor (sem barra lateral)';
  const emoji  = cfg.instaEmoji ?? '💜';
  const handle = cfg.instaHandle ? `@${cfg.instaHandle}` : 'Não definido';

  const embed = new EmbedBuilder()
    .setColor(ativo ? 0xE1306C : 0x555555)
    .setTitle('📸 Configuração — Instagram')
    .setDescription(
      (ativo ? '🟢 **Feed ATIVO**' : '🔴 **Feed DESATIVADO**') +
      '\n\nO bot transforma automaticamente imagens e vídeos do canal configurado em posts estilo Instagram.',
    )
    .addFields(
      { name: '📣 Canal',    value: cfg.instaChannel ? `<#${cfg.instaChannel}>` : '*(não configurado)*', inline: true },
      { name: '🎨 Cor',      value: cor,                                                                  inline: true },
      { name: '❤️ Emoji',   value: emoji,                                                                 inline: true },
      { name: '🔗 Handle',   value: handle,                                                               inline: true },
    )
    .setFooter({ text: 'Dica: ative o módulo configurando um canal com /instagram ativar' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('insta_cfg_canal')
      .setLabel(ativo ? 'Alterar Canal' : 'Ativar (definir canal)')
      .setEmoji('📣')
      .setStyle(ativo ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('insta_cfg_desativar')
      .setLabel('Desativar Feed')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!ativo),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('insta_cfg_cor')
      .setLabel('Alterar Cor')
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('insta_cfg_sem_cor')
      .setLabel('Sem Lateral')
      .setEmoji('◻️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('insta_cfg_emoji')
      .setLabel('Emoji do Like')
      .setEmoji('❤️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('insta_cfg_handle')
      .setLabel('@ do Instagram')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2, backRow()] };
}

// ─── Mini config do Status (aberto via painel) ────────────────────────────────

export function buildStatusConfigPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️ Configuração — Status do Bot')
    .setDescription(
      'Configure o status de **Transmitindo** exibido no perfil do bot.\n\n' +
      '**Subcomandos disponíveis:**\n' +
      '`/status definir` — abre editor de emoji + texto\n' +
      '`/status automatico [textos]` — rotação automática separada por `|`\n' +
      '`/status parar` — para a rotação e restaura o padrão',
    )
    .setFooter({ text: 'Use os comandos /status para alterar o streaming do bot' });

  return { embeds: [embed], components: [backRow()] };
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

export async function handlePainelModuloSel(interaction) {
  if (!interaction.memberPermissions?.has(0x20n)) { // ManageGuild
    return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
  }

  const modulo = interaction.values[0];
  const cfg    = await getCfg(interaction.guildId);

  let payload;

  switch (modulo) {
    case 'boasvindas': {
      const base = buildWelcomeConfigPayload(cfg);
      payload = { ...base, components: [...base.components, backRow()] };
      break;
    }
    case 'ticket': {
      const base = buildTicketConfigPayload(cfg);
      payload = { ...base, components: [...base.components, backRow()] };
      break;
    }
    case 'tellonym': {
      const base = buildTellonymConfigPayload(cfg);
      payload = { ...base, components: [...base.components, backRow()] };
      break;
    }
    case 'parceria': {
      const base = buildPartnerConfigPayload(cfg);
      payload = { ...base, components: [...base.components, backRow()] };
      break;
    }
    case 'loja': {
      const base = buildLojaAdminPayload(cfg);
      payload = { ...base, components: [...base.components, backRow()] };
      break;
    }
    case 'vip': {
      const base = buildVipConfigPayload(cfg);
      payload = { ...base, components: [...base.components, backRow()] };
      break;
    }
    case 'instagram': {
      payload = buildInstaConfigPayload(cfg);
      break;
    }
    case 'status': {
      payload = buildStatusConfigPayload();
      break;
    }
    default:
      return interaction.reply({ content: '❌ Módulo desconhecido.', ephemeral: true });
  }

  return interaction.update(payload);
}

// ─── Handlers de botões do painel ─────────────────────────────────────────────

export async function handlePainelFuncoes(interaction) {
  if (!interaction.memberPermissions?.has(0x20n)) {
    return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
  }
  const cfg = await getCfg(interaction.guildId);
  return interaction.update(buildPainelFuncoes(interaction.guild, cfg));
}

export async function handlePainelVoltar(interaction) {
  const cfg = await getCfg(interaction.guildId);
  return interaction.update(buildPainelMain(interaction.guild, cfg));
}

// ─── Handlers de botões do mini-Instagram ─────────────────────────────────────

export async function handleInstaCfgBtn(interaction) {
  const { customId } = interaction;

  if (customId === 'insta_cfg_desativar') {
    await prisma.guildConfig.upsert({
      where:  { guildId: interaction.guildId },
      create: { guildId: interaction.guildId },
      update: { instaChannel: null },
    });
    const cfg = await getCfg(interaction.guildId);
    return interaction.update(buildInstaConfigPayload(cfg));
  }

  if (customId === 'insta_cfg_sem_cor') {
    await prisma.guildConfig.upsert({
      where:  { guildId: interaction.guildId },
      create: { guildId: interaction.guildId },
      update: { instaColor: null },
    });
    const cfg = await getCfg(interaction.guildId);
    return interaction.update(buildInstaConfigPayload(cfg));
  }

  // Botões que abrem modal de texto
  const MODAL_MAP = {
    insta_cfg_canal:  { customId: 'insta_cfg_modal_canal',  title: 'Canal do Feed (ID ou #canal)',    label: 'ID do canal',       max: 30,  ph: '123456789012345678' },
    insta_cfg_cor:    { customId: 'insta_cfg_modal_cor',    title: 'Cor da barra lateral',            label: 'Cor hex (sem #)',    max: 6,   ph: 'E1306C' },
    insta_cfg_emoji:  { customId: 'insta_cfg_modal_emoji',  title: 'Emoji do botão de curtir',        label: 'Emoji',             max: 32,  ph: '💜' },
    insta_cfg_handle: { customId: 'insta_cfg_modal_handle', title: '@ do Instagram do servidor',     label: '@ do Instagram',    max: 50,  ph: 'fallen.angels' },
  };

  const def = MODAL_MAP[customId];
  if (!def) return;

  const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
  const modal = new ModalBuilder().setCustomId(def.customId).setTitle(def.title);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('value')
        .setLabel(def.label)
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(def.max)
        .setPlaceholder(def.ph),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleInstaCfgModal(interaction) {
  await interaction.deferUpdate();

  const { customId } = interaction;
  const raw   = interaction.fields.getTextInputValue('value').trim();
  const value = raw || null;

  let update = {};

  if (customId === 'insta_cfg_modal_canal') {
    // Aceita ID direto ou <#ID>
    const id = value ? value.replace(/[<#>]/g, '') : null;
    update = { instaChannel: id };
  } else if (customId === 'insta_cfg_modal_cor') {
    update = { instaColor: value ? value.replace(/^#/, '').toUpperCase().slice(0, 6) : null };
  } else if (customId === 'insta_cfg_modal_emoji') {
    update = { instaEmoji: value ?? '💜' };
  } else if (customId === 'insta_cfg_modal_handle') {
    update = { instaHandle: value ? value.replace(/^@/, '') : null };
  }

  await prisma.guildConfig.upsert({
    where:  { guildId: interaction.guildId },
    create: { guildId: interaction.guildId, ...update },
    update,
  });

  const cfg = await getCfg(interaction.guildId);
  await interaction.message.edit(buildInstaConfigPayload(cfg));
}
