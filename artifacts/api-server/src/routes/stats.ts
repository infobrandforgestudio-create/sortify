import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable, categoriesTable, emailCategoriesTable, syncStateTable } from "@workspace/db";
import { eq, isNotNull, isNull, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const [totalEmails, categorizedEmails, perCategory, syncState] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(emailsTable),
    db
      .select({ count: sql<number>`count(distinct ${emailCategoriesTable.emailId})::int` })
      .from(emailCategoriesTable),
    db
      .select({
        categoryId: categoriesTable.id,
        name: categoriesTable.name,
        color: categoriesTable.color,
        count: sql<number>`count(${emailCategoriesTable.id})::int`,
      })
      .from(categoriesTable)
      .leftJoin(emailCategoriesTable, eq(categoriesTable.id, emailCategoriesTable.categoryId))
      .groupBy(categoriesTable.id)
      .orderBy(sql`count(${emailCategoriesTable.id}) desc`),
    db.select().from(syncStateTable).limit(1),
  ]);

  const total = totalEmails[0]?.count ?? 0;
  const categorized = categorizedEmails[0]?.count ?? 0;

  res.json({
    totalEmails: total,
    categorizedEmails: categorized,
    uncategorizedEmails: total - categorized,
    totalCategories: perCategory.length,
    emailsPerCategory: perCategory.map((r) => ({
      categoryId: r.categoryId,
      name: r.name,
      color: r.color,
      count: r.count,
    })),
    lastSyncAt: syncState[0]?.lastSyncAt ? syncState[0].lastSyncAt.toISOString() : null,
  });
});

export default router;
