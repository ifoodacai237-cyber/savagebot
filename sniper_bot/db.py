import aiosqlite
import time
from typing import List, Tuple, Dict

class Database:
    def __init__(self, db_path: str = "sniper.db"):
        self.db_path = db_path
    
    async def init(self):
        """Inicializa o banco de dados com índices otimizados"""
        async with aiosqlite.connect(self.db_path) as db:
            # Desativa journaling para melhor performance
            await db.execute("PRAGMA journal_mode = WAL")
            await db.execute("PRAGMA synchronous = NORMAL")
            await db.execute("PRAGMA cache_size = -64000")
            await db.execute("PRAGMA temp_store = MEMORY")
            
            # Tabela de usernames gerados
            await db.execute("""
                CREATE TABLE IF NOT EXISTS usernames (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                    category TEXT NOT NULL,
                    available INTEGER DEFAULT -1,
                    last_check REAL DEFAULT 0,
                    check_count INTEGER DEFAULT 0,
                    created_at REAL DEFAULT 0,
                    INDEX idx_available (available),
                    INDEX idx_category (category),
                    INDEX idx_last_check (last_check)
                )
            """)
            
            # Tabela de alvos de snipe
            await db.execute("""
                CREATE TABLE IF NOT EXISTS snipe_targets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                    user_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'monitoring',
                    added_at REAL DEFAULT 0,
                    caught_at REAL,
                    INDEX idx_status (status),
                    INDEX idx_user_id (user_id),
                    INDEX idx_username (username)
                )
            """)
            
            # Tabela de histórico
            await db.execute("""
                CREATE TABLE IF NOT EXISTS history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    status TEXT NOT NULL,
                    timestamp REAL DEFAULT 0,
                    INDEX idx_timestamp (timestamp)
                )
            """)
            
            # Tabela de canais de publicação
            await db.execute("""
                CREATE TABLE IF NOT EXISTS publish_channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER UNIQUE NOT NULL,
                    category TEXT NOT NULL,
                    INDEX idx_category (category)
                )
            """)
            
            # Tabela de cache de disponibilidade
            await db.execute("""
                CREATE TABLE IF NOT EXISTS availability_cache (
                    username TEXT PRIMARY KEY UNIQUE COLLATE NOCASE,
                    available INTEGER NOT NULL,
                    timestamp REAL DEFAULT 0
                )
            """)
            
            await db.commit()
    
    async def add_username(self, username: str, category: str) -> bool:
        """Adiciona username gerado"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    INSERT OR IGNORE INTO usernames (username, category, created_at)
                    VALUES (?, ?, ?)
                    """,
                    (username.lower(), category, time.time())
                )
                await db.commit()
                return True
        except Exception as e:
            print(f"Erro ao adicionar username: {e}")
            return False
    
    async def bulk_add_usernames(self, usernames: List[Tuple[str, str]]) -> int:
        """Adiciona múltiplos usernames de uma vez (bulk insert)"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                current_time = time.time()
                data = [(u.lower(), cat, current_time) for u, cat in usernames]
                
                await db.executemany(
                    """
                    INSERT OR IGNORE INTO usernames (username, category, created_at)
                    VALUES (?, ?, ?)
                    """,
                    data
                )
                await db.commit()
                return len(data)
        except Exception as e:
            print(f"Erro em bulk_add_usernames: {e}")
            return 0
    
    async def update_availability(self, username: str, available: int, cache: bool = True):
        """Atualiza status de disponibilidade de um username"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                current_time = time.time()
                
                # Atualiza username
                await db.execute(
                    """
                    UPDATE usernames 
                    SET available = ?, last_check = ?, check_count = check_count + 1
                    WHERE username = ?
                    """,
                    (available, current_time, username.lower())
                )
                
                # Atualiza cache
                if cache:
                    await db.execute(
                        """
                        INSERT OR REPLACE INTO availability_cache 
                        (username, available, timestamp)
                        VALUES (?, ?, ?)
                        """,
                        (username.lower(), available, current_time)
                    )
                
                await db.commit()
        except Exception as e:
            print(f"Erro ao atualizar disponibilidade: {e}")
    
    async def get_available_usernames(self, category: str = None, limit: int = 100) -> List:
        """Retorna usernames disponíveis"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                if category:
                    query = """
                        SELECT username, category, last_check FROM usernames
                        WHERE available = 1 AND category = ?
                        ORDER BY last_check DESC
                        LIMIT ?
                    """
                    params = (category, limit)
                else:
                    query = """
                        SELECT username, category, last_check FROM usernames
                        WHERE available = 1
                        ORDER BY last_check DESC
                        LIMIT ?
                    """
                    params = (limit,)
                
                async with db.execute(query, params) as cursor:
                    return await cursor.fetchall()
        except Exception as e:
            print(f"Erro ao buscar disponíveis: {e}")
            return []
    
    async def get_unavailable_usernames(self, category: str = None, limit: int = 100) -> List:
        """Retorna usernames ocupados"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                if category:
                    query = """
                        SELECT username, category, last_check FROM usernames
                        WHERE available = 0 AND category = ?
                        ORDER BY last_check DESC
                        LIMIT ?
                    """
                    params = (category, limit)
                else:
                    query = """
                        SELECT username, category, last_check FROM usernames
                        WHERE available = 0
                        ORDER BY last_check DESC
                        LIMIT ?
                    """
                    params = (limit,)
                
                async with db.execute(query, params) as cursor:
                    return await cursor.fetchall()
        except Exception as e:
            print(f"Erro ao buscar ocupados: {e}")
            return []
    
    async def get_unverified_usernames(self, limit: int = 1000) -> List:
        """Retorna usernames não verificados"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(
                    """
                    SELECT username FROM usernames
                    WHERE available = -1
                    ORDER BY created_at ASC
                    LIMIT ?
                    """,
                    (limit,)
                ) as cursor:
                    return await cursor.fetchall()
        except Exception as e:
            print(f"Erro ao buscar não verificados: {e}")
            return []
    
    async def add_snipe_target(self, username: str, user_id: int) -> bool:
        """Adiciona username para snipe"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    INSERT INTO snipe_targets (username, user_id, added_at, status)
                    VALUES (?, ?, ?, 'monitoring')
                    """,
                    (username.lower(), user_id, time.time())
                )
                await db.commit()
                return True
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                return False
            print(f"Erro ao adicionar snipe: {e}")
            return False
    
    async def get_snipe_targets(self, status: str = "monitoring") -> List:
        """Retorna todos os alvos de snipe com status específico"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(
                    """
                    SELECT id, username, status, added_at FROM snipe_targets
                    WHERE status = ?
                    """,
                    (status,)
                ) as cursor:
                    return await cursor.fetchall()
        except Exception as e:
            print(f"Erro ao buscar snipes: {e}")
            return []
    
    async def get_user_targets(self, user_id: int) -> List:
        """Retorna alvos de snipe de um usuário"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(
                    """
                    SELECT id, username, status, added_at FROM snipe_targets
                    WHERE user_id = ?
                    ORDER BY added_at DESC
                    """,
                    (user_id,)
                ) as cursor:
                    return await cursor.fetchall()
        except Exception as e:
            print(f"Erro ao buscar alvos do usuário: {e}")
            return []
    
    async def mark_caught(self, snipe_id: int):
        """Marca alvo de snipe como capturado"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    UPDATE snipe_targets
                    SET status = 'caught', caught_at = ?
                    WHERE id = ?
                    """,
                    (time.time(), snipe_id)
                )
                await db.commit()
        except Exception as e:
            print(f"Erro ao marcar capturado: {e}")
    
    async def get_statistics(self) -> Dict:
        """Retorna estatísticas gerais"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Total
                async with db.execute("SELECT COUNT(*) FROM usernames") as cursor:
                    total = (await cursor.fetchone())[0]
                
                # Disponíveis
                async with db.execute("SELECT COUNT(*) FROM usernames WHERE available = 1") as cursor:
                    available = (await cursor.fetchone())[0]
                
                # Ocupados
                async with db.execute("SELECT COUNT(*) FROM usernames WHERE available = 0") as cursor:
                    unavailable = (await cursor.fetchone())[0]
                
                # Em snipe
                async with db.execute("SELECT COUNT(*) FROM snipe_targets WHERE status = 'monitoring'") as cursor:
                    sniped = (await cursor.fetchone())[0]
                
                return {
                    'total_usernames': total,
                    'available': available,
                    'unavailable': unavailable,
                    'sniped': sniped,
                    'check_rate': "~2.5K"
                }
        except Exception as e:
            print(f"Erro ao buscar estatísticas: {e}")
            return {}
    
    async def cleanup(self):
        """Otimiza o banco de dados"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("VACUUM")
                await db.execute("ANALYZE")
                await db.commit()
                print("✅ Banco de dados otimizado")
        except Exception as e:
            print(f"Erro em cleanup: {e}")
