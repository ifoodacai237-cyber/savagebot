import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, guildConfigTable } from "@workspace/db";
import {
  GetGuildConfigParams,
  UpdateGuildConfigParams,
  UpdateGuildConfigBody,
  GetGuildStatsParams,
} from "@workspace/api-zod";
const router: IRouter = Router();

router.get("/guilds", async (req, res) => {
  try {
    const guilds = await db
      .select({
        id: guildConfigTable.id,
        guildId: guildConfigTable.guildId,
        welcomeEnabled: guildConfigTable.welcomeEnabled,
        partnerEnabled: guildConfigTable.partnerEnabled,
        ticketChannel: guildConfigTable.ticketChannel,
        lojaTitle: guildConfigTable.lojaTitle,
      })
      .from(guildConfigTable);

    const summaries = guilds.map((g) => ({
      id: g.id,
      guildId: g.guildId,
      welcomeEnabled: g.welcomeEnabled,
      partnerEnabled: g.partnerEnabled,
      hasTicketChannel: !!g.ticketChannel,
      hasShop: !!g.lojaTitle,
    }));

    res.json(summaries);
  } catch (err) {
    req.log.error({ err }, "Failed to list guilds");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/guilds/:guildId/config", async (req, res) => {
  const parsed = GetGuildConfigParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid guild ID" });
    return;
  }
  const { guildId } = parsed.data;

  try {
    const [config] = await db
      .select()
      .from(guildConfigTable)
      .where(eq(guildConfigTable.guildId, guildId))
      .limit(1);

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
  const paramsParsed = UpdateGuildConfigParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid guild ID" });
    return;
  }
  const { guildId } = paramsParsed.data;

  const bodyParsed = UpdateGuildConfigBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: guildConfigTable.id })
      .from(guildConfigTable)
      .where(eq(guildConfigTable.guildId, guildId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Guild config not found" });
      return;
    }

    const [updated] = await db
      .update(guildConfigTable)
      .set(bodyParsed.data)
      .where(eq(guildConfigTable.guildId, guildId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update guild config");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/guilds/:guildId/stats", async (req, res) => {
  const parsed = GetGuildStatsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid guild ID" });
    return;
  }
  const { guildId } = parsed.data;

  try {
    const [totalTickets] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM "Ticket" WHERE "guildId" = ${guildId}`
    );
    const [openTickets] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM "Ticket" WHERE "guildId" = ${guildId} AND "status" = 'open'`
    );
    const [totalPartnerships] = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM "Partnership" WHERE "guildId" = ${guildId}`
    );
    const [economyStats] = await db.execute<{ users: string; richest: string; total: string }>(
      sql`SELECT COUNT(*) as users, COALESCE(MAX("balance" + "bank"), 0) as richest, COALESCE(SUM("balance" + "bank"), 0) as total FROM "Economy" WHERE "guildId" = ${guildId}`
    );

    res.json({
      guildId,
      totalUsers: parseInt(economyStats?.users ?? "0") || 0,
      totalTickets: parseInt(totalTickets?.count ?? "0") || 0,
      openTickets: parseInt(openTickets?.count ?? "0") || 0,
      totalPartnerships: parseInt(totalPartnerships?.count ?? "0") || 0,
      richestBalance: parseInt(economyStats?.richest ?? "0") || 0,
      totalEconomy: parseInt(economyStats?.total ?? "0") || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get guild stats");
    res.json({
      guildId,
      totalUsers: 0,
      totalTickets: 0,
      openTickets: 0,
      totalPartnerships: 0,
      richestBalance: 0,
      totalEconomy: 0,
    });
  }
});

export default router;
