---
name: Discord wedding message format
description: Formato confiável do cartão de casamento e regra para não reintroduzir o payload V2 rejeitado.
---

O cartão de casamento usa mensagem clássica com `EmbedBuilder`, imagem `attachment://casamento-card.png` e `ActionRow` de botões. O fluxo não deve usar `MessageFlags.IsComponentsV2`.

**Why:** O Discord estava rejeitando o payload do casamento com `flags: 32768` no Railway, mesmo após reduzir o contêiner V2. O formato clássico com anexo e embed evita essa falha e preserva o cartão visual.

**How to apply:** Ao alterar `/casamento`, `/casar` ou o botão `casar_refresh_`, mantenha `deferReply()`/`deferUpdate()` sem flags V2, retorne o payload clássico e use embeds clássicos também nos erros desse fluxo.