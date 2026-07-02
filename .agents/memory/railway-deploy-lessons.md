---
name: Railway Deploy — fallen-angels-bot
description: Lições sobre como o Railway builda e roda o discord-bot (fallen-angels-bot)
---

## Configuração atual (funcional)

- **Repositório GitHub**: `pedrohalmeida2207-gif/fallen-angels-bot`
- **Railway project**: `honest-flow` | serviceId: `c140ffbe-386d-4493-ace5-0ae430073452` | environmentId: `d25351c0-20be-4df8-b883-52f54f5da900`
- **rootDirectory** no Railway: `discord-bot` (definido via `serviceInstanceUpdate`)
- **Builder**: NIXPACKS (definido em `discord-bot/railway.json`)
- **nixpacksConfigPath**: `/discord-bot/nixpacks.toml`

## nixpacks.toml atual (funcional)

```toml
[variables]
NIXPACKS_NODE_VERSION = "22"

[phases.setup]
nixPkgs = ["ffmpeg"]

[phases.install]
cmds = ["npm install --legacy-peer-deps"]

[phases.build]
cmds = ["npx prisma generate"]

[start]
cmd = "npx prisma db push --accept-data-loss && node src/index.js"
```

## Regra crítica: package-lock.json gerado no Replit não pode ir ao GitHub

O npm no Replit usa um proxy interno (`package-firewall.replit.local`) e salva URLs desse proxy no `package-lock.json`. Railway não consegue resolver essas URLs → build falha com `ENOTFOUND`.

**Como aplicar**: `discord-bot/package-lock.json` está no `.gitignore`. Nunca remover essa entrada. Railway gera o próprio lock file durante o build.

## Regra: NUNCA adicionar `nodejs_XX` ou `nodePackages.npm` no nixpacks.toml

Nixpacks instala Node automaticamente. Adicionar `nodejs_22` em `nixPkgs` cria colisão com `nodejs_20` (puxado por `nodePackages.npm`):
```
error: collision between /nix/store/...-nodejs-20.18.1/... and /nix/store/...-nodejs-22.11.0/...
```

**Como aplicar**: Especificar versão do Node APENAS via `NIXPACKS_NODE_VERSION = "22"` na seção `[variables]`. Para FFmpeg e outros binários, adicionar em `nixPkgs` normalmente — só Node não pode entrar.

**Why:** Nixpacks detecta automaticamente o engine do package.json e instala um Node padrão. Qualquer outro nodejs_XX conflita com o que já foi instalado.

## Regra: prisma db push precisa rodar no start, não só no build

O banco SQLite (`bot.db`) é efêmero no Railway (sem volume). `prisma generate` no build phase gera o cliente; `prisma db push` no start command cria as tabelas a cada deploy.

**Como aplicar**: 
- `nixpacks.toml` → `[phases.build]` → inclui `npx prisma generate`
- `railway.json` → `startCommand`: `"npx prisma db push --accept-data-loss && node src/index.js"`

## Regra: loader.js deve registrar comandos em apenas UM escopo

Registrar guild + global ao mesmo tempo faz o `/perfil` aparecer duplicado no Discord. Usar `if (GUILD_ID) guild-only, else global-only`, e limpar o escopo oposto com `PUT [...] body:[]` para remover comandos antigos.

## Regra: @napi-rs/canvas 1.0.0 não registra fontes TTF customizadas via API

No ambiente Nix/Replit, `GlobalFonts.register()`, `registerFromPath()` e `loadFontsFromDir()` retornam null/0 silenciosamente — fontes customizadas nunca aparecem em `getFamilies()`. Apenas fontes do SISTEMA (via fontconfig) são acessíveis.

**Como aplicar**: Nunca depender de registro manual de fonte. Usar `GlobalFonts.loadSystemFonts()` + detecção dinâmica da família disponível. No Railway, garantir que fontconfig + apt-fonts estejam instalados (via railpack.toml com aptPkgs).

## Regra: usar railpack.toml (apt) em vez de nixpacks.toml (nix) para fontes no Railway

Nixpacks não configura fontconfig corretamente para o skia do @napi-rs/canvas. Com aptPkgs: ["fonts-dejavu-core","fonts-noto","fonts-liberation","fontconfig"] + fc-cache no build, o `loadSystemFonts()` funciona.

**Como aplicar**: Manter nixpacks.toml vazio/comentado. Não forçar builder no railway.json — deixar Railway auto-detectar o railpack.toml.

## Regra: fazer push via GitHub API quando git não está disponível no agente

O agente main não pode usar `git add/commit/push` diretamente. Usar GitHub Contents API:
1. `GET /repos/{owner}/{repo}/contents/{path}` → pega o `sha` do arquivo
2. `PUT /repos/{owner}/{repo}/contents/{path}` com `content` (base64) e `sha` → push direto

## Como buscar FutggId para novos jogadores

O CDN do FUT.GG (`cdn.futgg.com`) é inacessível da rede do Replit (timeout/000). Para encontrar futggId de jogadores:
- Não usar: sofifa.com, futbin.com, fut.gg (todos Cloudflare)
- Alternativa: o script `scripts/sync-futgg.js --force` roda no Railway/servidor externo onde o CDN é acessível
- Jogadores sem futggId mostram avatar com iniciais (comportamento esperado e já implementado)
