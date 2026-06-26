---
name: Welcome System — Boas-Vindas
description: Sistema completo de boas-vindas com painel de config e evento guildMemberAdd.
---

## Arquivos
- `discord-bot/src/events/guildMemberAdd.js` — evento que envia welcome quando membro entra
- `discord-bot/src/commands/admin/boas-vindas.js` — comando /boas-vindas abre painel de config
- `discord-bot/src/utils/configPanels.js` — `buildWelcomeConfigPayload()` + `welcomeConfigButtons()`
- `discord-bot/src/events/interactionCreate.js` — handlers wcfg_*, wcfg_modal_*, chansel_wc

## Formato: Components V2 (ContainerBuilder, sem embed)
A mensagem de boas-vindas usa `buildWelcomeV2(cfg, vars)` que retorna `{ components: [container], flags: MessageFlags.IsComponentsV2 }`.
Sem barra lateral de cor (nenhum `setAccentColor`). O `vars` precisa incluir `avatarUrl` para o thumbnail padrão.

## Schema (GuildConfig)
Campos: `welcomeChannel`, `welcomeBanner`, `welcomeThumb`, `welcomeFooter`, `welcomeTitle`, `welcomeText`, `welcomeRoles` (CSV), `welcomeChannels` (CSV), `welcomeUseDivider` Boolean.
REMOVIDO: `welcomeColor` (lateral de cor foi removida definitivamente).

## Placeholders suportados no texto/título/rodapé
`{user}` `{username}` `{server}` `{count}`

## Interaction IDs
- Botões: `wcfg_titulo/banner/thumb/rodape/texto/separador/canal/cargos/canais/test/toggle`
- Canal select: `chansel_wc`
- Modais: `wcfg_modal_<campo>`, `wcfg_modal_cargos`, `wcfg_modal_canais`
- Fallback fields obj: `WELCOME_MODAL_FIELDS` em interactionCreate.js (sem campo `cor`)

**Why:** Seguiu o mesmo padrão V2 do ticket/tellonym. Cor lateral foi removida por pedido do usuário.
