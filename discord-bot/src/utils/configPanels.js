import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from 'discord.js';
import { buildConfigEmbed, Colors } from './embed.js';

// ─── Botão de abrir ticket ────────────────────────────────────────────────────

const BTN_STYLE_MAP = {
  Primary:   ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success:   ButtonStyle.Success,
  Danger:    ButtonStyle.Danger,
};

export function buildTicketOpenButton(cfg) {
  const label    = cfg.ticketBtnLabel || 'Abrir Ticket';
  const emojiRaw = (cfg.ticketBtnEmoji || '🎫').trim();
  const style    = BTN_STYLE_MAP[cfg.ticketBtnStyle] ?? ButtonStyle.Primary;
  const btn = new ButtonBuilder().setCustomId('ticket_open').setLabel(label).setStyle(style);
  const match = emojiRaw.match(/^<(a?):([^:>\s]+):(\d+)>$/);
  if (match) btn.setEmoji({ animated: match[1] === 'a', name: match[2], id: match[3] });
  else if (emojiRaw) btn.setEmoji(emojiRaw);
  return btn;
}

// ─── Painel público V2 (sem barra lateral quando sem cor) ─────────────────────

export function buildTicketPanelV2(cfg) {
  const container = new ContainerBuilder();

  // Só define accentColor se o admin configurou uma cor — sem cor = sem barra lateral
  if (cfg.ticketColor) {
    const parsed = parseInt(cfg.ticketColor, 16);
    if (!isNaN(parsed)) container.setAccentColor(parsed);
  }

  const base = cfg.ticketText ?? DEFAULT_TICKET_TEXT;
  const body = cfg.ticketUseSeparator
    ? `──────────────────────────────────\n\n${base}`
    : base;

  const titleLine = cfg.ticketTitle ? `## ${cfg.ticketTitle}\n\n` : '';
  const fullText  = `${titleLine}${body}`;

  if (cfg.ticketBanner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(cfg.ticketBanner)),
    );
  }

  if (cfg.ticketThumb) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(cfg.ticketThumb));
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText));
  }

  if (cfg.ticketFooter) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${cfg.ticketFooter}`));
  }

  const row = new ActionRowBuilder().addComponents(buildTicketOpenButton(cfg));
  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}

export function buildTellonymPanelV2(cfg) {
  const container = new ContainerBuilder();

  // Só define accentColor se o admin configurou uma cor — sem cor = sem barra lateral
  if (cfg.tellonymColor) {
    const parsed = parseInt(cfg.tellonymColor, 16);
    if (!isNaN(parsed)) container.setAccentColor(parsed);
  }

  // null = nunca configurado → usa texto padrão; '' = usuário limpou → sem texto
  const body      = (cfg.tellonymText == null) ? DEFAULT_TELLONYM_TEXT : cfg.tellonymText;
  const titleLine = cfg.tellonymTitle ? `## ${cfg.tellonymTitle}\n\n` : '';
  const fullText  = `${titleLine}${body}`.trim();

  if (cfg.tellonymBanner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(cfg.tellonymBanner)),
    );
  }

  if (fullText) {
    if (cfg.tellonymThumb) {
      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(cfg.tellonymThumb));
      container.addSectionComponents(section);
    } else {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText));
    }
  }

  if (cfg.tellonymFooter) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${cfg.tellonymFooter}`));
  }

  const btnLabel = cfg.tellonymBtnLabel?.trim() || 'Enviar Mensagem';
  const btnEmoji = cfg.tellonymBtnEmoji?.trim() || '💌';
  const sendBtn = new ButtonBuilder().setCustomId('tellonym_send').setLabel(btnLabel).setStyle(ButtonStyle.Secondary);
  try { sendBtn.setEmoji(btnEmoji); } catch { sendBtn.setEmoji('💌'); }
  const row = new ActionRowBuilder().addComponents(sendBtn);
  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}

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
    new ButtonBuilder().setCustomId('tcfg_ping').setLabel('Ping Cargos').setEmoji('🔔').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tcfg_ping_user').setLabel('Ping Usuários').setEmoji('👤').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tcfg_salvar').setLabel('Salvar Preset').setEmoji('💾').setStyle(ButtonStyle.Secondary),
  );
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tcfg_carregar').setLabel('Carregar Preset').setEmoji('📂').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2, row3, row4];
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
    new ButtonBuilder().setCustomId('tncfg_botao').setLabel('Botão').setEmoji('🔘').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_canal').setLabel('Canal').setEmoji('📣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tncfg_enviar').setLabel('Enviar Painel').setEmoji('🚀').setStyle(ButtonStyle.Success),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tncfg_salvar').setLabel('Salvar Preset').setEmoji('💾').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tncfg_carregar').setLabel('Carregar Preset').setEmoji('📂').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2, row3];
}

export function formatDeleteTime(seconds) {
  if (!seconds) return 'Desativado';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s}s`;
}

export function welcomeConfigButtons(cfg = {}) {
  const enabled    = cfg.welcomeEnabled ?? true;
  const sepOn      = cfg.welcomeUseDivider ?? false;
  const bannerPos  = cfg.welcomeBannerPosition ?? 'top';
  const showTitle  = cfg.welcomeShowTitle  ?? true;
  const showAvatar = cfg.welcomeShowAvatar ?? true;
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wcfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_sem_cor').setLabel('Sem Lateral').setEmoji('◻️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_titulo').setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_banner_pos').setLabel(bannerPos === 'top' ? 'Banner ⬆️ Cima' : 'Banner ⬇️ Baixo').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wcfg_thumb').setLabel('Thumbnail').setEmoji('📷').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_rodape').setLabel('Rodapé').setEmoji('👇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_texto').setLabel('Texto').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_separador').setLabel('Divisória').setEmoji('➖').setStyle(sepOn ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('wcfg_canal').setLabel('Canal').setEmoji('📣').setStyle(ButtonStyle.Primary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wcfg_cargos').setLabel('Cargos').setEmoji('🔔').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('wcfg_canais').setLabel('Canais').setEmoji('🔗').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('wcfg_toggle_titulo').setLabel(showTitle ? 'Sem Título' : 'Com Título').setEmoji(showTitle ? '🔤' : '✖️').setStyle(showTitle ? ButtonStyle.Secondary : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('wcfg_toggle_avatar').setLabel(showAvatar ? 'Sem Avatar' : 'Com Avatar').setEmoji(showAvatar ? '👤' : '✖️').setStyle(showAvatar ? ButtonStyle.Secondary : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('wcfg_test').setLabel('Testar').setEmoji('🧪').setStyle(ButtonStyle.Success),
  );
  const deleteAfter = cfg.welcomeDeleteAfter ?? null;
  const deleteLabel = deleteAfter ? `⏱️ Sumir: ${formatDeleteTime(deleteAfter)}` : '⏱️ Sumir: Desativado';
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('wcfg_sumir').setLabel(deleteLabel).setStyle(deleteAfter ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('wcfg_toggle')
      .setLabel(enabled ? 'Desativar Sistema' : 'Ativar Sistema')
      .setEmoji(enabled ? '🔴' : '🟢')
      .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  );
  return [row1, row2, row3, row4];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_TICKET_TEXT      = '> Clique no botão abaixo para abrir um ticket de suporte.\n> Nossa equipe irá te atender em breve.';
export const DEFAULT_TICKET_OPEN_TEXT = 'Aguarde um instante, em breve um membro da equipe irá lhe atender.';
export const DEFAULT_TELLONYM_TEXT    = '> Clique no botão abaixo para enviar uma mensagem.\n> Você poderá escolher entre **anônimo** ou **marcar alguém**.';
export const DEFAULT_WELCOME_TITLE    = '👋 Bem-vindo(a) ao {server}!';
export const DEFAULT_WELCOME_TEXT     = '> Seja bem-vindo(a), {user}!\n> Esperamos que você tenha uma ótima experiência aqui.\n> Você é o membro nº **{count}**!';

export const DEFAULT_QUESTIONS = [
  'Qual é o assunto do ticket?',
  'Descreva o problema com detalhes',
  'Há alguma informação adicional relevante?',
];

// ─── Payload builders (painel de configuração admin) ─────────────────────────

const BTN_STYLE_LABELS = {
  Primary:   '🔵 Azul (Primary)',
  Secondary: '⚫ Cinza (Secondary)',
  Success:   '🟢 Verde (Success)',
  Danger:    '🔴 Vermelho (Danger)',
};

export function buildTicketConfigPayload(cfg) {
  const color = cfg.ticketColor ? (parseInt(cfg.ticketColor, 16) || Colors.PRIMARY) : Colors.PRIMARY;
  const texto    = cfg.ticketText    || DEFAULT_TICKET_TEXT;
  const openText = cfg.ticketOpenText || DEFAULT_TICKET_OPEN_TEXT;

  const btnStyleLabel = BTN_STYLE_LABELS[cfg.ticketBtnStyle] ?? '🔵 Azul (Primary)';
  const sepStatus     = cfg.ticketUseSeparator ? '✅ Ativado' : '❌ Desativado';
  const semLateral    = !cfg.ticketColor;

  const configEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🎫 Configuração — Tickets')
    .setDescription('Edite cada campo pelos botões abaixo. O preview atualiza a cada alteração.')
    .addFields(
      { name: '🎨 Cor',          value: cfg.ticketColor  ? `\`#${cfg.ticketColor}\`` : '*(sem lateral)*', inline: true },
      { name: '📝 Título',       value: cfg.ticketTitle  || '*(não definido)*',                           inline: true },
      { name: '👇 Rodapé',       value: cfg.ticketFooter || '*(não definido)*',                           inline: true },
      { name: '🖼️ Banner',      value: cfg.ticketBanner ? '✅ definido' : '*(não definido)*',            inline: true },
      { name: '📷 Thumbnail',    value: cfg.ticketThumb  ? '✅ definido' : '*(não definido)*',            inline: true },
      { name: '📂 Categoria',    value: cfg.ticketCategory ? `<#${cfg.ticketCategory}>` : '*(não definido)*', inline: true },
      { name: '🔔 Ping Cargos',   value: cfg.ticketPingRole ? cfg.ticketPingRole.split(',').map(id => `<@&${id.trim()}>`).join(' ') : '*(desativado)*', inline: true },
      { name: '👤 Ping Usuários', value: cfg.ticketPingUser ? cfg.ticketPingUser.split(',').map(id => `<@${id.trim()}>`).join(' ') : '*(desativado)*', inline: true },
      { name: '🔘 Botão',        value: `\`${cfg.ticketBtnLabel || 'Abrir Ticket'}\` ${cfg.ticketBtnEmoji || '🎫'} — ${btnStyleLabel}`, inline: true },
      { name: '➖ Separador',     value: sepStatus,                                                        inline: true },
      { name: '✏️ Texto (Painel)',    value: texto.length > 100   ? texto.slice(0, 97) + '...'   : texto,   inline: false },
      { name: '💬 Texto (Abertura)', value: openText.length > 100 ? openText.slice(0, 97) + '...' : openText, inline: false },
    );

  const previewEmbed = buildConfigEmbed({
    color: semLateral ? null : cfg.ticketColor,
    banner: cfg.ticketBanner, thumbnail: cfg.ticketThumb,
    footer: cfg.ticketFooter, title: cfg.ticketTitle, description: texto,
  }).setAuthor({ name: semLateral ? '👁️ Preview — sem barra lateral' : '👁️ Preview — como o painel vai aparecer' });

  return { embeds: [configEmbed, previewEmbed], components: ticketConfigButtons(cfg) };
}

export function buildTellonymConfigPayload(cfg) {
  const color = cfg.tellonymColor ? (parseInt(cfg.tellonymColor, 16) || Colors.TELLONYM) : Colors.TELLONYM;
  const texto = cfg.tellonymText ?? DEFAULT_TELLONYM_TEXT;
  const semLateral = !cfg.tellonymColor;

  const configEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('💌 Configuração — Tellonym')
    .setDescription('Edite cada campo pelos botões abaixo. O preview atualiza a cada alteração.')
    .addFields(
      { name: '🎨 Cor',       value: cfg.tellonymColor  ? `\`#${cfg.tellonymColor}\`` : '*(sem lateral)*', inline: true },
      { name: '📝 Título',    value: cfg.tellonymTitle   || '*(não definido)*',                             inline: true },
      { name: '👇 Rodapé',    value: cfg.tellonymFooter  || '*(não definido)*',                             inline: true },
      { name: '🖼️ Banner',   value: cfg.tellonymBanner  ? '✅ definido' : '*(não definido)*',              inline: true },
      { name: '📷 Thumbnail', value: cfg.tellonymThumb   ? '✅ definido' : '*(não definido)*',              inline: true },
      { name: '📣 Canal',     value: cfg.tellonymChannel ? `<#${cfg.tellonymChannel}>` : '*(não definido)*', inline: true },
      { name: '✏️ Texto',     value: texto.length > 100  ? texto.slice(0, 97) + '...' : texto,              inline: false },
    );

  const previewEmbed = buildConfigEmbed({
    color: semLateral ? null : cfg.tellonymColor,
    banner: cfg.tellonymBanner, thumbnail: cfg.tellonymThumb,
    footer: cfg.tellonymFooter, title: cfg.tellonymTitle, description: texto,
  }).setAuthor({ name: semLateral ? '👁️ Preview — sem barra lateral' : '👁️ Preview — como o painel vai aparecer' });

  return { embeds: [configEmbed, previewEmbed], components: tellonymConfigButtons() };
}

export function buildWelcomeV2(cfg, vars) {
  const titulo = cfg.welcomeTitle ?? DEFAULT_WELCOME_TITLE;
  const texto  = cfg.welcomeText  ?? DEFAULT_WELCOME_TEXT;
  const bannerPos = cfg.welcomeBannerPosition ?? 'top';

  const replaceVars = str => str
    .replace(/\{user\}/g,     vars.user)
    .replace(/\{username\}/g, vars.username)
    .replace(/\{server\}/g,   vars.server)
    .replace(/\{count\}/g,    vars.count);

  const showTitle  = cfg.welcomeShowTitle  ?? true;
  const showAvatar = cfg.welcomeShowAvatar ?? true;

  const SEP = '──────────────────────────────────';
  const titleResolved = replaceVars(titulo);
  const textResolved  = replaceVars(texto).replace(/\{sep\}/g, SEP);
  const hasSepInText  = textResolved.includes(SEP);
  const sepLine = (!hasSepInText && cfg.welcomeUseDivider) ? `${SEP}\n\n` : '';
  const titleLine = showTitle ? `## ${titleResolved}\n\n` : '';
  const fullText = `${titleLine}${sepLine}${textResolved}`;

  const container = new ContainerBuilder();

  if (cfg.welcomeColor) {
    const parsed = parseInt(cfg.welcomeColor, 16);
    if (!isNaN(parsed)) container.setAccentColor(parsed);
  }

  // Banner no topo
  if (cfg.welcomeBanner && bannerPos === 'top') {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(cfg.welcomeBanner)),
    );
  }

  const thumbUrl = cfg.welcomeThumb || (showAvatar ? vars.avatarUrl : null) || null;
  if (thumbUrl) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl));
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fullText));
  }

  // Banner embaixo
  if (cfg.welcomeBanner && bannerPos === 'bottom') {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(cfg.welcomeBanner)),
    );
  }

  if (cfg.welcomeFooter) {
    const footerText = replaceVars(cfg.welcomeFooter);
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footerText}`));
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function buildWelcomeConfigPayload(cfg) {
  const titulo  = cfg.welcomeTitle ?? DEFAULT_WELCOME_TITLE;
  const texto   = cfg.welcomeText  ?? DEFAULT_WELCOME_TEXT;
  const enabled = cfg.welcomeEnabled ?? true;
  const sepOn   = cfg.welcomeUseDivider ?? false;

  const rolesStr = cfg.welcomeRoles
    ? cfg.welcomeRoles.split(',').filter(Boolean).map(id => `<@&${id.trim()}>`).join(' ') || '*(nenhum)*'
    : '*(nenhum)*';
  const chansStr = cfg.welcomeChannels
    ? cfg.welcomeChannels.split(',').filter(Boolean).map(id => `<#${id.trim()}>`).join(' ') || '*(nenhum)*'
    : '*(nenhum)*';

  const color = cfg.welcomeColor ? (parseInt(cfg.welcomeColor, 16) || 0x5865F2) : 0x5865F2;

  const configEmbed = new EmbedBuilder()
    .setColor(enabled ? color : 0x6B6B6B)
    .setTitle('🎉 Configuração — Boas-Vindas (V2)')
    .setDescription(
      (enabled ? '✅ **Sistema ATIVO**' : '🔴 **Sistema DESATIVADO**') +
      '\nMensagem enviada como componente V2. Placeholders:\n' +
      '`{user}` `{username}` `{server}` `{count}`\n' +
      '`{sep}` — divisória na posição que você quiser no texto',
    )
    .addFields(
      { name: '🎨 Cor',       value: cfg.welcomeColor  ? `\`#${cfg.welcomeColor}\`` : '*(sem lateral)*',   inline: true },
      { name: '📝 Título',    value: titulo.length > 50 ? titulo.slice(0, 47) + '...' : titulo,            inline: true },
      { name: '👇 Rodapé',    value: cfg.welcomeFooter  || '*(não definido)*',                              inline: true },
      { name: '🖼️ Banner',   value: cfg.welcomeBanner  ? `✅ definido — ${(cfg.welcomeBannerPosition ?? 'top') === 'top' ? '⬆️ cima' : '⬇️ baixo'}` : '*(não definido)*', inline: true },
      { name: '📷 Thumbnail', value: cfg.welcomeThumb   ? '✅ definido' : '*(avatar do usuário)*',         inline: true },
      { name: '📣 Canal',     value: cfg.welcomeChannel ? `<#${cfg.welcomeChannel}>` : '*(não definido)*', inline: true },
      { name: '➖ Divisória',  value: sepOn ? '✅ Ativada' : '❌ Desativada',                               inline: true },
      { name: '🔤 Título',    value: (cfg.welcomeShowTitle ?? true) ? '✅ Visível' : '❌ Oculto',                                        inline: true },
      { name: '👤 Avatar',    value: (cfg.welcomeShowAvatar ?? true) ? '✅ Visível' : '❌ Oculto',                                       inline: true },
      { name: '⏱️ Sumir',    value: cfg.welcomeDeleteAfter ? `Após **${formatDeleteTime(cfg.welcomeDeleteAfter)}**` : '*(desativado)*', inline: true },
      { name: '🔔 Cargos',    value: rolesStr,                                                              inline: true },
      { name: '🔗 Canais',    value: chansStr,                                                              inline: true },
      { name: '✏️ Texto',     value: texto.length > 120  ? texto.slice(0, 117) + '...' : texto,            inline: false },
    );

  return { embeds: [configEmbed], components: welcomeConfigButtons(cfg) };
}
