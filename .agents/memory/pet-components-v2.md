---
name: Pet Components V2
description: Pet interactions, purchases, profile equipment, and admin confirmations use Discord Components V2.
---

O fluxo de pets deve usar `ContainerBuilder`/`TextDisplayBuilder` e botões claros, sem `EmbedBuilder` com barra lateral colorida. Ações rápidas usam IDs `pet_action:*`, enquanto compra e equipar preservam os IDs e a persistência existentes.

**Why:** O usuário pediu uma experiência de pet mais interativa e visualmente consistente, sem quebrar cooldowns, compras ou o pet equipado no perfil.

**How to apply:** Ao adicionar uma nova tela ou resultado de pet, reutilize o painel V2 compartilhado e mantenha o roteamento das ações no evento central de interações.