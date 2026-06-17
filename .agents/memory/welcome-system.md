---
name: Welcome System — Boas-Vindas
description: Sistema completo de boas-vindas com painel de config e evento guildMemberAdd.
---

## Arquivos
- `discord-bot/src/events/guildMemberAdd.js` — evento que envia welcome quando membro entra
- `discord-bot/src/commands/admin/boas-vindas.js` — comando /boas-vindas abre painel de config
- `discord-bot/src/utils/configPanels.js` — `buildWelcomeConfigPayload()` + `welcomeConfigButtons()`
- `discord-bot/src/events/interactionCreate.js` — handlers wcfg_*, wcfg_modal_*, chansel_wc

## Schema (GuildConfig)
Campos adicionados: `welcomeChannel`, `welcomeColor`, `welcomeBanner`, `welcomeThumb`, `welcomeFooter`, `welcomeTitle`, `welcomeText`, `welcomeRoles` (CSV de IDs), `welcomeChannels` (CSV de IDs)

## Placeholders suportados no texto/título/rodapé
`{user}` `{username}` `{server}` `{count}`

## Interaction IDs
- Botões: `wcfg_cor/titulo/banner/thumb/rodape/texto/canal/cargos/canais/test`
- Canal select: `chansel_wc`
- Modais: `wcfg_modal_<campo>`, `wcfg_modal_cargos`, `wcfg_modal_canais`
- Fallback fields obj: `WELCOME_MODAL_FIELDS` em interactionCreate.js

**Why:** Seguiu o mesmo padrão tcfg_/tncfg_ já existente para consistência de código.
