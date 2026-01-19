import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock functions for @derogab/stt-proxy
const mockTranscribe = vi.fn();
const mockTranscribeBuffer = vi.fn();
const mockIsWhisperConfigured = vi.fn();
const mockFreeWhisper = vi.fn().mockResolvedValue(undefined);
const mockGetAvailableModels = vi.fn();
const mockGetModelUrl = vi.fn();

// Mock @derogab/stt-proxy
vi.mock('@derogab/stt-proxy', () => ({
  transcribe: mockTranscribe,
  transcribeBuffer: mockTranscribeBuffer,
  isWhisperConfigured: mockIsWhisperConfigured,
  freeWhisper: mockFreeWhisper,
  getAvailableModels: mockGetAvailableModels,
  getModelUrl: mockGetModelUrl,
}));

// Helper: Create temp audio file and clean up after test
async function withTempAudioFile<T>(
  fn: (filePath: string) => Promise<T>
): Promise<T> {
  const tempFile = path.join(os.tmpdir(), `test_audio_${Date.now()}.wav`);
  fs.writeFileSync(tempFile, 'fake audio data');
  try {
    return await fn(tempFile);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

// Dynamic import to reset module state between tests
async function getSttModule() {
  const modulePath = '../../src/utils/stt';
  vi.resetModules();

  vi.doMock('@derogab/stt-proxy', () => ({
    transcribe: mockTranscribe,
    transcribeBuffer: mockTranscribeBuffer,
    isWhisperConfigured: mockIsWhisperConfigured,
    freeWhisper: mockFreeWhisper,
    getAvailableModels: mockGetAvailableModels,
    getModelUrl: mockGetModelUrl,
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

    // Default mock implementations
    mockGetAvailableModels.mockReturnValue([
      'ggml-tiny.bin',
      'ggml-tiny.en.bin',
      'ggml-base.bin',
      'ggml-base.en.bin',
      'ggml-small.bin',
      'ggml-small.en.bin',
      'ggml-medium.bin',
      'ggml-medium.en.bin',
      'ggml-large-v1.bin',
      'ggml-large-v2.bin',
      'ggml-large-v3.bin',
      'ggml-large-v3-turbo.bin',
    ]);

    mockGetModelUrl.mockImplementation((modelName: string) =>
      `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modelName}`
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(tempModelPath)) {
      fs.unlinkSync(tempModelPath);
    }
  });

  describe('getWhisperModelPath', () => {
    it('should return the model path from environment variable', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = '/path/to/model.bin';
      expect(stt.getWhisperModelPath()).toBe('/path/to/model.bin');
    });

    it('should return null when env var is not set', async () => {
      const stt = await getSttModule();
      delete process.env.WHISPER_CPP_MODEL_PATH;
      expect(stt.getWhisperModelPath()).toBeNull();
    });
  });

  describe('isWhisperConfigured', () => {
    it('should return false when proxy reports not configured', async () => {
      const stt = await getSttModule();
      mockIsWhisperConfigured.mockReturnValue(false);
      expect(stt.isWhisperConfigured()).toBe(false);
    });

    it('should return true when proxy reports configured', async () => {
      const stt = await getSttModule();
      mockIsWhisperConfigured.mockReturnValue(true);
      expect(stt.isWhisperConfigured()).toBe(true);
    });
  });

  describe('getAvailableModels', () => {
    it('should return array of model names', async () => {
      const stt = await getSttModule();
      const models = stt.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('ggml-base.bin');
      expect(models).toContain('ggml-base.en.bin');
      expect(models).toContain('ggml-large-v3-turbo.bin');
    });
  });

  describe('getModelUrl', () => {
    it('should return correct HuggingFace URL', async () => {
      const stt = await getSttModule();
      expect(stt.getModelUrl('ggml-base.en.bin')).toBe(
        'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
      );
    });
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio file successfully', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockResolvedValue({ text: 'Hello World' });

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBe('Hello World');
        expect(mockTranscribe).toHaveBeenCalledWith(tempFile, {
          language: undefined,
          translate: undefined,
        });
      });
    });

    it('should use custom options', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockResolvedValue({ text: 'Test' });

      await withTempAudioFile(async (tempFile) => {
        await stt.transcribeAudio(tempFile, {
          language: 'en',
          translate: true,
          gpu: false,
        });

        expect(mockTranscribe).toHaveBeenCalledWith(tempFile, {
          language: 'en',
          translate: true,
        });
      });
    });

    it('should return null on error', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockRejectedValue(new Error('STT error'));

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBeNull();
      });
    });

    it('should return null for empty transcript', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockResolvedValue({ text: '' });

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBeNull();
      });
    });
  });

  describe('transcribeToText', () => {
    it('should be an alias for transcribeAudio', async () => {
      const stt = await getSttModule();
      mockTranscribe.mockResolvedValue({ text: 'Test' });

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeToText(tempFile);
        expect(result).toBe('Test');
      });
    });
  });

  describe('transcribeBuffer', () => {
    it('should transcribe audio from buffer', async () => {
      const stt = await getSttModule();
      mockTranscribeBuffer.mockResolvedValue({ text: 'Buffer test' });

      const audioBuffer = Buffer.from('fake audio data');
      const result = await stt.transcribeBuffer(audioBuffer, 'ogg');
      expect(result).toBe('Buffer test');
      expect(mockTranscribeBuffer).toHaveBeenCalledWith(audioBuffer, {
        language: undefined,
        translate: undefined,
      });
    });

    it('should return null on error', async () => {
      const stt = await getSttModule();
      mockTranscribeBuffer.mockRejectedValue(new Error('Buffer error'));

      const audioBuffer = Buffer.from('fake audio data');
      const result = await stt.transcribeBuffer(audioBuffer, 'mp3');
      expect(result).toBeNull();
    });
  });

  describe('freeWhisper', () => {
    it('should call proxy freeWhisper', async () => {
      const stt = await getSttModule();
      await stt.freeWhisper();
      expect(mockFreeWhisper).toHaveBeenCalled();
    });
  });
});
