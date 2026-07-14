import discord
from discord.ext import commands, tasks
import asyncio
import os
from dotenv import load_dotenv
import sys
import traceback

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from sniper_bot.db import Database
from sniper_bot.generator import UsernameGenerator
from sniper_bot.sniper import UsernameSniper
from sniper_bot.checker import AvailabilityChecker

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)

db = None
generator = None
sniper = None
checker = None

PUBLISH_CHANNELS = {}
PUBLISH_INTERVAL = 5  # minutos
USERNAMES_PER_MESSAGE = 500

@bot.event
async def on_ready():
    global db, generator, sniper, checker
    
    print(f"\n{'='*60}")
    print(f"✅ Bot conectado como {bot.user}")
    print(f"🆔 Bot ID: {bot.user.id}")
    print(f"{'='*60}\n")
    
    try:
        db = Database()
        await db.init()
        print("✅ Database inicializado")
        
        generator = UsernameGenerator(db)
        checker = AvailabilityChecker(db)
        sniper = UsernameSniper(bot, db, checker)
        print("✅ Módulos inicializados")
        
        if not generator_task.is_running():
            generator_task.start()
            print("✅ Gerador iniciado")
        if not sniper_task.is_running():
            sniper_task.start()
            print("✅ Sniper iniciado")
        if not cleanup_task.is_running():
            cleanup_task.start()
            print("✅ Cleanup iniciado")
        if not publish_task.is_running():
            publish_task.start()
            print("✅ Publisher iniciado")
        
        print("\n🔄 Sincronizando comandos...")
        try:
            synced = await bot.tree.sync()
            print(f"\n✅ {len(synced)} comando(s) sincronizado(s):\n")
            for cmd in synced:
                print(f"   ✅ /{cmd.name}")
            print()
        except Exception as e:
            print(f"❌ Erro ao sincronizar comandos: {e}")
            traceback.print_exc()
    except Exception as e:
        print(f"❌ Erro no on_ready: {e}")
        traceback.print_exc()

@tasks.loop(minutes=5)
async def generator_task():
    """Tarefa de geração contínua de usernames"""
    if generator is None:
        return
    try:
        await generator.generate_batch(batch_size=5000, category="mixed")
    except Exception as e:
        print(f"❌ Erro em generator_task: {e}")

@tasks.loop(minutes=2)
async def sniper_task():
    """Tarefa de monitoramento de sniper"""
    if sniper is None or db is None:
        return
    try:
        await sniper.check_sniped_usernames()
    except Exception as e:
        print(f"❌ Erro em sniper_task: {e}")

@tasks.loop(hours=1)
async def cleanup_task():
    """Tarefa de limpeza e otimização do banco de dados"""
    if db is None:
        return
    try:
        await db.cleanup()
    except Exception as e:
        print(f"❌ Erro em cleanup_task: {e}")

@tasks.loop(minutes=PUBLISH_INTERVAL)
async def publish_task():
    """Tarefa de publicação de usernames nos canais"""
    if db is None or not PUBLISH_CHANNELS:
        return
    
    try:
        for category, channel_id in PUBLISH_CHANNELS.items():
            await publish_available_usernames(category, channel_id)
    except Exception as e:
        print(f"❌ Erro em publish_task: {e}")

async def publish_available_usernames(category: str, channel_id: int):
    """Publica usernames disponíveis em um canal"""
    try:
        channel = bot.get_channel(channel_id)
        if not channel:
            print(f"❌ Canal {channel_id} não encontrado")
            return
        
        # Busca usernames disponíveis
        usernames = await db.get_available_usernames(category=category, limit=USERNAMES_PER_MESSAGE)
        
        if not usernames:
            return
        
        # Cria lista de usernames
        username_list = "\n".join([f"✅ `{u[0]}`" for u in usernames])
        
        # Cria embed
        embed = discord.Embed(
            title=f"🎁 Usernames Disponíveis - {category.upper()}",
            color=discord.Color.green(),
            description=username_list
        )
        embed.set_footer(text=f"Total: {len(usernames)} | Fallen Angels Sniper")
        
        # Envia
        await channel.send(embed=embed)
        print(f"✅ {len(usernames)} usernames de '{category}' publicados em #{channel.name}")
        
    except Exception as e:
        print(f"❌ Erro ao publicar usernames: {e}")
        traceback.print_exc()

# ========== SLASH COMMANDS ==========

@bot.tree.command(name="setup_canal", description="Configura um canal para publicação automática")
@discord.app_commands.choices(
    categoria=[
        discord.app_commands.Choice(name="short (2-5 chars)", value="short"),
        discord.app_commands.Choice(name="numbers (com números)", value="numbers"),
        discord.app_commands.Choice(name="realword (palavras reais)", value="realword"),
        discord.app_commands.Choice(name="mixed (misturado)", value="mixed"),
        discord.app_commands.Choice(name="rare (raro)", value="rare"),
    ]
)
@discord.app_commands.describe(
    categoria="Categoria de usernames a publicar neste canal"
)
async def setup_canal(interaction: discord.Interaction, categoria: str):
    """Configura um canal para receber usernames de uma categoria"""
    # Verifica permissões de admin
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ Você precisa ser administrador!", ephemeral=True)
        return
    
    global PUBLISH_CHANNELS
    
    PUBLISH_CHANNELS[categoria] = interaction.channel_id
    
    embed = discord.Embed(
        title="✅ Canal Configurado",
        color=discord.Color.green(),
        description=f"Este canal receberá usernames de categoria: **{categoria}**\n\nPublicação automática a cada {PUBLISH_INTERVAL} minutos"
    )
    embed.set_footer(text="Fallen Angels Sniper")
    
    await interaction.response.send_message(embed=embed)
    print(f"✅ Canal #{interaction.channel.name} configurado para categoria '{categoria}'")

@bot.tree.command(name="canais", description="Mostra canais configurados para publicação")
async def canais(interaction: discord.Interaction):
    """Lista canais configurados"""
    if not PUBLISH_CHANNELS:
        await interaction.response.send_message("❌ Nenhum canal configurado ainda!", ephemeral=True)
        return
    
    embed = discord.Embed(
        title="📊 Canais Configurados",
        color=discord.Color.blue(),
        description="Canais ativos para publicação de usernames"
    )
    
    for category, channel_id in PUBLISH_CHANNELS.items():
        channel = bot.get_channel(channel_id)
        channel_mention = channel.mention if channel else f"Canal {channel_id}"
        embed.add_field(
            name=f"📁 {category.upper()}",
            value=f"{channel_mention} | ID: {channel_id}",
            inline=False
        )
    
    embed.set_footer(text="Fallen Angels Sniper")
    await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="gerar", description="Inicia geração automática de usernames")
@discord.app_commands.choices(
    categoria=[
        discord.app_commands.Choice(name="short (2-5 chars)", value="short"),
        discord.app_commands.Choice(name="numbers (com números)", value="numbers"),
        discord.app_commands.Choice(name="realword (palavras reais)", value="realword"),
        discord.app_commands.Choice(name="mixed (misturado)", value="mixed"),
        discord.app_commands.Choice(name="rare (raro)", value="rare"),
    ]
)
@discord.app_commands.describe(
    categoria="Escolha a categoria de usernames"
)
async def gerar(interaction: discord.Interaction, categoria: str = "mixed"):
    """Inicia geração automática de usernames"""
    if generator is None:
        await interaction.response.send_message("❌ Sistema ainda não foi inicializado!", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    try:
        count = await generator.generate_batch(batch_size=10000, category=categoria)
        
        embed = discord.Embed(
            title="✅ Geração Iniciada",
            color=discord.Color.green(),
            description=f"**Categoria:** {categoria}\n**Usernames gerados:** {count:,}"
        )
        embed.set_footer(text="Fallen Angels Sniper")
        await interaction.followup.send(embed=embed)
    except Exception as e:
        await interaction.followup.send(f"❌ Erro: {str(e)}")
        traceback.print_exc()

@bot.tree.command(name="snipe_add", description="Adiciona username para monitoramento")
@discord.app_commands.describe(
    username="Username para monitorar (3-32 caracteres)"
)
async def snipe_add(interaction: discord.Interaction, username: str):
    """Adiciona username para snipe"""
    if sniper is None:
        await interaction.response.send_message("❌ Sistema ainda não foi inicializado!", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    if len(username) < 3 or len(username) > 32:
        await interaction.followup.send("❌ Username deve ter entre 3 e 32 caracteres!")
        return
    
    try:
        success = await sniper.add_target(username, interaction.user.id)
        
        if success:
            embed = discord.Embed(
                title="✅ Username Adicionado",
                color=discord.Color.green(),
                description=f"Monitorando: **{username}**"
            )
            embed.set_footer(text="Fallen Angels Sniper")
            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send(f"❌ Username {username} já está sendo monitorado!")
    except Exception as e:
        await interaction.followup.send(f"❌ Erro: {str(e)}")
        traceback.print_exc()

@bot.tree.command(name="snipe_list", description="Lista seus usernames em monitoramento")
async def snipe_list(interaction: discord.Interaction):
    """Lista usernames em snipe"""
    if sniper is None:
        await interaction.response.send_message("❌ Sistema ainda não foi inicializado!", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    try:
        targets = await sniper.get_user_targets(interaction.user.id)
        
        if not targets:
            await interaction.followup.send("❌ Você não possui usernames em monitoramento")
            return
        
        embed = discord.Embed(
            title="📋 Seus Alvos de Snipe",
            color=discord.Color.blue(),
            description=f"Total: {len(targets)} username(s)"
        )
        
        for target in targets[:25]:
            embed.add_field(
                name=target[1],
                value=f"Status: {target[2]} | Adicionado: <t:{int(target[3])}:R>",
                inline=False
            )
        
        embed.set_footer(text="Fallen Angels Sniper")
        await interaction.followup.send(embed=embed)
    except Exception as e:
        await interaction.followup.send(f"❌ Erro: {str(e)}")
        traceback.print_exc()

@bot.tree.command(name="disponivel", description="Verifica se um username está disponível")
@discord.app_commands.describe(
    username="Username para verificar"
)
async def disponivel(interaction: discord.Interaction, username: str):
    """Verifica disponibilidade de um username"""
    if checker is None:
        await interaction.response.send_message("❌ Sistema ainda não foi inicializado!", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    try:
        is_available = await checker.check_availability(username)
        
        status = "✅ DISPONÍVEL" if is_available else "❌ OCUPADO"
        color = discord.Color.green() if is_available else discord.Color.red()
        
        embed = discord.Embed(
            title=status,
            color=color,
            description=f"Username: **{username}**"
        )
        embed.set_footer(text="Fallen Angels Sniper")
        
        await interaction.followup.send(embed=embed)
    except Exception as e:
        await interaction.followup.send(f"❌ Erro: {str(e)}")
        traceback.print_exc()

@bot.tree.command(name="status", description="Mostra status geral do sistema")
async def status(interaction: discord.Interaction):
    """Mostra status do sistema"""
    if db is None:
        await interaction.response.send_message("❌ Sistema ainda não foi inicializado!", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    try:
        stats = await db.get_statistics()
        
        embed = discord.Embed(
            title="📊 Status do Sistema",
            color=discord.Color.gold(),
            description="Estatísticas gerais em tempo real"
        )
        
        embed.add_field(name="💾 Usernames em BD", value=f"{stats['total_usernames']:,}", inline=True)
        embed.add_field(name="✅ Disponíveis", value=f"{stats['available']:,}", inline=True)
        embed.add_field(name="❌ Ocupados", value=f"{stats['unavailable']:,}", inline=True)
        embed.add_field(name="🎯 Em Monitoramento", value=f"{stats['sniped']:,}", inline=True)
        embed.add_field(name="⚡ Taxa de Verificação", value=f"{stats['check_rate']}/min", inline=True)
        
        gen_status = "✅ Ativo" if generator_task.is_running() else "❌ Parado"
        sniper_status = "✅ Ativo" if sniper_task.is_running() else "❌ Parado"
        publish_status = "✅ Ativo" if publish_task.is_running() else "❌ Parado"
        
        embed.add_field(name="🔄 Gerador", value=gen_status, inline=True)
        embed.add_field(name="🎯 Sniper", value=sniper_status, inline=True)
        embed.add_field(name="💼 Publisher", value=publish_status, inline=True)
        
        embed.set_footer(text="Fallen Angels Sniper")
        
        await interaction.followup.send(embed=embed)
    except Exception as e:
        await interaction.followup.send(f"❌ Erro: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        print("❌ DISCORD_TOKEN não configurado em .env!")
        sys.exit(1)
    
    print("🚀 Iniciando bot Fallen Angels...")
    try:
        bot.run(token)
    except Exception as e:
        print(f"❌ Erro ao iniciar bot: {e}")
        traceback.print_exc()
