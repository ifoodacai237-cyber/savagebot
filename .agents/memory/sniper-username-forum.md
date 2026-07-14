---
name: Sniper de usernames
description: Estado atual do sistema de sniper após limpeza — o que existe, o que foi removido.
---

## Estado atual (julho 2026)

O sistema antigo de sniper (monitor automático em background, `/sniper-config`, word lists, `userUpdate` event, `SniperConfig` model) foi **completamente removido**.

O que sobrou são apenas os 4 comandos públicos portados do Python (Copilot):

- `/disponivel` — checa se um username está disponível via API do Discord
- `/snipe_add` — adiciona username ao monitoramento pessoal do usuário (salva em `SniperTarget`)
- `/snipe_list` — lista os targets do usuário
- `/gerar` — mostra usernames encontrados disponíveis nas últimas 24h

**Arquivos:**
- `discord-bot/src/commands/general/sniper.js` — os 4 comandos acima
- `discord-bot/src/utils/checker.js` — função `isAvailable()` (chamada HTTP ao endpoint do Discord)
- Schema: apenas `SniperTarget` (sem `SniperConfig`)

**Why:** O monitor automático foi removido a pedido do usuário. Os comandos do Copilot foram preservados.

**Atenção:** `SniperTarget` usa `addedByUserId` (não `droppedById`) para rastrear quem adicionou cada target. O campo antigo `droppedById` não existe mais nesse modelo.
