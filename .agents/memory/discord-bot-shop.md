---
name: Discord Bot Shop System
description: Shop system (loja) for Slow bot — banners, roles, profile cards, interactions.
---

## Architecture

- Banners: defined globally in `discord-bot/src/utils/shopData.js` (8 banners with Unsplash URLs + gradient fallbacks). Fixed `key` IDs, not stored in DB.
- Roles: stored per-guild in `ShopRole` model (guildId + roleId + name + price + description).
- Purchases: stored in `UserPurchase` (userId, guildId, itemType="role"|"banner", itemRef=roleId|bannerKey).
- User profiles (active banner): stored in `UserProfile` (userId, guildId, activeBanner=bannerKey|null).

## Commands

- `/loja painel` — posts shop panel (not ephemeral, anyone can see)
- `/loja admin cargo @role <price>` — adds role to shop (admin only)
- `/loja admin remover <id>` — removes role from shop
- `/loja admin listar` — lists all roles in shop
- `/perfil [user]` — shows canvas profile card (900x340px), with "Mudar Banner" button for self

## Interaction customId prefixes

- `shop_comprar` → buy menu (select roles or banners)
- `shop_vitrine` → banner showcase
- `shop_converter` → conversion rates info
- `shop_saldo` → balance overview
- `shop_type_sel` → select menu: roles or banners category
- `shop_item_sel` → select menu: pick specific item
- `shop_vitrine_sel` → select menu: browse banners in vitrine
- `shop_buy_<type>:<ref>` → confirm purchase button
- `shop_ok_<type>:<ref>` → execute purchase button
- `shop_cancel` → cancel purchase
- `profile_banner_btn` → show owned banners to equip
- `profile_banner_sel` → select menu: equip banner on profile

All shop/profile interactions dispatched from `interactionCreate.js` → `handleShopInteraction()` in `shopHandlers.js`.

## Preview-before-equip pattern (ring/frame/color)

Ring color presets, frames, and custom hex colors (both ring and border) render a
throwaway canvas preview (`ringPreview.js` → `renderRingPreview`) in an ephemeral
deferred reply with "Equipar"/"Cancelar" buttons (`*_ring_confirm:<value>`,
`*_ringborder_confirm:<value>`, `*_ring_cancel`) BEFORE writing to `UserProfile`.
DB write only happens on confirm.

**Why:** User asked to see how a ring/frame/color would look without having to equip
every option one by one — equip-then-check was too slow for browsing many presets.

**How to apply:** Any new equippable cosmetic with multiple visual options should follow
this same defer→render→confirm/cancel flow instead of applying immediately, reusing
`sendRingPreview`/`sendRingBorderPreview` as the template. The generic `profile_`/`wallet_ring`
prefix routing in `interactionCreate.js` already covers any new suffix on these prefixes —
no interactionCreate.js changes needed when only adding new customId suffixes there.

## Profile card

- 900×340px canvas card using `@napi-rs/canvas`
- If activeBanner set: loads Unsplash URL as background image; gradient fallback on error
- Default: dark purple gradient
- Layout: left accent bar, circular avatar with purple gradient ring, username, banner badge, 3 stat cards (wallet, bank, items)

**Why:** Banners defined in code (not DB) to avoid per-guild seeding complexity and keep them consistent. Roles are per-guild because Discord roleIds are guild-specific.

**How to apply:** When adding new banners, add to `BANNERS` array in `shopData.js` — no DB migration needed. Roles always require admin to add via slash command.
