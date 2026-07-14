---
name: Sniper de usernames — REMOVIDO
description: Sistema de sniper/checker de usernames existiu, teve vários bugs corrigidos, e foi totalmente removido a pedido do usuário em 14/07/2026. Não recriar sem pedido explícito.
---

**Status atual: removido por completo.** Código (checker.js, usernameMonitor.js,
publishChannels.js, comandos sniper/monitor, detector de troca de username) e tabelas do
banco (`PublishChannel`, `SniperTarget`) foram apagados. O usuário cansou de gerenciar
contas/tokens descartáveis para o checker autenticado. Se pedir de volta, tratar como
feature nova — não tentar restaurar do histórico. As notas abaixo documentam bugs e
lições técnicas encontradas enquanto o sistema existia, úteis apenas se for reconstruído.

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

**Diagnóstico de token "morto na hora" — corrupção vs. conta inválida de verdade:**
quando um token (bot ou user) morre imediatamente, primeiro checar a *estrutura* do valor
salvo no secret antes de assumir que a conta caiu: contar chars, procurar espaço/whitespace
embutido e bytes fora de `[A-Za-z0-9._-]`, sem nunca imprimir o valor. Já aconteceu do
`DISCORD_TOKEN` do bot ficar com espaços e um byte corrompido no meio (autocorretor do
teclado ao copiar/colar) — o log dava `TokenInvalid`/401 igualzinho a uma conta banida, mas
era só o secret salvo errado. Se a estrutura estiver limpa (mesmo nº de chars, 2 pontos,
sem lixo) e mesmo assim vier `401: {"message":"401: Unauthorized","code":0}` do Discord, aí
sim é a conta mesmo (token realmente inválido/banido/deslogado do lado do Discord), não erro
de cópia.

**Nunca aceitar token/secret colado em texto puro no chat** (nem em campo de formulário
comum) — trate como comprometido e peça pra gerar de novo usando o fluxo seguro de secrets
(`requestSecrets`), mesmo que o usuário insista que "sempre funcionou".
