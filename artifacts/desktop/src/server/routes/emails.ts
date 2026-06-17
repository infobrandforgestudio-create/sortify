import { Router } from "express";
import { db } from "../db";
import { emailsTable, emailAttachmentsTable, categoriesTable, emailCategoriesTable, categoryRulesTable } from "../schema";
import { eq, desc, like, or, isNull, and, sql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";
import { categorizeEmailsBatch } from "../lib/categorizer";

const router = Router();

function toIso(d: Date | number | null): string | null {
  if (d === null || d === undefined) return null;
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

router.post("/", async (req, res) => {
  const parsed = z.object({
    subject: z.string().min(1),
    fromAddress: z.string().min(1),
    body: z.string(),
    receivedAt: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { subject, fromAddress, body, receivedAt } = parsed.data;
  const snippet = body.slice(0, 200);
  const gmailId = `manual-${randomUUID()}`;

  const inserted = db
    .insert(emailsTable)
    .values({ gmailId, subject, fromAddress, snippet, body, htmlBody: "", receivedAt: receivedAt ? new Date(receivedAt) : new Date(), isRead: false })
    .returning()
    .get();

  const categories = db.select().from(categoriesTable).all();
  const rules = db.select().from(categoryRulesTable).all();

  if (categories.length > 0) {
    const receivedAtDate = receivedAt ? new Date(receivedAt) : new Date();
    const resultsMap = await categorizeEmailsBatch(
      [{ id: gmailId, subject, from: fromAddress, snippet, body, htmlBody: "", attachments: [], receivedAt: receivedAtDate, isRead: false }],
      categories, rules
    ).catch(() => new Map());
    const match = resultsMap.get(gmailId);
    if (match?.categoryId) {
      db.insert(emailCategoriesTable).values({ emailId: inserted.id, categoryId: match.categoryId, confidence: match.confidence, assignedBy: match.assignedBy }).run();
    }
  }

  const rows = db
    .select({
      id: emailsTable.id, gmailId: emailsTable.gmailId, subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress, snippet: emailsTable.snippet, body: emailsTable.body,
      htmlBody: emailsTable.htmlBody, receivedAt: emailsTable.receivedAt, isRead: emailsTable.isRead,
      categoryId: emailCategoriesTable.categoryId, categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color, assignedBy: emailCategoriesTable.assignedBy,
    })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .leftJoin(categoriesTable, eq(emailCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(emailsTable.id, inserted.id))
    .all();

  const r = rows[0];
  res.status(201).json({ ...r, receivedAt: toIso(r.receivedAt), categoryId: r.categoryId ?? null, categoryName: r.categoryName ?? null, categoryColor: r.categoryColor ?? null, assignedBy: r.assignedBy ?? null, attachments: [] });
});

router.get("/", (req, res) => {
  const parsed = z.object({
    categoryId: z.coerce.number().optional(),
    uncategorized: z.enum(["true", "false"]).transform(v => v === "true").optional(),
    search: z.string().optional(),
    limit: z.coerce.number().optional(),
    offset: z.coerce.number().optional(),
  }).safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

  const { categoryId, uncategorized, search, limit = 50, offset = 0 } = parsed.data;
  const lim = Math.min(limit ?? 50, 200);
  const off = offset ?? 0;

  let query = db
    .select({
      id: emailsTable.id, gmailId: emailsTable.gmailId, subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress, snippet: emailsTable.snippet,
      receivedAt: emailsTable.receivedAt, isRead: emailsTable.isRead,
      categoryId: emailCategoriesTable.categoryId, categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color, assignedBy: emailCategoriesTable.assignedBy,
    })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .leftJoin(categoriesTable, eq(emailCategoriesTable.categoryId, categoriesTable.id))
    .$dynamic();

  const conditions = [];
  if (categoryId != null) conditions.push(eq(emailCategoriesTable.categoryId, categoryId));
  if (uncategorized) conditions.push(isNull(emailCategoriesTable.id));
  if (search) {
    const pat = `%${search}%`;
    conditions.push(or(like(emailsTable.subject, pat), like(emailsTable.fromAddress, pat), like(emailsTable.snippet, pat)));
  }

  if (conditions.length > 0) query = query.where(and(...conditions));

  const rows = query.orderBy(desc(emailsTable.receivedAt)).limit(lim).offset(off).all();

  const countResult = db
    .select({ count: sql<number>`count(*)` })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
    .get();

  res.json({
    emails: rows.map((r) => ({ ...r, receivedAt: toIso(r.receivedAt), categoryId: r.categoryId ?? null, categoryName: r.categoryName ?? null, categoryColor: r.categoryColor ?? null, assignedBy: r.assignedBy ?? null })),
    total: countResult?.count ?? 0,
    offset: off,
    limit: lim,
  });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = db
    .select({
      id: emailsTable.id, gmailId: emailsTable.gmailId, subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress, snippet: emailsTable.snippet,
      body: emailsTable.body, htmlBody: emailsTable.htmlBody,
      receivedAt: emailsTable.receivedAt, isRead: emailsTable.isRead,
      categoryId: emailCategoriesTable.categoryId, categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color, assignedBy: emailCategoriesTable.assignedBy,
    })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .leftJoin(categoriesTable, eq(emailCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(emailsTable.id, id))
    .all();

  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  const attachments = db
    .select({ id: emailAttachmentsTable.id, emailId: emailAttachmentsTable.emailId, filename: emailAttachmentsTable.filename, contentType: emailAttachmentsTable.contentType, size: emailAttachmentsTable.size })
    .from(emailAttachmentsTable)
    .where(eq(emailAttachmentsTable.emailId, id))
    .all();

  const r = rows[0];
  res.json({ ...r, receivedAt: toIso(r.receivedAt), categoryId: r.categoryId ?? null, categoryName: r.categoryName ?? null, categoryColor: r.categoryColor ?? null, assignedBy: r.assignedBy ?? null, attachments });
});

router.get("/:id/attachments/:attId", (req, res) => {
  const emailId = Number(req.params.id);
  const attId = Number(req.params.attId);
  if (isNaN(emailId) || isNaN(attId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = db.select().from(emailAttachmentsTable).where(and(eq(emailAttachmentsTable.id, attId), eq(emailAttachmentsTable.emailId, emailId))).limit(1).all();
  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  const att = rows[0];
  const buffer = Buffer.from(att.data, "base64");
  res.setHeader("Content-Type", att.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(att.filename)}"`);
  res.setHeader("Content-Length", String(buffer.length));
  res.send(buffer);
});

router.post("/:id/assign", async (req, res) => {
  const emailId = Number(req.params.id);
  if (isNaN(emailId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const bodyParsed = z.object({ categoryId: z.number().nullable() }).safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const email = db.select().from(emailsTable).where(eq(emailsTable.id, emailId)).all();
  if (email.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  db.delete(emailCategoriesTable).where(eq(emailCategoriesTable.emailId, emailId)).run();

  const { categoryId } = bodyParsed.data;
  if (categoryId !== null) {
    db.insert(emailCategoriesTable).values({ emailId, categoryId, confidence: 1.0, assignedBy: "manual" }).run();
  }

  const rows = db
    .select({
      id: emailsTable.id, gmailId: emailsTable.gmailId, subject: emailsTable.subject,
      fromAddress: emailsTable.fromAddress, snippet: emailsTable.snippet,
      body: emailsTable.body, htmlBody: emailsTable.htmlBody,
      receivedAt: emailsTable.receivedAt, isRead: emailsTable.isRead,
      categoryId: emailCategoriesTable.categoryId, categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color, assignedBy: emailCategoriesTable.assignedBy,
    })
    .from(emailsTable)
    .leftJoin(emailCategoriesTable, eq(emailsTable.id, emailCategoriesTable.emailId))
    .leftJoin(categoriesTable, eq(emailCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(emailsTable.id, emailId))
    .all();

  const attachments = db
    .select({ id: emailAttachmentsTable.id, emailId: emailAttachmentsTable.emailId, filename: emailAttachmentsTable.filename, contentType: emailAttachmentsTable.contentType, size: emailAttachmentsTable.size })
    .from(emailAttachmentsTable)
    .where(eq(emailAttachmentsTable.emailId, emailId))
    .all();

  const r = rows[0];
  res.json({ ...r, receivedAt: toIso(r.receivedAt), categoryId: r.categoryId ?? null, categoryName: r.categoryName ?? null, categoryColor: r.categoryColor ?? null, assignedBy: r.assignedBy ?? null, attachments });
});

export default router;
