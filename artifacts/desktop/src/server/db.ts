import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import os from "os";
import * as schema from "./schema";

function getDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  const dir = path.join(os.homedir(), ".sortify");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, "sortify.db");
}

function initDb() {
  const dbPath = getDbPath();
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gmail_id TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL DEFAULT '(no subject)',
      from_address TEXT NOT NULL DEFAULT '',
      snippet TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      html_body TEXT NOT NULL DEFAULT '',
      received_at INTEGER NOT NULL DEFAULT 0,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS email_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      filename TEXT NOT NULL DEFAULT 'attachment',
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS email_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      confidence REAL NOT NULL DEFAULT 1.0,
      assigned_by TEXT NOT NULL DEFAULT 'ai',
      assigned_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      field_type TEXT NOT NULL,
      operator TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS imap_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      imap_host TEXT NOT NULL,
      imap_port INTEGER NOT NULL DEFAULT 993,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      use_ssl INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_sync_at INTEGER,
      is_syncing INTEGER NOT NULL DEFAULT 0,
      total_emails_synced INTEGER NOT NULL DEFAULT 0,
      last_page_token TEXT,
      updated_at INTEGER NOT NULL DEFAULT 0
    );
  `);

  return drizzle(sqlite, { schema });
}

export const db = initDb();
