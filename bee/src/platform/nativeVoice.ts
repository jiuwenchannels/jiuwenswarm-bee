/**
 * Bridge to the Android app's native voice, exposed as `window.AndroidVoice` by
 * `VoiceBridge.java`. The native side pushes events back through a single global,
 * `window.__beeVoice`, which this module owns so both TTS (`speech.ts`) and dictation
 * (`recognition.ts`) can share it.
 */

export interface AndroidVoiceBridge {
  speak?: (text: string, rate?: number) => void;
  stopSpeaking?: () => void;
  startListening?: (lang: string) => void;
  stopListening?: () => void;
  log?: (message: string) => void;
}

export type SpeechState = 'start' | 'end' | 'boundary';
export type ListeningState = 'start' | 'end' | 'error';

let speechHandler: ((state: SpeechState) => void) | null = null;
let transcriptHandler: ((text: string, isFinal: boolean) => void) | null = null;
let listeningHandler: ((state: ListeningState) => void) | null = null;
let installed = false;

export function androidVoice(): AndroidVoiceBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { AndroidVoice?: AndroidVoiceBridge }).AndroidVoice;
}

export function hasNativeVoice(): boolean {
  return Boolean(androidVoice());
}

/** Mirror a web-side event into the native logcat stream (no-op elsewhere). */
export function voiceLog(message: string): void {
  androidVoice()?.log?.(message);
  if (typeof console !== 'undefined') console.log(`[voice] ${message}`);
}

/** Install the global callback object once (native TTS/recognition push into it). */
export function installNativeVoice(): void {
  if (installed || typeof window === 'undefined') return;
  (window as unknown as { __beeVoice?: unknown }).__beeVoice = {
    onSpeech: (state: SpeechState) => speechHandler?.(state),
    onTranscript: (text: string, isFinal: boolean) => transcriptHandler?.(text, isFinal),
    onListening: (state: ListeningState) => listeningHandler?.(state),
  };
  installed = true;
}

export function setSpeechHandler(handler: ((state: SpeechState) => void) | null): void {
  speechHandler = handler;
}

export function setTranscriptHandler(
  handler: ((text: string, isFinal: boolean) => void) | null,
): void {
  transcriptHandler = handler;
}

export function setListeningHandler(handler: ((state: ListeningState) => void) | null): void {
  listeningHandler = handler;
}
