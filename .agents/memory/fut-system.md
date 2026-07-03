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

## Sistema de fotos — SoFIFA CDN (chave: futggId = sofifa player ID)
`futggId` = sofifa/EA player ID. Mesmo número para buscar foto e identificar jogador.
- CDN: `cdn.sofifa.net/players/{id[0:3]}/{id[3:]}/25_120.png` (FC25 → fallback FC24)
- Cache local: `src/assets/players/{futggId}.png`
- Sync script: `scripts/sync-futgg.js` (baixa fotos que faltam; `--force` re-baixa tudo)
- Rótulos de stats: PAS DRI DEF FIN VEL RES (linha) | ANT DEF TAT AER DIS EXP (goleiro)
- Jogadores sem futggId mostram avatar com iniciais (comportamento esperado)

**CDN errado histórico:** FUT.GG CDN (`cdn.futgg.com`) usa "resource IDs" DIFERENTES dos sofifa IDs.
Fotos baixadas com sofifa IDs desse CDN mostravam JOGADORES ALEATÓRIOS. Não usar nunca mais.

**Why SoFIFA:** sofifa IDs = futggIds já no arquivo. CDN acessível, retorna fotos reais.
FC24 fallback resolve jogadores que saíram do EA FC 25 (aposentados/sem licença).

## Verificar IDs com SoFIFA CDN
```js
// Testar se um ID é válido:
const s = String(id).padStart(6,'0');
fetch(`https://cdn.sofifa.net/players/${s.slice(0,3)}/${s.slice(3)}/25_120.png`)
// 200 + >5000 bytes = válido | 404 = ID errado
```

## Status dos futggId
- 97 jogadores com IDs válidos e verificados no SoFIFA CDN
- FC24-only (sem foto FC25, mas ID correto): Marquinhos(213000), Thiago Silva(164240), Benzema(182521), Koulibaly(195722), Laporte(218353), Alaba(195864), Mendy(238803), Casemiro(193056), Frenkie De Jong(226328), D.Henderson(233684), Balogun(255892), Zaire-Emery(262004), Gomes(226325), Luiz Henrique(258219)
- Sem futggId (IDs errados removidos): Kroos, Gabigol, Raphael Veiga, Tiquinho, Soteldo, Zé Rafael, Léo Pereira, Patrick

## Como buscar futggId para novos jogadores
- Verificar no SoFIFA CDN (ver snippet acima). ID correto = 200 + >5000 bytes
- IDs tipicamente na faixa 20000–275000 (sofifa IDs históricos)
- NUNCA usar FUT.GG CDN — usa resource IDs diferentes dos sofifa IDs

## Painel admin de override manual (nome/foto por carta)
`FutPlayerOverride` (Prisma, playerId único) + `src/utils/futOverrides.js` (cache em memória +
CRUD). Override aplica `customPhotoUrl` (URL direta) que `fetchPlayerPhoto` prioriza antes do CDN.

**Como aplica:** sempre usar `getPlayerById` de `futManager.js` (não de `futPlayers.js`) para
que o override seja aplicado automaticamente — senão o override é ignorado.
