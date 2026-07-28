import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
  const enabled      = cfg.partnerEnabled     ?? false;
  const dmActive     = cfg.partnerNotifyDm    ?? false;
  const removeActive = cfg.partnerRemoveOnLeave ?? false;

  const row0 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pcfg_toggle_enabled')
      .setLabel(enabled ? '✅  Sistema ATIVADO — clique para desativar' : '❌  Sistema DESATIVADO — clique para ativar')
      .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Danger),
  );

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
  return [row0, row1, row2, row3];
}

export function buildPartnerConfigPayload(cfg = {}) {
  const enabled = cfg.partnerEnabled ?? false;

  const info = [
    `## 🤝 Parcerias — ${enabled ? '🟢 ATIVO' : '🔴 DESATIVADO'}`,
    '',
    '**Obrigatório:**',
    `💌 **Canal:** ${cfg.partnerChannel ? `<#${cfg.partnerChannel}>` : '*(não definido)*'}`,
    `👑 **Cargo Responsável:** ${cfg.partnerResponsibleRole ? `<@&${cfg.partnerResponsibleRole}>` : '*(não definido)*'}`,
    '',
    '**Opcional:**',
    `🔔 **Cargo Ping:** ${cfg.partnerPingRole ? `<@&${cfg.partnerPingRole}>` : '*(nenhum)*'}   🤝 **Cargo Parceiro:** ${cfg.partnerRole ? `<@&${cfg.partnerRole}>` : '*(nenhum)*'}`,
    `📩 **Notif. DM:** ${cfg.partnerNotifyDm ? 'Ativado' : 'Desativado'}   🚪 **Remover ao Sair:** ${cfg.partnerRemoveOnLeave ? 'Ativado' : 'Desativado'}`,
    `🎨 **Cor:** \`#${cfg.partnerColor || 'A020F0'}\`   🖼️ **Imagem:** ${cfg.partnerImage ? '✅' : '*(padrão)*'}   📷 **Thumb:** ${cfg.partnerThumbnail ? '✅' : '*(padrão)*'}`,
    `👇 **Rodapé:** ${cfg.partnerFooter ? cfg.partnerFooter.slice(0, 60) : '*(nenhum)*'}`,
    `✏️ **Mensagem:** ${cfg.partnerMessage ? cfg.partnerMessage.slice(0, 80) : '*(padrão)*'}`,
    '',
    '-# Envie o convite do servidor no canal configurado para registrar uma parceria.',
  ].join('\n');

  const container = new ContainerBuilder();
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(info));

  return { components: [container, ...partnerConfigButtons(cfg)], flags: MessageFlags.IsComponentsV2 };
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
