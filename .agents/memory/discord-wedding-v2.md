---
name: Discord wedding V2
description: Regras de compatibilidade do cartão de casamento com Discord Components V2.
---

Respostas finais com `MessageFlags.IsComponentsV2` não podem misturar `embeds` ou `content`; erros e estados vazios também precisam ser contêineres V2. O `deferReply` deve ser normal, sem essa flag.

**Why:** O `discord.js` restringe as flags do `deferReply` a respostas efêmeras; `IsComponentsV2` é aplicado na edição da resposta. O Discord aceita o card visual com `ContainerBuilder`, galeria apontando para `attachment://...` e `ActionRow` externo, mas rejeita embeds/content em uma resposta V2. Esse erro costuma aparecer apenas como falha genérica no bot.

**How to apply:** Ao alterar `/casamento` ou seus botões, faça `deferReply()` normal antes de consultas/geração de imagem e aplique `IsComponentsV2` no `editReply` final. Mantenha o anexo e a galeria no mesmo payload, reconheça `Atualizar` antes do trabalho assíncrono e use `v2Error`/`v2Simple` em todos os caminhos V2.