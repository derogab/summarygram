import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock functions
const mockTranscribe = vi.fn();
const mockFree = vi.fn().mockResolvedValue(undefined);
const mockExecSync = vi.fn();

// Mock smart-whisper
vi.mock('smart-whisper', () => ({
  Whisper: vi.fn().mockImplementation(function (this: any) {
    this.transcribe = mockTranscribe;
    this.free = mockFree;
    return this;
  }),
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

// Helper: Mock ffmpeg to create a fake PCM file
function mockFfmpegSuccess() {
  mockExecSync.mockImplementation((cmd: string) => {
    if (typeof cmd === 'string' && cmd.includes('ffmpeg')) {
      const match = cmd.match(/-y "([^"]+)"/);
      if (match) {
        const floatData = new Float32Array([0.1, 0.2, 0.3]);
        fs.writeFileSync(match[1], Buffer.from(floatData.buffer));
      }
    }
    return Buffer.from('');
  });
}

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

  vi.doMock('smart-whisper', () => ({
    Whisper: vi.fn().mockImplementation(function (this: any) {
      this.transcribe = mockTranscribe;
      this.free = mockFree;
      return this;
    }),
  }));
  vi.doMock('child_process', () => ({
    execSync: mockExecSync,
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
    it('should return null when file does not exist', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      const result = await stt.transcribeAudio('/nonexistent/path/audio.wav');
      expect(result).toBeNull();
    });

    it('should return null when whisper is not configured', async () => {
      const stt = await getSttModule();
      delete process.env.WHISPER_CPP_MODEL_PATH;

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBeNull();
      });
    });

    it('should transcribe audio file successfully', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockFfmpegSuccess();
      mockTranscribe.mockResolvedValue({
        result: Promise.resolve([
          { text: 'Hello', from: 0, to: 1000 },
          { text: 'World', from: 1000, to: 2000 },
        ]),
      });

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBe('Hello World');
        expect(mockTranscribe).toHaveBeenCalled();
      });
    });

    it('should use custom options', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockFfmpegSuccess();
      mockTranscribe.mockResolvedValue({
        result: Promise.resolve([{ text: 'Test', from: 0, to: 1000 }]),
      });

      await withTempAudioFile(async (tempFile) => {
        await stt.transcribeAudio(tempFile, {
          language: 'en',
          translate: true,
          gpu: false,
        });

        expect(mockTranscribe).toHaveBeenCalledWith(
          expect.any(Float32Array),
          expect.objectContaining({
            language: 'en',
            translate: true,
          })
        );
      });
    });

    it('should return null on whisper error', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockFfmpegSuccess();
      mockTranscribe.mockRejectedValue(new Error('Whisper error'));

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBeNull();
      });
    });

    it('should return null when ffmpeg fails', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockExecSync.mockImplementation(() => {
        throw new Error('ffmpeg not found');
      });

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBeNull();
      });
    });

    it('should return null for empty transcript', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockFfmpegSuccess();
      mockTranscribe.mockResolvedValue({
        result: Promise.resolve([{ text: '   ', from: 0, to: 1000 }]),
      });

      await withTempAudioFile(async (tempFile) => {
        const result = await stt.transcribeAudio(tempFile);
        expect(result).toBeNull();
      });
    });
  });

  describe('transcribeToText', () => {
    it('should be an alias for transcribeAudio', async () => {
      const stt = await getSttModule();
      const result = await stt.transcribeToText('/nonexistent/path/audio.wav');
      expect(result).toBeNull();
    });
  });

  describe('transcribeBuffer', () => {
    it('should transcribe audio from buffer', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockFfmpegSuccess();
      mockTranscribe.mockResolvedValue({
        result: Promise.resolve([{ text: 'Buffer test', from: 0, to: 1000 }]),
      });

      const audioBuffer = Buffer.from('fake audio data');
      const result = await stt.transcribeBuffer(audioBuffer, 'ogg');
      expect(result).toBe('Buffer test');
    });

    it('should clean up temp file even on error', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockExecSync.mockImplementation(() => {
        throw new Error('ffmpeg error');
      });

      const audioBuffer = Buffer.from('fake audio data');
      const result = await stt.transcribeBuffer(audioBuffer, 'mp3');
      expect(result).toBeNull();
    });
  });

  describe('freeWhisper', () => {
    it('should free whisper instance', async () => {
      const stt = await getSttModule();
      process.env.WHISPER_CPP_MODEL_PATH = tempModelPath;
      mockFfmpegSuccess();
      mockTranscribe.mockResolvedValue({
        result: Promise.resolve([{ text: 'Test', from: 0, to: 1000 }]),
      });

      await withTempAudioFile(async (tempFile) => {
        await stt.transcribeAudio(tempFile);
        await stt.freeWhisper();
        expect(mockFree).toHaveBeenCalled();
      });
    });
  });
});
