import { Whisper } from 'smart-whisper';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Options for transcription.
 */
export interface TranscribeOptions {
  /** Language code for transcription (e.g., 'en', 'de', 'auto') */
  language?: string;
  /** Translate from source language to English */
  translate?: boolean;
  /** Use GPU for processing (default: true on supported systems) */
  gpu?: boolean;
}

// Singleton Whisper instance for reuse
let whisperInstance: Whisper | null = null;
let currentModelPath: string | null = null;

/**
 * Get the Whisper model path from environment variable.
 *
 * @returns The path to the Whisper model file, or null if not configured.
 */
export function getWhisperModelPath(): string | null {
  return process.env.WHISPER_CPP_MODEL_PATH || null;
}

/**
 * Check if Whisper STT is configured and available.
 *
 * @returns True if WHISPER_CPP_MODEL_PATH is set and the file exists.
 */
export function isWhisperConfigured(): boolean {
  const modelPath = getWhisperModelPath();
  if (!modelPath) return false;
  return fs.existsSync(modelPath);
}

/**
 * Get or create the Whisper instance.
 * Reuses the same instance if the model path hasn't changed.
 *
 * @param options Optional transcription options.
 * @returns The Whisper instance, or null if not configured.
 */
async function getWhisperInstance(options?: TranscribeOptions): Promise<Whisper | null> {
  const modelPath = getWhisperModelPath();
  if (!modelPath || !fs.existsSync(modelPath)) {
    return null;
  }

  // If model path changed, free the old instance
  if (whisperInstance && currentModelPath !== modelPath) {
    await whisperInstance.free();
    whisperInstance = null;
    currentModelPath = null;
  }

  // Create new instance if needed
  if (!whisperInstance) {
    whisperInstance = new Whisper(modelPath, {
      gpu: options?.gpu ?? true,
    });
    currentModelPath = modelPath;
  }

  return whisperInstance;
}

/**
 * Convert an audio file to PCM Float32Array for Whisper.
 * The audio must be mono 16kHz.
 *
 * @param audioFilePath Path to the audio file.
 * @returns The PCM data as Float32Array, or null on error.
 */
function audioToPcm(audioFilePath: string): Float32Array | null {
  const tempPcmPath = path.join(os.tmpdir(), `whisper_${Date.now()}.pcm`);

  try {
    // Convert to mono 16kHz 32-bit float PCM using ffmpeg
    execSync(
      `ffmpeg -i "${audioFilePath}" -ar 16000 -ac 1 -f f32le -y "${tempPcmPath}" 2>/dev/null`,
      { stdio: 'pipe' }
    );

    // Read the PCM file
    const buffer = fs.readFileSync(tempPcmPath);
    const pcm = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

    return pcm;
  } catch (error) {
    console.error('Error converting audio to PCM:', error);
    return null;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempPcmPath)) {
      fs.unlinkSync(tempPcmPath);
    }
  }
}

/**
 * Transcribe an audio file to text using Whisper.
 *
 * @param audioFilePath Path to the audio file to transcribe.
 * @param options Optional transcription options.
 * @returns The transcription text, or null if transcription fails.
 */
export async function transcribeAudio(
  audioFilePath: string,
  options?: TranscribeOptions
): Promise<string | null> {
  // Check if file exists.
  if (!fs.existsSync(audioFilePath)) {
    console.error(`Audio file not found: ${audioFilePath}`);
    return null;
  }

  // Check if Whisper is configured.
  if (!isWhisperConfigured()) {
    console.error('Whisper not configured: WHISPER_CPP_MODEL_PATH not set or model file not found');
    return null;
  }

  try {
    const whisper = await getWhisperInstance(options);
    if (!whisper) {
      return null;
    }

    // Convert audio to PCM
    const pcm = audioToPcm(audioFilePath);
    if (!pcm) {
      console.error('Failed to convert audio to PCM');
      return null;
    }

    // Transcribe
    const task = await whisper.transcribe(pcm, {
      language: options?.language || 'auto',
      translate: options?.translate ?? false,
    });

    const results = await task.result;

    // Combine all segments into a single string
    const text = results.map(r => r.text).join(' ').trim();

    return text || null;
  } catch (error) {
    console.error('Whisper transcription error:', error);
    return null;
  }
}

/**
 * Transcribe audio and return plain text.
 * This is an alias for transcribeAudio for API consistency.
 *
 * @param audioFilePath Path to the audio file to transcribe.
 * @param options Optional transcription options.
 * @returns The full transcription text, or null if transcription fails.
 */
export async function transcribeToText(
  audioFilePath: string,
  options?: TranscribeOptions
): Promise<string | null> {
  return transcribeAudio(audioFilePath, options);
}

/**
 * Transcribe audio from a buffer by writing to a temp file.
 *
 * @param audioBuffer Buffer containing audio data.
 * @param fileExtension File extension for the temp file (e.g., 'ogg', 'mp3', 'wav').
 * @param options Optional transcription options.
 * @returns The full transcription text, or null if transcription fails.
 */
export async function transcribeBuffer(
  audioBuffer: Buffer,
  fileExtension: string,
  options?: TranscribeOptions
): Promise<string | null> {
  // Create temp file path.
  const tempDir = os.tmpdir();
  const tempFileName = `whisper_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const tempFilePath = path.join(tempDir, tempFileName);

  try {
    // Write buffer to temp file.
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Transcribe the temp file.
    const result = await transcribeToText(tempFilePath, options);

    return result;
  } finally {
    // Clean up temp file.
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

/**
 * Free the Whisper instance and release resources.
 * Call this when you're done using STT to free memory.
 */
export async function freeWhisper(): Promise<void> {
  if (whisperInstance) {
    await whisperInstance.free();
    whisperInstance = null;
    currentModelPath = null;
  }
}

/**
 * Get available Whisper model names from HuggingFace.
 *
 * @returns Array of available model names.
 */
export function getAvailableModels(): string[] {
  return [
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
  ];
}

/**
 * Get the HuggingFace URL for a model.
 *
 * @param modelName The model name (e.g., 'ggml-base.en.bin').
 * @returns The download URL.
 */
export function getModelUrl(modelName: string): string {
  return `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modelName}`;
}
