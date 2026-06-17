import { Router } from "express";
import { db } from "../db";
import { emailsTable, categoriesTable, emailCategoriesTable, syncStateTable } from "../schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", (_req, res) => {
  const totalEmails = db.select({ count: sql<number>`count(*)` }).from(emailsTable).get();
  const categorizedEmails = db.select({ count: sql<number>`count(distinct ${emailCategoriesTable.emailId})` }).from(emailCategoriesTable).get();

  const perCategory = db
    .select({
      categoryId: categoriesTable.id,
      name: categoriesTable.name,
      color: categoriesTable.color,
      count: sql<number>`count(${emailCategoriesTable.id})`,
    })
    .from(categoriesTable)
    .leftJoin(emailCategoriesTable, eq(categoriesTable.id, emailCategoriesTable.categoryId))
    .groupBy(categoriesTable.id)
    .orderBy(sql`count(${emailCategoriesTable.id}) desc`)
    .all();

  const syncState = db.select().from(syncStateTable).limit(1).all();

  const total = totalEmails?.count ?? 0;
  const categorized = categorizedEmails?.count ?? 0;

  res.json({
    totalEmails: total,
    categorizedEmails: categorized,
    uncategorizedEmails: total - categorized,
    totalCategories: perCategory.length,
    emailsPerCategory: perCategory.map((r) => ({ categoryId: r.categoryId, name: r.name, color: r.color, count: r.count })),
    lastSyncAt: syncState[0]?.lastSyncAt ? (syncState[0].lastSyncAt instanceof Date ? syncState[0].lastSyncAt : new Date(syncState[0].lastSyncAt as number)).toISOString() : null,
  });
});

export default router;
