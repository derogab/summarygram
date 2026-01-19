declare module '@derogab/stt-proxy' {
  export interface TranscribeOptions {
    language?: string;
    translate?: boolean;
  }

  export interface TranscribeOutput {
    text: string;
  }

  export function transcribe(audio: string | Buffer, options?: TranscribeOptions): Promise<TranscribeOutput>;
  export function transcribeBuffer(audioBuffer: Buffer, options?: TranscribeOptions): Promise<TranscribeOutput>;
  export function isWhisperConfigured(): boolean;
  export function freeWhisper(): Promise<void>;
  export function getAvailableModels(): string[];
  export function getModelUrl(model: string): string;
}
