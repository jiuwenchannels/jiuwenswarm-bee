/**
 * Text-to-speech via the Web Speech API (built into Chromium/WebView2), with
 * lightweight lip-sync hooks: `onBoundary` fires on word boundaries so the
 * avatar's mouth can pulse while it speaks.
 *
 * The module is browser-only; everything is guarded so imports are safe in tests.
 */

export interface SpeakerCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: () => void;
  onError?: (message: string) => void;
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/** Strip markdown/formatting so the voice reads prose, not syntax. */
export function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Prefer a natural English voice, else the first available. */
export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const english = voices.filter((voice) => (voice.lang || '').toLowerCase().startsWith('en'));
  const preferred = english.find((voice) =>
    /aria|jenny|samantha|zira|female|natural/i.test(voice.name),
  );
  return preferred ?? english[0] ?? voices[0];
}

export function splitSentences(text: string): string[] {
  const clean = stripForSpeech(text);
  if (!clean) return [];
  return clean
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export class Speaker {
  private readonly callbacks: SpeakerCallbacks;
  private voice: SpeechSynthesisVoice | undefined;
  private queue: string[] = [];
  private speaking = false;
  private cancelled = false;

  constructor(callbacks: SpeakerCallbacks = {}) {
    this.callbacks = callbacks;
    if (isSpeechSupported()) {
      this.refreshVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.refreshVoices());
    }
  }

  get speakingNow(): boolean {
    return this.speaking;
  }

  private refreshVoices(): void {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) this.voice = pickVoice(voices);
  }

  speak(text: string): void {
    if (!isSpeechSupported()) return;
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;
    this.cancelled = false;
    this.queue.push(...sentences);
    if (!this.speaking) this.processNext();
  }

  cancel(): void {
    if (!isSpeechSupported()) return;
    this.cancelled = true;
    this.queue = [];
    window.speechSynthesis.cancel();
    if (this.speaking) {
      this.speaking = false;
      this.callbacks.onEnd?.();
    }
  }

  private processNext(): void {
    const sentence = this.queue.shift();
    if (!sentence || this.cancelled) {
      this.speaking = false;
      this.callbacks.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentence);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      this.speaking = true;
      this.callbacks.onStart?.();
    };
    utterance.onboundary = () => this.callbacks.onBoundary?.();
    utterance.onerror = (event) => {
      this.callbacks.onError?.(String(event.error ?? 'speech error'));
      this.speaking = false;
      this.callbacks.onEnd?.();
    };
    utterance.onend = () => {
      if (this.queue.length > 0 && !this.cancelled) {
        this.processNext();
      } else {
        this.speaking = false;
        this.callbacks.onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  }
}
