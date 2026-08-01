// Dependencies.
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';

// Constants.
const HISTORY_WINDOW_MS = 1000 * 60 * 60 * 24; // Summaries only consider messages from the last 24 hours.

// The handle for the SQLite database, opened on first use.
let db: DatabaseSync | null = null;

/**
 * Get the SQLite database, opening the file on first use.
 *
 * @returns the database handle.
 */
function getDb(): DatabaseSync {
  if (db) return db;

  const dbPath = process.env.SQLITE_PATH || 'summarygram.sqlite';
  // Ensure the parent directory exists (e.g. a mounted volume path).
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      chat_id        TEXT    NOT NULL,
      user_id        TEXT    NOT NULL,
      username       TEXT,
      user_firstname TEXT,
      user_lastname  TEXT,
      message        TEXT    NOT NULL,
      created_at     INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages (chat_id, created_at);
  `);
  // Refresh planner statistics: with them, the active-chats query skip-scans the index
  // instead of scanning all retained history. analysis_limit bounds the sampling so
  // startup cost stays constant no matter how much history is retained.
  db.exec('PRAGMA analysis_limit=1000; ANALYZE;');

  return db;
}

/**
 * Close the SQLite database. It will be reopened on next use.
 */
export function close() {
  db?.close();
  db = null;
}

/**
 * Update history in the storage.
 *
 * @param chatId the id of the chat to update the history.
 * @param userId the id of the user who sent the message.
 * @param username the username of the user who sent the message, if available.
 * @param userFirstname the first name of the user who sent the message, if available.
 * @param userLastname the last name of the user who sent the message, if available.
 * @param message the message to update the history with.
 */
export function updateHistory(chatId: string, userId: string, username: string | undefined, userFirstname: string | undefined, userLastname: string | undefined, message: string) {
  getDb()
    .prepare('INSERT INTO messages (chat_id, user_id, username, user_firstname, user_lastname, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(chatId, userId, username ?? null, userFirstname ?? null, userLastname ?? null, message, Date.now());
}

/**
 * Get the history from the storage.
 *
 * @param chatId the id of the chat to get the history.
 * @returns the history messages and their author display names from the last 24 hours.
 */
export function getHistory(chatId: string): { author: string, message: string }[] {
  // Retrieve the recent history in insertion order. Older messages stay stored but are not returned.
  // Authors are displayed as @username; those without one fall back to their plain
  // first name, or user id as a last resort ('@' || NULL is NULL, skipping the prefix).
  const rows = getDb()
    .prepare("SELECT COALESCE('@' || username, user_firstname, user_id) AS author, message FROM messages WHERE chat_id = ? AND created_at >= ? ORDER BY rowid")
    .all(chatId, Date.now() - HISTORY_WINDOW_MS);
  return rows.map(row => ({ author: row.author as string, message: row.message as string }));
}

/**
 * Get all active chats from the storage.
 *
 * @returns the chats with messages from the last 24 hours.
 */
export function getActiveChats(): string[] {
  const rows = getDb()
    .prepare('SELECT DISTINCT chat_id FROM messages WHERE created_at >= ?')
    .all(Date.now() - HISTORY_WINDOW_MS); // Chats whose messages are all older than the summary window are not active.
  return rows.map(row => row.chat_id as string);
}
