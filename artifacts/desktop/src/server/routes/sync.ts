import { Router } from "express";
import { db } from "../db";
import { emailsTable, emailAttachmentsTable, categoriesTable, emailCategoriesTable, categoryRulesTable } from "../schema";
import { eq, sql } from "drizzle-orm";
import { checkConnection, getSyncState, markSyncStarted, markSyncFinished, fetchRecentEmails } from "../lib/imap";
import { categorizeEmailsBatch } from "../lib/categorizer";

const router = Router();

let syncInProgress = false;

function toIso(d: Date | number | null): string | null {
  if (d === null || d === undefined) return null;
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

async function runSync() {
  if (syncInProgress) return;
  syncInProgress = true;
  await markSyncStarted();

  let synced = 0;

  try {
    const messages = await fetchRecentEmails(100);
    console.log(`[Sortify] Fetched ${messages.length} emails from IMAP`);

    const categories = db.select().from(categoriesTable).all();
    const rules = db.select().from(categoryRulesTable).all();

    for (const msg of messages) {
      const existing = db.select().from(emailsTable).where(eq(emailsTable.gmailId, msg.id)).all();

      let emailId: number;
      if (existing.length === 0) {
        const inserted = db
          .insert(emailsTable)
          .values({ gmailId: msg.id, subject: msg.subject, fromAddress: msg.from, snippet: msg.snippet, body: msg.body, htmlBody: msg.htmlBody, receivedAt: msg.receivedAt, isRead: msg.isRead })
          .returning()
          .get();
        emailId = inserted.id;

        if (msg.attachments.length > 0) {
          db.insert(emailAttachmentsTable).values(
            msg.attachments.map((att) => ({ emailId, filename: att.filename, contentType: att.contentType, size: att.size, data: att.data }))
          ).run();
        }
        synced++;
      } else {
        emailId = existing[0].id;
      }

      const alreadyCategorized = db.select().from(emailCategoriesTable).where(eq(emailCategoriesTable.emailId, emailId)).all();

      if (alreadyCategorized.length === 0 && categories.length > 0) {
        const results = await categorizeEmailsBatch([msg], categories, rules);
        const result = results.get(msg.id);
        if (result && result.categoryId !== null) {
          db.insert(emailCategoriesTable).values({ emailId, categoryId: result.categoryId, confidence: result.confidence, assignedBy: result.assignedBy }).run();
        }
      }
    }

    const state = await getSyncState();
    await markSyncFinished(state.totalEmailsSynced + synced);
    console.log(`[Sortify] Sync complete — ${synced} new emails`);
  } catch (err) {
    console.error("[Sortify] Sync failed:", err);
    try {
      const state = await getSyncState();
      await markSyncFinished(state.totalEmailsSynced + synced);
    } catch { /* ignore */ }
  } finally {
    syncInProgress = false;
  }
}

router.get("/status", async (_req, res) => {
  const [status, state] = await Promise.all([checkConnection(), getSyncState()]);
  const totalRows = db.select({ count: sql<number>`count(*)` }).from(emailsTable).get();

  res.json({
    connected: status.connected,
    lastSyncAt: toIso(state.lastSyncAt),
    totalEmails: totalRows?.count ?? 0,
    isSyncing: syncInProgress || state.isSyncing,
    message: status.message,
  });
});

router.post("/", async (_req, res) => {
  const status = await checkConnection();
  const state = await getSyncState();
  const totalRows = db.select({ count: sql<number>`count(*)` }).from(emailsTable).get();

  if (!status.connected) {
    res.json({ connected: false, lastSyncAt: toIso(state.lastSyncAt), totalEmails: totalRows?.count ?? 0, isSyncing: false, message: status.message ?? "No email account connected." });
    return;
  }

  runSync();

  res.json({ connected: true, lastSyncAt: toIso(state.lastSyncAt), totalEmails: totalRows?.count ?? 0, isSyncing: true, message: "Sync started" });
});

export default router;
