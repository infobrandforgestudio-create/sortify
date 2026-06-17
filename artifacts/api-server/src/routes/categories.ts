import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, emailCategoriesTable, categoryRulesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  GetCategoryParams,
  UpdateCategoryParams,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { z } from "zod/v4";

const router = Router();

const VALID_FIELD_TYPES = ["sender", "subject", "body"] as const;
const VALID_OPERATORS = ["contains", "equals", "starts_with", "ends_with"] as const;

const CreateRuleBody = z.object({
  fieldType: z.enum(VALID_FIELD_TYPES),
  operator: z.enum(VALID_OPERATORS),
  value: z.string().min(1),
});

function withCounts(id?: number) {
  const emailCountExpr = id
    ? sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${id})::int`
    : sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${categoriesTable.id})::int`;
  const ruleCountExpr = id
    ? sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${id})::int`
    : sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${categoriesTable.id})::int`;
  return { emailCountExpr, ruleCountExpr };
}

router.get("/", async (req, res) => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      emailCount: sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${categoriesTable.id})::int`,
      ruleCount: sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${categoriesTable.id})::int`,
    })
    .from(categoriesTable)
    .orderBy(categoriesTable.createdAt);

  res.json(
    rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { name, description, color } = parsed.data;
  const inserted = await db
    .insert(categoriesTable)
    .values({ name, description: description ?? "", color: color ?? "#6366f1" })
    .returning();
  const cat = inserted[0];
  res.status(201).json({
    ...cat,
    emailCount: 0,
    ruleCount: 0,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  });
});

router.get("/:id/rules", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const cat = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat.length) { res.status(404).json({ error: "Not found" }); return; }

  const rules = await db
    .select()
    .from(categoryRulesTable)
    .where(eq(categoryRulesTable.categoryId, id))
    .orderBy(categoryRulesTable.createdAt);

  res.json(rules.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/:id/rules", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const cat = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat.length) { res.status(404).json({ error: "Not found" }); return; }

  const parsed = CreateRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const [inserted] = await db
    .insert(categoryRulesTable)
    .values({ categoryId: id, ...parsed.data })
    .returning();

  res.status(201).json({ ...inserted, createdAt: inserted.createdAt.toISOString() });
});

router.delete("/:id/rules/:ruleId", async (req, res) => {
  const id = Number(req.params.id);
  const ruleId = Number(req.params.ruleId);
  if (isNaN(id) || isNaN(ruleId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .delete(categoryRulesTable)
    .where(and(eq(categoryRulesTable.id, ruleId), eq(categoryRulesTable.categoryId, id)));

  res.status(204).send();
});

router.get("/:id", async (req, res) => {
  const parsed = GetCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      emailCount: sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${categoriesTable.id})::int`,
      ruleCount: sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${categoriesTable.id})::int`,
    })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, parsed.data.id));

  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  const cat = rows[0];
  res.json({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  });
});

router.put("/:id", async (req, res) => {
  const paramsParsed = UpdateCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const bodyParsed = UpdateCategoryBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.id, paramsParsed.data.id));
  if (existing.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  const { name, description, color } = bodyParsed.data;
  const updates: Partial<typeof existing[0]> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (color !== undefined) updates.color = color;

  await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, paramsParsed.data.id));

  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      emailCount: sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${categoriesTable.id})::int`,
      ruleCount: sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${categoriesTable.id})::int`,
    })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, paramsParsed.data.id));

  const cat = rows[0];
  res.json({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
