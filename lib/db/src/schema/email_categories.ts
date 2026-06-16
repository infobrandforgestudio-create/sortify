import { pgTable, serial, integer, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { emailsTable } from "./emails";
import { categoriesTable } from "./categories";

export const emailCategoriesTable = pgTable("email_categories", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id")
    .notNull()
    .references(() => emailsTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  confidence: real("confidence").notNull().default(1.0),
  assignedBy: text("assigned_by").notNull().default("ai"),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

export const insertEmailCategorySchema = createInsertSchema(emailCategoriesTable).omit({
  id: true,
  assignedAt: true,
});

export type InsertEmailCategory = z.infer<typeof insertEmailCategorySchema>;
export type EmailCategory = typeof emailCategoriesTable.$inferSelect;
