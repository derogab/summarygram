import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

import { createClient } from 'redis';
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

  afterEach(() => {
    vi.restoreAllMocks();
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

    it('should configure bounded Redis reconnect retries', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await storage.connect();
      const createClientMock = vi.mocked(createClient);
      const options = createClientMock.mock.calls[createClientMock.mock.calls.length - 1][0] as any;

      expect(options.socket.reconnectStrategy(3)).toBe(300);
      expect(options.socket.reconnectStrategy(11)).toBe(false);
      expect(logSpy).toHaveBeenCalledWith('Redis connection retry 3/10');
      expect(errorSpy).toHaveBeenCalledWith('Redis connection failed after 10 retries');
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

  it('should parse stored username and message entries', async () => {
    const storage = new Storage();
    storage.client = {
      lRange: vi.fn().mockResolvedValue([
        'alice###Hello world',
        'bob###How are you?',
      ]),
    } as any;

    const history = await getHistory(storage, 'chat:123');

    expect(history).toEqual([
      { username: 'alice', message: 'Hello world' },
      { username: 'bob', message: 'How are you?' },
    ]);
  });
});

describe('getActiveChats', () => {
  it('should return array when called', async () => {
    const storage = new Storage();
    const chats = await getActiveChats(storage);
    expect(Array.isArray(chats)).toBe(true);
  });

  it('should remove the chat key prefix from active chat IDs', async () => {
    const storage = new Storage();
    storage.client = {
      keys: vi.fn().mockResolvedValue([
        'chat:123',
        'chat:-100456',
      ]),
    } as any;

    const chats = await getActiveChats(storage);

    expect(chats).toEqual(['123', '-100456']);
  });
});
