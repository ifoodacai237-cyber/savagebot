// ─── /futfoto — Admin: define manualmente a foto de um jogador via override ───
//
// Uso:
//   /futfoto id:42 url:https://...         → define customPhotoUrl para o jogador 42
//   /futfoto id:42 limpar:true             → remove o override e volta ao CDN padrão
//   /futfoto id:42                         → mostra status atual da foto do jogador
//
// Integra com o sistema de override existente (futOverrides.js + futCardCache.js).
// Somente administradores (ManageGuild) podem usar.

import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { getCardByInternalId, applyCardOverride, validateCard, logCard } from '../../utils/futCardCache.js';
import { setOverride, removeOverride, getOverride } from '../../utils/futOverrides.js';
import { generateSingleCardImage } from '../../utils/futCanvas.js';

export default {
  name: 'futfoto',
  data: new SlashCommandBuilder()
    .setName('futfoto')
    .setDescription('[ADMIN] Define ou consulta a foto de um jogador FUT via override')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt.setName('id')
         .setDescription('ID interno do jogador (ex: 42 = Marquinhos). Use /fut colecao para ver os IDs.')
         .setRequired(true)
         .setMinValue(1)
         .setMaxValue(200)
    )
    .addStringOption(opt =>
      opt.setName('url')
         .setDescription('URL da foto (PNG/JPG direto). Deixe vazio para apenas consultar o status.')
         .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('limpar')
         .setDescription('Remove o override e volta ao CDN padrão (FUT.GG / SoFIFA).')
         .setRequired(false)
    ),

  async execute(interaction) {
    // ── Verificação de permissão extra (dupla segurança além do setDefaultMemberPermissions)
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Apenas administradores podem usar este comando.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    const playerId = interaction.options.getInteger('id');
    const url      = interaction.options.getString('url')?.trim() ?? null;
    const limpar   = interaction.options.getBoolean('limpar') ?? false;

    // ── Busca carta no cache ──────────────────────────────────────────────────
    const baseCard = getCardByInternalId(playerId);
    if (!baseCard) {
      return interaction.editReply({
        content: `❌ Jogador com ID **${playerId}** não encontrado no sistema. Use /fut colecao para ver os IDs válidos.`,
      });
    }

    // ── Modo: LIMPAR override ─────────────────────────────────────────────────
    if (limpar) {
      await removeOverride(playerId);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🗑️ Override de foto removido')
        .setDescription(
          `**${baseCard.name}** (ID: ${playerId}) voltou a usar as fontes padrão:\n` +
          `• FUT.GG CDN: ${baseCard.imageUrl ? `\`${baseCard.imageUrl}\`` : '*(sem futggId)*'}\n` +
          `• Fallback 1 (SoFIFA FC25): ${baseCard.fallbackUrl1 ? `\`${baseCard.fallbackUrl1}\`` : '*(sem sofascoreId)*'}\n` +
          `• Fallback 2 (SoFIFA FC24): ${baseCard.fallbackUrl2 ? `\`${baseCard.fallbackUrl2}\`` : '*(sem sofascoreId)*'}`
        )
        .setFooter({ text: `Executado por ${interaction.user.tag}` });

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Modo: DEFINIR nova URL ────────────────────────────────────────────────
    if (url) {
      // Valida que parece uma URL antes de salvar
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return interaction.editReply({
          content: '❌ A URL deve começar com `http://` ou `https://`.',
        });
      }

      // Salva no banco via override system
      await setOverride(playerId, { customPhotoUrl: url }, interaction.user.id);

      // Aplica override sobre a carta base para gerar preview
      const cardComOverride = applyCardOverride(baseCard, { customPhotoUrl: url });

      // Valida e loga antes de renderizar
      const v = validateCard(cardComOverride);
      logCard(`FUTFOTO override playerId=${playerId}`, cardComOverride);

      if (!v.valid) {
        console.warn(`[FUTFOTO] Carta com campos ausentes após override: ${v.errors.join(', ')}`);
      }

      // Gera imagem preview da carta com a nova foto
      let imageBuffer;
      try {
        imageBuffer = await generateSingleCardImage(cardComOverride);
      } catch (err) {
        console.error('[FUTFOTO] Erro ao gerar preview:', err);
        // Override foi salvo mesmo sem preview — avisa o admin
        return interaction.editReply({
          content:
            `✅ Foto de **${baseCard.name}** (ID: ${playerId}) definida com sucesso!\n` +
            `⚠️ Não foi possível gerar o preview da carta agora, mas o override está salvo.\n` +
            `URL: \`${url}\``,
        });
      }

      const attachment = new AttachmentBuilder(imageBuffer, { name: `futfoto_${playerId}.png` });
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📸 Foto definida com sucesso')
        .setDescription(
          `**${baseCard.name}** (ID: ${playerId})\n` +
          `URL: \`${url}\`\n\n` +
          `A carta renderizada abaixo usa a nova foto.`
        )
        .setImage(`attachment://futfoto_${playerId}.png`)
        .setFooter({ text: `Override salvo por ${interaction.user.tag}` });

      return interaction.editReply({ embeds: [embed], files: [attachment] });
    }

    // ── Modo: CONSULTAR status atual ──────────────────────────────────────────
    // Sem url e sem limpar → mostra status de foto atual do jogador
    const { getOverride } = await import('../../utils/futOverrides.js');
    const ov = await getOverride(playerId);

    const linhas = [
      `**Jogador:** ${baseCard.name} (ID: ${playerId})`,
      `**Rating:** ${baseCard.rating}  •  **Posição:** ${baseCard.position}`,
      '',
      '**Fontes de foto (ordem de prioridade):**',
      `1. customPhotoUrl (override): ${ov?.customPhotoUrl ? `\`${ov.customPhotoUrl}\`` : '*(não definida)*'}`,
      `2. imageUrl (FUT.GG CDN):     ${baseCard.imageUrl  ? `\`${baseCard.imageUrl}\``  : '*(sem futggId — usa drawAvatar)*'}`,
      `3. fallbackUrl1 (SoFIFA FC25):${baseCard.fallbackUrl1 ? `\`${baseCard.fallbackUrl1}\`` : ' *(sem sofascoreId)*'}`,
      `4. fallbackUrl2 (SoFIFA FC24):${baseCard.fallbackUrl2 ? `\`${baseCard.fallbackUrl2}\`` : ' *(sem sofascoreId)*'}`,
      '',
      ov?.customPhotoUrl
        ? `✅ Override ativo. Para remover: \`/futfoto id:${playerId} limpar:true\``
        : `ℹ️ Sem override. Para definir: \`/futfoto id:${playerId} url:<URL>\``,
    ];

    const embed = new EmbedBuilder()
      .setColor(ov?.customPhotoUrl ? 0x57f287 : 0xfee75c)
      .setTitle('🔍 Status de foto — FUT Override')
      .setDescription(linhas.join('\n'))
      .setFooter({ text: 'Use /futfoto id:<n> url:<url> para definir uma foto customizada.' });

    return interaction.editReply({ embeds: [embed] });
  },
};
