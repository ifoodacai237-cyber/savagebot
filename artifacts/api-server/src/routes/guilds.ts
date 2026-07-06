import { Router } from "express";
import { db } from "@workspace/db";
import { guildConfigTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

function isValidGuildId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0;
}

router.get("/guilds", async (req, res) => {
  try {
    const guilds = await db.select().from(guildConfigTable);
    res.json(guilds);
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
