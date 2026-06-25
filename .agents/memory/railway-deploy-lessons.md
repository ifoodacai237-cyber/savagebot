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

## Regra crítica: package-lock.json gerado no Replit não pode ir ao GitHub

O npm no Replit usa um proxy interno (`package-firewall.replit.local`) e salva URLs desse proxy no `package-lock.json`. Railway não consegue resolver essas URLs → build falha com `ENOTFOUND`.

**Como aplicar**: `discord-bot/package-lock.json` está no `.gitignore`. Nunca remover essa entrada. Railway gera o próprio lock file durante o build.

## Regra: nunca adicionar `nodejs_XX` manualmente no nixpacks.toml

Nixpacks já instala Node por padrão. Adicionar `nodejs_22` em `nixPkgs` causa colisão com o Node já incluído.

**Como aplicar**: Para especificar versão do Node, usar a variável `NIXPACKS_NODE_VERSION = "22"` na seção `[variables]` do `nixpacks.toml`.

## Regra: prisma db push precisa rodar no start, não só no build

O banco SQLite (`bot.db`) é efêmero no Railway (sem volume). `prisma generate` no build phase gera o cliente; `prisma db push` no start command cria as tabelas a cada deploy.

**Como aplicar**: 
- `nixpacks.toml` → `[phases.install]` → inclui `npx prisma generate`
- `railway.json` → `startCommand`: `"npx prisma db push --accept-data-loss && node src/index.js"`

## Regra: loader.js deve registrar comandos em apenas UM escopo

Registrar guild + global ao mesmo tempo faz o `/perfil` aparecer duplicado no Discord. Usar `if (GUILD_ID) guild-only, else global-only`, e limpar o escopo oposto com `PUT [...] body:[]` para remover comandos antigos.
