import { db } from "@workspace/db";
import { syncStateTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  body: string;
  receivedAt: Date;
  isRead: boolean;
}

export interface GmailConnectionStatus {
  connected: boolean;
  message: string | null;
}

async function getOrCreateSyncState() {
  const rows = await db.select().from(syncStateTable).limit(1);
  if (rows.length > 0) return rows[0];
  const inserted = await db.insert(syncStateTable).values({}).returning();
  return inserted[0];
}

export async function checkGmailConnection(): Promise<GmailConnectionStatus> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const identity = process.env.REPL_IDENTITY;

  if (!hostname || !identity) {
    return { connected: false, message: "Gmail not connected. Connect Gmail in the app settings to enable automatic email syncing." };
  }

  try {
    const resp = await fetch(
      `https://${hostname}/api/v2/connection/ccfg_google-mail_B959E7249792448ABBA58D46AF/credentials`,
      {
        headers: {
          "X-Replit-Identity": identity,
          ...(process.env.WEB_REPL_RENEWAL
            ? { "X-Replit-Renewal": process.env.WEB_REPL_RENEWAL }
            : {}),
        },
      }
    );
    if (!resp.ok) return { connected: false, message: "Gmail not connected yet." };
    const data = (await resp.json()) as { access_token?: string };
    if (!data.access_token) return { connected: false, message: "Gmail not connected yet." };
    return { connected: true, message: null };
  } catch {
    return { connected: false, message: "Could not reach Gmail connector." };
  }
}

async function getAccessToken(): Promise<string | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const identity = process.env.REPL_IDENTITY;
  if (!hostname || !identity) return null;
  try {
    const resp = await fetch(
      `https://${hostname}/api/v2/connection/ccfg_google-mail_B959E7249792448ABBA58D46AF/credentials`,
      {
        headers: {
          "X-Replit-Identity": identity,
          ...(process.env.WEB_REPL_RENEWAL
            ? { "X-Replit-Renewal": process.env.WEB_REPL_RENEWAL }
            : {}),
        },
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getSyncState() {
  return getOrCreateSyncState();
}

export async function markSyncStarted() {
  const state = await getOrCreateSyncState();
  await db
    .update(syncStateTable)
    .set({ isSyncing: true, updatedAt: new Date() })
    .where(eq(syncStateTable.id, state.id));
}

export async function markSyncFinished(totalSynced: number, pageToken?: string) {
  const state = await getOrCreateSyncState();
  await db
    .update(syncStateTable)
    .set({
      isSyncing: false,
      lastSyncAt: new Date(),
      totalEmailsSynced: totalSynced,
      lastPageToken: pageToken ?? null,
      updatedAt: new Date(),
    })
    .where(eq(syncStateTable.id, state.id));
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

interface GmailMessageResponse {
  id: string;
  snippet: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: Array<{ mimeType: string; body?: { data?: string } }>;
    }>;
  };
}

function decodeBase64(encoded: string): string {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractBody(payload: GmailMessageResponse["payload"]): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64(part.body.data);
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      return decodeBase64(part.body.data).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
    for (const subpart of part.parts ?? []) {
      if (subpart.mimeType === "text/plain" && subpart.body?.data) {
        return decodeBase64(subpart.body.data);
      }
    }
  }
  return "";
}

export async function fetchRecentEmails(maxResults = 50): Promise<GmailMessage[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`;
  const listResp = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listResp.ok) return [];

  const listData = (await listResp.json()) as GmailListResponse;
  const messageIds = (listData.messages ?? []).map((m) => m.id);

  const messages: GmailMessage[] = [];
  for (const id of messageIds) {
    try {
      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!msgResp.ok) continue;
      const msg = (await msgResp.json()) as GmailMessageResponse;
      const headers = msg.payload?.headers ?? [];
      const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "(no subject)";
      const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
      const body = extractBody(msg.payload);
      const isRead = !(msg.labelIds ?? []).includes("UNREAD");
      const receivedAt = msg.internalDate
        ? new Date(parseInt(msg.internalDate, 10))
        : new Date();

      messages.push({
        id,
        subject,
        from,
        snippet: msg.snippet ?? "",
        body,
        receivedAt,
        isRead,
      });
    } catch {
      // skip individual failures
    }
  }
  return messages;
}
