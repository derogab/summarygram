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
  return modelPath !== null && fs.existsSync(modelPath);
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
    const result = await transcribe(audioFilePath, options);
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
    const result = await transcribe(audioBuffer, options);
    return result.text || null;
  } catch (error) {
    console.error('STT transcription error:', error);
    return null;
  }
}

/**
 * Free the Whisper instance and release resources.
 * Note: In @derogab/stt-proxy v0.2.0+, resource management is handled automatically.
 * This function is kept for backward compatibility but is a no-op.
 */
export async function freeWhisper(): Promise<void> {
  // No-op: resource management is handled automatically by @derogab/stt-proxy
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
