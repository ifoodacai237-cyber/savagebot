import {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} from 'discord.js';
import prisma from '../../database/client.js';
import {
  getOrCreateTeam, openPack, autoLineup, getTeamLineup,
  getTeamOvr, getCollection, changeFormation, changeTeamName,
  simulateMatch, getUserBalance, PACKS, FORMATION_POSITIONS,
} from '../../utils/futManager.js';
import { generateFieldImage, generateCollectionImage, generateLojaImage, generatePacksImage, generatePartidaImage, generateSingleCardImage } from '../../utils/futCanvas.js';
import { getPlayerById, rarityLabel } from '../../utils/futPlayers.js';

// ─── Helpers de UI ────────────────────────────────────────────────────────────
function rarityEmoji(rarity) {
  const map = { black: '⬛', gold: '🥇', silver: '🥈', bronze: '🥉' };
  return map[rarity] ?? '⚪';
}

function resultEmoji(result) {
  return result === 'win' ? '✅' : result === 'draw' ? '🤝' : '❌';
}

export async function buildTeamMessage(userId, guildId, member) {
  const team = await getOrCreateTeam(userId, guildId);
  const lineup = await getTeamLineup(team.id);
  const ovr = await getTeamOvr(team.id);
  const totalCards = await prisma.futUserCard.count({ where: { teamId: team.id } });

  const imageBuffer = await generateFieldImage({
    lineup,
    formation: team.formation,
    teamName:  team.teamName,
    elo:       team.elo,
  });

  const attachment = new AttachmentBuilder(imageBuffer, { name: 'campo.png' });

  const embed = new EmbedBuilder()
    .setColor(0x1e6b1e)
    .setTitle(`⚽ ${team.teamName}`)
    .setDescription(`Monte seu elenco para jogar partidas contra outros usuários!\nVeja sua coleção completa usando </fut colecao:0>.`)
    .addFields(
      { name: 'OVR Efetivo',   value: `**${ovr || '—'}**`, inline: true },
      { name: 'Formação',      value: `**${team.formation}**`, inline: true },
      { name: 'ELO',           value: `**${team.elo}**`, inline: true },
      { name: 'Histórico',     value: `✅ ${team.wins}V · 🤝 ${team.draws}E · ❌ ${team.losses}D`, inline: true },
      { name: 'Total de Cartas', value: `**${totalCards}** cartas`, inline: true },
    )
    .setImage('attachment://campo.png')
    .setThumbnail(member?.user?.displayAvatarURL({ size: 128 }) ?? null)
    .setFooter({ text: `@${member?.user?.username ?? userId}` });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fut_formacao').setLabel('Mudar Formação').setStyle(ButtonStyle.Secondary).setEmoji('🔀'),
    new ButtonBuilder().setCustomId('fut_partida').setLabel('Jogar Partida Ranqueada').setStyle(ButtonStyle.Success).setEmoji('⚽'),
    new ButtonBuilder().setCustomId('fut_colecao_1').setLabel('Ver Coleção').setStyle(ButtonStyle.Primary).setEmoji('📋'),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fut_loja').setLabel('Loja').setStyle(ButtonStyle.Secondary).setEmoji('🛒'),
    new ButtonBuilder().setCustomId('fut_pacotes').setLabel('Abrir Pacotes').setStyle(ButtonStyle.Secondary).setEmoji('📦'),
    new ButtonBuilder().setCustomId('fut_autolineup').setLabel('Auto-Escalação').setStyle(ButtonStyle.Secondary).setEmoji('🤖'),
  );

  return { embeds: [embed], files: [attachment], components: [row1, row2] };
}

export async function buildCollectionMessage(userId, guildId, page = 1) {
  const team = await getOrCreateTeam(userId, guildId);
  const data  = await getCollection(team.id, page, 8);

  const rarityOrder = { black: 0, gold: 1, silver: 2, bronze: 3 };
  const sorted = [...data.cards].sort((a, b) =>
    (rarityOrder[a.player?.rarity] ?? 4) - (rarityOrder[b.player?.rarity] ?? 4) ||
    (b.player?.ovr ?? 0) - (a.player?.ovr ?? 0)
  );

  const imageBuffer = await generateCollectionImage(sorted);
  const attachment  = new AttachmentBuilder(imageBuffer, { name: 'colecao.png' });

  const embed = new EmbedBuilder()
    .setColor(0x6a0dad)
    .setTitle('📋 Sua Coleção')
    .setDescription(`**${data.total}** cartas no total`)
    .setImage('attachment://colecao.png')
    .setFooter({ text: `Página ${data.page}/${data.pages || 1}` });

  const prevDisabled = page <= 1;
  const nextDisabled = page >= (data.pages || 1);

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`fut_colecao_${page - 1}`).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(prevDisabled),
    new ButtonBuilder().setCustomId('fut_time').setLabel('🏟️ Ver Time').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fut_colecao_${page + 1}`).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(nextDisabled),
  );

  const cardOptions = sorted.slice(0, 25).map(c => ({
    label: `${rarityEmoji(c.player?.rarity)} ${(c.player?.name ?? 'Desconhecido').slice(0, 80)}`,
    value: String(c.playerId),
    description: `OVR ${c.player?.ovr ?? '??'} · ${c.player?.pos ?? ''} · ${(c.player?.club ?? '').slice(0, 50)}`,
  }));

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('fut_carta_select')
      .setPlaceholder('🃏 Ver carta completa de um jogador...')
      .addOptions(cardOptions.length ? cardOptions : [{ label: 'Sem cartas', value: 'none' }]),
  );

  return { embeds: [embed], files: [attachment], components: [selectRow, navRow] };
}

export async function buildShopMessage(userId, guildId) {
  const balance = await getUserBalance(userId, guildId);
  const imgBuf  = await generateLojaImage(balance);
  const attach  = new AttachmentBuilder(imgBuf, { name: 'loja.png' });

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setImage('attachment://loja.png')
    .setFooter({ text: 'Selecione um item para comprar' });

  const options = Object.entries(PACKS).slice(0, 10).map(([key, pack]) => ({
    label:       `${pack.emoji} ${pack.name}`,
    description: `${pack.price.toLocaleString('pt-BR')} moedas · ${pack.cards} cartas`,
    value:       key,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('fut_shop_select')
    .setPlaceholder('Selecione um item da loja')
    .addOptions(options);

  const row1 = new ActionRowBuilder().addComponents(select);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fut_time').setLabel('🏟️ Meu Time').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('fut_pacotes').setLabel('📦 Meus Pacotes').setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2], files: [attach] };
}

export async function buildPacksMessage(userId, guildId) {
  const balance = await getUserBalance(userId, guildId);
  const imgBuf  = await generatePacksImage();
  const attach  = new AttachmentBuilder(imgBuf, { name: 'pacotes.png' });

  const embed = new EmbedBuilder()
    .setColor(0xaa44ff)
    .setImage('attachment://pacotes.png')
    .setDescription(`🪙 **${balance.toLocaleString('pt-BR')}** moedas disponíveis`)
    .setFooter({ text: 'Selecione um pacote para abrir' });

  const options = Object.entries(PACKS).slice(0, 10).map(([key, pack]) => ({
    label:       `${pack.emoji} ${pack.name}`,
    description: `${pack.price.toLocaleString('pt-BR')} moedas · ${pack.description.slice(0, 50)}`,
    value:       key,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('fut_pack_select')
    .setPlaceholder('Selecione um pacote')
    .addOptions(options);

  const row1 = new ActionRowBuilder().addComponents(select);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('fut_loja').setLabel('🛒 Ir para Loja').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('fut_time').setLabel('🏟️ Meu Time').setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row1, row2], files: [attach] };
}

// ─── Formação Select ──────────────────────────────────────────────────────────
function buildFormacaoMessage(currentFormation) {
  const formations = Object.keys(FORMATION_POSITIONS);
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🔀 Mudar Formação')
    .setDescription(`Formação atual: **${currentFormation}**\n\nEscolha a nova formação do seu time:`);

  const options = formations.map(f => ({
    label:   f,
    value:   f,
    default: f === currentFormation,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('fut_formacao_select')
    .setPlaceholder('Clique para alterar a formação do seu time...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);
  return { embeds: [embed], components: [row] };
}

// ─── Comando principal ────────────────────────────────────────────────────────
export default {
  name: 'fut',
  data: new SlashCommandBuilder()
    .setName('fut')
    .setDescription('Sistema de cartas estilo FIFA/eFootball')
    .addSubcommand(sub =>
      sub.setName('time').setDescription('Veja seu time e elenco')
         .addUserOption(opt => opt.setName('usuario').setDescription('Ver time de outro usuário').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('colecao').setDescription('Veja sua coleção de cartas')
         .addIntegerOption(opt => opt.setName('pagina').setDescription('Página').setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('loja').setDescription('Compre pacotes e itens com suas moedas')
    )
    .addSubcommand(sub =>
      sub.setName('pacotes').setDescription('Abra pacotes de cartas')
    )
    .addSubcommand(sub =>
      sub.setName('partida').setDescription('Jogue uma partida ranqueada')
    )
    .addSubcommand(sub =>
      sub.setName('formacao').setDescription('Mude a formação do seu time')
         .addStringOption(opt =>
           opt.setName('formacao').setDescription('Formação').setRequired(true)
              .addChoices(
                { name: '4-3-3', value: '4-3-3' },
                { name: '4-4-2', value: '4-4-2' },
                { name: '4-2-4', value: '4-2-4' },
                { name: '3-3-4', value: '3-3-4' },
                { name: '5-3-2', value: '5-3-2' },
                { name: '4-5-1', value: '4-5-1' },
                { name: '3-4-3', value: '3-4-3' },
              )
         )
    )
    .addSubcommand(sub =>
      sub.setName('carta').setDescription('Ver carta completa de um jogador da sua coleção')
         .addIntegerOption(opt => opt.setName('id').setDescription('ID do jogador (veja os números em /fut colecao)').setRequired(false).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('nome').setDescription('Mude o nome do seu time')
         .addStringOption(opt => opt.setName('nome').setDescription('Novo nome (máx. 32 caracteres)').setRequired(true).setMaxLength(32))
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const userId  = interaction.user.id;
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.reply({ content: '❌ Este comando só funciona em servidores.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    try {
      // ── time ──────────────────────────────────────────────────────────────
      if (sub === 'time') {
        const targetUser = interaction.options.getUser('usuario');
        const targetId   = targetUser?.id ?? userId;
        const member     = await interaction.guild.members.fetch(targetId).catch(() => null) ?? interaction.member;
        const msg = await buildTeamMessage(targetId, guildId, member);
        return interaction.editReply(msg);
      }

      // ── carta ────────────────────────────────────────────────────────────
      if (sub === 'carta') {
        const playerId = interaction.options.getInteger('id');
        const team = await getOrCreateTeam(userId, guildId);
        let player;
        if (playerId) {
          const card = await prisma.futUserCard.findFirst({ where: { teamId: team.id, playerId } });
          if (!card) return interaction.editReply({ content: '❌ Você não tem essa carta na sua coleção. Use `/fut colecao` para ver seus jogadores.' });
          player = getPlayerById(playerId);
        } else {
          const allCards = await prisma.futUserCard.findMany({ where: { teamId: team.id } });
          if (!allCards.length) return interaction.editReply({ content: '❌ Você não tem cartas ainda! Abra pacotes com `/fut loja`.' });
          const withPlayers = allCards.map(c => ({ ...c, player: getPlayerById(c.playerId) }));
          const best = withPlayers.sort((a, b) => (b.player?.ovr ?? 0) - (a.player?.ovr ?? 0))[0];
          player = best.player;
        }
        if (!player) return interaction.editReply({ content: '❌ Jogador não encontrado.' });
        const imgBuf = await generateSingleCardImage(player);
        const attach = new AttachmentBuilder(imgBuf, { name: 'carta.png' });
        const embed = new EmbedBuilder()
          .setColor(player.rarity === 'black' ? 0x9333ea : player.rarity === 'gold' ? 0xffd700 : player.rarity === 'silver' ? 0x94a3b8 : 0xb45309)
          .setTitle(`${rarityEmoji(player.rarity)} ${player.name}`)
          .setDescription(`**OVR ${player.ovr}** · ${player.pos} · ${player.club} · ${player.nat}`)
          .setImage('attachment://carta.png')
          .setFooter({ text: 'Use /fut colecao para ver todas as suas cartas' });
        return interaction.editReply({ embeds: [embed], files: [attach] });
      }

      // ── colecao ───────────────────────────────────────────────────────────
      if (sub === 'colecao') {
        const page = interaction.options.getInteger('pagina') ?? 1;
        const msg  = await buildCollectionMessage(userId, guildId, page);
        return interaction.editReply(msg);
      }

      // ── loja ──────────────────────────────────────────────────────────────
      if (sub === 'loja') {
        const msg = await buildShopMessage(userId, guildId);
        return interaction.editReply(msg);
      }

      // ── pacotes ───────────────────────────────────────────────────────────
      if (sub === 'pacotes') {
        const msg = await buildPacksMessage(userId, guildId);
        return interaction.editReply(msg);
      }

      // ── partida ───────────────────────────────────────────────────────────
      if (sub === 'partida') {
        const result = await simulateMatch(userId, guildId);

        if (!result.success) {
          return interaction.editReply({ content: `⚠️ ${result.message}` });
        }

        const eloText = result.eloChange >= 0 ? `+${result.eloChange}` : `${result.eloChange}`;

        const imgBuf = await generatePartidaImage({
          result:    result.result,
          myScore:   result.myScore,
          oppScore:  result.oppScore,
          myOvr:     result.myOvr,
          oppOvr:    result.oppOvr,
          oppName:   result.oppName,
          eloChange: result.eloChange,
          newElo:    result.newElo,
        });
        const attach = new AttachmentBuilder(imgBuf, { name: 'partida.png' });

        const embed = new EmbedBuilder()
          .setColor(result.result === 'win' ? 0x2ecc71 : result.result === 'draw' ? 0xf39c12 : 0xe74c3c)
          .setImage('attachment://partida.png')
          .addFields(
            { name: 'Histórico', value: `✅ ${result.wins}V · 🤝 ${result.draws}E · ❌ ${result.losses}D`, inline: false },
          )
          .setFooter({ text: `ELO: ${result.newElo} (${eloText})` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('fut_partida').setLabel('Jogar Novamente').setStyle(ButtonStyle.Success).setEmoji('⚽'),
          new ButtonBuilder().setCustomId('fut_time').setLabel('🏟️ Meu Time').setStyle(ButtonStyle.Primary),
        );

        return interaction.editReply({ embeds: [embed], components: [row], files: [attach] });
      }

      // ── formacao ──────────────────────────────────────────────────────────
      if (sub === 'formacao') {
        const formation = interaction.options.getString('formacao');
        const team = await getOrCreateTeam(userId, guildId);
        await changeFormation(team.id, formation);
        const msg = await buildTeamMessage(userId, guildId, interaction.member);
        return interaction.editReply({ content: `✅ Formação alterada para **${formation}**!`, ...msg });
      }

      // ── nome ──────────────────────────────────────────────────────────────
      if (sub === 'nome') {
        const name = interaction.options.getString('nome');
        const team = await getOrCreateTeam(userId, guildId);
        await changeTeamName(team.id, name);
        const msg = await buildTeamMessage(userId, guildId, interaction.member);
        return interaction.editReply({ content: `✅ Nome do time alterado para **${name}**!`, ...msg });
      }

    } catch (err) {
      console.error('[FUT ERROR]', err);
      return interaction.editReply({ content: '❌ Ocorreu um erro. Tente novamente.' });
    }
  },
};
