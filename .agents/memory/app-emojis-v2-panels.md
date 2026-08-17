---
name: Application emojis and V2 panels
description: Regras para emojis registrados em background e payloads Components V2 da loja.
---

Emojis de aplicação são registrados em background no evento `ready`; qualquer chamada de `getEmoji` antes da conclusão precisa retornar um emoji Unicode seguro, nunca um pseudo-emoji como `:nome:`.

**Why:** Menus e botões enviados ao Discord validam o nome do emoji; um nome textual sem `id` faz a API rejeitar o payload e pode parecer um erro interno no painel V2.

**How to apply:** Mantenha os emojis personalizados quando estiverem no cache, mas defina fallbacks Unicode para todos os nomes usados em componentes e em mensagens enquanto o registro ainda está pendente.