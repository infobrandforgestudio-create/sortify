import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "../db";
import { imapConfigTable, syncStateTable } from "../schema";
import { eq } from "drizzle-orm";

export interface AttachmentData {
  filename: string;
  contentType: string;
  size: number;
  data: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  body: string;
  htmlBody: string;
  attachments: AttachmentData[];
  receivedAt: Date;
  isRead: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  message: string | null;
  email?: string;
}

function getConfig() {
  const rows = db.select().from(imapConfigTable).where(eq(imapConfigTable.isActive, true)).limit(1).all();
  return rows[0] ?? null;
}

export function getOrCreateSyncState() {
  const rows = db.select().from(syncStateTable).limit(1).all();
  if (rows.length > 0) return Promise.resolve(rows[0]);

  const inserted = db.insert(syncStateTable).values({}).returning().get();
  return Promise.resolve(inserted);
}

export async function checkConnection(): Promise<ConnectionStatus> {
  const config = getConfig();
  if (!config) return { connected: false, message: "No email account connected. Go to Settings to add your email." };
  return { connected: true, message: null, email: config.email };
}

export async function testImapConnection(opts: {
  email: string; imapHost: string; imapPort: number; username: string; password: string; useSsl: boolean;
}): Promise<{ success: boolean; message: string }> {
  const client = new ImapFlow({
    host: opts.imapHost, port: opts.imapPort, secure: opts.useSsl,
    auth: { user: opts.username, pass: opts.password },
    logger: false, tls: { rejectUnauthorized: false },
  });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Connection timed out after 15 seconds.")), 15000)
  );

  try {
    await Promise.race([client.connect(), timeout]);
    await client.logout();
    return { success: true, message: `Connected successfully to ${opts.imapHost}` };
  } catch (err: unknown) {
    client.close();
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      if (e["authenticationFailed"]) {
        const detail = typeof e["responseText"] === "string" ? e["responseText"] : "";
        if (opts.imapHost.includes("gmail")) {
          return { success: false, message: `Authentication failed. For Gmail: (1) enable 2-Step Verification, (2) create an App Password at myaccount.google.com/apppasswords, (3) enable IMAP in Gmail settings.${detail ? ` Server: ${detail}` : ""}` };
        }
        return { success: false, message: `Authentication failed — wrong email or app password.${detail ? ` Server: ${detail}` : ""}` };
      }
      if (typeof e["responseText"] === "string" && e["responseText"]) return { success: false, message: `Connection failed: ${e["responseText"]}` };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Connection failed: ${msg}` };
  }
}

export async function fetchRecentEmails(maxResults = 100): Promise<EmailMessage[]> {
  const config = getConfig();
  if (!config) return [];

  const client = new ImapFlow({
    host: config.imapHost, port: config.imapPort, secure: config.useSsl,
    auth: { user: config.username, pass: config.password },
    logger: false, tls: { rejectUnauthorized: false },
  });

  const messages: EmailMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages ?? 0;
      if (total === 0) return [];

      const start = Math.max(1, total - maxResults + 1);
      const range = `${start}:${total}`;

      for await (const msg of client.fetch(range, { envelope: true, flags: true, internalDate: true, source: true })) {
        try {
          const env = msg.envelope;
          const subject = env?.subject ?? "(no subject)";
          const fromAddr = env?.from?.[0];
          const from = fromAddr ? (fromAddr.name ? `${fromAddr.name} <${fromAddr.address}>` : (fromAddr.address ?? "")) : "";
          const isRead = msg.flags?.has("\\Seen") ?? false;
          const receivedAt = msg.internalDate instanceof Date ? msg.internalDate : new Date(msg.internalDate ?? Date.now());
          const uid = msg.uid?.toString() ?? `imap-${Date.now()}-${Math.random()}`;

          let htmlBody = "";
          let textBody = "";
          const attachments: AttachmentData[] = [];

          if (msg.source) {
            try {
              const parsed = await simpleParser(msg.source);
              htmlBody = parsed.html || "";
              textBody = parsed.text || "";
              for (const att of parsed.attachments ?? []) {
                if (att.content && att.content.length > 0) {
                  attachments.push({ filename: att.filename || "attachment", contentType: att.contentType || "application/octet-stream", size: att.size ?? att.content.length, data: att.content.toString("base64") });
                }
              }
            } catch {
              const raw = msg.source.toString();
              const bodyStart = raw.indexOf("\r\n\r\n");
              if (bodyStart !== -1) textBody = raw.slice(bodyStart + 4).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            }
          }

          const body = textBody || htmlBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          messages.push({ id: `imap-${config.email}-${uid}`, subject, from, snippet: body.slice(0, 200), body: body.slice(0, 5000), htmlBody: htmlBody.slice(0, 500000), attachments, receivedAt, isRead });
        } catch { /* skip malformed */ }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    await client.close();
    throw err;
  }

  return messages.reverse();
}

export async function getSyncState() {
  return getOrCreateSyncState();
}

export async function markSyncStarted() {
  const state = await getOrCreateSyncState();
  db.update(syncStateTable).set({ isSyncing: true, updatedAt: new Date() }).where(eq(syncStateTable.id, state.id)).run();
}

export async function markSyncFinished(totalSynced: number) {
  const state = await getOrCreateSyncState();
  db.update(syncStateTable).set({ isSyncing: false, lastSyncAt: new Date(), totalEmailsSynced: totalSynced, updatedAt: new Date() }).where(eq(syncStateTable.id, state.id)).run();
}
