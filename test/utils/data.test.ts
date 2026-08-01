import { describe, it, expect, afterEach, vi } from 'vitest';
import { close, updateHistory, getHistory, getActiveChats } from '../../src/utils/data';

// Use an in-memory SQLite database so tests never touch the filesystem.
// Closing it between tests gives each test a fresh, empty database.
process.env.SQLITE_PATH = ':memory:';

afterEach(() => {
  vi.useRealTimers();
  close();
});

describe('history', () => {
  it('should return empty history for an unknown chat', () => {
    expect(getHistory('unknown')).toEqual([]);
  });

  it('should store and retrieve messages in insertion order', () => {
    updateHistory('123', '1', 'alice', 'Alice', 'Smith','Hello world');
    updateHistory('123', '2', 'bob', 'Bob', 'Jones','How are you?');

    expect(getHistory('123')).toEqual([
      { author:'@alice', message: 'Hello world' },
      { author:'@bob', message: 'How are you?' },
    ]);
  });

  it('should keep chats separate', () => {
    updateHistory('123', '1', 'alice', 'Alice', 'Smith','Hello');
    updateHistory('456', '2', 'bob', 'Bob', 'Jones', 'Hi');

    expect(getHistory('123')).toEqual([{ author:'@alice', message: 'Hello' }]);
  });

  it('should accept messages without user names', () => {
    updateHistory('123', '1', 'alice', undefined, undefined, 'Hello');

    expect(getHistory('123')).toEqual([{ author:'@alice', message: 'Hello' }]);
  });

  it('should fall back to first name or user id when username is missing', () => {
    updateHistory('123', '1', undefined, 'Alice', undefined, 'Hello');
    updateHistory('123', '2', undefined, undefined, undefined, 'Hi');

    expect(getHistory('123')).toEqual([
      { author:'Alice', message: 'Hello' },
      { author:'2', message: 'Hi' },
    ]);
  });

  it('should preserve messages containing the ### separator', () => {
    updateHistory('123', '1', 'alice', 'Alice', 'Smith','a###b###c');

    expect(getHistory('123')).toEqual([{ author:'@alice', message: 'a###b###c' }]);
  });

  it('should only return messages from the last 24 hours, without deleting older ones', () => {
    const now = Date.now();
    // Store a message 25 hours in the past.
    vi.useFakeTimers();
    vi.setSystemTime(now - 1000 * 60 * 60 * 25);
    updateHistory('123', '1', 'alice', 'Alice', 'Smith','Old message');
    vi.setSystemTime(now);
    updateHistory('123', '2', 'bob', 'Bob', 'Jones','Recent message');

    expect(getHistory('123')).toEqual([{ author:'@bob', message: 'Recent message' }]);

    // The old message is still stored: it is visible from within its own 24-hour window.
    vi.setSystemTime(now - 1000 * 60 * 60 * 24);
    expect(getHistory('123')).toContainEqual({ author:'@alice', message: 'Old message' });
  });
});

describe('getActiveChats', () => {
  it('should return empty array when no chats are active', () => {
    expect(getActiveChats()).toEqual([]);
  });

  it('should return the ids of chats with history', () => {
    updateHistory('123', '1', 'alice', 'Alice', 'Smith','Hello');
    updateHistory('-100456', '2', 'bob', 'Bob', 'Jones', 'Hi');

    expect(getActiveChats().sort()).toEqual(['-100456', '123']);
  });

  it('should not return chats with only messages older than 24 hours', () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now - 1000 * 60 * 60 * 25);
    updateHistory('123', '1', 'alice', 'Alice', 'Smith', 'Old message');
    vi.setSystemTime(now);
    updateHistory('456', '2', 'bob', 'Bob', 'Jones', 'Recent message');

    expect(getActiveChats()).toEqual(['456']);
  });
});
