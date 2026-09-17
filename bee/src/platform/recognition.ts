/**
 * Speech-to-text (dictation). Prefers the Android app's native recognizer
 * (`window.AndroidVoice`, via `nativeVoice.ts`); otherwise uses the Web Speech API.
 * Feature-detected, so the UI can hide the microphone where neither is available.
 */

import {
  androidVoice,
  hasNativeVoice,
  installNativeVoice,
  setListeningHandler,
  setTranscriptHandler,
} from './nativeVoice';

// Minimal structural types for the (prefixed) Web Speech recognition API. Defined
// here rather than relying on the experimental `SpeechRecognition` DOM typings.
export interface RecognitionAlternative {
  transcript: string;
}

export interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}

export interface RecognitionResultList {
  length: number;
  [index: number]: RecognitionResult;
}

interface RecognitionEventLike {
  results: RecognitionResultList;
}

interface RecognitionErrorEventLike {
  error: string;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

export function isRecognitionSupported(): boolean {
  return Boolean(recognitionCtor()) || hasNativeVoice();
}

/** Flatten a recognition result list into committed (`final`) and live (`interim`) text. */
export function readTranscript(results: RecognitionResultList): { final: string; interim: string } {
  let final = '';
  let interim = '';
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const text = result[0]?.transcript ?? '';
    if (result.isFinal) final += text;
    else interim += text;
  }
  return { final: final.trim(), interim: interim.trim() };
}

export interface DictationCallbacks {
  /** Latest transcript of the current dictation (partial results replace earlier ones). */
  onTranscript?: (text: string, isFinal: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/** BCP-47 language tag for dictation, from the app locale. */
export function recognitionLang(locale: string): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

/** A single dictation session. `available` is false when nothing supports capture. */
export class Dictation {
  private readonly callbacks: DictationCallbacks;
  private readonly lang: string;
  private readonly native: boolean;
  private readonly recognition: RecognitionLike | null;

  constructor(lang: string, callbacks: DictationCallbacks = {}) {
    this.callbacks = callbacks;
    this.lang = lang;
    this.native = hasNativeVoice();

    if (this.native) {
      installNativeVoice();
      this.recognition = null;
      setTranscriptHandler((text, isFinal) => this.callbacks.onTranscript?.(text, isFinal));
      setListeningHandler((state) => {
        if (state === 'start') this.callbacks.onStart?.();
        else if (state === 'error') this.callbacks.onError?.('native');
        else this.callbacks.onEnd?.();
      });
      return;
    }

    const Ctor = recognitionCtor();
    if (!Ctor) {
      this.recognition = null;
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => this.callbacks.onStart?.();
    recognition.onresult = (event) => {
      const { final, interim } = readTranscript(event.results);
      const lastIndex = event.results.length - 1;
      const isFinal = lastIndex >= 0 ? event.results[lastIndex].isFinal : false;
      this.callbacks.onTranscript?.(interim ? `${final} ${interim}`.trim() : final, isFinal);
    };
    recognition.onerror = (event) => this.callbacks.onError?.(event.error);
    recognition.onend = () => this.callbacks.onEnd?.();
    this.recognition = recognition;
  }

  get available(): boolean {
    return this.native || this.recognition !== null;
  }

  start(): void {
    if (this.native) {
      androidVoice()?.startListening?.(this.lang);
      return;
    }
    try {
      this.recognition?.start();
    } catch {
      // Already started — ignore.
    }
  }

  stop(): void {
    if (this.native) {
      androidVoice()?.stopListening?.();
      return;
    }
    try {
      this.recognition?.stop();
    } catch {
      // Not started — ignore.
    }
  }
}
