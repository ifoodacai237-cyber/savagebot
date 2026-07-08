import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import prisma from '../database/client.js';

// Valida emoji antes de enviar à API — IDs de emoji customizado inválidos causam COMPONENT_INVALID_EMOJI
function parseEmoji(raw) {
  if (!raw) return null;
  const s = raw.trim();
  const match = s.match(/^<(a?):([^:>\s]+):(\d+)>$/);
  if (match) {
    const id = match[3];
    if (id.length < 17 || id.length > 20) return null;
    return { animated: match[1] === 'a', name: match[2], id };
  }
  return s || null;
}

// ─── Painel de gestão de opções do menu de ticket ─────────────────────────────

export async function buildMenuOptsPanel(guildId, client = null) {
  const options = await prisma.ticketOption.findMany({
    where: { guildId },
    orderBy: { order: 'asc' },
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Ticket — Opções do Menu')
    .setDescription(
      options.length === 0
        ? '📭 Nenhuma opção criada ainda.\nClique em **Adicionar** para criar a primeira.'
        : `**${options.length}** opção(ões) configurada(s).\nSelecione uma para editar ou excluir.`,
    );

  if (options.length > 0) {
    embed.addFields(
      options.map(o => ({
        name: `${o.emoji || '🎫'} ${o.label}`,
        value: [
          o.description ? `*${o.description}*` : '',
          o.pingRole
            ? `🔔 Cargos: ${o.pingRole.split(',').map(r => `<@&${r.trim()}>`).join(' ')}`
            : '',
          o.pingUser
            ? `👤 Usuários: ${o.pingUser.split(',').map(u => `<@${u.trim()}>`).join(' ')}`
            : '',
        ].filter(Boolean).join('\n') || '*(sem pings configurados)*',
        inline: false,
      })),
    );
  }

  const rows = [];

  if (options.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId('tcfg_menu_opt_sel')
      .setPlaceholder('Selecione uma opção para gerenciar…')
      .addOptions(
        options.map(o => {
          const opt = new StringSelectMenuOptionBuilder()
            .setLabel(o.label.slice(0, 100))
            .setValue(o.id)
            .setDescription((o.description?.slice(0, 100)) || 'Clique para editar ou excluir');
          const emoji = parseEmoji(o.emoji);
          if (emoji) {
            if (typeof emoji === 'string') {
              try { opt.setEmoji(emoji); } catch {}
            } else if (client?.emojis?.cache?.has(emoji.id)) {
              try { opt.setEmoji(emoji); } catch {}
            }
            // customizado sem acesso → omite (evita COMPONENT_INVALID_EMOJI)
          }
          return opt;
        }),
      );
    rows.push(new ActionRowBuilder().addComponents(select));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tcfg_menu_opt_add')
        .setLabel('Adicionar Opção')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('tcfg_menu_back')
        .setLabel('Voltar')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { embeds: [embed], components: rows };
}

// ─── Painel de detalhes de uma opção ──────────────────────────────────────────

export async function buildOptionDetailPanel(option) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${option.emoji || '🎫'} ${option.label}`)
    .addFields(
      {
        name: '📝 Descrição',
        value: option.description || '*(não definida)*',
        inline: false,
      },
      {
        name: '🔔 Ping Cargos',
        value: option.pingRole
          ? option.pingRole.split(',').map(r => `<@&${r.trim()}>`).join(' ')
          : '*(nenhum)*',
        inline: true,
      },
      {
        name: '👤 Ping Usuários',
        value: option.pingUser
          ? option.pingUser.split(',').map(u => `<@${u.trim()}>`).join(' ')
          : '*(nenhum)*',
        inline: true,
      },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tcfg_menu_opt_edit:${option.id}`)
      .setLabel('Editar')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`tcfg_menu_opt_del:${option.id}`)
      .setLabel('Excluir')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('tcfg_menu_opts')
      .setLabel('Voltar')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

// ─── Modal de adição de opção ─────────────────────────────────────────────────

export function buildAddOptionModal() {
  const modal = new ModalBuilder()
    .setCustomId('tcfg_menu_modal_add')
    .setTitle('➕ Nova Opção do Menu de Ticket');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_label')
        .setLabel('Nome da opção (aparece no menu)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Suporte Geral, Vendas, Parcerias…')
        .setMaxLength(100)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_emoji')
        .setLabel('Emoji (unicode ou ID de emoji customizado)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 🎫  ou  <:nome:123456789>')
        .setMaxLength(64)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_desc')
        .setLabel('Descrição (aparece abaixo do nome no menu)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Problemas com contas e acessos')
        .setMaxLength(100)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_ping_role')
        .setLabel('IDs de Cargos a pingar (um por linha)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('123456789\n987654321')
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_ping_user')
        .setLabel('IDs de Usuários a pingar (um por linha)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('111222333\n444555666')
        .setRequired(false),
    ),
  );

  return modal;
}

// ─── Modal de edição de opção ─────────────────────────────────────────────────

export function buildEditOptionModal(option) {
  const modal = new ModalBuilder()
    .setCustomId(`tcfg_menu_modal_edit:${option.id}`)
    .setTitle('✏️ Editar Opção do Menu');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_label')
        .setLabel('Nome da opção')
        .setStyle(TextInputStyle.Short)
        .setValue(option.label)
        .setMaxLength(100)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_emoji')
        .setLabel('Emoji')
        .setStyle(TextInputStyle.Short)
        .setValue(option.emoji || '')
        .setMaxLength(64)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_desc')
        .setLabel('Descrição')
        .setStyle(TextInputStyle.Short)
        .setValue(option.description || '')
        .setMaxLength(100)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_ping_role')
        .setLabel('IDs de Cargos (um por linha)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(option.pingRole ? option.pingRole.split(',').join('\n') : '')
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('opt_ping_user')
        .setLabel('IDs de Usuários (um por linha)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(option.pingUser ? option.pingUser.split(',').join('\n') : '')
        .setRequired(false),
    ),
  );

  return modal;
}

// ─── Parse de IDs de um campo de texto (um por linha) ────────────────────────

export function parseIdList(raw) {
  if (!raw) return '';
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => /^\d+$/.test(s))
    .join(',');
}
