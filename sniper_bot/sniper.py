import asyncio
import discord
from typing import Dict, List
from db import Database
from checker import AvailabilityChecker
import time

class UsernameSniper:
    def __init__(self, bot: discord.Client, db: Database, checker: AvailabilityChecker):
        self.bot = bot
        self.db = db
        self.checker = checker
        self.notification_cooldown = {}  # Evita spam de notificações
    
    async def add_target(self, username: str, user_id: int) -> bool:
        """Adiciona um username para monitoramento"""
        success = await self.db.add_snipe_target(username, user_id)
        
        if success:
            print(f"🎯 Username adicionado para snipe: {username} (por {user_id})")
        
        return success
    
    async def get_user_targets(self, user_id: int) -> List:
        """Retorna alvos de um usuário"""
        return await self.db.get_user_targets(user_id)
    
    async def check_sniped_usernames(self):
        """Verifica todos os usernames em monitoramento"""
        targets = await self.db.get_snipe_targets(status="monitoring")
        
        if not targets:
            print("ℹ️  Nenhum username em monitoramento")
            return
        
        print(f"🔍 Verificando {len(targets)} alvos de snipe...")
        
        # Verifica cada alvo
        available_targets = []
        
        for target_id, username, status, added_at in targets:
            try:
                # Verifica disponibilidade
                is_available = await self.checker.check_availability(username)
                
                if is_available:
                    # Marca como capturado
                    await self.db.mark_caught(target_id)
                    available_targets.append({
                        'target_id': target_id,
                        'username': username,
                        'added_at': added_at
                    })
                    
                    print(f"✅ ALERTA: {username} está disponível!")
                
                # Rate limiting
                await asyncio.sleep(0.1)
            
            except Exception as e:
                print(f"❌ Erro ao verificar {username}: {e}")
        
        # Notifica usuários sobre capturados
        if available_targets:
            await self._notify_users(available_targets)
    
    async def _notify_users(self, targets: List[Dict]):
        """Notifica usuários quando seu alvo fica disponível"""
        # Agrupa por usuário
        targets_by_user = {}
        
        # Aqui você precisaria recuperar o user_id do target
        # Para simplificar, vamos notificar em um canal específico
        
        try:
            # Tenta encontrar canal de notificação (você deve configurar isso)
            notification_channels = []
            
            # Alternativa: enviar DM para o usuário
            for target in targets:
                username = target['username']
                
                # Cria embed de notificação
                embed = discord.Embed(
                    title="✅ ALERTA DE SNIPE!",
                    color=discord.Color.gold(),
                    description=f"Username liberado: **{username}**",
                    timestamp=discord.utils.utcnow()
                )
                
                embed.add_field(
                    name="Ação Rápida",
                    value=f"Acesse Discord e troque para: `{username}`",
                    inline=False
                )
                
                # Aqui você enviaria para canal ou DM
                # await user.send(embed=embed)
        
        except Exception as e:
            print(f"Erro ao notificar: {e}")
    
    async def setup_notification_channel(self, guild_id: int, category: str = "snipe"):
        """Configura canal de notificação para um servidor"""
        try:
            guild = self.bot.get_guild(guild_id)
            
            if not guild:
                return False
            
            # Verifica se canal já existe
            existing = discord.utils.get(
                guild.text_channels,
                name=f"🎯-{category}-alerts"
            )
            
            if existing:
                return existing.id
            
            # Cria novo canal
            channel = await guild.create_text_channel(
                name=f"🎯-{category}-alerts",
                topic=f"Alertas de snipe para categoria {category}",
                reason="Sistema de sniper automático"
            )
            
            print(f"✅ Canal de notificação criado: {channel.mention}")
            return channel.id
        
        except Exception as e:
            print(f"❌ Erro ao criar canal: {e}")
            return None
    
    async def publish_available(self, channel_id: int, usernames: List[str], category: str):
        """Publica usernames disponíveis em um canal"""
        try:
            channel = self.bot.get_channel(channel_id)
            
            if not channel:
                return False
            
            # Prepara mensagem em chunks (Discord tem limite de 2000 caracteres)
            chunks = []
            current_chunk = []
            current_length = 0
            
            for username in usernames:
                line = f"✅ `{username}`\n"
                if current_length + len(line) > 1800:
                    chunks.append(current_chunk)
                    current_chunk = [line]
                    current_length = len(line)
                else:
                    current_chunk.append(line)
                    current_length += len(line)
            
            if current_chunk:
                chunks.append(current_chunk)
            
            # Envia mensagens
            for i, chunk in enumerate(chunks):
                embed = discord.Embed(
                    title=f"🎁 Usernames Disponíveis - {category.upper()}",
                    color=discord.Color.green(),
                    description=f"Parte {i+1}/{len(chunks)}"
                )
                
                embed.add_field(
                    name="Disponíveis",
                    value="".join(chunk),
                    inline=False
                )
                
                embed.set_footer(text="Sistema de Gerador de Usernames")
                
                await channel.send(embed=embed)
                await asyncio.sleep(1)  # Rate limit
            
            return True
        
        except Exception as e:
            print(f"Erro ao publicar: {e}")
            return False
