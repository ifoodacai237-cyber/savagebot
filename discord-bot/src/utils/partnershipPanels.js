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

export function partnerConfigButtons(cfg = {}) {
  const dmActive     = cfg.partnerNotifyDm     ?? false;
  const removeActive = cfg.partnerRemoveOnLeave ?? false;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pcfg_canal').setLabel('Canal').setEmoji('💌').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pcfg_cargo_resp').setLabel('Cargo Responsável').setEmoji('👑').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pcfg_cargo_ping').setLabel('Cargo Ping').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pcfg_cargo_parceiro').setLabel('Cargo Parceiro').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pcfg_toggle_dm').setLabel('Notif. DM').setEmoji('📩').setStyle(dmActive ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pcfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pcfg_imagem').setLabel('Imagem').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pcfg_thumb').setLabel('Thumbnail').setEmoji('📷').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pcfg_footer').setLabel('Rodapé').setEmoji('👇').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pcfg_mensagem').setLabel('Mensagem').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pcfg_toggle_remove').setLabel('Remover ao Sair').setEmoji('🚪').setStyle(removeActive ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
  return [row1, row2, row3];
}

export function buildPartnerConfigPayload(cfg = {}) {
  const color = cfg.partnerColor ? (parseInt(cfg.partnerColor, 16) || 0xA020F0) : 0xA020F0;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🤝 Sistema de Parcerias')
    .addFields(
      { name: '💛 Obrigatório informar:', value: '\u200b', inline: false },
      { name: '💌 Canal de parcerias',   value: cfg.partnerChannel          ? `<#${cfg.partnerChannel}>`          : 'Nenhum',      inline: true },
      { name: '👑 Cargo responsável',    value: cfg.partnerResponsibleRole  ? `<@&${cfg.partnerResponsibleRole}>` : 'Nenhum',      inline: true },
      { name: '💛 Opcional:', value: '\u200b', inline: false },
      { name: '🔔 Cargo de ping',        value: cfg.partnerPingRole         ? `<@&${cfg.partnerPingRole}>`        : 'Nenhum',      inline: true },
      { name: '🤝 Cargo de parceiros',   value: cfg.partnerRole             ? `<@&${cfg.partnerRole}>`            : 'Nenhum',      inline: true },
      { name: '📩 Notif. no privado',    value: cfg.partnerNotifyDm         ? 'Ativado'                           : 'Desativado',  inline: true },
      { name: '✏️ Mensagem',            value: cfg.partnerMessage           ? cfg.partnerMessage.slice(0, 80)     : 'Padrão',      inline: true },
      { name: '🖼️ Imagem',             value: cfg.partnerImage             ? '✅ Definida'                        : 'Padrão',      inline: true },
      { name: '📷 Thumbnail',           value: cfg.partnerThumbnail         ? '✅ Definida'                        : 'Padrão',      inline: true },
      { name: '👇 Rodapé',              value: cfg.partnerFooter            ? cfg.partnerFooter.slice(0, 50)      : 'Nenhum',      inline: true },
      { name: '🎨 Cor da Embed',         value: `#${cfg.partnerColor || 'A020F0'}`,                                                inline: true },
      { name: '🚪 Remover ao Sair',      value: cfg.partnerRemoveOnLeave    ? 'Ativado'                           : 'Desativado',  inline: true },
    )
    .addFields({
      name: '👑 O que posso fazer com esse sistema:',
      value: [
        '👑 Sempre que for feita uma parceria notificarei os membros com o cargo de Ping',
        '👑 Só aceitarei parcerias de membros com o cargo responsável no canal configurado',
        '👑 Darei o cargo de parceiro ao representante quando a parceria for realizada',
        '👑 Para a parceria contar, envie o texto com o link de convite do servidor',
        '👑 Ao marcar um membro no texto ele se torna o representante\n    Exemplo: `Rep: @membro` ou `Representante: @membro`',
      ].join('\n'),
      inline: false,
    });

  return { embeds: [embed], components: partnerConfigButtons(cfg) };
}

export function buildPartnershipPost({ cfg, promoterId, partnerName, inviteCode, partnershipCount, rank, thumbUrl, imageUrl, messageUrl }) {
  const accentColor = cfg?.partnerColor ? (parseInt(cfg.partnerColor, 16) || 0xA020F0) : 0xA020F0;
  const defaultMsg  = cfg?.partnerMessage || '★ Obrigado por fortalecer nossa comunidade!';

  const container = new ContainerBuilder().setAccentColor(accentColor);

  if (thumbUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('**✦ • Parceria Realizada**'))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl)),
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('**✦ • Parceria Realizada**'));
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `🎖️ **Promoter:** <@${promoterId}>\n` +
    `🏅 **Rank:** #${rank}\n` +
    `🤝 **Parcerias feitas:** ${partnershipCount}\n` +
    `↳ **Servidor parceiro:** ${partnerName}`,
  ));

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(defaultMsg));

  if (imageUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imageUrl)),
    );
  }

  if (cfg?.partnerFooter) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${cfg.partnerFooter}`));
  }

  const inviteLink = `https://discord.gg/${inviteCode}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Entrar no servidor').setURL(inviteLink).setStyle(ButtonStyle.Link),
  );
  if (messageUrl) {
    row.addComponents(new ButtonBuilder().setLabel('Ver mensagem').setURL(messageUrl).setStyle(ButtonStyle.Link));
  }

  return { components: [container, row], flags: MessageFlags.IsComponentsV2 };
}
