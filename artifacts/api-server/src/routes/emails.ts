import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable, categoriesTable, emailCategoriesTable } from "@workspace/db";
import { eq, desc, ilike, or, isNull, and, sql } from "drizzle-orm";
import {
  ListEmailsQueryParams,
  GetEmailParams,
  AssignEmailCategoryParams,
  AssignEmailCategoryBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = ListEmailsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

  const { categoryId, uncategorized, search, limit = 50, offset = 0 } = parsed.data;
  const lim = Math.min(limit ?? 50, 200);
  const off = offset ?? 0;

  const baseQuery = db
    .select({
      id: emailsTable.id,
      gmailId: emailsTable.gmailId,
      subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress,
      snippet: emailsTable.snippet,
      receivedAt: emailsTable.receivedAt,
      isRead: emailsTable.isRead,
      categoryId: emailCategoriesTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      assignedBy: emailCategoriesTable.assignedBy,
    })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .leftJoin(categoriesTable, eq(emailCategoriesTable.categoryId, categoriesTable.id));

  const conditions = [];

  if (categoryId != null) {
    conditions.push(eq(emailCategoriesTable.categoryId, categoryId));
  }
  if (uncategorized) {
    conditions.push(isNull(emailCategoriesTable.id));
  }
  if (search) {
    conditions.push(
      or(
        ilike(emailsTable.subject, `%${search}%`),
        ilike(emailsTable.fromAddress, `%${search}%`),
        ilike(emailsTable.snippet, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    whereClause
      ? baseQuery.where(whereClause).orderBy(desc(emailsTable.receivedAt)).limit(lim).offset(off)
      : baseQuery.orderBy(desc(emailsTable.receivedAt)).limit(lim).offset(off),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailsTable)
      .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
      .where(whereClause ?? sql`1=1`),
  ]);

  res.json({
    emails: rows.map((r) => ({
      ...r,
      receivedAt: r.receivedAt.toISOString(),
      categoryId: r.categoryId ?? null,
      categoryName: r.categoryName ?? null,
      categoryColor: r.categoryColor ?? null,
      assignedBy: r.assignedBy ?? null,
    })),
    total: countRows[0]?.count ?? 0,
    offset: off,
    limit: lim,
  });
});

router.get("/:id", async (req, res) => {
  const parsed = GetEmailParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select({
      id: emailsTable.id,
      gmailId: emailsTable.gmailId,
      subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress,
      snippet: emailsTable.snippet,
      body: emailsTable.body,
      receivedAt: emailsTable.receivedAt,
      isRead: emailsTable.isRead,
      categoryId: emailCategoriesTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      assignedBy: emailCategoriesTable.assignedBy,
    })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .leftJoin(categoriesTable, eq(emailCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(emailsTable.id, parsed.data.id));

  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  const r = rows[0];
  res.json({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    assignedBy: r.assignedBy ?? null,
  });
});

router.post("/:id/assign", async (req, res) => {
  const paramsParsed = AssignEmailCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const bodyParsed = AssignEmailCategoryBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const emailId = paramsParsed.data.id;
  const { categoryId } = bodyParsed.data;

  const email = await db.select().from(emailsTable).where(eq(emailsTable.id, emailId));
  if (email.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(emailCategoriesTable).where(eq(emailCategoriesTable.emailId, emailId));

  if (categoryId !== null) {
    await db.insert(emailCategoriesTable).values({
      emailId,
      categoryId,
      confidence: 1.0,
      assignedBy: "manual",
    });
  }

  const rows = await db
    .select({
      id: emailsTable.id,
      gmailId: emailsTable.gmailId,
      subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress,
      snippet: emailsTable.snippet,
      body: emailsTable.body,
      receivedAt: emailsTable.receivedAt,
      isRead: emailsTable.isRead,
      categoryId: emailCategoriesTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      assignedBy: emailCategoriesTable.assignedBy,
    })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .leftJoin(categoriesTable, eq(emailCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(emailsTable.id, emailId));

  const r = rows[0];
  res.json({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    assignedBy: r.assignedBy ?? null,
  });
});

export default router;
