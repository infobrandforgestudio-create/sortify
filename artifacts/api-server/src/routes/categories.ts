import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, emailCategoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  GetCategoryParams,
  UpdateCategoryParams,
  DeleteCategoryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      emailCount: sql<number>`count(${emailCategoriesTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(emailCategoriesTable, eq(categoriesTable.id, emailCategoriesTable.categoryId))
    .groupBy(categoriesTable.id)
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
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  });
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
      emailCount: sql<number>`count(${emailCategoriesTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(emailCategoriesTable, eq(categoriesTable.id, emailCategoriesTable.categoryId))
    .where(eq(categoriesTable.id, parsed.data.id))
    .groupBy(categoriesTable.id);

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
      emailCount: sql<number>`count(${emailCategoriesTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(emailCategoriesTable, eq(categoriesTable.id, emailCategoriesTable.categoryId))
    .where(eq(categoriesTable.id, paramsParsed.data.id))
    .groupBy(categoriesTable.id);

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
