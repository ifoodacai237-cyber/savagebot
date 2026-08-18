---
name: Pet Components V2
description: Pet interactions, purchases, profile equipment, and admin confirmations use Discord Components V2.
---

O fluxo de pets deve usar `ContainerBuilder`/`TextDisplayBuilder` e botões claros, sem `EmbedBuilder` com barra lateral colorida. Ações rápidas usam IDs `pet_action:*`, enquanto compra e equipar preservam os IDs e a persistência existentes.

**Why:** O usuário pediu uma experiência de pet mais interativa e visualmente consistente, sem quebrar cooldowns, compras ou o pet equipado no perfil.

**How to apply:** Ao adicionar uma nova tela ou resultado de pet, reutilize o painel V2 compartilhado e mantenha o roteamento das ações no evento central de interações.

Ao usar `deferReply` com `MessageFlags.IsComponentsV2`, todo caminho posterior de sucesso ou erro precisa editar com `components` V2; não use `content` ou `embeds` nesses caminhos.

**Why:** O Discord rejeita misturar `content`/`embeds` com uma resposta já marcada como Components V2, o que deixa a interação presa no carregamento ou exibe apenas o erro genérico.

**How to apply:** Antes de adicionar um retorno em `/loja`, compra de pet ou `/perfil` → `Meu Pet`, confirme se a interação foi iniciada como V2 e mantenha o payload no mesmo formato até o fim.

Ao exibir o nome de um pet, preserve a marcação original de emoji personalizado (`<:nome:id>`/`<a:nome:id>`) quando o cache de emojis do servidor não estiver disponível; na loja, passe o guild da interação para resolver emojis por nome/ID.

**Why:** Substituir um emoji personalizado não resolvido por `🐾` impede o membro de identificar qual pet está comprando.

**How to apply:** Use `petDisplayName(pet, interaction.guild)` em carrosséis, detalhes e confirmações de compra; mantenha o fallback para a marcação original, não para uma patinha genérica.

Navegação circular com exatamente dois itens precisa de IDs distintos por direção, mesmo quando Anterior e Próximo apontam para o mesmo índice; encode a direção no custom ID e extraia o índice no handler.

**Why:** O Discord rejeita componentes com `custom_id` duplicado, e remover os dois botões deixa o carrossel de dois pets sem navegação.

**How to apply:** Ao criar carrosséis com dois itens, use sufixos como `prev`/`next` nos IDs e mantenha a navegação oculta apenas quando houver um único item.