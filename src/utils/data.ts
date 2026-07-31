// Dependencies.
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';

// Constants.
const HISTORY_WINDOW_MS = 1000 * 60 * 60 * 24; // Summaries only consider messages from the last 24 hours.

// Class for the data storage.
export default class Storage {
  // The handle for the SQLite database.
  db: DatabaseSync | null;

  /**
   * Create a new instance of the Storage class.
   */
  constructor() {
    this.db = null;
  }

  /**
   * Open the SQLite database file.
   */
  async connect() {
    if (this.db) return; // If the database is already open, return.

    const dbPath = process.env.SQLITE_PATH || 'summarygram.sqlite';
    // Ensure the parent directory exists (e.g. a mounted volume path).
    if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        chat_id    TEXT    NOT NULL,
        username   TEXT    NOT NULL,
        message    TEXT    NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
    `);

    this.db = db;
  }

  /**
   * Close the SQLite database.
   */
  async disconnect() {
    this.db?.close();
    this.db = null;
  }

  /**
   * Destroy the database content.
   */
  async destroy() {
    this.db?.exec('DELETE FROM messages');
    await this.disconnect();
  }
}

/**
 * Update history in the storage.
 *
 * @param storage storage instance.
 * @param chatId the id of the chat to update the history.
 * @param username the username of the user who sent the message.
 * @param message the message to update the history with.
 */
export async function updateHistory(storage: Storage, chatId: string, username: string, message: string) {
  // Connect storage if not connected.
  await storage.connect();
  // Append the new message.
  storage.db?.prepare('INSERT INTO messages (chat_id, username, message, created_at) VALUES (?, ?, ?, ?)')
    .run(chatId, username, message, Date.now());
}

/**
 * Get the history from the storage.
 *
 * @param storage storage instance.
 * @param chatId the id of the chat to get the history.
 * @returns the history messages and authors from the last 24 hours.
 */
export async function getHistory(storage: Storage, chatId: string): Promise<{ username: string, message: string }[]> {
  // Connect storage if not connected.
  await storage.connect();
  // Retrieve the recent history in insertion order. Older messages stay stored but are not returned.
  const rows = storage.db?.prepare('SELECT username, message FROM messages WHERE chat_id = ? AND created_at >= ? ORDER BY rowid')
    .all(chatId, Date.now() - HISTORY_WINDOW_MS) || [];
  // Generate the history messages and authors.
  return rows.map(row => ({ username: row.username as string, message: row.message as string }));
}

/**
 * Get all active chats from the storage.
 *
 * @param storage the storage instance.
 * @returns the active chats.
 */
export async function getActiveChats(storage: Storage): Promise<string[]> {
  // Connect storage if not connected.
  await storage.connect();
  // Retrieve the active chats.
  const rows = storage.db?.prepare('SELECT DISTINCT chat_id FROM messages').all() || [];
  return rows.map(row => row.chat_id as string);
}
