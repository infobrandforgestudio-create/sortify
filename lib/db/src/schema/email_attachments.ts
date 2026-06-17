import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { emailsTable } from "./emails";

export const emailAttachmentsTable = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id")
    .notNull()
    .references(() => emailsTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull().default("attachment"),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  data: text("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EmailAttachment = typeof emailAttachmentsTable.$inferSelect;
