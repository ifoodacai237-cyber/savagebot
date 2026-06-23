import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { buildConfigEmbed, Colors } from './embed.js';

// ─── Botões de Config ─────────────────────────────────────────────────────────

export function ticketConfigButtons(cfg = {}) {
  const sepEnabled = cfg.ticketUseSeparator ?? false;
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tcfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_sem_cor').setLabel('Sem Lateral').setEmoji('◻️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_titulo').setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_thumb').setLabel('Thumbnail').setEmoji('📷').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tcfg_botao').setLabel('Botão').setEmoji('🔘').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_rodape').setLabel('Rodapé').setEmoji('👇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_texto').setLabel('Texto').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_abertura').setLabel('Txt Abertura').setEmoji('💬').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_separador').setLabel('Separador').setEmoji('➖').setStyle(sepEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tcfg_categoria').setLabel('Categoria').setEmoji('📂').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tcfg_enviar').setLabel('Enviar Painel').setEmoji('🚀').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tcfg_ping').setLabel('Ping Equipe').setEmoji('🔔').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tcfg_salvar').setLabel('Salvar Preset').setEmoji('💾').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tcfg_carregar').setLabel('Carregar Preset').setEmoji('📂').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2, row3];
}

export function tellonymConfigButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tncfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_sem_cor').setLabel('Sem Lateral').setEmoji('◻️').setStyle(ButtonStyle.Secondary),
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

export function welcomeConfigButtons(enabled = true) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wcfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_sem_cor').setLabel('Sem Lateral').setEmoji('◻️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_titulo').setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_thumb').setLabel('Thumbnail').setEmoji('📷').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wcfg_rodape').setLabel('Rodapé').setEmoji('👇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_texto').setLabel('Texto').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_canal').setLabel('Canal').setEmoji('📣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('wcfg_cargos').setLabel('Cargos').setEmoji('🔔').setStyle(ButtonStyle.Primary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wcfg_canais').setLabel('Canais').setEmoji('🔗').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('wcfg_test').setLabel('Testar').setEmoji('🧪').setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('wcfg_toggle')
      .setLabel(enabled ? 'Desativar' : 'Ativar')
      .setEmoji(enabled ? '🔴' : '🟢')
      .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  );
  return [row1, row2, row3];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_TICKET_TEXT     = '> Clique no botão abaixo para abrir um ticket de suporte.\n> Nossa equipe irá te atender em breve.';
export const DEFAULT_TICKET_OPEN_TEXT = 'Aguarde um instante, em breve um membro da equipe irá lhe atender.';
export const DEFAULT_TELLONYM_TEXT = '> Clique no botão abaixo para enviar uma mensagem.\n> Você poderá escolher entre **anônimo** ou **marcar alguém**.';
export const DEFAULT_WELCOME_TITLE = '👋 Bem-vindo(a) ao {server}!';
export const DEFAULT_WELCOME_TEXT  = '> Seja bem-vindo(a), {user}!\n> Esperamos que você tenha uma ótima experiência aqui.\n> Você é o membro nº **{count}**!';

export const DEFAULT_QUESTIONS = [
  'Qual é o assunto do ticket?',
  'Descreva o problema com detalhes',
  'Há alguma informação adicional relevante?',
];

// ─── Payload builders ─────────────────────────────────────────────────────────

const BTN_STYLE_LABELS = { Primary: '🔵 Azul (Primary)', Secondary: '⚫ Cinza (Secondary)', Success: '🟢 Verde (Success)', Danger: '🔴 Vermelho (Danger)' };

export function buildTicketConfigPayload(cfg) {
  const color = cfg.ticketColor ? (parseInt(cfg.ticketColor, 16) || Colors.PRIMARY) : Colors.PRIMARY;
  const texto   = cfg.ticketText    || DEFAULT_TICKET_TEXT;
  const openText = cfg.ticketOpenText || DEFAULT_TICKET_OPEN_TEXT;

  const btnStyleLabel = BTN_STYLE_LABELS[cfg.ticketBtnStyle] ?? '🔵 Azul (Primary)';
  const sepStatus = cfg.ticketUseSeparator ? '✅ Ativado' : '❌ Desativado';

  const configEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🎫 Configuração — Tickets')
    .setDescription('Edite cada campo pelos botões abaixo. O preview atualiza a cada alteração.')
    .addFields(
      { name: '🎨 Cor',        value: cfg.ticketColor    ? `\`#${cfg.ticketColor}\`` : '*(sem lateral)*',          inline: true },
      { name: '📝 Título',     value: cfg.ticketTitle    || '*(não definido)*',                                  inline: true },
      { name: '👇 Rodapé',     value: cfg.ticketFooter   || '*(não definido)*',                                  inline: true },
      { name: '🖼️ Banner',    value: cfg.ticketBanner   ? '✅ definido' : '*(não definido)*',                  inline: true },
      { name: '📷 Thumbnail',  value: cfg.ticketThumb    ? '✅ definido' : '*(não definido)*',                  inline: true },
      { name: '📂 Categoria',  value: cfg.ticketCategory ? `<#${cfg.ticketCategory}>` : '*(não definido)*',    inline: true },
      { name: '🔔 Ping Equipe',value: cfg.ticketPingRole ? `<@&${cfg.ticketPingRole}>` : '*(desativado)*',     inline: true },
      { name: '🔘 Botão',      value: `\`${cfg.ticketBtnLabel || 'Abrir Ticket'}\` ${cfg.ticketBtnEmoji || '🎫'} — ${btnStyleLabel}`, inline: true },
      { name: '➖ Separador',   value: sepStatus,                                                                inline: true },
      { name: '✏️ Texto (Painel)', value: texto.length > 100 ? texto.slice(0, 97) + '...' : texto,             inline: false },
      { name: '💬 Texto (Abertura)', value: openText.length > 100 ? openText.slice(0, 97) + '...' : openText,  inline: false },
    );

  const previewEmbed = buildConfigEmbed({
    color: cfg.ticketColor, banner: cfg.ticketBanner,
    thumbnail: cfg.ticketThumb, footer: cfg.ticketFooter,
    title: cfg.ticketTitle, description: texto,
  }).setAuthor({ name: '👁️ Preview — como o painel vai aparecer' });

  return { embeds: [configEmbed, previewEmbed], components: ticketConfigButtons(cfg) };
}

export function buildTellonymConfigPayload(cfg) {
  const color = cfg.tellonymColor ? (parseInt(cfg.tellonymColor, 16) || Colors.TELLONYM) : Colors.TELLONYM;
  const texto = cfg.tellonymText ?? DEFAULT_TELLONYM_TEXT;

  const configEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('💌 Configuração — Tellonym')
    .setDescription('Edite cada campo pelos botões abaixo. O preview atualiza a cada alteração.')
    .addFields(
      { name: '🎨 Cor',       value: cfg.tellonymColor   ? `\`#${cfg.tellonymColor}\`` : '*(sem lateral)*',        inline: true },
      { name: '📝 Título',    value: cfg.tellonymTitle    || '*(não definido)*',                                 inline: true },
      { name: '👇 Rodapé',    value: cfg.tellonymFooter   || '*(não definido)*',                                 inline: true },
      { name: '🖼️ Banner',   value: cfg.tellonymBanner   ? '✅ definido' : '*(não definido)*',                 inline: true },
      { name: '📷 Thumbnail', value: cfg.tellonymThumb    ? '✅ definido' : '*(não definido)*',                 inline: true },
      { name: '📣 Canal',     value: cfg.tellonymChannel  ? `<#${cfg.tellonymChannel}>` : '*(não definido)*',  inline: true },
      { name: '✏️ Texto',     value: texto.length > 100   ? texto.slice(0, 97) + '...' : texto,                 inline: false },
    );

  const previewEmbed = buildConfigEmbed({
    color: cfg.tellonymColor, banner: cfg.tellonymBanner,
    thumbnail: cfg.tellonymThumb, footer: cfg.tellonymFooter,
    title: cfg.tellonymTitle, description: texto,
  }).setAuthor({ name: '👁️ Preview — como o painel vai aparecer' });

  return { embeds: [configEmbed, previewEmbed], components: tellonymConfigButtons() };
}

export function buildWelcomeConfigPayload(cfg) {
  const color    = cfg.welcomeColor ? (parseInt(cfg.welcomeColor, 16) || 0x5865F2) : 0x5865F2;
  const titulo   = cfg.welcomeTitle ?? DEFAULT_WELCOME_TITLE;
  const texto    = cfg.welcomeText  ?? DEFAULT_WELCOME_TEXT;
  const enabled  = cfg.welcomeEnabled ?? true;

  const rolesStr = cfg.welcomeRoles
    ? cfg.welcomeRoles.split(',').filter(Boolean).map(id => `<@&${id.trim()}>`).join(' ') || '*(nenhum)*'
    : '*(nenhum)*';
  const chansStr = cfg.welcomeChannels
    ? cfg.welcomeChannels.split(',').filter(Boolean).map(id => `<#${id.trim()}>`).join(' ') || '*(nenhum)*'
    : '*(nenhum)*';

  const configEmbed = new EmbedBuilder()
    .setColor(enabled ? color : 0x6B6B6B)
    .setTitle('🎉 Configuração — Boas-Vindas')
    .setDescription(
      (enabled ? '✅ **Sistema ATIVO**' : '🔴 **Sistema DESATIVADO**') +
      '\nConfigure a mensagem de boas-vindas. Placeholders disponíveis:\n' +
      '`{user}` `{username}` `{server}` `{count}`',
    )
    .addFields(
      { name: '🎨 Cor',          value: cfg.welcomeColor   ? `\`#${cfg.welcomeColor}\`` : '*(sem lateral)*',         inline: true },
      { name: '📝 Título',       value: titulo.length > 50 ? titulo.slice(0, 47) + '...' : titulo,               inline: true },
      { name: '👇 Rodapé',       value: cfg.welcomeFooter  || '*(não definido)*',                                inline: true },
      { name: '🖼️ Banner',      value: cfg.welcomeBanner  ? '✅ definido' : '*(avatar do usuário)*',           inline: true },
      { name: '📷 Thumbnail',    value: cfg.welcomeThumb   ? '✅ definido' : '*(avatar do usuário)*',           inline: true },
      { name: '📣 Canal',        value: cfg.welcomeChannel ? `<#${cfg.welcomeChannel}>` : '*(não definido)*',   inline: true },
      { name: '🔔 Cargos',       value: rolesStr,                                                                 inline: true },
      { name: '🔗 Canais',       value: chansStr,                                                                 inline: true },
      { name: '✏️ Texto',        value: texto.length > 120 ? texto.slice(0, 117) + '...' : texto,               inline: false },
    );

  const previewDesc = texto
    .replace(/\{user\}/g,     '`@NovoMembro`')
    .replace(/\{username\}/g, 'NovoMembro')
    .replace(/\{server\}/g,   cfg.guildName ?? 'Servidor')
    .replace(/\{count\}/g,    '1.234');

  const previewTitle = titulo
    .replace(/\{server\}/g, cfg.guildName ?? 'Servidor')
    .replace(/\{username\}/g, 'NovoMembro')
    .replace(/\{count\}/g,   '1.234');

  const previewEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(previewTitle)
    .setDescription(previewDesc)
    .setTimestamp()
    .setAuthor({ name: '👁️ Preview — como a mensagem vai aparecer' });

  if (cfg.welcomeBanner) previewEmbed.setImage(cfg.welcomeBanner);
  if (cfg.welcomeThumb)  previewEmbed.setThumbnail(cfg.welcomeThumb);
  if (cfg.welcomeFooter) {
    const footerText = cfg.welcomeFooter
      .replace(/\{server\}/g,   cfg.guildName ?? 'Servidor')
      .replace(/\{username\}/g, 'NovoMembro')
      .replace(/\{count\}/g,    '1.234');
    previewEmbed.setFooter({ text: footerText });
  }

  return { embeds: [configEmbed, previewEmbed], components: welcomeConfigButtons(enabled) };
}
