import { Router } from "express";
import { db } from "@workspace/db";
import { guildConfigTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

const DISCORD_API = "https://discord.com/api/v10";
const BOT_TOKEN = process.env.DISCORD_TOKEN;

function isValidGuildId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

async function fetchDiscordGuild(guildId: string): Promise<DiscordGuild | null> {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (!res.ok) return null;
    return await res.json() as DiscordGuild;
  } catch {
    return null;
  }
}

function guildIconUrl(guildId: string, icon: string | null): string | null {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=64`;
}

router.get("/guilds", async (req, res) => {
  try {
    const guilds = await db.select().from(guildConfigTable);

    const enriched = await Promise.all(
      guilds.map(async (g) => {
        const discord = await fetchDiscordGuild(g.guildId);
        return {
          id: g.id,
          guildId: g.guildId,
          welcomeEnabled: g.welcomeEnabled,
          partnerEnabled: g.partnerEnabled,
          hasTicketChannel: !!g.ticketChannel,
          hasShop: !!g.lojaTitle,
          discordName: discord?.name ?? null,
          discordIcon: discord ? guildIconUrl(g.guildId, discord.icon) : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list guilds");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/guilds/:guildId/config", async (req, res) => {
  const { guildId } = req.params;
  if (!isValidGuildId(guildId)) {
    res.status(400).json({ error: "Invalid guild ID" });
    return;
  }

  try {
    const [config] = await db
      .select()
      .from(guildConfigTable)
      .where(eq(guildConfigTable.guildId, guildId));

    if (!config) {
      res.status(404).json({ error: "Guild config not found" });
      return;
    }

    res.json(config);
  } catch (err) {
    req.log.error({ err }, "Failed to get guild config");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/guilds/:guildId/config", async (req, res) => {
  const { guildId } = req.params;
  if (!isValidGuildId(guildId)) {
    res.status(400).json({ error: "Invalid guild ID" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(guildConfigTable)
      .where(eq(guildConfigTable.guildId, guildId));

    if (!existing) {
      res.status(404).json({ error: "Guild config not found" });
      return;
    }

    const [updated] = await db
      .update(guildConfigTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(guildConfigTable.guildId, guildId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update guild config");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function safeCount(query: ReturnType<typeof sql>): Promise<number> {
  try {
    const result = await db.execute<{ count: string }>(query);
    return parseInt(result[0]?.count ?? "0") || 0;
  } catch {
    return 0;
  }
}

async function safeEconomyStats(guildId: string) {
  try {
    const [row] = await db.execute<{ users: string; richest: string; total: string }>(
      sql`SELECT COUNT(*) as users, COALESCE(MAX("balance" + "bank"), 0) as richest, COALESCE(SUM("balance" + "bank"), 0) as total FROM "Economy" WHERE "guildId" = ${guildId}`
    );
    return {
      users: parseInt(row?.users ?? "0") || 0,
      richest: parseInt(row?.richest ?? "0") || 0,
      total: parseInt(row?.total ?? "0") || 0,
    };
  } catch {
    return { users: 0, richest: 0, total: 0 };
  }
}

router.get("/guilds/:guildId/stats", async (req, res) => {
  const { guildId } = req.params;
  if (!isValidGuildId(guildId)) {
    res.status(400).json({ error: "Invalid guild ID" });
    return;
  }

  const [totalTickets, openTickets, totalPartnerships, economy] = await Promise.all([
    safeCount(sql`SELECT COUNT(*) as count FROM "Ticket" WHERE "guildId" = ${guildId}`),
    safeCount(sql`SELECT COUNT(*) as count FROM "Ticket" WHERE "guildId" = ${guildId} AND "status" = 'open'`),
    safeCount(sql`SELECT COUNT(*) as count FROM "Partnership" WHERE "guildId" = ${guildId}`),
    safeEconomyStats(guildId),
  ]);

  res.json({
    guildId,
    totalUsers: economy.users,
    totalTickets,
    openTickets,
    totalPartnerships,
    richestBalance: economy.richest,
    totalEconomy: economy.total,
  });
});

export default router;
