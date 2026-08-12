---
name: Discord ticket interactions
description: Reliability rules for ticket action menus and buttons in Discord interactions.
---

Ticket action custom IDs must each have an explicit handler, and handlers that perform Prisma or Discord API work must acknowledge the interaction immediately with `deferReply`/`deferUpdate`.

**Why:** Discord expires an unacknowledged component interaction after roughly three seconds, which appears to users as “O aplicativo não respondeu”; ticket actions commonly perform multiple database/API calls.

**How to apply:** When adding or changing ticket controls, verify the full custom ID route for menu and button variants, acknowledge first, handle missing/closed tickets explicitly, and use an atomic claim update to avoid two attendants claiming the same ticket.