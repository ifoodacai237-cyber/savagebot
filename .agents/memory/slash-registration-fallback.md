---
name: Slash command registration fallback
description: Discord slash registration must fall back from a stale GUILD_ID to an accessible guild.
---

The Railway `GUILD_ID` can be stale or point to a server the bot cannot access, producing Discord `Missing Access` during `applicationGuildCommands`. The bot can still see and register commands in other cached guilds.

**Why:** The bot login succeeded and prefix commands worked, but slash registration failed before publishing; probing the connected bot showed the configured guild was inaccessible while another guild accepted all commands.

**How to apply:** Prefer an accessible configured guild, then try cached guilds, and only then use global registration. Keep the `applications.commands` installation scope enabled when adding the bot to a server.