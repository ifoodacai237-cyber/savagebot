import {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import prisma from '../../database/client.js';

// ─── Emojis ───────────────────────────────────────────────────────────────────
const COIN    = '<a:emoji_1:1516993823665033286>';
const VIP_TAG = '<:vip:1526994000000000000>'; // substitua pelo ID real do emoji VIP

// ─── Preço do VIP ─────────────────────────────────────────────────────────────
const VIP_PRICE_LABEL = 'R$ 20/mes';

// ─── Build do painel VIP em Components V2 ────────────────────────────────────
export function buildVipPanel() {
  const container = new ContainerBuilder().setAccentColor(0x5865F2);

  // Título
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${VIP_TAG} Painel VIP\nCompre VIP com carrinho publico e libere bonus reais na economia.`,
    ),
  );

  // Separador
  container.addSeparatorComponents(new SeparatorBuilder());

  // Benefícios
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `### ⭐ Beneficios VIP`,
        `${COIN} +35% em recompensas`,
        `🕒 Cooldowns reduzidos`,
        `🛡️ Mais proteção contra roubos`,
        `🌿 Bonus extra na mineração`,
        `🎣 Bonus na pesca`,
        `🏹 Bonus na caça`,
        `🌾 Bonus na fazenda`,
        `🏛️ Banco 2.5x maior`,
        `💵 Juros 50% maiores`,
      ].join('\n'),
    ),
  );

  // Separador
  container.addSeparatorComponents(new SeparatorBuilder());

  // Plano
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ${COIN} Plano principal\n${VIP_TAG} **${VIP_PRICE_LABEL}**`,
    ),
  );

  // Botões
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('vip_escolher')
      .setLabel('Escolher VIP')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('vip_carrinho')
      .setLabel('Meu carrinho')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    components: [container, row],
    flags: MessageFlags.IsComponentsV2,
  };
}

// ─── Handler dos botões VIP ───────────────────────────────────────────────────
export async function handleVipButton(interaction) {
  const id = interaction.customId;

  if (id === 'vip_escolher') {
    const c = new ContainerBuilder().setAccentColor(0x5865F2);
    c.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${VIP_TAG} Adquirir VIP\n` +
        `Para comprar o VIP, entre em contato com a equipe do servidor.\n\n` +
        `**Plano:** ${VIP_TAG} ${VIP_PRICE_LABEL}\n` +
        `${COIN} Após ativação, seus bônus são aplicados automaticamente.`,
      ),
    );
    return interaction.reply({
      components: [c],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  if (id === 'vip_carrinho') {
    // Verifica se o usuário tem algum VipGrant ativo
    const grants = await prisma.vipGrant.findMany({
      where: {
        guildId: interaction.guildId,
        userId:  interaction.user.id,
        expiresAt: { gt: new Date() },
      },
    });

    const c = new ContainerBuilder().setAccentColor(0x5865F2);
    if (grants.length === 0) {
      c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🛒 Meu Carrinho\nVocê não possui VIP ativo no momento.\n\n` +
          `Clique em **Escolher VIP** para adquirir.`,
        ),
      );
    } else {
      const linhas = grants.map(g => {
        const ts = Math.floor(g.expiresAt.getTime() / 1000);
        return `${VIP_TAG} Cargo <@&${g.roleId}> — expira <t:${ts}:R>`;
      });
      c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🛒 Meu Carrinho\n${linhas.join('\n')}`,
        ),
      );
    }
    return interaction.reply({
      components: [c],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }
}

// ─── Comando ──────────────────────────────────────────────────────────────────
export default {
  name: 'vip',

  data: new SlashCommandBuilder()
    .setName('vip')
    .setDescription('🏷️ Sistema VIP do servidor')
    .addSubcommand(s =>
      s.setName('painel').setDescription('📢 Envia o painel VIP no canal atual'),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'painel') {
      return interaction.reply(buildVipPanel());
    }
  },

  async executePrefix(message) {
    return message.reply(buildVipPanel());
  },
};
