---
name: Discord bot per-server personalization + AI
description: How per-guild bot avatar/banner/bio was implemented, and why the AI feature uses the user's own OpenAI key instead of Replit's AI proxy.
---

## Per-server bot identity (icon/banner/bio)

Discord bots can have a **per-guild profile** distinct from their global identity, via
`PATCH /guilds/{guild.id}/members/@me` with `avatar`, `banner`, `bio` fields (base64 data URIs
for images, empty string/`null` to clear). discord.js doesn't wrap this in a high-level method,
so it's called directly via `client.rest.patch(Routes.guildMember(guildId, '@me'), { body })`.

**Why:** This is the only way to give the bot a different look per server without changing its
global identity for every guild. Implemented in `discord-bot/src/utils/botProfile.js`, exposed
via `/personalizar` (icone/banner/bio/resetar/ver), values mirrored into `GuildConfig`
(`botIconUrl`, `botBannerUrl`, `botBio`) so admins can view current settings.

## AI provider must be direct and Railway-compatible

The bot's general chat and ticket support use the Groq OpenAI-compatible API with the directly
configured `GROQ_API_KEY`; image generation remains a separate Pollinations image request.

**Why:** `fallen-angels-bot` deploys externally to Railway (see railway-deploy-lessons.md), so
Replit's AI Integrations proxy is not available in production. The legacy Pollinations text
endpoint can return `402 Payment Required` because its anonymous text budget is exhausted.

**How to apply:** Keep text AI on a directly configured provider key and reuse
`discord-bot/src/utils/aiManager.js` for its short-term per-user/per-guild chat history. Never
expose provider keys in logs or chat.

## Railway secrets are separate

The bot process runs on Railway, so provider keys used by AI features must also be configured in the Railway service environment. Replit Secrets are not automatically mirrored into Railway.

**Why:** A key can exist in the Replit workspace while `process.env` on Railway remains empty, causing external AI calls to fail only in production.

**How to apply:** When adding or debugging an AI provider for this bot, verify the corresponding key exists in Railway as well as in Replit; never expose the value in logs or chat.
