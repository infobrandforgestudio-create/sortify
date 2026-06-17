import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable, categoriesTable, emailCategoriesTable, categoryRulesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  checkConnection,
  getSyncState,
  markSyncStarted,
  markSyncFinished,
  fetchRecentEmails,
} from "../lib/imap";
import { categorizeEmailsBatch } from "../lib/categorizer";
import { logger } from "../lib/logger";

const router = Router();

let syncInProgress = false;

async function runSync() {
  if (syncInProgress) return;
  syncInProgress = true;
  await markSyncStarted();

  let synced = 0;

  try {
    const messages = await fetchRecentEmails(100);
    logger.info({ count: messages.length }, "Fetched emails from IMAP");

    const [categories, rules] = await Promise.all([
      db.select().from(categoriesTable),
      db.select().from(categoryRulesTable),
    ]);

    for (const msg of messages) {
      const existing = await db
        .select()
        .from(emailsTable)
        .where(eq(emailsTable.gmailId, msg.id));

      let emailId: number;
      if (existing.length === 0) {
        const inserted = await db
          .insert(emailsTable)
          .values({
            gmailId: msg.id,
            subject: msg.subject,
            fromAddress: msg.from,
            snippet: msg.snippet,
            body: msg.body,
            receivedAt: msg.receivedAt,
            isRead: msg.isRead,
          })
          .returning();
        emailId = inserted[0].id;
        synced++;
      } else {
        emailId = existing[0].id;
      }

      const alreadyCategorized = await db
        .select()
        .from(emailCategoriesTable)
        .where(eq(emailCategoriesTable.emailId, emailId));

      if (alreadyCategorized.length === 0 && categories.length > 0) {
        const results = await categorizeEmailsBatch([msg], categories, rules);
        const result = results.get(msg.id);
        if (result && result.categoryId !== null) {
          await db.insert(emailCategoriesTable).values({
            emailId,
            categoryId: result.categoryId,
            confidence: result.confidence,
            assignedBy: result.assignedBy,
          });
        }
      }
    }

    const state = await getSyncState();
    await markSyncFinished(state.totalEmailsSynced + synced);
    logger.info({ synced }, "Sync completed successfully");
  } catch (err) {
    logger.error({ err }, "Sync failed — resetting sync state");
    try {
      const state = await getSyncState();
      await markSyncFinished(state.totalEmailsSynced + synced);
    } catch (resetErr) {
      logger.error({ err: resetErr }, "Failed to reset isSyncing state");
    }
  } finally {
    syncInProgress = false;
  }
}

router.get("/status", async (_req, res) => {
  const [status, state] = await Promise.all([
    checkConnection(),
    getSyncState(),
  ]);

  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailsTable);

  res.json({
    connected: status.connected,
    lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    totalEmails: totalRows[0]?.count ?? 0,
    isSyncing: syncInProgress || state.isSyncing,
    message: status.message,
  });
});

router.post("/", async (_req, res) => {
  const status = await checkConnection();

  const state = await getSyncState();
  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailsTable);

  if (!status.connected) {
    res.json({
      connected: false,
      lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
      totalEmails: totalRows[0]?.count ?? 0,
      isSyncing: false,
      message: status.message ?? "No email account connected.",
    });
    return;
  }

  runSync();

  res.json({
    connected: true,
    lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    totalEmails: totalRows[0]?.count ?? 0,
    isSyncing: true,
    message: "Sync started",
  });
});

export default router;
