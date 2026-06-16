import OpenAI from "openai";
import type { GmailMessage } from "./gmail";
import type { Category } from "@workspace/db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CategorizationResult {
  categoryId: number | null;
  confidence: number;
}

export async function categorizeEmail(
  email: GmailMessage,
  categories: Category[]
): Promise<CategorizationResult> {
  if (categories.length === 0) return { categoryId: null, confidence: 0 };

  const categoryList = categories
    .map((c) => `- ID ${c.id}: "${c.name}" — ${c.description}`)
    .join("\n");

  const emailContent = [
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    `Snippet: ${email.snippet}`,
    email.body ? `Body (first 500 chars): ${email.body.slice(0, 500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are an email categorizer. Given the email below and a list of categories, pick the BEST matching category.

Categories:
${categoryList}

Email:
${emailContent}

Respond with ONLY a JSON object like: {"categoryId": <number or null>, "confidence": <0.0-1.0>}
- Use null if no category is a good fit
- confidence should reflect how certain you are`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { categoryId?: number | null; confidence?: number };
    const categoryId = parsed.categoryId ?? null;
    const confidence = parsed.confidence ?? 0.8;

    if (categoryId !== null && !categories.find((c) => c.id === categoryId)) {
      return { categoryId: null, confidence: 0 };
    }

    return { categoryId, confidence };
  } catch {
    return { categoryId: null, confidence: 0 };
  }
}

export async function categorizeEmailsBatch(
  emails: GmailMessage[],
  categories: Category[]
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();
  const CONCURRENCY = 3;

  for (let i = 0; i < emails.length; i += CONCURRENCY) {
    const batch = emails.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((email) => categorizeEmail(email, categories))
    );
    batch.forEach((email, idx) => {
      results.set(email.id, batchResults[idx]);
    });
  }

  return results;
}
