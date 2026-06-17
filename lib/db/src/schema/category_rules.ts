import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const categoryRulesTable = pgTable("category_rules", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  fieldType: text("field_type").notNull(),
  operator: text("operator").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCategoryRuleSchema = createInsertSchema(categoryRulesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertCategoryRule = z.infer<typeof insertCategoryRuleSchema>;
export type CategoryRule = typeof categoryRulesTable.$inferSelect;
