---
name: Sniper de usernames — fórum + rate limit
description: Por que o feed de usernames disponíveis ficava lento/incompleto e como foi corrigido.
---

Cards de username disponível devem ser mensagens normais (`channel.send`), nunca uma
thread de fórum nova por username. Criar thread por mensagem bate no rate limit de
criação de thread do Discord (muito mais agressivo que enviar mensagem numa thread/canal
já existente) — isso causava tanto a lentidão para o post aparecer quanto categorias que
simplesmente paravam de postar (erro de rate limit engolido no catch).

**Como aplicar:** se o canal configurado (`PublishChannel.channelId`) for um canal do tipo
Fórum, resolva/crie UMA thread persistente por categoria (nome = categoria, ex:
"realwordpt") e regrave o `channelId` no banco para essa thread — depois disso é só
`.send()` normal, igual print de referência (thread por categoria acumulando milhares de
posts, não uma thread por username). Essa lógica está centralizada em
`discord-bot/src/utils/publishChannels.js` (`postEmbedToCategory` / `resolveChannel`) e é
usada por todos os pontos que postam (monitor automático, `/snipe_add`, `/publicar_agora`,
detecção de troca de username).

Separado disso: o throughput de checagem depende do pool de tokens em
`DISCORD_USER_TOKENS` (`checker.js`, fila por token, ~1.6 req/s por token vivo). Se vários
tokens morrerem (401 nos logs `[CHECKER:token] 401 — token morto`), sobra pouca capacidade
e aparecem 429 constantes — sintoma parecido de "lento" mas é problema de tokens
inválidos/banidos, não de código. Checar `/monitor status` para ver quantos tokens estão
vivos.
