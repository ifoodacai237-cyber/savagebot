import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { buildConfigEmbed, Colors } from './embed.js';

// ─── Botões de Config ─────────────────────────────────────────────────────────

export function ticketConfigButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tcfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_titulo').setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_thumb').setLabel('Thumbnail').setEmoji('📷').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tcfg_rodape').setLabel('Rodapé').setEmoji('👇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_texto').setLabel('Texto').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_categoria').setLabel('Categoria').setEmoji('📂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tcfg_enviar').setLabel('Enviar Painel').setEmoji('🚀').setStyle(ButtonStyle.Success),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tcfg_salvar').setLabel('Salvar Preset').setEmoji('💾').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_carregar').setLabel('Carregar Preset').setEmoji('📂').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2, row3];
}

export function tellonymConfigButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tncfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_titulo').setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_thumb').setLabel('Thumbnail').setEmoji('📷').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tncfg_rodape').setLabel('Rodapé').setEmoji('👇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_texto').setLabel('Texto').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_canal').setLabel('Canal').setEmoji('📣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tncfg_enviar').setLabel('Enviar Painel').setEmoji('🚀').setStyle(ButtonStyle.Success),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tncfg_salvar').setLabel('Salvar Preset').setEmoji('💾').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_carregar').setLabel('Carregar Preset').setEmoji('📂').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2, row3];
}

// ─── Payload builders ─────────────────────────────────────────────────────────

export const DEFAULT_TICKET_TEXT = '> Clique no botão abaixo para abrir um ticket de suporte.\n> Nossa equipe irá te atender em breve.';
export const DEFAULT_TELLONYM_TEXT = '> Clique no botão abaixo para enviar uma mensagem.\n> Você poderá escolher entre **anônimo** ou **marcar alguém**.';

export function buildTicketConfigPayload(cfg) {
  const color = cfg.ticketColor ? (parseInt(cfg.ticketColor, 16) || Colors.PRIMARY) : Colors.PRIMARY;
  const texto = cfg.ticketText ?? DEFAULT_TICKET_TEXT;

  const configEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🎫 Configuração — Tickets')
    .setDescription('Edite cada campo pelos botões abaixo. O preview atualiza a cada alteração.')
    .addFields(
      { name: '🎨 Cor',       value: cfg.ticketColor ? `\`#${cfg.ticketColor}\`` : '*(sem cor)*',             inline: true },
      { name: '📝 Título',    value: cfg.ticketTitle  || '*(não definido)*',                                   inline: true },
      { name: '👇 Rodapé',    value: cfg.ticketFooter || '*(não definido)*',                                   inline: true },
      { name: '🖼️ Banner',   value: cfg.ticketBanner  ? '✅ definido' : '*(não definido)*',                  inline: true },
      { name: '📷 Thumbnail', value: cfg.ticketThumb   ? '✅ definido' : '*(não definido)*',                  inline: true },
      { name: '📂 Categoria', value: cfg.ticketCategory ? `<#${cfg.ticketCategory}>` : '*(não definido)*',    inline: true },
      { name: '✏️ Texto do Painel', value: cfg.ticketText ? (texto.length > 100 ? texto.slice(0, 97) + '...' : texto) : '*(padrão)*', inline: false },
    );

  const previewEmbed = buildConfigEmbed({
    color:       cfg.ticketColor,
    banner:      cfg.ticketBanner,
    thumbnail:   cfg.ticketThumb,
    footer:      cfg.ticketFooter,
    title:       cfg.ticketTitle,
    description: texto,
  }).setAuthor({ name: '👁️ Preview — como o painel vai aparecer' });

  return { embeds: [configEmbed, previewEmbed], components: ticketConfigButtons() };
}

export function buildTellonymConfigPayload(cfg) {
  const color = cfg.tellonymColor ? (parseInt(cfg.tellonymColor, 16) || Colors.TELLONYM) : Colors.TELLONYM;
  const texto = cfg.tellonymText ?? DEFAULT_TELLONYM_TEXT;

  const configEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('💌 Configuração — Tellonym')
    .setDescription('Edite cada campo pelos botões abaixo. O preview atualiza a cada alteração.')
    .addFields(
      { name: '🎨 Cor',       value: cfg.tellonymColor ? `\`#${cfg.tellonymColor}\`` : '*(sem cor)*',          inline: true },
      { name: '📝 Título',    value: cfg.tellonymTitle  || '*(não definido)*',                                  inline: true },
      { name: '👇 Rodapé',    value: cfg.tellonymFooter || '*(não definido)*',                                  inline: true },
      { name: '🖼️ Banner',   value: cfg.tellonymBanner  ? '✅ definido' : '*(não definido)*',                 inline: true },
      { name: '📷 Thumbnail', value: cfg.tellonymThumb   ? '✅ definido' : '*(não definido)*',                 inline: true },
      { name: '📣 Canal',     value: cfg.tellonymChannel ? `<#${cfg.tellonymChannel}>` : '*(não definido)*',   inline: true },
      { name: '✏️ Texto do Painel', value: cfg.tellonymText ? (texto.length > 100 ? texto.slice(0, 97) + '...' : texto) : '*(padrão)*', inline: false },
    );

  const previewEmbed = buildConfigEmbed({
    color:       cfg.tellonymColor,
    banner:      cfg.tellonymBanner,
    thumbnail:   cfg.tellonymThumb,
    footer:      cfg.tellonymFooter,
    title:       cfg.tellonymTitle,
    description: texto,
  }).setAuthor({ name: '👁️ Preview — como o painel vai aparecer' });

  return { embeds: [configEmbed, previewEmbed], components: tellonymConfigButtons() };
}
