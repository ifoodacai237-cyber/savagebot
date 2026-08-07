---
name: Fishing economy system
description: Isolated fishing economy module with rods, catch inventory, cooldown and V2 interactions.
---

The fishing feature is intentionally separate from the general shop: it uses Economy for coins, but keeps rods and fish inventory in dedicated per-user/per-guild tables.

**Why:** Fishing was requested as an economy activity without changing existing shop, profile, game, or daily/work behavior.

**How to apply:** Keep new fishing buttons and select menus under the `fish_` prefix and route them through the fishing handler; preserve the 45-minute cooldown and sell-through-wallet flow unless the user explicitly asks to rebalance it.