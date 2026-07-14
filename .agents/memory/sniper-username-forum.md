---
name: Sniper de usernames
description: Estado completo do sistema de sniper após implementação do monitor automático.
---

## Estado atual (julho 2026)

### Monitor automático (NOVO)
- `discord-bot/src/utils/usernameMonitor.js` — loop que gera e checa usernames continuamente
- Delay: 1800ms entre checks (~33/min)
- Categorias: short, numbers, realword, realwordpt, mixed
- Quando disponível → upsert em `SniperTarget` com `postedAt = now()`
- A cada 60 checks, checa também targets pessoais (/snipe_add) e envia DM
- Inicia via `startMonitor(client)` no evento `clientReady`

### Publisher automático
- Em `ready.js` — publica a cada 5 minutos nos canais configurados
- APENAS usernames novos (usa `lastRunAt` de `PublishChannel` para não repetir)
- Após publicar, atualiza `lastRunAt` do canal

### Importante: monitor deve iniciar ANTES do Promise.all de comandos
- O registro global de comandos (fallback quando Missing Access na guild) pode travar por minutos
- `startMonitor(client)` deve ser chamado antes de `Promise.all([registerSlashCommands, initEmojis])`
- O Promise.all usa `.then/.catch` (não awaited) para não bloquear

### Comandos disponíveis
- `/disponivel` — checa se um username está disponível via API do Discord
- `/snipe_add` — adiciona username ao monitoramento pessoal do usuário (salva em `SniperTarget`)
- `/snipe_list` — lista os targets do usuário
- `/gerar` — mostra usernames encontrados disponíveis nas últimas 24h
- `/setup_canal` — (ADMIN) configura canal para publicação automática por categoria
- `/canais` — lista canais configurados
- `/publicar_agora` — (ADMIN) publica imediatamente
- `/monitor` — (ADMIN) status / pausar / retomar o monitor

### Schema
- `SniperTarget` — username, category, addedByUserId, detectedAt, postedAt
- `PublishChannel` — guildId, channelId, category, **lastRunAt** (novo campo)

**Why:** O lastRunAt foi adicionado para evitar spam de repostar todos os usernames das últimas 24h a cada 1 minuto.
**Atenção:** `SniperTarget` usa `addedByUserId` (não `droppedById`).
