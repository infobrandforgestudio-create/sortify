import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable, emailAttachmentsTable, categoriesTable, emailCategoriesTable, categoryRulesTable } from "@workspace/db";
import { eq, desc, ilike, or, isNull, and, sql } from "drizzle-orm";
import {
  ListEmailsQueryParams,
  GetEmailParams,
  AssignEmailCategoryParams,
  AssignEmailCategoryBody,
  CreateEmailBody,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { categorizeEmailsBatch } from "../lib/categorizer";

const router = Router();

router.post("/", async (req, res) => {
  const parsed = CreateEmailBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const { subject, fromAddress, body, receivedAt } = parsed.data;
  const snippet = body.slice(0, 200);
  const gmailId = `manual-${randomUUID()}`;

  const [inserted] = await db
    .insert(emailsTable)
    .values({
      gmailId,
      subject,
      fromAddress,
      snippet,
      body,
      htmlBody: "",
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      isRead: false,
    })
    .returning();

  const [categories, rules] = await Promise.all([
    db.select().from(categoriesTable),
    db.select().from(categoryRulesTable),
  ]);
  if (categories.length > 0) {
    const receivedAtDate = receivedAt ? new Date(receivedAt) : new Date();
    const resultsMap = await categorizeEmailsBatch(
      [{ id: gmailId, subject, from: fromAddress, snippet, body, htmlBody: "", attachments: [], receivedAt: receivedAtDate, isRead: false }],
      categories,
      rules
    ).catch(() => new Map());
    const match = resultsMap.get(gmailId);
    if (match?.categoryId) {
      await db.insert(emailCategoriesTable).values({
        emailId: inserted.id,
        categoryId: match.categoryId,
        confidence: match.confidence,
        assignedBy: match.assignedBy,
      });
    }
  }

  const rows = await db
    .select({
      id: emailsTable.id,
      gmailId: emailsTable.gmailId,
      subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress,
      snippet: emailsTable.snippet,
      body: emailsTable.body,
      htmlBody: emailsTable.htmlBody,
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
    .where(eq(emailsTable.id, inserted.id));

  const r = rows[0];
  res.status(201).json({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    assignedBy: r.assignedBy ?? null,
    attachments: [],
  });
});

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
      htmlBody: emailsTable.htmlBody,
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

  const attachments = await db
    .select({
      id: emailAttachmentsTable.id,
      emailId: emailAttachmentsTable.emailId,
      filename: emailAttachmentsTable.filename,
      contentType: emailAttachmentsTable.contentType,
      size: emailAttachmentsTable.size,
    })
    .from(emailAttachmentsTable)
    .where(eq(emailAttachmentsTable.emailId, parsed.data.id));

  const r = rows[0];
  res.json({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    assignedBy: r.assignedBy ?? null,
    attachments,
  });
});

router.get("/:id/attachments/:attId", async (req, res) => {
  const emailId = Number(req.params.id);
  const attId = Number(req.params.attId);

  if (isNaN(emailId) || isNaN(attId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(emailAttachmentsTable)
    .where(and(eq(emailAttachmentsTable.id, attId), eq(emailAttachmentsTable.emailId, emailId)))
    .limit(1);

  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  const att = rows[0];
  const buffer = Buffer.from(att.data, "base64");

  res.setHeader("Content-Type", att.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(att.filename)}"`);
  res.setHeader("Content-Length", String(buffer.length));
  res.send(buffer);
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
      htmlBody: emailsTable.htmlBody,
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

  const attachments = await db
    .select({
      id: emailAttachmentsTable.id,
      emailId: emailAttachmentsTable.emailId,
      filename: emailAttachmentsTable.filename,
      contentType: emailAttachmentsTable.contentType,
      size: emailAttachmentsTable.size,
    })
    .from(emailAttachmentsTable)
    .where(eq(emailAttachmentsTable.emailId, emailId));

  const r = rows[0];
  res.json({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
    categoryId: r.categoryId ?? null,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    assignedBy: r.assignedBy ?? null,
    attachments,
  });
});

export default router;
