---
name: FUT Card System
description: Sistema completo estilo FIFA/eFootball — cartas, pacotes, time, campo canvas, partidas ranqueadas.
---

# FUT Card System

## Regra central
Player data fica em `src/utils/futPlayers.js` (array JS, não tabela Prisma). FutUserCard salva só o `playerId` (Int) que referencia o array JS. Isso evita seeding de banco.

**Why:** Railway não roda seeds facilmente; o array JS é suficiente para ~140 jogadores e é mais simples de manter.

## Prisma Models (adicionados ao schema)
- `FutUserTeam` — um por userId+guildId, guarda nome, formação, ELO, W/D/L
- `FutUserCard` — coleção do usuário (playerId referencia futPlayers.js)
- `FutLineup` — qual card ocupa qual slot (1-11) na formação ativa
- `FutMatch` — histórico de partidas contra IA

## Arquivos-chave
- `src/utils/futPlayers.js` — ~140 jogadores (black/gold/silver/bronze, 4 séries)
- `src/utils/futManager.js` — PACKS, FORMATION_POSITIONS, openPack, autoLineup, simulateMatch, getTeamOvr
- `src/utils/futCanvas.js` — gera imagem PNG 700x900 do campo com cartas posicionadas
- `src/commands/jogos/fut.js` — /fut time|colecao|loja|pacotes|partida|formacao|nome + buildTeamMessage etc.
- `src/events/interactionCreate.js` — handlers: fut_shop_select, fut_pack_select, fut_formacao_select + botões fut_*

## Pacotes disponíveis (11 tipos)
padrao (500), ouro (2000), premium (5000), copa2026 (3000), bundle_copa (30000), europeu (2800), bundle_europeu (28000), defesa (2500), meiocampo (2500), ataque (2500), goleiro (2000)

## Formações suportadas (7)
4-3-3, 4-4-2, 4-2-4, 3-3-4, 5-3-2, 4-5-1, 3-4-3

## Moeda
Usa `Economy.balance` (model existente, campo `balance`). `deductBalance` usa `prisma.economy.update` com `decrement`.

## Auto-lineup
`autoLineup(teamId, formation)` apaga FutLineup atual e recria com melhores cartas por POSITION_COMPAT. Roda automaticamente após abrir pacote.

## Partida
IA com OVR ± 7 do usuário. ELO padrão K=32. Placar gerado por OVR diff + random.

## Customizar / continuar
- Adicionar fotos de jogadores reais: passar `imageUrl` para `drawPlayerCard` no futCanvas.js
- Adicionar troca de cartas entre usuários: nova rota no futManager.js
- Mercado de transferências: modelo FutTransfer no schema

## Painel admin de override manual (nome/foto por carta)
Como fallback para quando a foto automática (FutBin CDN por eaId) vem errada/trocada, existe
`FutPlayerOverride` (Prisma, playerId único) + `src/utils/futOverrides.js` (cache em memória +
CRUD) + comando `/fut-painel-fotos` (admin) com botões que abrem modais para editar/resetar/listar.

**Why:** correção automática por eaId nem sempre resolve (fotos trocadas entre jogadores parecidos,
CDN sem imagem); admin precisa de um jeito manual e imediato sem depender de nova sessão de agente.

**Como aplica:** `getPlayerById` em `futManager.js` (não em `futPlayers.js`) já aplica o override
automaticamente — qualquer novo código que resolva jogador por ID deve usar essa versão (async) e
não a de `futPlayers.js` diretamente, senão o override é ignorado. Fotos customizadas usam
`player.customPhotoUrl` (URL direta, sem depender de eaId) — `fetchPlayerPhoto` prioriza isso antes do CDN.
