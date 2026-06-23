import {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from 'discord.js';

const COLOR = 0x9B4FD6;

// ─── Definição das categorias ─────────────────────────────────────────────────

const CATEGORIES = [
  {
    value: 'economia',
    label: 'Economia',
    description: 'Comandos de economia',
    emoji: '💰',
    title: '💰 Comandos de Economia',
    commands: [
      { cmd: '/eco daily',              desc: 'Colete sua recompensa diária de moedas.' },
      { cmd: '/eco trabalho',           desc: 'Trabalhe e ganhe moedas (cooldown: 1h).' },
      { cmd: '/eco pagar [usuário] [valor]', desc: 'Transfira moedas para outro usuário.' },
      { cmd: '/eco depositar [valor]',  desc: 'Deposite moedas no banco (use "tudo" para tudo).' },
      { cmd: '/eco sacar [valor]',      desc: 'Saque moedas do banco.' },
      { cmd: '/eco top',                desc: 'Veja o ranking de economia do servidor.' },
      { cmd: '/jogo',                   desc: 'Apostas e jogos de cassino.' },
    ],
  },
  {
    value: 'loja',
    label: 'Loja & Perfil',
    description: 'Banners, pets e personalização',
    emoji: '🛒',
    title: '🛒 Loja & Perfil',
    commands: [
      { cmd: '/loja painel',            desc: 'Envia o painel da loja no canal.' },
      { cmd: '/perfil',                 desc: 'Veja seu card de perfil com banner equipado.' },
      { cmd: '/pet brincar',            desc: 'Brinque com seu pet e ganhe 150–300 moedas (CD: 4h).' },
      { cmd: '/pet alimentar',          desc: 'Alimente seu pet e ganhe 80–160 moedas (CD: 2h).' },
      { cmd: '/pet acariciar',          desc: 'Faça carinho no seu pet e ganhe 40–100 moedas (CD: 1h).' },
      { cmd: '/pet status',             desc: 'Veja os cooldowns das interações do seu pet.' },
      { cmd: '/conquista listar',       desc: 'Veja todas as conquistas e seu progresso.' },
    ],
  },
  {
    value: 'interacao',
    label: 'Interação',
    description: 'Comandos de interação social',
    emoji: '💬',
    title: '💬 Comandos de Interação',
    commands: [
      { cmd: '/kiss @usuário',  desc: 'Beije alguém especial.' },
      { cmd: '/hug @usuário',   desc: 'Dê um abraço quentinho.' },
      { cmd: '/pat @usuário',   desc: 'Faça carinho em alguém.' },
      { cmd: '/bite @usuário',  desc: 'Morda alguém (carinhosamente).' },
      { cmd: '/poke @usuário',  desc: 'Cutuque alguém.' },
      { cmd: '/push @usuário',  desc: 'Empurre alguém (de brincadeira).' },
      { cmd: '/slap @usuário',  desc: 'Dê um tapinha.' },
      { cmd: '/punch @usuário', desc: 'Dê um socão.' },
    ],
  },
  {
    value: 'utilidades',
    label: 'Utilidades',
    description: 'Comandos gerais e ferramentas',
    emoji: '🔧',
    title: '🔧 Utilidades',
    commands: [
      { cmd: '/ping',               desc: 'Veja a latência do bot.' },
      { cmd: '/call',               desc: 'Faz o bot entrar em call 24/7.' },
      { cmd: '/musica',             desc: 'Toca uma música do YouTube no canal de voz.' },
      { cmd: '/radio',              desc: 'Liga o rádio do servidor no canal de voz.' },
      { cmd: '/instagram perfil (usuário)', desc: 'Veja o perfil de alguém no estilo Instagram.' },
      { cmd: '/tellonym',           desc: 'Envie ou receba mensagens anônimas.' },
      { cmd: '/ticket painel',      desc: 'Envia o painel de abertura de tickets.' },
      { cmd: '/container criar',    desc: 'Crie mensagens personalizadas com containers.' },
    ],
  },
  {
    value: 'admin',
    label: 'Administração',
    description: 'Comandos exclusivos para admins',
    emoji: '⚙️',
    title: '⚙️ Administração',
    commands: [
      { cmd: '/boas-vindas',            desc: 'Configura o sistema de boas-vindas do servidor.' },
      { cmd: '/loja config',            desc: 'Abre o painel de administração da loja.' },
      { cmd: '/criar-banner [nome] [imagem] [preço]', desc: 'Cria um banner personalizado para a loja.' },
      { cmd: '/remover-banner',         desc: 'Remove um banner personalizado da loja.' },
      { cmd: '/criar-pet',              desc: 'Adiciona um pet à venda na loja.' },
      { cmd: '/editar-pet',             desc: 'Edita um pet existente na loja.' },
      { cmd: '/conquista emoji',        desc: 'Personaliza o emoji de uma conquista.' },
      { cmd: '/ticket config',          desc: 'Configura o sistema de tickets.' },
      { cmd: '/instagram ativar/desativar', desc: 'Ativa ou desativa o feed do Instagram.' },
      { cmd: '/instagram cor [hex]',    desc: 'Altera a cor dos posts do Instagram.' },
      { cmd: '/tellonym config',        desc: 'Configura o módulo de mensagens anônimas.' },
      { cmd: '/sync',                   desc: 'Sincroniza os slash commands com o Discord.' },
    ],
  },
];

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildSelectMenu() {
  const sel = new StringSelectMenuBuilder()
    .setCustomId('ajuda_cat_sel')
    .setPlaceholder('📂 Selecione uma categoria');

  for (const cat of CATEGORIES) {
    sel.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(cat.label)
        .setValue(cat.value)
        .setDescription(cat.description)
        .setEmoji(cat.emoji)
    );
  }

  return new ActionRowBuilder().addComponents(sel);
}

function buildInitialContainer(botUser) {
  const catList = CATEGORIES.map(c => `${c.emoji} **${c.label}** — ${c.description}`).join('\n');
  const text = `## 📖 Central de Ajuda\n\nSelecione uma categoria abaixo para ver os comandos disponíveis.\n\n${catList}\n\n-# [] = Obrigatório  () = Opcional`;

  const c = new ContainerBuilder().setAccentColor(COLOR);
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return c;
}

function buildCategoryContainer(catValue) {
  const cat = CATEGORIES.find(c => c.value === catValue);
  if (!cat) return null;

  const lines = cat.commands
    .map(c => `↳ \`${c.cmd}\`\n  ↪ ${c.desc}`)
    .join('\n');

  const text = `## ${cat.title}\n\n**\`[]\` = Obrigatório  \`()\` = Opcional**\n\n${lines}\n\n-# Use /ajuda para voltar ao menu`;

  const c = new ContainerBuilder().setAccentColor(COLOR);
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return c;
}

function v2HelpPayload(container) {
  return { components: [container, buildSelectMenu()], flags: MessageFlags.IsComponentsV2 };
}

// ─── Comando ──────────────────────────────────────────────────────────────────

export default {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('📖 Lista todos os comandos disponíveis por categoria'),
  name: 'ajuda',
  aliases: ['help', 'comandos'],

  async execute(interaction) {
    const container = buildInitialContainer(interaction.client.user);
    return interaction.reply({ ...v2HelpPayload(container), ephemeral: true });
  },

  async executePrefix(message) {
    const container = buildInitialContainer(message.client.user);
    return message.reply(v2HelpPayload(container));
  },
};

// ─── Handler do select menu (chamado pelo interactionCreate) ──────────────────

export async function handleAjudaCatSel(interaction) {
  const catValue  = interaction.values[0];
  const container = buildCategoryContainer(catValue);
  if (!container) return interaction.update({ content: '❌ Categoria não encontrada.', components: [] });

  return interaction.update(v2HelpPayload(container));
}
