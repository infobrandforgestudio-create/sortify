import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const categoriesTable = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#6366f1"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const emailsTable = sqliteTable("emails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gmailId: text("gmail_id").notNull().unique(),
  subject: text("subject").notNull().default("(no subject)"),
  fromAddress: text("from_address").notNull().default(""),
  snippet: text("snippet").notNull().default(""),
  body: text("body").notNull().default(""),
  htmlBody: text("html_body").notNull().default(""),
  receivedAt: integer("received_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const emailAttachmentsTable = sqliteTable("email_attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emailId: integer("email_id").notNull().references(() => emailsTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull().default("attachment"),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  data: text("data").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const emailCategoriesTable = sqliteTable("email_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emailId: integer("email_id").notNull().references(() => emailsTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  confidence: real("confidence").notNull().default(1.0),
  assignedBy: text("assigned_by").notNull().default("ai"),
  assignedAt: integer("assigned_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const categoryRulesTable = sqliteTable("category_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  fieldType: text("field_type").notNull(),
  operator: text("operator").notNull(),
  value: text("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const imapConfigTable = sqliteTable("imap_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  imapHost: text("imap_host").notNull(),
  imapPort: integer("imap_port").notNull().default(993),
  username: text("username").notNull(),
  password: text("password").notNull(),
  useSsl: integer("use_ssl", { mode: "boolean" }).notNull().default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const syncStateTable = sqliteTable("sync_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
  isSyncing: integer("is_syncing", { mode: "boolean" }).notNull().default(false),
  totalEmailsSynced: integer("total_emails_synced").notNull().default(0),
  lastPageToken: text("last_page_token"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const appSettingsTable = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Category = typeof categoriesTable.$inferSelect;
export type CategoryRule = typeof categoryRulesTable.$inferSelect;
