import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  hasNativeVoice,
  installNativeVoice,
  setListeningHandler,
  setSpeechHandler,
  setTranscriptHandler,
} from './nativeVoice';

interface BeeVoiceGlobal {
  onSpeech: (state: string) => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onListening: (state: string) => void;
}

function beeVoice(): BeeVoiceGlobal {
  return (window as unknown as { __beeVoice: BeeVoiceGlobal }).__beeVoice;
}

afterEach(() => {
  setSpeechHandler(null);
  setTranscriptHandler(null);
  setListeningHandler(null);
});

describe('nativeVoice', () => {
  it('has no bridge in the test environment', () => {
    expect(hasNativeVoice()).toBe(false);
  });

  it('forwards native events to the registered handlers', () => {
    installNativeVoice();
    const speech = vi.fn();
    const transcript = vi.fn();
    const listening = vi.fn();
    setSpeechHandler(speech);
    setTranscriptHandler(transcript);
    setListeningHandler(listening);

    beeVoice().onSpeech('boundary');
    beeVoice().onTranscript('hi', true);
    beeVoice().onListening('end');

    expect(speech).toHaveBeenCalledWith('boundary');
    expect(transcript).toHaveBeenCalledWith('hi', true);
    expect(listening).toHaveBeenCalledWith('end');
  });
});
