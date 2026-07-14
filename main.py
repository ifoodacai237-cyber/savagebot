import discord
from discord.ext import commands, tasks
import asyncio
import os
from dotenv import load_dotenv
import sys
import traceback
import random
import string
from datetime import datetime

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

PUBLISH_CHANNELS = {}  # {category: channel_id}
PUBLISH_INTERVAL = 1  # minutos (TESTE: 1 min)
USERNAMES_PER_MESSAGE = 50  # Começa com 50 para teste

@bot.event
async def on_ready():
    global db, generator, sniper, checker
    
    print(f"\n{'='*60}")
    print(f"✅ Bot conectado como {bot.user}")
    print(f"🆔 Bot ID: {bot.user.id}")
    print(f"Horário: {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*60}\n")
    
    try:
        db = Database()
        await db.init()
        print("✅ Database inicializado")
        
        generator = UsernameGenerator(db)
        checker = AvailabilityChecker(db)
        sniper = UsernameSniper(bot, db, checker)
        print("✅ Módulos inicializados")
        
        # Popula banco de dados com dados de teste
        print("\n💾 Populando banco de dados com usernames de teste...")
        await populate_test_data()
        print("✅ Dados de teste adicionados")
        
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
            print("✅ Publisher iniciado (intervalo: {PUBLISH_INTERVAL} minuto(s))")
        
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

async def populate_test_data():
    """Popula banco com dados de teste"""
    if db is None:
        return
    
    try:
        # Verifica se já tem dados
        stats = await db.get_statistics()
        if stats['total_usernames'] > 0:
            print(f"   Já existem {stats['total_usernames']} usernames no BD")
            return
        
        # Cria usernames de teste
        test_data = []
        categories = ['short', 'numbers', 'realword', 'mixed', 'rare']
        
        for category in categories:
            for i in range(100):  # 100 por categoria
                if category == 'short':
                    username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=random.randint(2, 5)))
                elif category == 'numbers':
                    username = f"user{random.randint(1000, 9999)}"
                elif category == 'realword':
                    username = random.choice(['fire', 'water', 'earth', 'wind', 'sky', 'dream', 'star', 'moon']) + str(random.randint(0, 999))
                elif category == 'mixed':
                    username = f"player_{random.randint(1, 999)}"
                else:  # rare
                    username = ''.join(random.choices(string.ascii_lowercase, k=random.randint(3, 8)))
                
                test_data.append((username, category))
        
        # Insere dados
        count = await db.bulk_add_usernames(test_data)
        print(f"   ✅ {count} usernames adicionados para teste")
        
        # Marca alguns como disponíveis
        for username, _ in test_data[:250]:  # 50% disponível
            await db.update_availability(username, 1, cache=False)
        
    except Exception as e:
        print(f"   ❌ Erro ao popular dados: {e}")

@tasks.loop(minutes=PUBLISH_INTERVAL)
async def generator_task():
    """Tarefa de geração contínua de usernames"""
    if generator is None:
        return
    try:
        now = datetime.now().strftime('%H:%M:%S')
        print(f"[{now}] 🔄 Gerando batch de usernames...")
        await generator.generate_batch(batch_size=100, category="mixed")  # Reduzido para teste
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
    if db is None:
        return
    
    now = datetime.now().strftime('%H:%M:%S')
    print(f"[{now}] 💼 Publisher executando ({len(PUBLISH_CHANNELS)} canais configurados)")
    
    if not PUBLISH_CHANNELS:
        print(f"[{now}]    ℹ️  Nenhum canal configurado ainda")
        return
    
    try:
        for category, channel_id in PUBLISH_CHANNELS.items():
            await publish_available_usernames(category, channel_id)
    except Exception as e:
        print(f"[{now}] ❌ Erro em publish_task: {e}")
        traceback.print_exc()

async def publish_available_usernames(category: str, channel_id: int):
    """Publica usernames disponíveis em um canal"""
    try:
        channel = bot.get_channel(channel_id)
        if not channel:
            print(f"   ❌ Canal {channel_id} não encontrado")
            return
        
        # Busca usernames disponíveis
        usernames = await db.get_available_usernames(category=category, limit=USERNAMES_PER_MESSAGE)
        
        if not usernames:
            print(f"   ⚠️  Nenhum username disponível na categoria '{category}'")
            return
        
        # Cria lista de usernames
        username_list = "\n".join([f"✅ `{u[0]}`" for u in usernames])
        
        # Cria embed
        embed = discord.Embed(
            title=f"🎁 Usernames Disponíveis - {category.upper()}",
            color=discord.Color.green(),
            description=username_list if len(username_list) < 2048 else username_list[:2000] + "..."
        )
        embed.set_footer(text=f"Total: {len(usernames)} | Fallen Angels Sniper | {datetime.now().strftime('%H:%M:%S')}")
        
        # Envia
        await channel.send(embed=embed)
        print(f"   ✅ {len(usernames)} usernames de '{category}' publicados em #{channel.name}")
        
    except Exception as e:
        print(f"   ❌ Erro ao publicar usernames: {e}")
        traceback.print_exc()

# ========== SLASH COMMANDS ==========

@bot.tree.command(name="setup_canal", description="Configura um canal para publicação automática")
@discord.app_commands.choices(
    categoria=[
        discord.app_commands.Choice(name="short", value="short"),
        discord.app_commands.Choice(name="numbers", value="numbers"),
        discord.app_commands.Choice(name="realword", value="realword"),
        discord.app_commands.Choice(name="mixed", value="mixed"),
        discord.app_commands.Choice(name="rare", value="rare"),
    ]
)
@discord.app_commands.describe(categoria="Categoria de usernames")
async def setup_canal(interaction: discord.Interaction, categoria: str):
    """Configura um canal para receber usernames de uma categoria"""
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ Você precisa ser administrador!", ephemeral=True)
        return
    
    global PUBLISH_CHANNELS
    PUBLISH_CHANNELS[categoria] = interaction.channel_id
    
    embed = discord.Embed(
        title="✅ Canal Configurado",
        color=discord.Color.green(),
        description=f"Este canal receberá usernames: **{categoria}**\n\nPublicação a cada {PUBLISH_INTERVAL} minuto(s)"
    )
    embed.set_footer(text="Fallen Angels Sniper")
    
    await interaction.response.send_message(embed=embed)
    print(f"✅ Canal #{interaction.channel.name} ({interaction.channel_id}) configurado para '{categoria}'")

@bot.tree.command(name="canais", description="Mostra canais configurados")
async def canais(interaction: discord.Interaction):
    """Lista canais configurados"""
    if not PUBLISH_CHANNELS:
        await interaction.response.send_message("❌ Nenhum canal configurado!", ephemeral=True)
        return
    
    embed = discord.Embed(
        title="📊 Canais Configurados",
        color=discord.Color.blue(),
        description="Canais ativos para publicação"
    )
    
    for category, channel_id in PUBLISH_CHANNELS.items():
        channel = bot.get_channel(channel_id)
        channel_mention = channel.mention if channel else f"Canal {channel_id}"
        embed.add_field(name=f"📁 {category.upper()}", value=channel_mention, inline=False)
    
    embed.set_footer(text="Fallen Angels Sniper")
    await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="publicar_agora", description="Publica usernames imediatamente")
async def publicar_agora(interaction: discord.Interaction):
    """Publica usernames agora (para teste)"""
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ Você precisa ser administrador!", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    if not PUBLISH_CHANNELS:
        await interaction.followup.send("❌ Nenhum canal configurado!")
        return
    
    count = 0
    for category, channel_id in PUBLISH_CHANNELS.items():
        try:
            await publish_available_usernames(category, channel_id)
            count += 1
        except Exception as e:
            print(f"❌ Erro: {e}")
    
    await interaction.followup.send(f"✅ Publicado em {count} canal(is)")

@bot.tree.command(name="status", description="Status do sistema")
async def status(interaction: discord.Interaction):
    """Mostra status do sistema"""
    if db is None:
        await interaction.response.send_message("❌ Sistema não inicializado!", ephemeral=True)
        return
    
    await interaction.response.defer()
    
    try:
        stats = await db.get_statistics()
        
        embed = discord.Embed(
            title="📊 Status do Sistema",
            color=discord.Color.gold(),
            description="Estatísticas em tempo real"
        )
        
        embed.add_field(name="💾 Total em BD", value=f"{stats['total_usernames']:,}", inline=True)
        embed.add_field(name="✅ Disponíveis", value=f"{stats['available']:,}", inline=True)
        embed.add_field(name="❌ Ocupados", value=f"{stats['unavailable']:,}", inline=True)
        embed.add_field(name="📊 Canais", value=f"{len(PUBLISH_CHANNELS)} configurados", inline=True)
        embed.add_field(name="🔄 Intervalo", value=f"{PUBLISH_INTERVAL} minuto(s)", inline=True)
        embed.add_field(name="🕒 Horário", value=f"{datetime.now().strftime('%H:%M:%S')}", inline=True)
        
        gen_status = "✅" if generator_task.is_running() else "❌"
        pub_status = "✅" if publish_task.is_running() else "❌"
        
        embed.add_field(name="Estado", value=f"Gerador: {gen_status}  |  Publisher: {pub_status}", inline=False)
        
        embed.set_footer(text="Fallen Angels Sniper")
        await interaction.followup.send(embed=embed)
    except Exception as e:
        await interaction.followup.send(f"❌ Erro: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        print("❌ DISCORD_TOKEN não configurado!")
        sys.exit(1)
    
    print("🚀 Iniciando Fallen Angels Sniper...")
    try:
        bot.run(token)
    except Exception as e:
        print(f"❌ Erro ao iniciar: {e}")
        traceback.print_exc()
