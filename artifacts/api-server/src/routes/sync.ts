import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable, categoriesTable, emailCategoriesTable, syncStateTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  checkGmailConnection,
  getSyncState,
  markSyncStarted,
  markSyncFinished,
  fetchRecentEmails,
} from "../lib/gmail";
import { categorizeEmailsBatch } from "../lib/categorizer";

const router = Router();

let syncInProgress = false;

async function runSync() {
  if (syncInProgress) return;
  syncInProgress = true;
  await markSyncStarted();

  try {
    const gmailMessages = await fetchRecentEmails(100);
    const categories = await db.select().from(categoriesTable);

    let synced = 0;
    for (const msg of gmailMessages) {
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
        const results = await categorizeEmailsBatch([msg], categories);
        const result = results.get(msg.id);
        if (result && result.categoryId !== null) {
          await db.insert(emailCategoriesTable).values({
            emailId,
            categoryId: result.categoryId,
            confidence: result.confidence,
            assignedBy: "ai",
          });
        }
      }
    }

    const state = await getSyncState();
    await markSyncFinished(state.totalEmailsSynced + synced);
  } finally {
    syncInProgress = false;
  }
}

router.get("/status", async (_req, res) => {
  const [status, state] = await Promise.all([
    checkGmailConnection(),
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
  const status = await checkGmailConnection();
  if (!status.connected) {
    const state = await getSyncState();
    const totalRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailsTable);
    res.json({
      connected: false,
      lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
      totalEmails: totalRows[0]?.count ?? 0,
      isSyncing: false,
      message: status.message ?? "Gmail not connected.",
    });
    return;
  }

  runSync().catch((err) => {
    syncInProgress = false;
    console.error("Sync error:", err);
  });

  const state = await getSyncState();
  const totalRows = await db
    .select({ count: db.$count(emailsTable) })
    .from(emailsTable);

  res.json({
    connected: true,
    lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    totalEmails: Number(totalRows[0]?.count ?? 0),
    isSyncing: true,
    message: "Sync started",
  });
});

export default router;
