import aiohttp
import asyncio
import time
from typing import List
from db import Database

class AvailabilityChecker:
    def __init__(self, db: Database):
        self.db = db
        self.session = None
        self.check_count = 0
        self.last_reset = time.time()
        self.request_timeout = aiohttp.ClientTimeout(total=10)
    
    async def init_session(self):
        """Inicializa a sessão aiohttp"""
        if not self.session:
            self.session = aiohttp.ClientSession(timeout=self.request_timeout)
    
    async def close_session(self):
        """Fecha a sessão"""
        if self.session:
            await self.session.close()
    
    async def check_availability(self, username: str) -> bool:
        """Verifica se um username está disponível no Discord"""
        await self.init_session()
        
        try:
            username_lower = username.lower()
            
            # Palavras-chave banidas no Discord
            banned_patterns = [
                'discord', 'admin', 'moderator', 'bot', 'system',
                'support', 'official', 'verified', 'staff'
            ]
            
            for pattern in banned_patterns:
                if pattern in username_lower:
                    return False
            
            # Validações do Discord
            if not (3 <= len(username) <= 32):
                return False
            
            if not username.replace('_', '').isalnum():
                return False
            
            # Simula verificação com probabilidade baseada em dados
            availability = self._simulate_check(username)
            
            # Atualiza banco de dados
            await self.db.update_availability(username, 1 if availability else 0)
            
            # Incrementa contador
            self.check_count += 1
            
            return availability
        
        except Exception as e:
            print(f"Erro ao verificar {username}: {e}")
            return False
    
    def _simulate_check(self, username: str) -> bool:
        """Simula verificação de disponibilidade (em produção usar API real)"""
        import random
        
        # Usernames muito curtos geralmente ocupados
        if len(username) <= 3:
            return random.random() > 0.85  # 15% chance
        
        # Usernames normais
        elif len(username) <= 10:
            return random.random() > 0.65  # 35% chance
        
        # Usernames longos geralmente disponíveis
        else:
            return random.random() > 0.30  # 70% chance
    
    async def batch_check(self, usernames: List[str], concurrent: int = 50) -> dict:
        """Verifica múltiplos usernames com limite de concorrência"""
        await self.init_session()
        
        results = {'available': [], 'unavailable': []}
        
        # Divide em chunks
        for i in range(0, len(usernames), concurrent):
            chunk = usernames[i:i+concurrent]
            
            tasks = [self.check_availability(u) for u in chunk]
            check_results = await asyncio.gather(*tasks)
            
            for username, is_available in zip(chunk, check_results):
                if is_available:
                    results['available'].append(username)
                else:
                    results['unavailable'].append(username)
            
            # Rate limiting
            await asyncio.sleep(0.5)
        
        return results
    
    def get_check_rate(self) -> str:
        """Retorna taxa de verificação por minuto"""
        elapsed = time.time() - self.last_reset
        if elapsed >= 60:
            rate = int(self.check_count / (elapsed / 60))
            self.check_count = 0
            self.last_reset = time.time()
            return f"~{rate}"
        else:
            rate = int((self.check_count / elapsed) * 60)
            return f"~{rate}"
