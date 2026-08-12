---
name: GitHub PAT push authentication
description: Formato de autenticação necessário para usar o PAT armazenado em secrets no push HTTPS do GitHub.
---

Para push HTTPS via Git, use autenticação Basic com `x-access-token:<PAT>` em `http.extraHeader`; o formato Bearer pode ser rejeitado pelo Git Smart HTTP mesmo quando o PAT é válido.

**Why:** O GitHub aceitou o mesmo secret imediatamente quando enviado como Basic, enquanto a tentativa com Bearer retornou credenciais inválidas.

**How to apply:** Gere o header Basic em memória/processo, nunca imprima o token e não grave a URL autenticada no remote.