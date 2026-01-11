import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { onMessageReceived, onCronJob } from '../../src/controller/core';

// Mock llm-proxy
vi.mock('@derogab/llm-proxy', () => ({
  generate: vi.fn().mockResolvedValue({ content: 'Mocked summary response' }),
}));

// Mock data utils
vi.mock('../../src/utils/data', async () => {
  const originalModule = await vi.importActual('../../src/utils/data');
  return {
    ...originalModule,
    default: class MockStorage {
      client = null;
      connect = vi.fn();
      disconnect = vi.fn();
      destroy = vi.fn();
    },
    getHistory: vi.fn().mockResolvedValue([]),
    updateHistory: vi.fn().mockResolvedValue(undefined),
    getActiveChats: vi.fn().mockResolvedValue([]),
  };
});

import Storage from '../../src/utils/data';
import * as dataUtils from '../../src/utils/data';
import { generate } from '@derogab/llm-proxy';

describe('onMessageReceived', () => {
  let mockStorage: Storage;
  let mockCtx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHITELISTED_CHATS;
    delete process.env.MSG_LENGTH_LIMIT;

    mockStorage = new Storage();
    mockCtx = {
      update: {
        message: {
          text: 'Hello world',
          chat: { id: 123 },
          from: { id: 456, username: 'testuser' },
          message_id: 1,
        },
      },
      api: {
        sendChatAction: vi.fn().mockResolvedValue(undefined),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should throw error when chatId is not available', async () => {
    mockCtx.update.message.chat = undefined;
    await expect(onMessageReceived(mockStorage, mockCtx)).rejects.toThrow('No Chat found.');
  });

  it('should throw error when from is not available', async () => {
    mockCtx.update.message.from = undefined;
    await expect(onMessageReceived(mockStorage, mockCtx)).rejects.toThrow('No Message Author found.');
  });

  it('should return early when chat is not whitelisted', async () => {
    process.env.WHITELISTED_CHATS = '999,888';
    await onMessageReceived(mockStorage, mockCtx);
    expect(dataUtils.updateHistory).not.toHaveBeenCalled();
  });

  it('should process message when chat is whitelisted', async () => {
    process.env.WHITELISTED_CHATS = '123,456';
    await onMessageReceived(mockStorage, mockCtx);
    expect(dataUtils.updateHistory).toHaveBeenCalled();
  });

  it('should return early when text is not available and no caption/document', async () => {
    mockCtx.update.message.text = undefined;
    await onMessageReceived(mockStorage, mockCtx);
    expect(dataUtils.updateHistory).not.toHaveBeenCalled();
  });

  it('should use caption when text is not available', async () => {
    mockCtx.update.message.text = undefined;
    mockCtx.update.message.caption = 'Photo caption';
    await onMessageReceived(mockStorage, mockCtx);
    expect(dataUtils.updateHistory).toHaveBeenCalledWith(
      mockStorage,
      'chat:123',
      'testuser',
      'Photo caption'
    );
  });

  it('should use document filename when text and caption are not available', async () => {
    mockCtx.update.message.text = undefined;
    mockCtx.update.message.document = { file_name: 'document.pdf' };
    await onMessageReceived(mockStorage, mockCtx);
    expect(dataUtils.updateHistory).toHaveBeenCalledWith(
      mockStorage,
      'chat:123',
      'testuser',
      'document.pdf'
    );
  });

  it('should use fromId when username is not available', async () => {
    mockCtx.update.message.from.username = undefined;
    await onMessageReceived(mockStorage, mockCtx);
    expect(dataUtils.updateHistory).toHaveBeenCalledWith(
      mockStorage,
      'chat:123',
      '456',
      'Hello world'
    );
  });

  it('should save regular message to history', async () => {
    await onMessageReceived(mockStorage, mockCtx);
    expect(dataUtils.updateHistory).toHaveBeenCalledWith(
      mockStorage,
      'chat:123',
      'testuser',
      'Hello world'
    );
  });

  it('should generate and send summary on /summary command', async () => {
    mockCtx.update.message.text = '/summary';
    (dataUtils.getHistory as Mock).mockResolvedValue([
      { username: 'user1', message: 'Hello' },
      { username: 'user2', message: 'World' },
    ]);

    await onMessageReceived(mockStorage, mockCtx);

    expect(mockCtx.api.sendChatAction).toHaveBeenCalledWith('123', 'typing');
    expect(generate).toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalledWith('Mocked summary response');
  });

  it('should generate TL;DR for long messages', async () => {
    process.env.MSG_LENGTH_LIMIT = '10';
    mockCtx.update.message.text = 'This is a very long message that exceeds the limit';

    await onMessageReceived(mockStorage, mockCtx);

    expect(dataUtils.updateHistory).toHaveBeenCalled();
    expect(generate).toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalledWith(
      'TL;DR\n\nMocked summary response',
      { reply_to_message_id: 1 }
    );
  });

  it('should not generate TL;DR for short messages', async () => {
    process.env.MSG_LENGTH_LIMIT = '1000';
    mockCtx.update.message.text = 'Short message';

    await onMessageReceived(mockStorage, mockCtx);

    expect(dataUtils.updateHistory).toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });
});

describe('onCronJob', () => {
  let mockStorage: Storage;
  let mockBot: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = new Storage();
    mockBot = {
      api: {
        sendChatAction: vi.fn().mockResolvedValue(undefined),
        sendMessage: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('should do nothing when no active chats', async () => {
    (dataUtils.getActiveChats as Mock).mockResolvedValue([]);
    await onCronJob(mockStorage, mockBot);
    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should skip chats with no history', async () => {
    (dataUtils.getActiveChats as Mock).mockResolvedValue(['123']);
    (dataUtils.getHistory as Mock).mockResolvedValue([]);

    await onCronJob(mockStorage, mockBot);

    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should send summary to active chats with history', async () => {
    (dataUtils.getActiveChats as Mock).mockResolvedValue(['123', '456']);
    (dataUtils.getHistory as Mock).mockResolvedValue([
      { username: 'user1', message: 'Hello' },
    ]);

    await onCronJob(mockStorage, mockBot);

    expect(mockBot.api.sendChatAction).toHaveBeenCalledTimes(2);
    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith('123', 'Mocked summary response');
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith('456', 'Mocked summary response');
  });
});
