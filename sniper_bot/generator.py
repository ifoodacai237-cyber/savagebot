import asyncio
import random
import string
from typing import List, Set
from db import Database
import itertools

class UsernameGenerator:
    def __init__(self, db: Database):
        self.db = db
        self.generated = set()
        self.categories = {
            'short': self.generate_short,
            'numbers': self.generate_numbers,
            'realword': self.generate_realwords,
            'mixed': self.generate_mixed,
            'rare': self.generate_rare
        }
        
        # Listas de palavras
        self.english_words = self._load_english_words()
        self.portuguese_words = self._load_portuguese_words()
    
    def _load_english_words(self) -> List[str]:
        """Carrega palavras em inglês (pode ser expandido com arquivo externo)"""
        return [
            'admin', 'user', 'test', 'demo', 'dev', 'prod', 'app', 'bot', 'api',
            'web', 'code', 'tech', 'data', 'base', 'root', 'main', 'core', 'hub',
            'pro', 'max', 'plus', 'ultra', 'mega', 'super', 'hyper', 'cyber',
            'alpha', 'beta', 'gamma', 'delta', 'omega', 'prime', 'dark', 'light',
            'fire', 'water', 'earth', 'wind', 'storm', 'shadow', 'ghost', 'void',
            'apex', 'zenith', 'matrix', 'nexus', 'realm', 'quest', 'legend', 'myth'
        ] * 10  # Multiplicar para ter mais variações
    
    def _load_portuguese_words(self) -> List[str]:
        """Carrega palavras em português"""
        return [
            'sol', 'lua', 'estrela', 'noite', 'dia', 'ceu', 'vento', 'agua',
            'fogo', 'terra', 'ar', 'mar', 'rio', 'montanha', 'floresta', 'praia',
            'nuvem', 'trovao', 'raio', 'tempestade', 'chuva', 'neve', 'gelo', 'calor',
            'puro', 'claro', 'escuro', 'brilho', 'sombra', 'luz', 'velocidade', 'forca'
        ] * 10
    
    async def generate_batch(self, batch_size: int = 5000, category: str = "mixed") -> int:
        """Gera um lote de usernames"""
        if category == "mixed":
            # Gera de todas as categorias
            batch = []
            batch.extend(await self._generate_category(batch_size // 5, 'short'))
            batch.extend(await self._generate_category(batch_size // 5, 'numbers'))
            batch.extend(await self._generate_category(batch_size // 5, 'realword'))
            batch.extend(await self._generate_category(batch_size // 5, 'mixed'))
            batch.extend(await self._generate_category(batch_size // 5, 'rare'))
        else:
            batch = await self._generate_category(batch_size, category)
        
        # Salva em BD
        count = await self.db.bulk_add_usernames(batch)
        print(f"✅ {count} usernames gerados em categoria {category}")
        return count
    
    async def _generate_category(self, count: int, category: str) -> List[tuple]:
        """Gera usernames de uma categoria específica"""
        usernames = []
        
        if category == 'short':
            # 2-5 caracteres aleatórios
            for _ in range(count):
                length = random.randint(2, 5)
                username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
                if username not in self.generated:
                    usernames.append((username, 'short'))
                    self.generated.add(username)
        
        elif category == 'numbers':
            # Nomes com números
            words = self.english_words[:100] + self.portuguese_words[:100]
            for _ in range(count):
                word = random.choice(words)[:8]
                number = random.randint(0, 9999)
                username = f"{word}{number}"
                if username not in self.generated and len(username) <= 32:
                    usernames.append((username, 'numbers'))
                    self.generated.add(username)
        
        elif category == 'realword':
            # Palavras reais em inglês e português
            words = self.english_words + self.portuguese_words
            for word in random.sample(words, min(count, len(words))):
                if word not in self.generated and 3 <= len(word) <= 20:
                    usernames.append((word, 'realword'))
                    self.generated.add(word)
        
        elif category == 'mixed':
            # Mistura de palavras com números e símbolos
            words = self.english_words[:50] + self.portuguese_words[:50]
            for _ in range(count):
                word = random.choice(words)[:12]
                extra = random.choice([random.randint(0, 99), random.choice(['_', ''], )])
                if extra == '':
                    extra = random.choice(string.ascii_lowercase)
                username = f"{word}{extra}"
                if username not in self.generated and 3 <= len(username) <= 32:
                    usernames.append((username, 'mixed'))
                    self.generated.add(username)
        
        elif category == 'rare':
            # Usernames raros com padrões especiais
            patterns = [
                lambda: ''.join([random.choice(string.ascii_lowercase) for _ in range(random.randint(1, 3))]) + str(random.randint(1, 999)),
                lambda: random.choice(self.english_words[:50]) + '_' + random.choice(self.portuguese_words[:50]),
                lambda: ''.join(random.sample(string.ascii_lowercase, random.randint(3, 6))),
            ]
            for _ in range(count):
                username = random.choice(patterns)()
                if username not in self.generated and 3 <= len(username) <= 32:
                    usernames.append((username, 'rare'))
                    self.generated.add(username)
        
        return usernames
    
    async def generate_for_sniper(self, keywords: List[str], count: int = 100) -> List[str]:
        """Gera usernames derivados de palavras-chave para snipe"""
        usernames = []
        
        for keyword in keywords:
            # Variações do keyword
            usernames.append(keyword)
            usernames.append(f"{keyword}_")
            usernames.append(f"_{keyword}")
            usernames.append(f"{keyword}1")
            usernames.append(f"{keyword}2")
            usernames.append(f"x{keyword}")
            usernames.append(f"{keyword}x")
            
            # Com números
            for num in random.sample(range(1000), min(10, count)):
                usernames.append(f"{keyword}{num}")
        
        return usernames[:count]
