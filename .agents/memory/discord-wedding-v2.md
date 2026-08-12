---
name: Discord wedding V2
description: Regras de compatibilidade do cartão de casamento com Discord Components V2.
---

Respostas iniciadas com `MessageFlags.IsComponentsV2` não podem misturar `embeds` ou `content`; erros e estados vazios também precisam ser contêineres V2.

**Why:** O Discord aceita o card visual com `ContainerBuilder`, galeria apontando para `attachment://...` e `ActionRow` externo, mas rejeita respostas legadas depois de um `deferReply` V2. Esse erro costuma aparecer apenas como falha genérica no bot.

**How to apply:** Ao alterar `/casamento` ou seus botões, faça o `deferReply` V2 antes de consultas/geração de imagem, mantenha o anexo e a galeria no mesmo payload, reconheça `Atualizar` antes do trabalho assíncrono e use `v2Error`/`v2Simple` em todos os caminhos V2.