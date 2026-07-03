---
name: FUT System — Identity Model & Photo Pipeline
description: Regras estruturais do sistema de cartas FUT após a reescrita de integridade de dados.
---

## Chave primária: internalId (player.id, 1-136)

**Regra:** `getCardByInternalId(internalId)` é o único caminho de resolução de carta a partir do banco. O DB armazena `futUserCard.playerId = internalId`.

**Por quê:** `futggId` NÃO é único no dataset (múltiplas variantes do mesmo jogador compartilham o mesmo futggId). Usar futggId como chave causaria colisões no Map e retornaria dados errados.

**Como aplicar:** Em qualquer novo handler que precise de dados de uma carta a partir do DB, sempre usar `getCardByInternalId(c.playerId)` de `futCardCache.js`.

---

## futggId: atributo de foto, não chave

**Regra:** `futggId` é usado APENAS para construir a URL do CDN FUT.GG (`card.imageUrl`). `getCardByFutggId` existe apenas para exibição decorativa em telas de loja/pacotes (retorna primeiro match).

**Por quê:** Múltiplos jogadores podem ter o mesmo futggId (variantes Base/Copa/Europeu do mesmo atleta).

---

## fetchCardPhoto(card): recebe objeto completo, nunca apenas ID

**Regra:** A função de fetch de foto recebe o objeto completo de carta. Usa `card.cardId` (= internalId) como chave de cache local e filename. URL chain: `card.imageUrl` (CDN por futggId) → `card.fallbackUrl1` (SoFIFA FC25 por sofascoreId) → `card.fallbackUrl2` (SoFIFA FC24).

**Por quê:** Garante que foto, nome, rating e posição sempre vêm do mesmo objeto. Elimina mistura de dados por índice de array.

---

## Validação obrigatória antes de renderizar

`validateCard(card)` deve ser chamada antes de todo `drawEACard`. Campos obrigatórios: `cardId`, `name`, `rating`, `position`, `nation`, `club`. imageUrl é opcional (jogadores sem futggId usam drawAvatar).

`logCard(prefix, card)` deve ser chamada para auditoria da cadeia de dados: `cardId | name | image | rating | position`.

---

## Jogadores sem futggId

12 jogadores no dataset não têm futggId. Eles FICAM no cache com `imageUrl: null`. São renderizados via drawAvatar (iniciais) — nunca carta vazia.

---

## Duplicate cardId na escalação

`getTeamLineup` valida e bloqueia cardIds duplicados. `autoLineup` usa `usedCardIds: Set` para evitar duplicatas.

---

## applyOverride (futOverrides.js)

`applyOverride(card)` usa `player.id` (= internalId) para lookup. Retorna `{ ...card, name: customName ?? card.name, customPhotoUrl }`. O campo `name` é mutado diretamente — não usa `customName` no objeto retornado.

---

## Admin panel (futadm_editar_modal / futadm_resetar_modal)

Deve usar `getCardByInternalId` do `futCardCache.js`. NUNCA usar `getPlayerById` do `futPlayers.js` para preview — geraria shape incompatível com `validateCard`.
