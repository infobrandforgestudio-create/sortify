import { pgTable, serial, timestamp, boolean, integer, text } from "drizzle-orm/pg-core";

export const syncStateTable = pgTable("sync_state", {
  id: serial("id").primaryKey(),
  lastSyncAt: timestamp("last_sync_at"),
  isSyncing: boolean("is_syncing").notNull().default(false),
  totalEmailsSynced: integer("total_emails_synced").notNull().default(0),
  lastPageToken: text("last_page_token"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SyncState = typeof syncStateTable.$inferSelect;
