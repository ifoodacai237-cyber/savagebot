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

## AI feature uses the user's own OpenAI key, not Replit's AI proxy

The `/ia` command (chat via `gpt-5.4` + image gen via `gpt-image-1`) uses the OpenAI SDK with
the user's own `OPENAI_API_KEY` secret, NOT Replit's built-in AI Integrations proxy.

**Why:** `fallen-angels-bot` deploys externally to Railway (see railway-deploy-lessons.md) —
it does not run inside Replit's own hosting in production. Replit's AI Integrations proxy
(`AI_INTEGRATIONS_OPENAI_BASE_URL`) is only reachable from within the Replit environment, so it
would break once deployed to Railway. Any future AI feature on this bot must keep using a
directly-configured provider key, not the Replit AI proxy.

**How to apply:** If adding more AI features to this bot, reuse `discord-bot/src/utils/aiManager.js`
(has short-term per-user/per-guild chat session memory) rather than re-deriving the OpenAI client.
