import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  gmailId: text("gmail_id").notNull().unique(),
  subject: text("subject").notNull().default("(no subject)"),
  fromAddress: text("from_address").notNull().default(""),
  snippet: text("snippet").notNull().default(""),
  body: text("body").notNull().default(""),
  htmlBody: text("html_body").notNull().default(""),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emailsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
