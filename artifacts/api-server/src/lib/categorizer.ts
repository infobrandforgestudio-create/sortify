import OpenAI from "openai";
import type { EmailMessage } from "./imap";
import type { Category, CategoryRule } from "@workspace/db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CategorizationResult {
  categoryId: number | null;
  confidence: number;
  assignedBy: "ai" | "rule";
}

function matchesRule(email: EmailMessage, rule: CategoryRule): boolean {
  const fields: Record<string, string> = {
    sender: email.from.toLowerCase(),
    subject: email.subject.toLowerCase(),
    body: (email.body ?? "").toLowerCase(),
  };
  const field = fields[rule.fieldType] ?? "";
  const val = rule.value.toLowerCase();

  switch (rule.operator) {
    case "contains":
      return field.includes(val);
    case "equals":
      return field === val;
    case "starts_with":
      return field.startsWith(val);
    case "ends_with":
      return field.endsWith(val);
    default:
      return false;
  }
}

export async function categorizeEmail(
  email: EmailMessage,
  categories: Category[]
): Promise<CategorizationResult> {
  if (categories.length === 0) return { categoryId: null, confidence: 0, assignedBy: "ai" };

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
      return { categoryId: null, confidence: 0, assignedBy: "ai" };
    }

    return { categoryId, confidence, assignedBy: "ai" };
  } catch {
    return { categoryId: null, confidence: 0, assignedBy: "ai" };
  }
}

export async function categorizeEmailsBatch(
  emails: EmailMessage[],
  categories: Category[],
  rules: CategoryRule[] = []
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();
  const needsAI: EmailMessage[] = [];

  for (const email of emails) {
    let matched = false;
    for (const rule of rules) {
      if (matchesRule(email, rule)) {
        results.set(email.id, {
          categoryId: rule.categoryId,
          confidence: 1.0,
          assignedBy: "rule",
        });
        matched = true;
        break;
      }
    }
    if (!matched) needsAI.push(email);
  }

  const CONCURRENCY = 3;
  for (let i = 0; i < needsAI.length; i += CONCURRENCY) {
    const batch = needsAI.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((email) => categorizeEmail(email, categories))
    );
    batch.forEach((email, idx) => {
      results.set(email.id, batchResults[idx]);
    });
  }

  return results;
}
