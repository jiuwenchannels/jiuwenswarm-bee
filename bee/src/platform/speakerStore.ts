/**
 * A single shared TTS speaker for the web chat view, so only one reply is read
 * at a time and the UI can reflect whether it is speaking. Native (Android)
 * voice is preferred automatically by `Speaker`.
 */
import { useSyncExternalStore } from 'react';

import { isSpeechSupported, Speaker } from './speech';

let speaking = false;
let speaker: Speaker | null = null;
const listeners = new Set<() => void>();

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
    speaker = new Speaker({
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
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
