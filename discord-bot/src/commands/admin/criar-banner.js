import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import prisma from '../../database/client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const COIN = '<a:emoji_1:1516993823665033286>';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const BANNERS_DIR = path.resolve(__dirname, '../../../../../artifacts/api-server/public/banners');

function getBaseUrl() {
  const domains = process.env.REPLIT_DOMAINS?.split(',');
  if (domains?.length) return `https://${domains[0]}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return null;
}

async function downloadBannerImage(imageUrl, filename) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FallenBot/1.0)' },
      redirect: 'follow',
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const contentType = resp.headers.get('content-type') || '';
    const ext = contentType.includes('png')  ? 'png'
              : contentType.includes('gif')  ? 'gif'
              : contentType.includes('webp') ? 'webp'
              : 'jpg';

    const buf      = Buffer.from(await resp.arrayBuffer());
    const fullName = `${filename}.${ext}`;
    const filePath = path.join(BANNERS_DIR, fullName);

    if (!fs.existsSync(BANNERS_DIR)) fs.mkdirSync(BANNERS_DIR, { recursive: true });
    fs.writeFileSync(filePath, buf);

    const base = getBaseUrl();
    if (!base) throw new Error('URL base não disponível no ambiente.');
    return `${base}/api/public/banners/${fullName}`;
  } finally {
    clearTimeout(timer);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('criar-banner')
    .setDescription('🖼️ [Admin] Cria ou atualiza um banner personalizado para a loja')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('nome').setDescription('Nome do banner (ex: Gang Angel)').setRequired(true).setMaxLength(50))
    .addStringOption(o => o.setName('imagem').setDescription('URL direta da imagem (Imgur, imgbb, etc. — NÃO use links do Discord)').setRequired(true))
    .addIntegerOption(o => o.setName('preco').setDescription('Preço em coins').setRequired(false).setMinValue(1))
    .addStringOption(o => o.setName('chave').setDescription('Chave do banner existente (para atualizar a imagem)').setRequired(false)),
  name: 'criar-banner',

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const nome   = interaction.options.getString('nome');
    const imagem = interaction.options.getString('imagem');
    const preco  = interaction.options.getInteger('preco');
    const chaveExistente = interaction.options.getString('chave');

    if (!/^https?:\/\/.+/.test(imagem))
      return interaction.editReply({ content: '❌ URL da imagem inválida. Use um link direto (http/https).' });

    // ── Modo atualização: chave fornecida ──────────────────────────────────────
    if (chaveExistente) {
      const existing = await prisma.customBanner.findFirst({
        where: { key: chaveExistente, guildId: interaction.guildId },
      });
      if (!existing)
        return interaction.editReply({ content: `❌ Banner com chave \`${chaveExistente}\` não encontrado.` });

      const filename = `${interaction.guildId}_${chaveExistente}`;
      let localUrl;
      try {
        localUrl = await downloadBannerImage(imagem, filename);
      } catch (err) {
        return interaction.editReply({ content: `❌ Falha ao baixar imagem: \`${err.message}\`` });
      }

      await prisma.customBanner.update({
        where: { id: existing.id },
        data: { imageUrl: localUrl, active: true, name: nome },
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Banner Atualizado!')
            .setDescription(`O banner **${nome}** foi atualizado com sucesso!\n✅ Nova imagem salva permanentemente.`)
            .setImage(localUrl)
            .addFields({ name: '🔑 Chave', value: `\`${chaveExistente}\``, inline: true })
            .setFooter({ text: 'Use /loja painel → Vitrine para ver o banner' }),
        ],
      });
    }

    // ── Modo criação ────────────────────────────────────────────────────────────
    const priceVal = preco ?? 1000;
    const chave = nome.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 30);

    const existing = await prisma.customBanner.findUnique({
      where: { guildId_key: { guildId: interaction.guildId, key: chave } },
    });
    const finalKey = existing ? `${chave}_${Date.now().toString(36)}` : chave;
    const filename = `${interaction.guildId}_${finalKey}`;

    let localUrl;
    try {
      localUrl = await downloadBannerImage(imagem, filename);
    } catch (err) {
      return interaction.editReply({ content: `❌ Não foi possível baixar a imagem: \`${err.message}\`` });
    }

    await prisma.customBanner.create({
      data: {
        guildId:     interaction.guildId,
        key:         finalKey,
        name:        nome,
        description: '',
        price:       priceVal,
        imageUrl:    localUrl,
        gradient1:   '#1a0533',
        gradient2:   '#4a1a8a',
        emoji:       '🖼️',
        active:      true,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x9B4FD6)
      .setTitle('✅ Banner Criado!')
      .setDescription(`O banner **${nome}** foi adicionado à loja!\n✅ Imagem salva permanentemente (sem expiração).`)
      .setImage(localUrl)
      .addFields(
        { name: '💰 Preço', value: `**${priceVal.toLocaleString('pt-BR')} ${COIN}**`, inline: true },
        { name: '🔑 Chave', value: `\`${finalKey}\``, inline: true },
      )
      .setFooter({ text: 'Guarde a chave para atualizar a imagem no futuro com /criar-banner chave:...' });

    return interaction.editReply({ embeds: [embed] });
  },

  async executePrefix(message) {
    return message.reply({ content: '⚠️ Use o comando slash `/criar-banner` para criar banners personalizados.' });
  },
};
