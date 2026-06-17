import { Router } from "express";
import { db } from "../db";
import { appSettingsTable } from "../schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", (_req, res) => {
  const row = db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "openai_api_key")).get();
  const key = row?.value ?? "";
  res.json({
    openaiApiKey: key ? `sk-...${key.slice(-4)}` : "",
    hasKey: key.length > 0,
  });
});

router.put("/", (req, res) => {
  const body = req.body as Record<string, unknown>;
  const rawKey = typeof body.openaiApiKey === "string" ? body.openaiApiKey.trim() : "";

  if (rawKey && !rawKey.startsWith("sk-")) {
    res.status(400).json({ error: "Invalid API key — must start with sk-" });
    return;
  }

  db.insert(appSettingsTable)
    .values({ key: "openai_api_key", value: rawKey, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: rawKey, updatedAt: new Date() } })
    .run();

  res.json({ success: true, hasKey: rawKey.length > 0 });
});

export default router;
