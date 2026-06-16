import { Router } from "express";
import { db } from "@workspace/db";
import { imapConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { testImapConnection } from "../lib/imap";
import { z } from "zod";

const router = Router();

const ImapConfigInputSchema = z.object({
  email: z.string().min(1),
  imapHost: z.string().min(1),
  imapPort: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().min(1),
  useSsl: z.boolean().default(true),
});

router.get("/config", async (_req, res) => {
  const rows = await db.select().from(imapConfigTable).where(eq(imapConfigTable.isActive, true)).limit(1);
  const config = rows[0] ?? null;

  if (!config) {
    res.json({ configured: false, email: null, imapHost: null, imapPort: null, username: null, useSsl: null });
    return;
  }

  res.json({
    configured: true,
    email: config.email,
    imapHost: config.imapHost,
    imapPort: config.imapPort,
    username: config.username,
    useSsl: config.useSsl,
  });
});

router.post("/config", async (req, res) => {
  const parsed = ImapConfigInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { email, imapHost, imapPort, username, password, useSsl } = parsed.data;

  await db.delete(imapConfigTable);

  await db.insert(imapConfigTable).values({
    email,
    imapHost,
    imapPort,
    username,
    password,
    useSsl,
    isActive: true,
  });

  res.json({
    configured: true,
    email,
    imapHost,
    imapPort,
    username,
    useSsl,
  });
});

router.post("/test", async (req, res) => {
  const parsed = ImapConfigInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const result = await testImapConnection(parsed.data);
  res.json(result);
});

export default router;
