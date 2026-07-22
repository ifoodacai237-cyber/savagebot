import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
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

async function getCfgWithPlans(guildId) {
  return prisma.guildConfig.upsert({
    where:   { guildId },
    create:  { guildId },
    update:  {},
    include: { vipPlans: { orderBy: { position: 'asc' } } },
  });
}

const D = (ok) => (ok ? '🟢' : '🔴');

/** Botão "Configurar" padrão dentro do container */
function cfgBtn(customId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel('Configurar')
      .setStyle(ButtonStyle.Secondary),
  );
}

/** Linha de voltar — fica fora do container, abaixo */
function voltarRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painel_voltar')
      .setLabel('← Voltar ao Painel')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ─── Tela Inicial (Screen 1) ──────────────────────────────────────────────────
//
// ┌──────────────────────────────────────┐
// │ 🤖 Painel                  [thumb]   │
// │ Painel › Inicial                     │
// │ **Servidor** · Nome#0000             │
// │ ⚙️ **Funções** · boas-vindas, …     │
// │ Tudo o que dá pra configurar aqui.   │
// │                                      │
// │ [Abrir Funções]  [Meu Premium]       │
// └──────────────────────────────────────┘
// [⟳ Atualizar]
// ─────────────────────────────────────────

export function buildPainelMain(guild, cfg) {
  const iconUrl = guild.iconURL({ size: 128 }) ?? null;

  const headerText = [
    '🤖 **Painel**',
    'Painel › Inicial',
    `**Servidor** · ${guild.name}`,
    '⚙️ **Funções** · boas-vindas, ticket, instagram, tellonym e mais',
    'Tudo o que dá pra configurar nesse servidor.',
  ].join('\n');

  const container = new ContainerBuilder().setAccentColor(0x5865F2);

  if (iconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl)),
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText));
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('painel_funcoes')
        .setLabel('Abrir Funções')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('painel_premium')
        .setLabel('Meu Premium')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    ),
  );

  const refreshRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('painel_refresh')
      .setLabel('Atualizar')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
  );

  return { components: [container, refreshRow], flags: MessageFlags.IsComponentsV2 };
}

// ─── Lista de Funções (Screens 2–5) ───────────────────────────────────────────
//
// Cada módulo:
//   🟢 **Nome**
//   Descrição curta do módulo
//   [Configurar]
//
// Separadores entre categorias.
// Botão "← Voltar" fora do container.
// ──────────────────────────────────────────

export function buildPainelFuncoes(guild, cfg) {
  const boasVindasOk = !!(cfg.welcomeChannel);
  const ticketOk     = !!(cfg.ticketChannel || cfg.ticketCategory);
  const instaOk      = !!(cfg.instaChannel);
  const tellonymOk   = !!(cfg.tellonymChannel);
  const parceiraOk   = !!(cfg.partnerEnabled && cfg.partnerChannel);

  const c = new ContainerBuilder().setAccentColor(0x5865F2);

  // ── Boas-Vindas ──────────────────────────────────────────────────────────
  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(`${D(boasVindasOk)} **Boas-Vindas**\nMensagem e cargos ao entrar no servidor`),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_boasvindas'));

  c.addSeparatorComponents(new SeparatorBuilder());

  // ── Suporte ───────────────────────────────────────────────────────────────
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('**Suporte**'),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(`${D(ticketOk)} **Ticket**\nSuporte via thread privada com a equipe`),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_ticket'));

  c.addSeparatorComponents(new SeparatorBuilder());

  // ── Engajamento ───────────────────────────────────────────────────────────
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('**Engajamento**'),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(`${D(instaOk)} **Instagram**\nFeed de fotos com curtidas e comentários`),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_instagram'));

  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(`${D(tellonymOk)} **Tellonym**\nMensagens anônimas entre os membros`),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_tellonym'));

  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(`${D(parceiraOk)} **Parceria**\nSistema de parcerias do servidor`),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_parceria'));

  c.addSeparatorComponents(new SeparatorBuilder());

  // ── Loja & Economia ───────────────────────────────────────────────────────
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('**Loja & Economia**'),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent('**Loja**\nLoja do servidor com cargos e banners personalizados'),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_loja'));

  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent('**VIP**\nPlano VIP com benefícios e cargos exclusivos'),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_vip'));

  c.addSeparatorComponents(new SeparatorBuilder());

  // ── Ferramentas ───────────────────────────────────────────────────────────
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('**Ferramentas**'),
  );
  c.addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent('**Status**\nStatus de streaming exibido no perfil do bot'),
  );
  c.addActionRowComponents(cfgBtn('painel_cfg_status'));

  return { components: [c, voltarRow()], flags: MessageFlags.IsComponentsV2 };
}

// ─── Mini-config do Instagram (abre pelo painel) ──────────────────────────────

export function buildInstaConfigPayload(cfg) {
  const ativo  = !!(cfg.instaChannel);
  const cor    = cfg.instaColor ? `#${cfg.instaColor}` : 'Sem cor';
  const emoji  = cfg.instaEmoji ?? '💜';
  const handle = cfg.instaHandle ? `@${cfg.instaHandle}` : 'Não definido';

  const c = new ContainerBuilder().setAccentColor(ativo ? 0xE1306C : 0x555555);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${D(ativo)} **Instagram** — ${ativo ? 'Feed ATIVO' : 'Feed DESATIVADO'}`,
        '',
        `📣 **Canal:** ${cfg.instaChannel ? `<#${cfg.instaChannel}>` : '*(não configurado)*'}`,
        `🎨 **Cor:** ${cor}   ❤️ **Emoji:** ${emoji}   🔗 **Handle:** ${handle}`,
      ].join('\n'),
    ),
  );

  c.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('insta_cfg_canal')
        .setLabel(ativo ? 'Alterar Canal' : 'Ativar (definir canal)')
        .setStyle(ativo ? ButtonStyle.Secondary : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('insta_cfg_desativar')
        .setLabel('Desativar')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!ativo),
    ),
  );

  c.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('insta_cfg_cor')
        .setLabel('Cor')
        .setEmoji('🎨')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('insta_cfg_sem_cor')
        .setLabel('Sem Lateral')
        .setEmoji('◻️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('insta_cfg_emoji')
        .setLabel('Emoji Like')
        .setEmoji('❤️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('insta_cfg_handle')
        .setLabel('@ Instagram')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [c, voltarRow()], flags: MessageFlags.IsComponentsV2 };
}

// ─── Mini-config do Status (abre pelo painel) ─────────────────────────────────

export function buildStatusConfigPayload() {
  const c = new ContainerBuilder().setAccentColor(0x5865F2);

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        '**Status** — Status de streaming do bot',
        '',
        'Configure o status de **Transmitindo** exibido no perfil do bot.',
        '',
        '`/status definir` — abre editor de emoji + texto',
        '`/status automatico [textos]` — rotação automática separada por `|`',
        '`/status parar` — para a rotação e restaura o padrão',
      ].join('\n'),
    ),
  );

  return { components: [c, voltarRow()], flags: MessageFlags.IsComponentsV2 };
}

// ─── Handler: clique em "Configurar" de qualquer módulo ─────────────────────

export async function handlePainelCfgBtn(interaction) {
  if (!interaction.memberPermissions?.has(0x20n)) {
    return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
  }

  const { customId } = interaction;
  const cfg = await getCfg(interaction.guildId);

  const modulo = customId.replace('painel_cfg_', '');

  let payload;

  switch (modulo) {
    case 'boasvindas': {
      const base = buildWelcomeConfigPayload(cfg);
      payload = { ...base, components: [...(base.components ?? []), voltarRow()] };
      break;
    }
    case 'ticket': {
      const base = buildTicketConfigPayload(cfg);
      payload = { ...base, components: [...(base.components ?? []), voltarRow()] };
      break;
    }
    case 'tellonym': {
      const base = buildTellonymConfigPayload(cfg);
      payload = { ...base, components: [...(base.components ?? []), voltarRow()] };
      break;
    }
    case 'parceria': {
      const base = buildPartnerConfigPayload(cfg);
      payload = { ...base, components: [...(base.components ?? []), voltarRow()] };
      break;
    }
    case 'loja': {
      const base = buildLojaAdminPayload(cfg);
      payload = { ...base, components: [...(base.components ?? []), voltarRow()] };
      break;
    }
    case 'vip': {
      const cfgVip = await getCfgWithPlans(interaction.guildId);
      const base = buildVipConfigPayload(cfgVip, cfgVip.vipPlans);
      payload = { ...base, components: [...(base.components ?? []), voltarRow()] };
      break;
    }
    case 'instagram':
      payload = buildInstaConfigPayload(cfg);
      break;
    case 'status':
      payload = buildStatusConfigPayload();
      break;
    default:
      return interaction.reply({ content: '❌ Módulo desconhecido.', flags: 64 });
  }

  return interaction.update(payload);
}

// ─── Handler: botões pm_* (planos VIP etc.) ───────────────────────────────────

export async function handlePainelModuleBtn(interaction) {
  if (!interaction.memberPermissions?.has(0x20n)) {
    return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
  }

  const { customId } = interaction;
  const guildId = interaction.guildId;

  // ── VIP: remover plano ───────────────────────────────────────────────────
  if (customId.startsWith('pm_vip_plano_del:')) {
    const planId = customId.slice('pm_vip_plano_del:'.length);
    await prisma.vipPlan.delete({ where: { id: planId } }).catch(() => {});
    // Redireciona para handlePainelCfgBtn que reconstrói com voltarRow
    interaction.customId = 'painel_cfg_vip';
    return handlePainelCfgBtn(interaction);
  }

  // ── VIP: adicionar plano (modal) ─────────────────────────────────────────
  if (customId === 'pm_vip_plano_add') {
    const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
    const modal = new ModalBuilder()
      .setCustomId('pm_modal_vip_plano_add')
      .setTitle('Adicionar Plano VIP');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name').setLabel('Nome do Plano').setStyle(TextInputStyle.Short)
          .setRequired(true).setMaxLength(50).setPlaceholder('Ex: VIP Gold'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('price').setLabel('Preço').setStyle(TextInputStyle.Short)
          .setRequired(true).setMaxLength(50).setPlaceholder('Ex: R$ 20/mês'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('emoji').setLabel('Emoji (opcional)').setStyle(TextInputStyle.Short)
          .setRequired(false).setMaxLength(100).setPlaceholder('Ex: ⭐ ou <:vip:123>'),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('roleId').setLabel('ID do Cargo VIP (opcional)').setStyle(TextInputStyle.Short)
          .setRequired(false).setMaxLength(25).setPlaceholder('Ex: 123456789012345678'),
      ),
    );
    return interaction.showModal(modal);
  }
}

// ─── Handler: modais pm_modal_* ───────────────────────────────────────────────

export async function handlePainelModuleModal(interaction) {
  await interaction.deferUpdate();

  const { customId } = interaction;
  const guildId = interaction.guildId;

  // ── VIP: salvar novo plano ───────────────────────────────────────────────
  if (customId === 'pm_modal_vip_plano_add') {
    const name   = interaction.fields.getTextInputValue('name').trim();
    const price  = interaction.fields.getTextInputValue('price').trim();
    const emoji  = interaction.fields.getTextInputValue('emoji').trim() || null;
    const roleId = interaction.fields.getTextInputValue('roleId').trim().replace(/[<@&>]/g, '') || null;

    const count = await prisma.vipPlan.count({ where: { guildId } });
    await prisma.vipPlan.create({
      data: { guildId, name, price, emoji, roleId: roleId || null, position: count },
    });

    const cfg  = await getCfgWithPlans(guildId);
    const base = buildVipConfigPayload(cfg, cfg.vipPlans);
    await interaction.message.edit({
      ...base,
      components: [...base.components, voltarRow()],
    });
  }
}

// ─── Handler: botão "Abrir Funções" / "Atualizar" ────────────────────────────

export async function handlePainelFuncoes(interaction) {
  if (!interaction.memberPermissions?.has(0x20n)) {
    return interaction.reply({ content: '❌ Sem permissão.', flags: 64 });
  }
  const cfg = await getCfg(interaction.guildId);
  return interaction.update(buildPainelFuncoes(interaction.guild, cfg));
}

// ─── Handler: botão "← Voltar ao Painel" ─────────────────────────────────────

export async function handlePainelVoltar(interaction) {
  const cfg = await getCfg(interaction.guildId);
  return interaction.update(buildPainelMain(interaction.guild, cfg));
}

// ─── Handler: select de módulo (mantido por compatibilidade) ─────────────────

export async function handlePainelModuloSel(interaction) {
  // Redireciona para o handler de botão simulando o customId
  interaction.customId = `painel_cfg_${interaction.values[0]}`;
  return handlePainelCfgBtn(interaction);
}

// ─── Handlers: mini-config Instagram ─────────────────────────────────────────

export async function handleInstaCfgBtn(interaction) {
  const { customId } = interaction;

  if (customId === 'insta_cfg_desativar') {
    await prisma.guildConfig.upsert({
      where:  { guildId: interaction.guildId },
      create: { guildId: interaction.guildId },
      update: { instaChannel: null },
    });
    return interaction.update(buildInstaConfigPayload(await getCfg(interaction.guildId)));
  }

  if (customId === 'insta_cfg_sem_cor') {
    await prisma.guildConfig.upsert({
      where:  { guildId: interaction.guildId },
      create: { guildId: interaction.guildId },
      update: { instaColor: null },
    });
    return interaction.update(buildInstaConfigPayload(await getCfg(interaction.guildId)));
  }

  const MODAL_MAP = {
    insta_cfg_canal:  { customId: 'insta_cfg_modal_canal',  title: 'Canal do Feed',         label: 'ID do canal',     max: 30, ph: '123456789012345678' },
    insta_cfg_cor:    { customId: 'insta_cfg_modal_cor',    title: 'Cor da barra lateral',  label: 'Hex sem #',       max: 6,  ph: 'E1306C' },
    insta_cfg_emoji:  { customId: 'insta_cfg_modal_emoji',  title: 'Emoji de curtir',       label: 'Emoji',           max: 32, ph: '💜' },
    insta_cfg_handle: { customId: 'insta_cfg_modal_handle', title: '@ do Instagram',        label: '@ do Instagram',  max: 50, ph: 'fallen.angels' },
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
  let   update = {};

  if      (customId === 'insta_cfg_modal_canal')  update = { instaChannel: value ? value.replace(/[<#>]/g, '') : null };
  else if (customId === 'insta_cfg_modal_cor')    update = { instaColor: value ? value.replace(/^#/, '').toUpperCase().slice(0, 6) : null };
  else if (customId === 'insta_cfg_modal_emoji')  update = { instaEmoji: value ?? '💜' };
  else if (customId === 'insta_cfg_modal_handle') update = { instaHandle: value ? value.replace(/^@/, '') : null };

  await prisma.guildConfig.upsert({
    where:  { guildId: interaction.guildId },
    create: { guildId: interaction.guildId, ...update },
    update,
  });

  const cfg = await getCfg(interaction.guildId);
  await interaction.message.edit(buildInstaConfigPayload(cfg));
}
