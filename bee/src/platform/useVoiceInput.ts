/**
 * One voice-input engine for the whole app. Encapsulates the platform choice
 * (Web Speech in the browser/Android, offline whisper in the desktop shells),
 * barge-in, and the release/blur/60s safety. Consumers just render a control
 * and call `begin`/`end`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocaleContext } from '../i18n/LocaleContext';
import { isDesktop, shellTranscribe, shellVoiceAvailable } from './desktop';
import { Dictation, isRecognitionSupported, recognitionLang } from './recognition';
import { ShellRecorder } from './recorder';
import { stopSpeaking } from './speakerStore';

export interface VoiceInput {
  /** True when a recognizer exists here (web/mic or an installed shell engine). */
  available: boolean;
  listening: boolean;
  /** True while a shell recording is being transcribed (no live transcript there). */
  processing: boolean;
  /** Live transcript while listening (web path). */
  transcript: string;
  begin: () => void;
  end: (submit: boolean) => void;
}

export function useVoiceInput(onResult: (text: string) => void, enabled = true): VoiceInput {
  const { locale } = useLocaleContext();
  const [shellVoice, setShellVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const dictationRef = useRef<Dictation | null>(null);
  const recorderRef = useRef<ShellRecorder | null>(null);
  const transcriptRef = useRef('');
  const pttRef = useRef(false);
  const available = shellVoice || (isRecognitionSupported() && !isDesktop());

  useEffect(() => {
    let alive = true;
    void shellVoiceAvailable().then((value) => {
      if (alive) setShellVoice(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  const end = useCallback(
    (submit: boolean) => {
      if (!pttRef.current) return;
      pttRef.current = false;
      setListening(false);
      setTranscript('');

      if (shellVoice) {
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (!recorder) return;
        setProcessing(true);
        void recorder.stop().then(async (wav) => {
          if (!submit || !wav) {
            setProcessing(false);
            return;
          }
          const text = await shellTranscribe(wav, locale === 'zh' ? 'zh' : 'en');
          setProcessing(false);
          if (text) onResult(text);
        });
        return;
      }

      dictationRef.current?.stop();
      dictationRef.current = null;
      const text = transcriptRef.current.trim();
      transcriptRef.current = '';
      if (submit && text) onResult(text);
    },
    [shellVoice, locale, onResult],
  );

  const begin = useCallback(() => {
    if (!available || !enabled || listening) return;
    stopSpeaking(); // barge-in
    transcriptRef.current = '';
    setTranscript('');
    setProcessing(false);
    pttRef.current = true;

    if (shellVoice) {
      const recorder = new ShellRecorder();
      recorderRef.current = recorder;
      void recorder.start().then((ok) => {
        if (!ok || !pttRef.current) {
          if (ok) void recorder.stop();
          if (recorderRef.current === recorder) recorderRef.current = null;
          if (!ok) pttRef.current = false;
          return;
        }
        setListening(true);
      });
      return;
    }

    const dictation = new Dictation(recognitionLang(locale), {
      onStart: () => setListening(true),
      onTranscript: (text) => {
        transcriptRef.current = text;
        setTranscript(text);
      },
      onEnd: () => {
        if (pttRef.current) end(true);
      },
      onError: () => {
        pttRef.current = false;
        setListening(false);
      },
    });
    if (!dictation.available) {
      pttRef.current = false;
      return;
    }
    dictationRef.current = dictation;
    dictation.start();
  }, [available, enabled, listening, shellVoice, end, locale]);

  // Release/blur outside the (tiny) window must end the talk; cap the length.
  useEffect(() => {
    if (!listening) return;
    const finish = () => end(true);
    const cancel = () => end(false);
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('blur', finish);
    const maxTimer = window.setTimeout(finish, 60_000);
    return () => {
      window.removeEventListener('pointerup', finish, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('blur', finish);
      window.clearTimeout(maxTimer);
    };
  }, [listening, end]);

  useEffect(
    () => () => {
      dictationRef.current?.stop();
      void recorderRef.current?.stop();
    },
    [],
  );

  return { available, listening, processing, transcript, begin, end };
}
