import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const imapConfigTable = pgTable("imap_config", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  imapHost: text("imap_host").notNull(),
  imapPort: integer("imap_port").notNull().default(993),
  username: text("username").notNull(),
  password: text("password").notNull(),
  useSsl: boolean("use_ssl").notNull().default(true),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertImapConfigSchema = createInsertSchema(imapConfigTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectImapConfigSchema = createSelectSchema(imapConfigTable);

export type InsertImapConfig = z.infer<typeof insertImapConfigSchema>;
export type ImapConfig = typeof imapConfigTable.$inferSelect;
