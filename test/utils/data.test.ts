import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Storage, { updateHistory, getHistory, getActiveChats } from '../../src/utils/data';

// Use an in-memory SQLite database so tests never touch the filesystem.
process.env.SQLITE_PATH = ':memory:';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  afterEach(async () => {
    await storage.disconnect();
  });

  describe('constructor', () => {
    it('should initialize with null db', () => {
      expect(storage.db).toBeNull();
    });
  });

  describe('connect', () => {
    it('should open the database', async () => {
      await storage.connect();
      expect(storage.db).not.toBeNull();
    });

    it('should not reopen if already connected', async () => {
      await storage.connect();
      const firstDb = storage.db;
      await storage.connect();
      expect(storage.db).toBe(firstDb);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and set db to null', async () => {
      await storage.connect();
      await storage.disconnect();
      expect(storage.db).toBeNull();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(storage.disconnect()).resolves.not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should clear all data and disconnect', async () => {
      await updateHistory(storage, '123', 'alice', 'Hello');
      await storage.destroy();
      expect(storage.db).toBeNull();
    });
  });
});

describe('history', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  afterEach(async () => {
    await storage.disconnect();
  });

  it('should return empty history for an unknown chat', async () => {
    const history = await getHistory(storage, 'unknown');
    expect(history).toEqual([]);
  });

  it('should store and retrieve messages in insertion order', async () => {
    await updateHistory(storage, '123', 'alice', 'Hello world');
    await updateHistory(storage, '123', 'bob', 'How are you?');

    const history = await getHistory(storage, '123');

    expect(history).toEqual([
      { username: 'alice', message: 'Hello world' },
      { username: 'bob', message: 'How are you?' },
    ]);
  });

  it('should keep chats separate', async () => {
    await updateHistory(storage, '123', 'alice', 'Hello');
    await updateHistory(storage, '456', 'bob', 'Hi');

    const history = await getHistory(storage, '123');

    expect(history).toEqual([{ username: 'alice', message: 'Hello' }]);
  });

  it('should preserve messages containing the ### separator', async () => {
    await updateHistory(storage, '123', 'alice', 'a###b###c');

    const history = await getHistory(storage, '123');

    expect(history).toEqual([{ username: 'alice', message: 'a###b###c' }]);
  });

  it('should only return messages from the last 24 hours, without deleting older ones', async () => {
    await updateHistory(storage, '123', 'alice', 'Old message');
    // Backdate the message beyond the 24-hour window.
    storage.db?.prepare('UPDATE messages SET created_at = ?').run(Date.now() - 1000 * 60 * 60 * 25);
    await updateHistory(storage, '123', 'bob', 'Recent message');

    const history = await getHistory(storage, '123');

    expect(history).toEqual([{ username: 'bob', message: 'Recent message' }]);
    // The old message is still stored.
    const count = storage.db?.prepare('SELECT COUNT(*) AS n FROM messages').get();
    expect(count?.n).toBe(2);
  });
});

describe('getActiveChats', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  afterEach(async () => {
    await storage.disconnect();
  });

  it('should return empty array when no chats are active', async () => {
    const chats = await getActiveChats(storage);
    expect(chats).toEqual([]);
  });

  it('should return the ids of chats with history', async () => {
    await updateHistory(storage, '123', 'alice', 'Hello');
    await updateHistory(storage, '-100456', 'bob', 'Hi');

    const chats = await getActiveChats(storage);

    expect(chats.sort()).toEqual(['-100456', '123']);
  });
});
