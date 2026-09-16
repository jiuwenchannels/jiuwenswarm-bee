/**
 * Speech-to-text (dictation) via the Web Speech API — the mirror of the TTS in
 * `speech.ts`. Feature-detected, so the UI can hide the microphone where it isn't
 * available (Firefox, and typically Electron / Android WebView).
 *
 * The module only holds plain types and callbacks so it is safe to import in tests.
 */

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
  return Boolean(recognitionCtor());
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
  /** Full transcript of the current dictation (final + interim). */
  onTranscript?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/** A single dictation session. `available` is false when the API is unsupported. */
export class Dictation {
  private readonly callbacks: DictationCallbacks;
  private readonly recognition: RecognitionLike | null;

  constructor(lang: string, callbacks: DictationCallbacks = {}) {
    this.callbacks = callbacks;
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
      this.callbacks.onTranscript?.(interim ? `${final} ${interim}`.trim() : final);
    };
    recognition.onerror = (event) => this.callbacks.onError?.(event.error);
    recognition.onend = () => this.callbacks.onEnd?.();
    this.recognition = recognition;
  }

  get available(): boolean {
    return this.recognition !== null;
  }

  start(): void {
    try {
      this.recognition?.start();
    } catch {
      // Already started — ignore.
    }
  }

  stop(): void {
    try {
      this.recognition?.stop();
    } catch {
      // Not started — ignore.
    }
  }
}

/** BCP-47 language tag for dictation, from the app locale. */
export function recognitionLang(locale: string): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}
