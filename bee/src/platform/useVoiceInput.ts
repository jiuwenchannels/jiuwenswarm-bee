/**
 * One voice-input engine for the whole app. Encapsulates the platform choice
 * (Web Speech in the browser/Android, offline whisper in the desktop shells),
 * barge-in, and the release/blur/60s safety. Consumers just render a control
 * and call `begin`/`end`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocaleContext } from '../i18n/LocaleContext';
import { isDesktop, shellTranscribe, shellVoiceAvailable } from './desktop';
import { hasNativeVoice, voiceLog } from './nativeVoice';
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
  // Android delivers partials while you hold, then the final result only *after*
  // stop() — so hold the last partial and prefer the final when it lands.
  const awaitingFinalRef = useRef(false);
  const pendingTextRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const clearFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (!awaitingFinalRef.current) return;
    awaitingFinalRef.current = false;
    clearFlush();
    // Prefer the final transcript; fall back to the last partial if none came.
    const text = (transcriptRef.current || pendingTextRef.current).trim();
    transcriptRef.current = '';
    pendingTextRef.current = '';
    voiceLog(`flush text="${text}"`);
    if (text) onResult(text);
  }, [clearFlush, onResult]);

  const end = useCallback(
    (submit: boolean) => {
      if (!pttRef.current) return;
      pttRef.current = false;
      setListening(false);
      setTranscript('');
      voiceLog(`end submit=${submit} shell=${shellVoice}`);

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

      const dictation = dictationRef.current;
      dictationRef.current = null;
      dictation?.stop();

      if (!submit) {
        awaitingFinalRef.current = false;
        pendingTextRef.current = '';
        clearFlush();
        transcriptRef.current = '';
        return;
      }

      const text = transcriptRef.current.trim();
      if (text && !hasNativeVoice()) {
        transcriptRef.current = '';
        voiceLog(`send text="${text}"`);
        onResult(text);
        return;
      }
      // Native (or nothing captured yet): give the platform a moment to deliver
      // its final transcript, then fall back to the last partial.
      pendingTextRef.current = text;
      awaitingFinalRef.current = true;
      voiceLog(`end: awaiting final (partial="${text}")`);
      flushTimerRef.current = setTimeout(flush, text ? 700 : 1500);
    },
    [shellVoice, locale, onResult, clearFlush, flush],
  );

  const begin = useCallback(() => {
    if (!available || !enabled || listening) return;
    voiceLog(`begin available=${available} shell=${shellVoice} enabled=${enabled}`);
    stopSpeaking(); // barge-in
    transcriptRef.current = '';
    setTranscript('');
    setProcessing(false);
    awaitingFinalRef.current = false;
    pendingTextRef.current = '';
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
      onStart: () => {
        voiceLog('onStart');
        if (pttRef.current) setListening(true);
      },
      onTranscript: (text, isFinal) => {
        voiceLog(`onTranscript final=${isFinal} text="${text}"`);
        // Ignore late events from a previous session; only the active press
        // (or one waiting on its final result) may write the transcript.
        if (!pttRef.current && !awaitingFinalRef.current) return;
        transcriptRef.current = text;
        setTranscript(text);
        if (isFinal) flush();
      },
      onEnd: () => {
        if (pttRef.current) end(true);
      },
      onError: () => {
        voiceLog('onError');
        if (!pttRef.current && !awaitingFinalRef.current) return;
        pttRef.current = false;
        awaitingFinalRef.current = false;
        pendingTextRef.current = '';
        clearFlush();
        setListening(false);
      },
    });
    if (!dictation.available) {
      pttRef.current = false;
      return;
    }
    dictationRef.current = dictation;
    dictation.start();
  }, [available, enabled, listening, shellVoice, end, locale, flush, clearFlush]);

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
      clearFlush();
    },
    [clearFlush],
  );

  return { available, listening, processing, transcript, begin, end };
}
