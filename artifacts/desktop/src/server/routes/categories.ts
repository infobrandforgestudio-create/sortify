import { Router } from "express";
import { db } from "../db";
import { categoriesTable, emailCategoriesTable, categoryRulesTable } from "../schema";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const CreateCategoryBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

const CreateRuleBody = z.object({
  fieldType: z.enum(["sender", "subject", "body"]),
  operator: z.enum(["contains", "equals", "starts_with", "ends_with"]),
  value: z.string().min(1),
});

router.get("/", (_req, res) => {
  const rows = db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      emailCount: sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${categoriesTable.id})`,
      ruleCount: sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${categoriesTable.id})`,
    })
    .from(categoriesTable)
    .orderBy(categoriesTable.createdAt)
    .all();

  res.json(
    rows.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt as number).toISOString(),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : new Date(r.updatedAt as number).toISOString(),
    }))
  );
});

router.post("/", (req, res) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { name, description, color } = parsed.data;
  const inserted = db
    .insert(categoriesTable)
    .values({ name, description: description ?? "", color: color ?? "#6366f1" })
    .returning()
    .get();

  res.status(201).json({
    ...inserted,
    emailCount: 0,
    ruleCount: 0,
    createdAt: (inserted.createdAt instanceof Date ? inserted.createdAt : new Date(inserted.createdAt as number)).toISOString(),
    updatedAt: (inserted.updatedAt instanceof Date ? inserted.updatedAt : new Date(inserted.updatedAt as number)).toISOString(),
  });
});

router.get("/:id/rules", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const cat = db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, id)).all();
  if (!cat.length) { res.status(404).json({ error: "Not found" }); return; }

  const rules = db
    .select()
    .from(categoryRulesTable)
    .where(eq(categoryRulesTable.categoryId, id))
    .orderBy(categoryRulesTable.createdAt)
    .all();

  res.json(rules.map((r) => ({
    ...r,
    createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as number)).toISOString(),
  })));
});

router.post("/:id/rules", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const cat = db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, id)).all();
  if (!cat.length) { res.status(404).json({ error: "Not found" }); return; }

  const parsed = CreateRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const inserted = db
    .insert(categoryRulesTable)
    .values({ categoryId: id, ...parsed.data })
    .returning()
    .get();

  res.status(201).json({
    ...inserted,
    createdAt: (inserted.createdAt instanceof Date ? inserted.createdAt : new Date(inserted.createdAt as number)).toISOString(),
  });
});

router.delete("/:id/rules/:ruleId", (req, res) => {
  const id = Number(req.params.id);
  const ruleId = Number(req.params.ruleId);
  if (isNaN(id) || isNaN(ruleId)) { res.status(400).json({ error: "Invalid id" }); return; }

  db.delete(categoryRulesTable)
    .where(and(eq(categoryRulesTable.id, ruleId), eq(categoryRulesTable.categoryId, id)))
    .run();

  res.status(204).send();
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      emailCount: sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${categoriesTable.id})`,
      ruleCount: sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${categoriesTable.id})`,
    })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .all();

  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  const cat = rows[0];
  res.json({
    ...cat,
    createdAt: (cat.createdAt instanceof Date ? cat.createdAt : new Date(cat.createdAt as number)).toISOString(),
    updatedAt: (cat.updatedAt instanceof Date ? cat.updatedAt : new Date(cat.updatedAt as number)).toISOString(),
  });
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const bodyParsed = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    color: z.string().optional(),
  }).safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const existing = db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).all();
  if (existing.length === 0) { res.status(404).json({ error: "Not found" }); return; }

  const { name, description, color } = bodyParsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (color !== undefined) updates.color = color;

  db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).run();

  const rows = db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      emailCount: sql<number>`(SELECT count(*) FROM email_categories WHERE category_id = ${categoriesTable.id})`,
      ruleCount: sql<number>`(SELECT count(*) FROM category_rules WHERE category_id = ${categoriesTable.id})`,
    })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .all();

  const cat = rows[0];
  res.json({
    ...cat,
    createdAt: (cat.createdAt instanceof Date ? cat.createdAt : new Date(cat.createdAt as number)).toISOString(),
    updatedAt: (cat.updatedAt instanceof Date ? cat.updatedAt : new Date(cat.updatedAt as number)).toISOString(),
  });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  db.delete(categoriesTable).where(eq(categoriesTable.id, id)).run();
  res.status(204).send();
});

export default router;
