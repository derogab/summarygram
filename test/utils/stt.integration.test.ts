import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Model and audio file paths (relative to project root)
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MODELS_DIR = path.join(PROJECT_ROOT, 'models');
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';
const MODEL_PATH = path.join(MODELS_DIR, 'ggml-base.en.bin');

const JFK_AUDIO_URL = 'https://github.com/openai/whisper/raw/refs/heads/main/tests/jfk.flac';
const JFK_AUDIO_PATH = path.join('/tmp', 'whisper-test-jfk.flac');

/**
 * Download a file from a URL to a local path.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  // Ensure the directory exists
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = (urlString: string) => {
      https.get(urlString, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            request(redirectUrl);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

/**
 * Integration tests for STT using real audio files.
 *
 * Prerequisites:
 * - ffmpeg must be installed for audio conversion
 *
 * The model will be automatically downloaded to models/ folder.
 */
describe('stt integration tests', () => {
  let transcribeAudio: typeof import('../../src/utils/stt').transcribeAudio;
  let transcribeBuffer: typeof import('../../src/utils/stt').transcribeBuffer;
  let freeWhisper: typeof import('../../src/utils/stt').freeWhisper;

  beforeAll(async () => {
    // Download the model if it doesn't exist
    if (!fs.existsSync(MODEL_PATH)) {
      console.log('Downloading Whisper model (ggml-base.en.bin)...');
      console.log('This may take a few minutes on first run.');
      await downloadFile(MODEL_URL, MODEL_PATH);
      console.log('Model download complete.');
    }

    // Download the test audio file if it doesn't exist
    if (!fs.existsSync(JFK_AUDIO_PATH)) {
      console.log('Downloading JFK test audio file...');
      await downloadFile(JFK_AUDIO_URL, JFK_AUDIO_PATH);
      console.log('Audio download complete.');
    }

    // Set the model path environment variable before importing the module
    process.env.WHISPER_CPP_MODEL_PATH = MODEL_PATH;

    // Dynamically import the module after setting the env var
    const stt = await import('../../src/utils/stt');
    transcribeAudio = stt.transcribeAudio;
    transcribeBuffer = stt.transcribeBuffer;
    freeWhisper = stt.freeWhisper;
  }, 600000); // 10 minute timeout for model download

  afterAll(async () => {
    // Free whisper resources
    if (freeWhisper) {
      await freeWhisper();
    }
  });

  it('should transcribe JFK speech audio file', async () => {
    const result = await transcribeAudio(JFK_AUDIO_PATH);

    expect(result).not.toBeNull();
    expect(result).toBeDefined();

    // Convert to lowercase and remove punctuation for comparison
    const normalizedResult = result!.toLowerCase().replace(/[.,!?]/g, '').trim();

    // The transcript should contain the famous JFK quote
    expect(normalizedResult).toContain('ask not what your country can do for you');
    expect(normalizedResult).toContain('ask what you can do for your country');
  }, 300000); // 5 minute timeout for transcription

  it('should transcribe audio from buffer', async () => {
    const audioBuffer = fs.readFileSync(JFK_AUDIO_PATH);
    const result = await transcribeBuffer(audioBuffer, 'flac');

    expect(result).not.toBeNull();
    expect(result).toBeDefined();

    // Convert to lowercase and remove punctuation for comparison
    const normalizedResult = result!.toLowerCase().replace(/[.,!?]/g, '').trim();

    // The transcript should contain the famous JFK quote
    expect(normalizedResult).toContain('ask not what your country can do for you');
  }, 300000); // 5 minute timeout for transcription
});
