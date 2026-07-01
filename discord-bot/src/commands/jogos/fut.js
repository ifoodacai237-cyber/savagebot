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
import { generateFieldImage } from '../../utils/futCanvas.js';
import { rarityLabel } from '../../utils/futPlayers.js';

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
  const data  = await getCollection(team.id, page, 12);

  const rarityOrder = { black: 0, gold: 1, silver: 2, bronze: 3 };
  const sorted = [...data.cards].sort((a, b) =>
    (rarityOrder[a.player?.rarity] ?? 4) - (rarityOrder[b.player?.rarity] ?? 4) ||
    (b.player?.ovr ?? 0) - (a.player?.ovr ?? 0)
  );

  const lines = sorted.map(c => {
    if (!c.player) return '`?` Carta desconhecida';
    return `${rarityEmoji(c.player.rarity)} \`${c.player.ovr}\` **${c.player.name}** — ${c.player.pos} · ${c.player.nat}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x6a0dad)
    .setTitle('📋 Sua Coleção')
    .setDescription(lines.length ? lines.join('\n') : 'Nenhuma carta ainda! Abra pacotes na loja.')
    .setFooter({ text: `Página ${data.page}/${data.pages || 1} · ${data.total} cartas no total` });

  const prevDisabled = page <= 1;
  const nextDisabled = page >= (data.pages || 1);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`fut_colecao_${page - 1}`).setLabel('◀ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(prevDisabled),
    new ButtonBuilder().setCustomId('fut_time').setLabel('🏟️ Ver Time').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`fut_colecao_${page + 1}`).setLabel('Próxima ▶').setStyle(ButtonStyle.Secondary).setDisabled(nextDisabled),
  );

  return { embeds: [embed], components: [row] };
}

export async function buildShopMessage(userId, guildId) {
  const balance = await getUserBalance(userId, guildId);

  const embed = new EmbedBuilder()
    .setColor(0xf4a261)
    .setTitle('🛒 Loja FUT')
    .setDescription(`Você tem 🪙 **${balance.toLocaleString('pt-BR')}** moedas\n\nAcesse os melhores produtos e pacotes exclusivos!`)
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

  return { embeds: [embed], components: [row1, row2] };
}

export async function buildPacksMessage(userId, guildId) {
  const balance = await getUserBalance(userId, guildId);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('📦 Abrir Pacotes')
    .setDescription(`Você tem 🪙 **${balance.toLocaleString('pt-BR')}** moedas\n\nVisualize os pacotes disponíveis que podem te ajudar a expandir sua coleção!`)
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

  return { embeds: [embed], components: [row1, row2] };
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

        const emoji = resultEmoji(result.result);
        const resultText = result.result === 'win' ? '**Vitória!**' : result.result === 'draw' ? '**Empate!**' : '**Derrota!**';
        const eloText = result.eloChange >= 0 ? `+${result.eloChange}` : `${result.eloChange}`;

        const embed = new EmbedBuilder()
          .setColor(result.result === 'win' ? 0x2ecc71 : result.result === 'draw' ? 0xf39c12 : 0xe74c3c)
          .setTitle(`${emoji} Partida Ranqueada — ${resultText}`)
          .addFields(
            { name: 'Placar',       value: `**${result.myScore} × ${result.oppScore}** vs ${result.oppName}`, inline: false },
            { name: 'Seu OVR',      value: `**${result.myOvr}**`, inline: true },
            { name: 'OVR Adversário', value: `**${result.oppOvr}**`, inline: true },
            { name: 'ELO',          value: `${result.newElo} (${eloText})`, inline: true },
            { name: 'Histórico',    value: `✅ ${result.wins}V · 🤝 ${result.draws}E · ❌ ${result.losses}D`, inline: false },
          )
          .setFooter({ text: `${resultText} vs ${result.oppName}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('fut_partida').setLabel('Jogar Novamente').setStyle(ButtonStyle.Success).setEmoji('⚽'),
          new ButtonBuilder().setCustomId('fut_time').setLabel('🏟️ Meu Time').setStyle(ButtonStyle.Primary),
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
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
