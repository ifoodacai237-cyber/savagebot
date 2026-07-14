import discord
from discord.ext import commands, tasks
import asyncio
import os
from dotenv import load_dotenv
from db import Database
from generator import UsernameGenerator
from sniper import UsernameSniper
from checker import AvailabilityChecker

load_dotenv()

# Setup bot
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Initialize modules
db = None
generator = None
sniper = None
checker = None

@bot.event
async def on_ready():
    global db, generator, sniper, checker
    
    print(f"✅ Bot conectado como {bot.user}")
    
    # Initialize database
    db = Database()
    await db.init()
    
    # Initialize modules
    generator = UsernameGenerator(db)
    checker = AvailabilityChecker(db)
    sniper = UsernameSniper(bot, db, checker)
    
    # Start background tasks
    if not generator_task.is_running():
        generator_task.start()
    if not sniper_task.is_running():
        sniper_task.start()
    if not cleanup_task.is_running():
        cleanup_task.start()
    
    # Sync commands
    try:
        synced = await bot.tree.sync()
        print(f"🔄 {len(synced)} comando(s) sincronizado(s)")
    except Exception as e:
        print(f"❌ Erro ao sincronizar comandos: {e}")

@tasks.loop(minutes=5)
async def generator_task():
    """Tarefa de geração contínua de usernames"""
    try:
        await generator.generate_batch(batch_size=5000)
    except Exception as e:
        print(f"❌ Erro em generator_task: {e}")

@tasks.loop(minutes=2)
async def sniper_task():
    """Tarefa de monitoramento de sniper"""
    try:
        await sniper.check_sniped_usernames()
    except Exception as e:
        print(f"❌ Erro em sniper_task: {e}")

@tasks.loop(hours=1)
async def cleanup_task():
    """Tarefa de limpeza e otimização do banco de dados"""
    try:
        await db.cleanup()
    except Exception as e:
        print(f"❌ Erro em cleanup_task: {e}")

# Commands
@bot.tree.command(name="gerar", description="Inicia geração automática de usernames")
@discord.app_commands.describe(
    categoria="Categoria de usernames (default: mixed)"
)
async def generate_command(interaction: discord.Interaction, categoria: str = "mixed"):
    """Inicia geração de usernames"""
    await interaction.response.defer()
    
    if categoria not in ["short", "numbers", "realword", "mixed", "rare"]:
        await interaction.followup.send("❌ Categoria inválida!")
        return
    
    count = await generator.generate_batch(batch_size=10000, category=categoria)
    
    embed = discord.Embed(
        title="✅ Geração Iniciada",
        color=discord.Color.green(),
        description=f"**Categoria:** {categoria}\n**Usernames gerados:** {count:,}"
    )
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="snipe_add", description="Adiciona username para monitoramento")
@discord.app_commands.describe(
    username="Username para monitorar"
)
async def snipe_add_command(interaction: discord.Interaction, username: str):
    """Adiciona username para snipe"""
    await interaction.response.defer()
    
    if len(username) < 3 or len(username) > 32:
        await interaction.followup.send("❌ Username deve ter entre 3 e 32 caracteres!")
        return
    
    success = await sniper.add_target(username, interaction.user.id)
    
    if success:
        embed = discord.Embed(
            title="✅ Username Adicionado",
            color=discord.Color.green(),
            description=f"Monitorando: **{username}**"
        )
        await interaction.followup.send(embed=embed)
    else:
        await interaction.followup.send(f"❌ Username {username} já está sendo monitorado!")

@bot.tree.command(name="snipe_list", description="Lista seus usernames em monitoramento")
async def snipe_list_command(interaction: discord.Interaction):
    """Lista usernames em snipe"""
    await interaction.response.defer()
    
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
    
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="disponivel", description="Verifica se um username está disponível")
@discord.app_commands.describe(
    username="Username para verificar"
)
async def check_command(interaction: discord.Interaction, username: str):
    """Verifica disponibilidade de um username"""
    await interaction.response.defer()
    
    is_available = await checker.check_availability(username)
    
    status = "✅ DISPONÍVEL" if is_available else "❌ OCUPADO"
    color = discord.Color.green() if is_available else discord.Color.red()
    
    embed = discord.Embed(
        title=status,
        color=color,
        description=f"Username: **{username}**"
    )
    
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="status", description="Mostra status geral do sistema")
async def status_command(interaction: discord.Interaction):
    """Mostra status do sistema"""
    await interaction.response.defer()
    
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
    embed.add_field(name="🔄 Gerador", value="✅ Ativo" if generator_task.is_running() else "❌ Parado", inline=True)
    
    await interaction.followup.send(embed=embed)

# Run bot
bot.run(os.getenv("DISCORD_TOKEN"))
