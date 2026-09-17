/**
 * A single shared TTS speaker for the web chat view, so only one reply is read
 * at a time and the UI can reflect whether it is speaking. Native (Android)
 * voice is preferred automatically by `Speaker`.
 */
import { useSyncExternalStore } from 'react';

import { isSpeechSupported, Speaker } from './speech';

let speaking = false;
let speaker: Speaker | null = null;
let currentRate = 1;
const listeners = new Set<() => void>();

/** Apply the user's speaking speed; rebuilds the shared speaker if it changes. */
export function setSpeechRate(rate: number): void {
  const next = Math.min(2, Math.max(0.5, rate));
  if (next === currentRate) return;
  currentRate = next;
  speaker?.cancel();
  speaker = null;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function setSpeaking(value: boolean): void {
  if (speaking === value) return;
  speaking = value;
  emit();
}

function getSpeaker(): Speaker | null {
  if (!isSpeechSupported()) return null;
  if (!speaker) {
    speaker = new Speaker(
      {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      },
      currentRate,
    );
  }
  return speaker;
}

export function speakText(text: string): void {
  const instance = getSpeaker();
  if (!instance) return;
  instance.cancel();
  setSpeaking(true);
  instance.speak(text);
}

export function stopSpeaking(): void {
  speaker?.cancel();
  setSpeaking(false);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSpeaking(): boolean {
  return useSyncExternalStore(subscribe, () => speaking, () => false);
}
