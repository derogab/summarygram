import { transcribe } from '@derogab/stt-proxy';
import * as fs from 'fs';

/**
 * Options for transcription.
 */
export interface TranscribeOptions {
  /** Language code for transcription (e.g., 'en', 'de', 'auto') */
  language?: string;
  /** Translate from source language to English */
  translate?: boolean;
}

/**
 * Check if Whisper STT is configured and available.
 *
 * @returns True if WHISPER_CPP_MODEL_PATH is set and the file exists.
 */
export function isWhisperConfigured(): boolean {
  const modelPath = process.env.WHISPER_CPP_MODEL_PATH;
  return modelPath !== undefined && fs.existsSync(modelPath);
}

/**
 * Transcribe audio from a buffer.
 *
 * @param audioBuffer Buffer containing audio data.
 * @param fileExtension File extension (unused, kept for backward compatibility).
 * @param options Optional transcription options.
 * @returns The transcription text, or null if transcription fails.
 */
export async function transcribeBuffer(
  audioBuffer: Buffer,
  fileExtension: string,
  options?: TranscribeOptions
): Promise<string | null> {
  try {
    const result = await transcribe(audioBuffer, options);
    return result.text || null;
  } catch (error) {
    console.error('STT transcription error:', error);
    return null;
  }
}
