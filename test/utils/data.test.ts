import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateKeyChat } from '../../src/utils/data';

// Mock redis to prevent actual connections
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    flushAll: vi.fn().mockResolvedValue(undefined),
    multi: vi.fn(() => ({
      rPush: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
    lRange: vi.fn().mockResolvedValue([]),
    keys: vi.fn().mockResolvedValue([]),
  })),
}));

import Storage, { updateHistory, getHistory, getActiveChats } from '../../src/utils/data';

describe('generateKeyChat', () => {
  it('should generate a key with chat: prefix for string chatId', () => {
    expect(generateKeyChat('12345')).toBe('chat:12345');
  });

  it('should generate a key with chat: prefix for number chatId', () => {
    expect(generateKeyChat(67890)).toBe('chat:67890');
  });

  it('should handle negative chat IDs (group chats)', () => {
    expect(generateKeyChat('-100123456789')).toBe('chat:-100123456789');
  });

  it('should handle empty string', () => {
    expect(generateKeyChat('')).toBe('chat:');
  });
});

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  describe('constructor', () => {
    it('should initialize with null client', () => {
      expect(storage.client).toBeNull();
    });
  });

  describe('connect', () => {
    it('should connect to Redis', async () => {
      await storage.connect();
      expect(storage.client).not.toBeNull();
    });

    it('should not reconnect if already connected', async () => {
      await storage.connect();
      const firstClient = storage.client;
      await storage.connect();
      expect(storage.client).toBe(firstClient);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and set client to null', async () => {
      await storage.connect();
      await storage.disconnect();
      expect(storage.client).toBeNull();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(storage.disconnect()).resolves.not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should flush all and disconnect', async () => {
      await storage.connect();
      await storage.destroy();
      expect(storage.client).toBeNull();
    });
  });
});

describe('updateHistory', () => {
  it('should not throw when called with valid params', async () => {
    const storage = new Storage();
    await expect(
      updateHistory(storage, 'chat:123', 'testuser', 'Hello world')
    ).resolves.not.toThrow();
  });
});

describe('getHistory', () => {
  it('should return array when called', async () => {
    const storage = new Storage();
    const history = await getHistory(storage, 'chat:123');
    expect(Array.isArray(history)).toBe(true);
  });
});

describe('getActiveChats', () => {
  it('should return array when called', async () => {
    const storage = new Storage();
    const chats = await getActiveChats(storage);
    expect(Array.isArray(chats)).toBe(true);
  });
});
