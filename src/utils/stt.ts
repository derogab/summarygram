import * as sttProxy from '@derogab/stt-proxy';

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
  return sttProxy.isWhisperConfigured();
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
  try {
    const result = await sttProxy.transcribe(audioFilePath, {
      language: options?.language,
      translate: options?.translate,
    });

    return result.text || null;
  } catch (error) {
    console.error('STT transcription error:', error);
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
 * Transcribe audio from a buffer.
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
  try {
    const result = await sttProxy.transcribeBuffer(audioBuffer, {
      language: options?.language,
      translate: options?.translate,
    });

    return result.text || null;
  } catch (error) {
    console.error('STT transcription error:', error);
    return null;
  }
}

/**
 * Free the Whisper instance and release resources.
 * Call this when you're done using STT to free memory.
 */
export async function freeWhisper(): Promise<void> {
  await sttProxy.freeWhisper();
}

/**
 * Get available Whisper model names from HuggingFace.
 *
 * @returns Array of available model names.
 */
export function getAvailableModels(): string[] {
  return sttProxy.getAvailableModels();
}

/**
 * Get the HuggingFace URL for a model.
 *
 * @param modelName The model name (e.g., 'ggml-base.en.bin').
 * @returns The download URL.
 */
export function getModelUrl(modelName: string): string {
  return sttProxy.getModelUrl(modelName);
}
