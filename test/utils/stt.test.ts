import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock functions for @derogab/stt-proxy
const mockTranscribe = vi.fn();

// Mock @derogab/stt-proxy
vi.mock('@derogab/stt-proxy', () => ({
  transcribe: mockTranscribe,
}));

// Dynamic import to reset module state between tests
async function getSttModule() {
  const modulePath = '../../src/utils/stt';
  vi.resetModules();

  vi.doMock('@derogab/stt-proxy', () => ({
    transcribe: mockTranscribe,
  }));

  return await import(modulePath);
}

describe('stt utilities', () => {
  const originalEnv = process.env;
  const tempModelPath = path.join(os.tmpdir(), 'test-model.bin');

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    fs.writeFileSync(tempModelPath, 'fake model data');
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(tempModelPath)) {
      fs.unlinkSync(tempModelPath);
    }
  });

  describe('isWhisperConfigured', () => {
    it('should return false when WHISPER_CPP_MODEL_PATH is not set', async () => {
      const stt = await getSttModule();
      delete process.env.WHISPER_CPP_MODEL_PATH;
      expect(stt.isWhisperConfigured()).toBe(false);
    });

    it('should return false when model file does not exist', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = '/nonexistent/model.bin';
      expect(stt.isWhisperConfigured()).toBe(false);
    });

    it('should return true when model file exists', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      expect(stt.isWhisperConfigured()).toBe(true);
    });
  });

  describe('transcribeBuffer', () => {
    it('should transcribe audio from buffer', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockResolvedValue({ text: 'Buffer test' });

      const audioBuffer = Buffer.from('fake audio data');
      const result = await stt.transcribeBuffer(audioBuffer, 'ogg');
      expect(result).toBe('Buffer test');
      expect(mockTranscribe).toHaveBeenCalledWith(audioBuffer, undefined);
    });

    it('should pass options to transcribe', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockResolvedValue({ text: 'Buffer test' });

      const audioBuffer = Buffer.from('fake audio data');
      await stt.transcribeBuffer(audioBuffer, 'ogg', {
        language: 'en',
        translate: true,
      });

      expect(mockTranscribe).toHaveBeenCalledWith(audioBuffer, {
        language: 'en',
        translate: true,
      });
    });

    it('should return null on error', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockRejectedValue(new Error('Buffer error'));

      const audioBuffer = Buffer.from('fake audio data');
      const result = await stt.transcribeBuffer(audioBuffer, 'mp3');
      expect(result).toBeNull();
    });

    it('should return null for empty transcript', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockResolvedValue({ text: '' });

      const audioBuffer = Buffer.from('fake audio data');
      const result = await stt.transcribeBuffer(audioBuffer, 'ogg');
      expect(result).toBeNull();
    });
  });
});
