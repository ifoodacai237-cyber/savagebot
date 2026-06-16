import {
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../database/client.js';
import { generateTranscript } from '../utils/transcript.js';
import { baseEmbed, buildConfigEmbed, errorEmbed, successEmbed, Colors } from '../utils/embed.js';
import { ACTIONS, buildInteractionEmbed } from '../commands/interacoes/interacoes.js';
import { generateTellonymCard } from '../utils/cardGenerator.js';
import { likesMap } from '../utils/instaState.js';
import { buildTicketConfigPayload, buildTellonymConfigPayload, DEFAULT_TICKET_TEXT, DEFAULT_TELLONYM_TEXT } from '../utils/configPanels.js';
import {
  getSession,
  deleteSession,
  buildContainerPayload,
  buildMainControls,
  buildTypeSelector,
  buildColorPicker,
  buildEditMenu,
  COLOR_MAP,
} from '../utils/containerSessions.js';

// ─── Container preview updater ────────────────────────────────────────────────

async function updateContainerPreview(session, client) {
  try {
    const ch = client.channels.cache.get(session.previewChannelId);
    if (!ch) return;
    const msg = await ch.messages.fetch(session.previewMessageId).catch(() => null);
    if (msg) await msg.edit(buildContainerPayload(session));
  } catch (e) {
    console.error('[CONTAINER PREVIEW]', e?.message ?? e);
  }
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function getCfg(guildId) {
  return prisma.guildConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
}

// ─── Resolve links discord.com/channels → URL de imagem real ─────────────────

async function resolveImageUrl(rawUrl, client) {
  if (!rawUrl) return rawUrl;
  const match = rawUrl.match(/https?:\/\/(?:www\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!match) return rawUrl;
  const [, , channelId, messageId] = match;
  try {
    const ch  = await client.channels.fetch(channelId);
    if (!ch) return null;
    const msg = await ch.messages.fetch(messageId);
    const img = [...msg.attachments.values()].find(a => a.contentType?.startsWith('image/'));
    if (img) return img.url;
    if (msg.embeds[0]?.image?.url) return msg.embeds[0].image.url;
    return null;
  } catch (e) {
    console.error('[LINK RESOLVER]', e.message);
    return null;
  }
}

// ─── Mapeamento dos campos de modal ───────────────────────────────────────────

const TICKET_MODAL_FIELDS = {
  cor:    { label: 'Cor (hex, ex: 5865F2)',      db: 'ticketColor',  placeholder: '5865F2 (deixe vazio para padrão)',           isUrl: false, isLong: false },
  titulo: { label: 'Título do painel',           db: 'ticketTitle',  placeholder: 'Abertura de Ticket (deixe vazio para remover)', isUrl: false, isLong: false },
  banner: { label: 'URL da imagem do banner',    db: 'ticketBanner', placeholder: 'https://... ou discord.com/channels/... (deixe vazio para remover)', isUrl: true, isLong: false },
  thumb:  { label: 'URL da thumbnail',           db: 'ticketThumb',  placeholder: 'https://... ou discord.com/channels/... (deixe vazio para remover)', isUrl: true, isLong: false },
  rodape: { label: 'Texto do rodapé',            db: 'ticketFooter', placeholder: 'Sistema de Suporte (deixe vazio para remover)', isUrl: false, isLong: false },
  texto:  { label: 'Texto principal do painel',  db: 'ticketText',   placeholder: 'Clique no botão para abrir um ticket... (deixe vazio para padrão)', isUrl: false, isLong: true },
};

const TELLONYM_MODAL_FIELDS = {
  cor:    { label: 'Cor (hex, ex: 2B2D31)',      db: 'tellonymColor',  placeholder: '2B2D31 (deixe vazio para padrão)',              isUrl: false, isLong: false },
  titulo: { label: 'Título do painel',           db: 'tellonymTitle',  placeholder: '💌 Tellonym (deixe vazio para remover)',         isUrl: false, isLong: false },
  banner: { label: 'URL da imagem do banner',    db: 'tellonymBanner', placeholder: 'https://... ou discord.com/channels/... (deixe vazio para remover)', isUrl: true, isLong: false },
  thumb:  { label: 'URL da thumbnail',           db: 'tellonymThumb',  placeholder: 'https://... ou discord.com/channels/... (deixe vazio para remover)', isUrl: true, isLong: false },
  rodape: { label: 'Texto do rodapé',            db: 'tellonymFooter', placeholder: 'Slow Bot · Tellonym (deixe vazio para remover)',  isUrl: false, isLong: false },
  texto:  { label: 'Texto principal do painel',  db: 'tellonymText',   placeholder: 'Clique no botão para enviar uma mensagem... (deixe vazio para padrão)', isUrl: false, isLong: true },
};

// ─── Handler principal ────────────────────────────────────────────────────────

export default {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    try {

      // ── SLASH COMMANDS ─────────────────────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;
        return cmd.execute(interaction, client);
      }

      // ── CHANNEL SELECT MENUS ───────────────────────────────────────────────
      if (interaction.isChannelSelectMenu()) {
        const channelId = interaction.values[0];

        if (interaction.customId === 'chansel_tc') {
          await prisma.guildConfig.upsert({
            where:  { guildId: interaction.guildId },
            create: { guildId: interaction.guildId, ticketCategory: channelId },
            update: { ticketCategory: channelId },
          });
          const cfg     = await getCfg(interaction.guildId);
          const payload = buildTicketConfigPayload(cfg);
          return interaction.update({ ...payload, content: null });
        }

        if (interaction.customId === 'chansel_tn') {
          await prisma.guildConfig.upsert({
            where:  { guildId: interaction.guildId },
            create: { guildId: interaction.guildId, tellonymChannel: channelId },
            update: { tellonymChannel: channelId },
          });
          const cfg     = await getCfg(interaction.guildId);
          const payload = buildTellonymConfigPayload(cfg);
          return interaction.update({ ...payload, content: null });
        }

        return;
      }

      // ── STRING SELECT MENUS ────────────────────────────────────────────────
      if (interaction.isStringSelectMenu()) {
        // ── Carregar preset de Ticket ──────────────────────────────────────
        if (interaction.customId === 'strsel_preset_tc') {
          const presetId = interaction.values[0];
          const preset   = await prisma.panelPreset.findUnique({ where: { id: presetId } });
          if (!preset) return interaction.update({ content: '❌ Preset não encontrado.', components: [] });

          await prisma.guildConfig.upsert({
            where:  { guildId: interaction.guildId },
            create: {
              guildId:       interaction.guildId,
              ticketColor:   preset.color,
              ticketBanner:  preset.banner,
              ticketThumb:   preset.thumb,
              ticketFooter:  preset.footer,
              ticketTitle:   preset.title,
              ticketText:    preset.text,
            },
            update: {
              ticketColor:   preset.color,
              ticketBanner:  preset.banner,
              ticketThumb:   preset.thumb,
              ticketFooter:  preset.footer,
              ticketTitle:   preset.title,
              ticketText:    preset.text,
            },
          });
          const cfg     = await getCfg(interaction.guildId);
          const payload = buildTicketConfigPayload(cfg);
          return interaction.update({ ...payload, content: null });
        }

        // ── Carregar preset de Tellonym ────────────────────────────────────
        if (interaction.customId === 'strsel_preset_tn') {
          const presetId = interaction.values[0];
          const preset   = await prisma.panelPreset.findUnique({ where: { id: presetId } });
          if (!preset) return interaction.update({ content: '❌ Preset não encontrado.', components: [] });

          await prisma.guildConfig.upsert({
            where:  { guildId: interaction.guildId },
            create: {
              guildId:        interaction.guildId,
              tellonymColor:  preset.color,
              tellonymBanner: preset.banner,
              tellonymThumb:  preset.thumb,
              tellonymFooter: preset.footer,
              tellonymTitle:  preset.title,
              tellonymText:   preset.text,
            },
            update: {
              tellonymColor:  preset.color,
              tellonymBanner: preset.banner,
              tellonymThumb:  preset.thumb,
              tellonymFooter: preset.footer,
              tellonymTitle:  preset.title,
              tellonymText:   preset.text,
            },
          });
          const cfg     = await getCfg(interaction.guildId);
          const payload = buildTellonymConfigPayload(cfg);
          return interaction.update({ ...payload, content: null });
        }

        return;
      }

      // ── BUTTONS ────────────────────────────────────────────────────────────
      if (interaction.isButton()) {
        const { customId } = interaction;

        // ── INSTAGRAM: Toggle like ───────────────────────────────────────
        if (customId.startsWith('insta_like_')) {
          const postId = customId.slice('insta_like_'.length);
          if (!likesMap.has(postId)) likesMap.set(postId, new Set());
          const likes = likesMap.get(postId);
          if (likes.has(interaction.user.id)) likes.delete(interaction.user.id);
          else likes.add(interaction.user.id);

          const comps   = interaction.message.components[0].components;
          const updated = new ActionRowBuilder().addComponents(
            ButtonBuilder.from(comps[0]).setLabel(String(likes.size)),
            ...comps.slice(1).map(c => ButtonBuilder.from(c)),
          );
          return interaction.update({ components: [updated] });
        }

        // ── INSTAGRAM: Ver quem curtiu ───────────────────────────────────
        if (customId.startsWith('insta_who_')) {
          const postId = customId.slice('insta_who_'.length);
          const likes  = likesMap.get(postId);
          if (!likes || likes.size === 0)
            return interaction.reply({ content: '💔 Nenhuma curtida ainda.', ephemeral: true });
          const list = [...likes].map(id => `<@${id}>`).join('\n');
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0x833AB4).setTitle(`💜 Curtidas — ${likes.size}`).setDescription(list)],
            ephemeral: true,
          });
        }

        // ── INSTAGRAM: Comentar ─────────────────────────────────────────
        if (customId.startsWith('insta_comment_')) {
          const threadId = customId.slice('insta_comment_'.length);
          const modal = new ModalBuilder()
            .setCustomId(`insta_cmodal_${threadId}`)
            .setTitle('💬 Enviar Comentário');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('comment')
                .setLabel('Seu comentário')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Escreva seu comentário...')
                .setRequired(true)
                .setMaxLength(500)
            ),
          );
          return interaction.showModal(modal);
        }

        // ── INSTAGRAM: Deletar ───────────────────────────────────────────
        if (customId.startsWith('insta_del_')) {
          const parts    = customId.split('_');
          const authorId = parts[parts.length - 1];
          const isAdmin  = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
          if (interaction.user.id !== authorId && !isAdmin)
            return interaction.reply({ embeds: [errorEmbed('Apenas o autor ou um moderador pode deletar.')], ephemeral: true });
          await interaction.message.delete();
          return;
        }

        // ── TICKET: Abrir modal ──────────────────────────────────────────
        if (customId === 'ticket_open') {
          const modal = new ModalBuilder().setCustomId('ticket_modal').setTitle('📋 Abertura de Ticket');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('ticket_reason')
                .setLabel('Descreva o motivo do atendimento')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true).setMinLength(10).setMaxLength(500)
            ),
          );
          return interaction.showModal(modal);
        }

        // ── TICKET: Fechar ───────────────────────────────────────────────
        if (customId.startsWith('ticket_close_')) {
          const channelId = customId.replace('ticket_close_', '');
          await interaction.reply({ embeds: [baseEmbed(Colors.WARNING).setDescription('🔒 Fechando em 5 segundos...')] });
          await prisma.ticket.update({ where: { channelId }, data: { status: 'closed' } }).catch(() => {});
          setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
          return;
        }

        // ── TICKET: Reivindicar ──────────────────────────────────────────
        if (customId.startsWith('ticket_claim_')) {
          const channelId = customId.replace('ticket_claim_', '');
          const ticket    = await prisma.ticket.findUnique({ where: { channelId } });
          if (ticket?.claimedBy)
            return interaction.reply({ embeds: [errorEmbed(`Já reivindicado por <@${ticket.claimedBy}>.`)], ephemeral: true });
          await prisma.ticket.update({ where: { channelId }, data: { claimedBy: interaction.user.id } }).catch(() => {});
          return interaction.reply({ embeds: [successEmbed('Reivindicado', `<@${interaction.user.id}> está atendendo este ticket.`)] });
        }

        // ── TICKET: Transcript ───────────────────────────────────────────
        if (customId.startsWith('ticket_transcript_')) {
          await interaction.deferReply({ ephemeral: true });
          try {
            const filepath   = await generateTranscript(interaction.channel);
            const attachment = new AttachmentBuilder(filepath, { name: `transcript-${interaction.channel.id}.html` });
            return interaction.editReply({ embeds: [successEmbed('Transcript Gerado', 'Histórico em HTML gerado com sucesso.')], files: [attachment] });
          } catch {
            return interaction.editReply({ embeds: [errorEmbed('Erro ao gerar transcript.')] });
          }
        }

        // ── CONFIG: Ticket — botões de campo ────────────────────────────
        if (customId.startsWith('tcfg_')) {
          const field = customId.replace('tcfg_', '');

          if (field === 'enviar') {
            await interaction.deferReply({ ephemeral: true });
            const cfg = await getCfg(interaction.guildId);
            const embed = buildConfigEmbed({
              color:       cfg.ticketColor,
              banner:      cfg.ticketBanner,
              thumbnail:   cfg.ticketThumb,
              footer:      cfg.ticketFooter,
              title:       cfg.ticketTitle,
              description: cfg.ticketText ?? DEFAULT_TICKET_TEXT,
            });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('ticket_open').setLabel('Abrir Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary),
            );
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.editReply({ embeds: [successEmbed('Painel Enviado', `O painel de tickets foi enviado em ${interaction.channel}.`)] });
          }

          if (field === 'salvar') {
            const modal = new ModalBuilder()
              .setCustomId('preset_modal_tc')
              .setTitle('💾 Salvar Preset — Ticket');
            modal.addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('preset_name')
                  .setLabel('Nome do preset')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('Ex: Suporte Geral, Vendas...')
                  .setRequired(true)
                  .setMaxLength(50)
              ),
            );
            return interaction.showModal(modal);
          }

          if (field === 'carregar') {
            const presets = await prisma.panelPreset.findMany({ where: { guildId: interaction.guildId, type: 'ticket' } });
            if (!presets.length) {
              return interaction.reply({ content: '📭 Você ainda não tem presets salvos para Ticket.\nUse **Salvar Preset** para guardar a configuração atual.', ephemeral: true });
            }
            const select = new StringSelectMenuBuilder()
              .setCustomId('strsel_preset_tc')
              .setPlaceholder('Selecione um preset para carregar')
              .addOptions(presets.map(p =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(p.name)
                  .setValue(p.id)
                  .setDescription(`Salvo em ${p.createdAt.toLocaleDateString('pt-BR')}`)
              ));
            const cancelBtn = new ButtonBuilder().setCustomId('tcfg_cancelar').setLabel('Cancelar').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
            return interaction.update({
              content: '📂 Selecione o preset que deseja carregar:',
              embeds: [],
              components: [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(cancelBtn)],
            });
          }

          if (field === 'cancelar') {
            const cfg     = await getCfg(interaction.guildId);
            const payload = buildTicketConfigPayload(cfg);
            return interaction.update({ ...payload, content: null });
          }

          if (field === 'categoria') {
            const select = new ChannelSelectMenuBuilder()
              .setCustomId('chansel_tc')
              .setPlaceholder('Selecione a categoria dos tickets')
              .setChannelTypes([ChannelType.GuildCategory]);
            const row = new ActionRowBuilder().addComponents(select);
            return interaction.reply({
              content: '📂 Selecione a categoria onde os tickets serão criados:',
              components: [row],
              ephemeral: true,
            });
          }

          const def = TICKET_MODAL_FIELDS[field];
          if (!def) return;

          const modal = new ModalBuilder()
            .setCustomId(`tcfg_modal_${field}`)
            .setTitle(`🎫 Ticket — ${def.label}`);
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('value')
                .setLabel(def.label)
                .setStyle(def.isLong ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setPlaceholder(def.placeholder)
                .setRequired(false)
                .setMaxLength(def.isLong ? 1000 : 500)
            ),
          );
          return interaction.showModal(modal);
        }

        // ── CONFIG: Tellonym — botões de campo ───────────────────────────
        if (customId.startsWith('tncfg_')) {
          const field = customId.replace('tncfg_', '');

          if (field === 'enviar') {
            await interaction.deferReply({ ephemeral: true });
            const cfg = await getCfg(interaction.guildId);
            const embed = buildConfigEmbed({
              color:       cfg.tellonymColor,
              banner:      cfg.tellonymBanner,
              thumbnail:   cfg.tellonymThumb,
              footer:      cfg.tellonymFooter,
              title:       cfg.tellonymTitle,
              description: cfg.tellonymText ?? DEFAULT_TELLONYM_TEXT,
            });
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('tellonym_send').setLabel('Enviar Mensagem').setEmoji('💌').setStyle(ButtonStyle.Secondary),
            );
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.editReply({ embeds: [successEmbed('Painel Enviado', `O painel Tellonym foi enviado em ${interaction.channel}.`)] });
          }

          if (field === 'salvar') {
            const modal = new ModalBuilder()
              .setCustomId('preset_modal_tn')
              .setTitle('💾 Salvar Preset — Tellonym');
            modal.addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('preset_name')
                  .setLabel('Nome do preset')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('Ex: Servidor Principal, Eventos...')
                  .setRequired(true)
                  .setMaxLength(50)
              ),
            );
            return interaction.showModal(modal);
          }

          if (field === 'carregar') {
            const presets = await prisma.panelPreset.findMany({ where: { guildId: interaction.guildId, type: 'tellonym' } });
            if (!presets.length) {
              return interaction.reply({ content: '📭 Você ainda não tem presets salvos para Tellonym.\nUse **Salvar Preset** para guardar a configuração atual.', ephemeral: true });
            }
            const select = new StringSelectMenuBuilder()
              .setCustomId('strsel_preset_tn')
              .setPlaceholder('Selecione um preset para carregar')
              .addOptions(presets.map(p =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(p.name)
                  .setValue(p.id)
                  .setDescription(`Salvo em ${p.createdAt.toLocaleDateString('pt-BR')}`)
              ));
            const cancelBtn = new ButtonBuilder().setCustomId('tncfg_cancelar').setLabel('Cancelar').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
            return interaction.update({
              content: '📂 Selecione o preset que deseja carregar:',
              embeds: [],
              components: [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(cancelBtn)],
            });
          }

          if (field === 'cancelar') {
            const cfg     = await getCfg(interaction.guildId);
            const payload = buildTellonymConfigPayload(cfg);
            return interaction.update({ ...payload, content: null });
          }

          if (field === 'canal') {
            const select = new ChannelSelectMenuBuilder()
              .setCustomId('chansel_tn')
              .setPlaceholder('Selecione o canal de destino')
              .setChannelTypes([ChannelType.GuildText]);
            const row = new ActionRowBuilder().addComponents(select);
            return interaction.reply({
              content: '📣 Selecione o canal onde as mensagens do Tellonym serão enviadas:',
              components: [row],
              ephemeral: true,
            });
          }

          const def = TELLONYM_MODAL_FIELDS[field];
          if (!def) return;

          const modal = new ModalBuilder()
            .setCustomId(`tncfg_modal_${field}`)
            .setTitle(`💌 Tellonym — ${def.label}`);
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('value')
                .setLabel(def.label)
                .setStyle(def.isLong ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setPlaceholder(def.placeholder)
                .setRequired(false)
                .setMaxLength(def.isLong ? 1000 : 500)
            ),
          );
          return interaction.showModal(modal);
        }

        // ── INTERAÇÕES: Retribuir ────────────────────────────────────────
        if (customId.startsWith('int_r_')) {
          const parts          = customId.split('_');
          const type           = parts[2];
          const originalFromId = parts[3];
          if (!ACTIONS[type]) return;

          const from   = interaction.member ?? interaction.user;
          const toUser = await interaction.guild.members.fetch(originalFromId).catch(() =>
            interaction.client.users.fetch(originalFromId).catch(() => null)
          );
          if (!toUser) return interaction.reply({ embeds: [errorEmbed('Usuário não encontrado.')], ephemeral: true });

          await interaction.deferReply();
          const payload = await buildInteractionEmbed(type, from, toUser, interaction.guildId);
          return interaction.editReply(payload);
        }

        // ── TELLONYM: Botão principal → escolha ─────────────────────────
        if (customId === 'tellonym_send') {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tellonym_anon').setLabel('Anônimo 🕵️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tellonym_tag').setLabel('Marcar Alguém 🎯').setStyle(ButtonStyle.Primary),
          );
          return interaction.reply({ content: '**Como deseja enviar sua mensagem?**', components: [row], flags: 64 });
        }

        // ── TELLONYM: Modal anônimo ──────────────────────────────────────
        if (customId === 'tellonym_anon') {
          const modal = new ModalBuilder().setCustomId('tellonym_modal_anon').setTitle('💌 Mensagem Anônima');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('tell_msg').setLabel('Sua mensagem')
                .setStyle(TextInputStyle.Paragraph).setPlaceholder('Escreva o que você quer dizer...')
                .setRequired(true).setMaxLength(500)
            ),
          );
          return interaction.showModal(modal);
        }

        // ── TELLONYM: Modal com marcação ─────────────────────────────────
        if (customId === 'tellonym_tag') {
          const modal = new ModalBuilder().setCustomId('tellonym_modal_tag').setTitle('🎯 Mensagem Marcada');
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('tell_msg').setLabel('Sua mensagem')
                .setStyle(TextInputStyle.Paragraph).setPlaceholder('Escreva o que você quer dizer...')
                .setRequired(true).setMaxLength(500)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('tell_to').setLabel('Para quem? (@ ou nome de usuário)')
                .setStyle(TextInputStyle.Short).setPlaceholder('@username').setRequired(true).setMaxLength(100)
            ),
          );
          return interaction.showModal(modal);
        }

        // ── CONTAINER: Buttons ────────────────────────────────────────────
        if (customId.startsWith('cont_')) {
          const session = getSession(interaction.user.id, interaction.guildId);

          if (customId === 'cont_back') {
            return interaction.update({
              content: '**🛠️ Editor de Container**\nUse os botões abaixo para montar seu container.',
              components: buildMainControls(),
            });
          }

          if (customId === 'cont_add') {
            return interaction.update({
              content: '**➕ Adicionar Item**\nEscolha o tipo de item:',
              components: buildTypeSelector(),
            });
          }

          if (customId === 'cont_add_sep') {
            if (!session) return interaction.reply({ content: '❌ Sessão expirada. Use `/container criar`.', ephemeral: true });
            session.items.push({ type: 'separator' });
            await updateContainerPreview(session, interaction.client);
            return interaction.update({ content: `**🛠️ Editor de Container**\n✅ Separador adicionado! (${session.items.length} item(s))`, components: buildMainControls() });
          }

          if (customId === 'cont_add_text') {
            const modal = new ModalBuilder().setCustomId('cont_modal_text').setTitle('📝 Adicionar Texto');
            modal.addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('text_content').setLabel('Conteúdo do texto')
                  .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)
                  .setPlaceholder('Suporta **negrito**, *itálico*, __sublinhado__...')
              ),
            );
            return interaction.showModal(modal);
          }

          if (customId === 'cont_add_img') {
            const modal = new ModalBuilder().setCustomId('cont_modal_img').setTitle('🖼️ Galeria de Imagem');
            modal.addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('img_urls').setLabel('URLs das imagens (uma por linha)')
                  .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)
                  .setPlaceholder('https://exemplo.com/imagem1.png\nhttps://exemplo.com/imagem2.png')
              ),
            );
            return interaction.showModal(modal);
          }

          if (customId === 'cont_add_btn') {
            const modal = new ModalBuilder().setCustomId('cont_modal_btn').setTitle('🔗 Botão de Link');
            modal.addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('btn_text').setLabel('Texto acima do botão (opcional)')
                  .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200)
                  .setPlaceholder('Clique no botão abaixo:')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('btn_label').setLabel('Rótulo do botão')
                  .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)
                  .setPlaceholder('Visitar site')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('btn_url').setLabel('URL do botão')
                  .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(500)
                  .setPlaceholder('https://exemplo.com')
              ),
            );
            return interaction.showModal(modal);
          }

          if (customId === 'cont_edit_menu') {
            if (!session) return interaction.reply({ content: '❌ Sessão expirada. Use `/container criar`.', ephemeral: true });
            if (session.items.length === 0) {
              return interaction.reply({ content: '❌ Não há itens para editar.', ephemeral: true });
            }
            return interaction.update({
              content: `**✏️ Remover Item**\nClique no item que deseja apagar (${session.items.length} item(s)):`,
              components: buildEditMenu(session),
            });
          }

          if (customId.startsWith('cont_del_item_')) {
            if (!session) return interaction.reply({ content: '❌ Sessão expirada. Use `/container criar`.', ephemeral: true });
            const idx = parseInt(customId.replace('cont_del_item_', ''), 10);
            if (!isNaN(idx) && session.items[idx] !== undefined) {
              session.items.splice(idx, 1);
              await updateContainerPreview(session, interaction.client);
            }
            return interaction.update({
              content: `**🛠️ Editor de Container**\n🗑️ Item removido! (${session.items.length} item(s) restante(s))`,
              components: buildMainControls(),
            });
          }

          if (customId === 'cont_color') {
            return interaction.update({
              content: '**🎨 Selecionar Cor**\nEscolha a cor da borda lateral do container:',
              components: buildColorPicker(),
            });
          }

          if (customId.startsWith('cont_color_')) {
            if (!session) return interaction.reply({ content: '❌ Sessão expirada. Use `/container criar`.', ephemeral: true });
            const colorKey = customId.replace('cont_color_', '');
            if (COLOR_MAP[colorKey] !== undefined) {
              session.accentColor = COLOR_MAP[colorKey];
              await updateContainerPreview(session, interaction.client);
            }
            return interaction.update({ content: '**🛠️ Editor de Container**\n🎨 Cor atualizada!', components: buildMainControls() });
          }

          if (customId === 'cont_pub') {
            if (!session) return interaction.reply({ content: '❌ Sessão expirada. Use `/container criar`.', ephemeral: true });
            if (session.items.length === 0) return interaction.reply({ content: '❌ Adicione pelo menos um item antes de publicar.', ephemeral: true });
            deleteSession(interaction.user.id, interaction.guildId);
            return interaction.update({ content: '✅ **Container publicado com sucesso!**\nA sessão de edição foi encerrada.', components: [] });
          }

          if (customId === 'cont_clear') {
            if (!session) return interaction.reply({ content: '❌ Sessão expirada. Use `/container criar`.', ephemeral: true });
            try {
              const ch  = interaction.guild.channels.cache.get(session.previewChannelId);
              const msg = ch ? await ch.messages.fetch(session.previewMessageId).catch(() => null) : null;
              if (msg) await msg.delete().catch(() => {});
            } catch {}
            deleteSession(interaction.user.id, interaction.guildId);
            return interaction.update({ content: '🗑️ **Container apagado.** Sessão encerrada.', components: [] });
          }
        }
      }

      // ── MODALS ─────────────────────────────────────────────────────────────
      if (interaction.isModalSubmit()) {

        // ── INSTAGRAM: Comentário enviado ───────────────────────────────
        if (interaction.customId.startsWith('insta_cmodal_')) {
          const threadId = interaction.customId.slice('insta_cmodal_'.length);
          const text     = interaction.fields.getTextInputValue('comment');

          await interaction.deferReply({ ephemeral: true });
          try {
            const thread = await interaction.guild.channels.fetch(threadId);
            if (!thread) throw new Error('Thread não encontrada');

            const authorName  = interaction.member?.displayName ?? interaction.user.username;
            const avatarUrl   = interaction.user.displayAvatarURL({ extension: 'png', size: 64 });

            const commentEmbed = new EmbedBuilder()
              .setColor(0x2B2D31)
              .setAuthor({ name: authorName, iconURL: avatarUrl })
              .setDescription(text)
              .setTimestamp();

            await thread.send({ embeds: [commentEmbed] });
            return interaction.editReply({ content: '✅ Comentário enviado!' });
          } catch (e) {
            console.error('[INSTA COMMENT]', e.message);
            return interaction.editReply({ content: '❌ Não foi possível enviar o comentário.' });
          }
        }

        // ── TICKET: Criar canal ──────────────────────────────────────────
        if (interaction.customId === 'ticket_modal') {
          await interaction.deferReply({ ephemeral: true });
          const reason = interaction.fields.getTextInputValue('ticket_reason');
          const guild  = interaction.guild;
          const config = await prisma.guildConfig.findUnique({ where: { guildId: guild.id } });
          const color  = parseInt(config?.ticketColor ?? '5865F2', 16);

          const existing = await prisma.ticket.findFirst({ where: { userId: interaction.user.id, guildId: guild.id, status: 'open' } });
          if (existing)
            return interaction.editReply({ embeds: [errorEmbed(`Você já tem um ticket aberto: <#${existing.channelId}>`)] });

          const channel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: config?.ticketCategory ?? null,
            permissionOverwrites: [
              { id: guild.roles.everyone, deny:  [PermissionFlagsBits.ViewChannel] },
              { id: interaction.user.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
          });

          await prisma.ticket.create({ data: { channelId: channel.id, userId: interaction.user.id, guildId: guild.id, reason } });

          const embed = baseEmbed(color)
            .setTitle(config?.ticketTitle ?? '📋 Ticket de Suporte')
            .setDescription(`**Usuário:** <@${interaction.user.id}>\n**Motivo:** ${reason}`)
            .setFooter({ text: config?.ticketFooter ?? 'Slow Bot · Suporte' });

          if (config?.ticketBanner) embed.setImage(config.ticketBanner);
          if (config?.ticketThumb)  embed.setThumbnail(config.ticketThumb);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ticket_close_${channel.id}`).setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`ticket_claim_${channel.id}`).setLabel('Reivindicar').setEmoji('🙋').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`ticket_transcript_${channel.id}`).setLabel('Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
          );

          await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
          return interaction.editReply({ embeds: [successEmbed('Ticket Criado', `Seu ticket foi aberto em ${channel}.`)] });
        }

        // ── PRESET: Salvar preset de Ticket ─────────────────────────────
        if (interaction.customId === 'preset_modal_tc') {
          const name = interaction.fields.getTextInputValue('preset_name').trim();
          const cfg  = await getCfg(interaction.guildId);
          await prisma.panelPreset.upsert({
            where:  { guildId_type_name: { guildId: interaction.guildId, type: 'ticket', name } },
            create: {
              guildId: interaction.guildId,
              type:    'ticket',
              name,
              color:   cfg.ticketColor,
              banner:  cfg.ticketBanner,
              thumb:   cfg.ticketThumb,
              footer:  cfg.ticketFooter,
              title:   cfg.ticketTitle,
              text:    cfg.ticketText,
            },
            update: {
              color:  cfg.ticketColor,
              banner: cfg.ticketBanner,
              thumb:  cfg.ticketThumb,
              footer: cfg.ticketFooter,
              title:  cfg.ticketTitle,
              text:   cfg.ticketText,
            },
          });
          await interaction.message?.edit(buildTicketConfigPayload(cfg)).catch(() => {});
          return interaction.reply({ content: `✅ Preset **${name}** salvo com sucesso!`, ephemeral: true });
        }

        // ── PRESET: Salvar preset de Tellonym ───────────────────────────
        if (interaction.customId === 'preset_modal_tn') {
          const name = interaction.fields.getTextInputValue('preset_name').trim();
          const cfg  = await getCfg(interaction.guildId);
          await prisma.panelPreset.upsert({
            where:  { guildId_type_name: { guildId: interaction.guildId, type: 'tellonym', name } },
            create: {
              guildId: interaction.guildId,
              type:    'tellonym',
              name,
              color:   cfg.tellonymColor,
              banner:  cfg.tellonymBanner,
              thumb:   cfg.tellonymThumb,
              footer:  cfg.tellonymFooter,
              title:   cfg.tellonymTitle,
              text:    cfg.tellonymText,
            },
            update: {
              color:  cfg.tellonymColor,
              banner: cfg.tellonymBanner,
              thumb:  cfg.tellonymThumb,
              footer: cfg.tellonymFooter,
              title:  cfg.tellonymTitle,
              text:   cfg.tellonymText,
            },
          });
          await interaction.message?.edit(buildTellonymConfigPayload(cfg)).catch(() => {});
          return interaction.reply({ content: `✅ Preset **${name}** salvo com sucesso!`, ephemeral: true });
        }

        // ── CONFIG: Ticket — salvar campo modal ─────────────────────────
        if (interaction.customId.startsWith('tcfg_modal_')) {
          const field = interaction.customId.replace('tcfg_modal_', '');
          const def   = TICKET_MODAL_FIELDS[field];
          if (!def) return;

          const rawValue = interaction.fields.getTextInputValue('value');
          let value = rawValue?.trim() ?? '';
          const isEmpty = value === '';

          if (def.isUrl) {
            await interaction.deferReply({ ephemeral: true });
            if (isEmpty) {
              value = null;
            } else {
              const resolved = await resolveImageUrl(value, client);
              if (resolved === null) {
                return interaction.editReply({
                  embeds: [errorEmbed('Não encontrei nenhuma imagem nessa mensagem. Cole uma URL direta de imagem (ex: `https://i.imgur.com/...`) ou o link de uma mensagem do Discord que contenha uma imagem.')],
                });
              }
              value = resolved;
            }
            await prisma.guildConfig.upsert({
              where:  { guildId: interaction.guildId },
              create: { guildId: interaction.guildId, [def.db]: value },
              update: { [def.db]: value },
            });
            const cfg     = await getCfg(interaction.guildId);
            const payload = buildTicketConfigPayload(cfg);
            await interaction.message?.edit(payload).catch(() => {});
            return interaction.editReply({ content: '✅ Campo atualizado!' });
          }

          if (isEmpty) {
            value = null;
          } else if (field === 'cor') {
            value = value.replace('#', '').toUpperCase();
          }

          await prisma.guildConfig.upsert({
            where:  { guildId: interaction.guildId },
            create: { guildId: interaction.guildId, [def.db]: value },
            update: { [def.db]: value },
          });

          const cfg     = await getCfg(interaction.guildId);
          const payload = buildTicketConfigPayload(cfg);
          await interaction.message?.edit(payload).catch(() => {});
          return interaction.reply({ content: '✅ Campo atualizado!', ephemeral: true });
        }

        // ── CONFIG: Tellonym — salvar campo modal ────────────────────────
        if (interaction.customId.startsWith('tncfg_modal_')) {
          const field = interaction.customId.replace('tncfg_modal_', '');
          const def   = TELLONYM_MODAL_FIELDS[field];
          if (!def) return;

          const rawValue = interaction.fields.getTextInputValue('value');
          let value = rawValue?.trim() ?? '';
          const isEmpty = value === '';

          if (def.isUrl) {
            await interaction.deferReply({ ephemeral: true });
            if (isEmpty) {
              value = null;
            } else {
              const resolved = await resolveImageUrl(value, client);
              if (resolved === null) {
                return interaction.editReply({
                  embeds: [errorEmbed('Não encontrei nenhuma imagem nessa mensagem. Cole uma URL direta de imagem (ex: `https://i.imgur.com/...`) ou o link de uma mensagem do Discord que contenha uma imagem.')],
                });
              }
              value = resolved;
            }
            await prisma.guildConfig.upsert({
              where:  { guildId: interaction.guildId },
              create: { guildId: interaction.guildId, [def.db]: value },
              update: { [def.db]: value },
            });
            const cfg     = await getCfg(interaction.guildId);
            const payload = buildTellonymConfigPayload(cfg);
            await interaction.message?.edit(payload).catch(() => {});
            return interaction.editReply({ content: '✅ Campo atualizado!' });
          }

          if (isEmpty) {
            value = null;
          } else if (field === 'cor') {
            value = value.replace('#', '').toUpperCase();
          }

          await prisma.guildConfig.upsert({
            where:  { guildId: interaction.guildId },
            create: { guildId: interaction.guildId, [def.db]: value },
            update: { [def.db]: value },
          });

          const cfg     = await getCfg(interaction.guildId);
          const payload = buildTellonymConfigPayload(cfg);
          await interaction.message?.edit(payload).catch(() => {});
          return interaction.reply({ content: '✅ Campo atualizado!', ephemeral: true });
        }

        // ── TELLONYM: Envio anônimo ──────────────────────────────────────
        if (interaction.customId === 'tellonym_modal_anon') {
          const msg = interaction.fields.getTextInputValue('tell_msg');
          await sendTellonymMsg(interaction, msg, null);
          return;
        }

        // ── TELLONYM: Envio com marcação ─────────────────────────────────
        if (interaction.customId === 'tellonym_modal_tag') {
          const msg = interaction.fields.getTextInputValue('tell_msg');
          const to  = interaction.fields.getTextInputValue('tell_to');
          await sendTellonymMsg(interaction, msg, to);
          return;
        }

        // ── CONTAINER: Modals ─────────────────────────────────────────────
        if (interaction.customId.startsWith('cont_modal_')) {
          const session = getSession(interaction.user.id, interaction.guildId);
          if (!session) return interaction.reply({ content: '❌ Sessão expirada. Use `/container criar` novamente.', ephemeral: true });

          await interaction.deferUpdate().catch(() => {});

          if (interaction.customId === 'cont_modal_text') {
            const content = interaction.fields.getTextInputValue('text_content');
            session.items.push({ type: 'text', content });
            await updateContainerPreview(session, interaction.client);
          }

          if (interaction.customId === 'cont_modal_img') {
            const rawUrls = interaction.fields.getTextInputValue('img_urls');
            const urls = rawUrls.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
            if (urls.length > 0) {
              session.items.push({ type: 'gallery', urls });
              await updateContainerPreview(session, interaction.client);
            }
          }

          if (interaction.customId === 'cont_modal_btn') {
            const text  = interaction.fields.getTextInputValue('btn_text')?.trim() ?? '';
            const label = interaction.fields.getTextInputValue('btn_label').trim();
            const url   = interaction.fields.getTextInputValue('btn_url').trim();
            if (url.startsWith('http')) {
              session.items.push({ type: 'button', text: text || '\u200b', label, url });
              await updateContainerPreview(session, interaction.client);
            }
          }

          return interaction.editReply({
            content: `**🛠️ Editor de Container**\nItem adicionado! Total: **${session.items.length}** item(s).\nContinue editando ou clique em **Publicar**.`,
            components: buildMainControls(),
          });
        }
      }

    } catch (err) {
      console.error('[INTERACTION ERROR]', err);
      const embed = errorEmbed('Ocorreu um erro interno. Tente novamente.');
      if (interaction.replied || interaction.deferred)
        interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
      else
        interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
  },
};

// ─── Helper: Tellonym — gera imagem + envia ───────────────────────────────────

async function sendTellonymMsg(interaction, msg, toText) {
  await interaction.deferReply({ ephemeral: true });

  const cfg             = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
  const targetChannelId = cfg?.tellonymChannel ?? interaction.channelId;
  const targetChannel   = interaction.guild.channels.cache.get(targetChannelId) ?? interaction.channel;

  const isAnon     = !toText;
  const authorName = isAnon ? 'Anônimo' : (interaction.member?.displayName ?? interaction.user.username);
  const authorSub  = isAnon ? '🕵️ anônimo' : `@${interaction.user.username}`;
  const avatarUrl  = isAnon
    ? 'https://cdn.discordapp.com/embed/avatars/1.png'
    : interaction.user.displayAvatarURL({ extension: 'png', size: 64 });

  try {
    const imgBuf     = await generateTellonymCard({ authorName, authorUsername: authorSub, message: msg, taggedTo: toText ?? null, avatarUrl, isAnon });
    const attachment = new AttachmentBuilder(imgBuf, { name: 'tellonym.png' });
    await targetChannel.send({ files: [attachment] });
  } catch (e) {
    console.error('[TELLONYM CARD]', e);
    const fallback = new EmbedBuilder()
      .setColor(0xFFFFFF)
      .setAuthor({ name: `${authorName} • ${authorSub}`, iconURL: avatarUrl })
      .setDescription(msg)
      .setFooter({ text: '💬 • agora' });
    if (toText) fallback.addFields({ name: 'Marcados', value: toText, inline: true });
    await targetChannel.send({ embeds: [fallback] });
  }

  return interaction.editReply({ content: '✅ Mensagem enviada com sucesso!' });
}
