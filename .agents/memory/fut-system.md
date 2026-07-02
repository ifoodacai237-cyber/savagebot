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
- `src/utils/futPlayers.js` — ~124 jogadores (black/gold/silver/bronze, 4 séries)
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

## Sistema de fotos — FUT.GG CDN (chave primária: futggId)
`futggId` é o único ID de carta — o mesmo número serve para buscar foto e dados (sem queries separadas).
- Foto: `cdn.futgg.com/images/players/{futggId}.png`
- Cache local: `src/assets/players/{futggId}.png`
- Sync script: `scripts/sync-futgg.js` (baixa fotos que faltam; `--force` re-baixa tudo)
- Rótulos de stats: PAS DRI DEF FIN VEL RES (linha) | ANT DEF TAT AER DIS EXP (goleiro)
- Jogadores sem futggId mostram avatar com iniciais (comportamento esperado)

**Why:** FutBin CDN bloqueava e retornava silhuetas genéricas; eaId foi renomeado para futggId
para deixar claro que a fonte é o FUT.GG. Um único ID por carta = sem cruzamento de fontes.

## Status dos futggId (após rebuild)
22 jogadores receberam futggId via web search (Thiago Silva=164240, Isco=197781, Pedro=189505, Raphael Veiga=250009, Gabigol=212823, Dudu=258085, Luciano=230601, Tiquinho=227476, Fabianski=164835, Lenglet=220440, Ndicka=236403, Javier Guerra=266436, Flores=259717, Palmieri=210736, Lodi=251573, Volland=200610, Soteldo=233531, Zé Rafael=221933, Léo Pereira=250001, Piquerez=239476, Patrick=242180, Neves Jr=272834).

4 ainda sem futggId (jogadores de ligas muito obscuras sem presença no EA FC 25): Carabott (MLT), Araújo Jr (Madureira/BRA), Ferreira (Criciúma/BRA), Reinaldo (Grêmio/BRA).

## Como buscar futggId para novos jogadores
- CDN fut.gg é bloqueado da rede Replit (timeout). Usar web search: `webSearch({ query: "fut.gg {nome} EA FC 25 player ID" })`
- IDs válidos ficam na faixa 158000–275000. IDs fora desse range são suspeitos/errados.
- futggId = EA internal resource ID (mesmo que sofifa.com usa na URL do jogador)

## Painel admin de override manual (nome/foto por carta)
`FutPlayerOverride` (Prisma, playerId único) + `src/utils/futOverrides.js` (cache em memória +
CRUD). Override aplica `customPhotoUrl` (URL direta) que `fetchPlayerPhoto` prioriza antes do CDN.

**Como aplica:** sempre usar `getPlayerById` de `futManager.js` (não de `futPlayers.js`) para
que o override seja aplicado automaticamente — senão o override é ignorado.
