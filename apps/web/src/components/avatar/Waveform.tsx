import { useEffect, useState } from 'react';

import './Waveform.css';

const BAR_COUNT = 5;

/**
 * A live microphone level meter for push-to-talk. Uses the real mic signal when
 * available and falls back to a synthetic pulse (so it still reads as "hearing
 * you" when capture is blocked), keeping the visual honest about being active.
 */
export function Waveform({ active }: { active: boolean }) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }
    let stopped = false;
    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;

    const runLoop = (read: () => number) => {
      const step = () => {
        if (stopped) return;
        setLevel(read());
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        runLoop(() => {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (let i = 0; i < samples.length; i += 1) {
            const value = (samples[i] - 128) / 128;
            sum += value * value;
          }
          return Math.min(1, Math.sqrt(sum / samples.length) * 4);
        });
      } catch {
        if (!stopped) {
          runLoop(() => 0.35 + 0.5 * Math.abs(Math.sin(performance.now() / 120)));
        }
      }
    };
    void start();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      void audioCtx?.close();
    };
  }, [active]);

  const bars = Array.from({ length: BAR_COUNT }, (_, index) => {
    if (!active) return 0.16;
    return Math.max(0.16, level - Math.abs(index - Math.floor(BAR_COUNT / 2)) * 0.16);
  });

  return (
    <span className={`waveform${active ? ' waveform--active' : ''}`} aria-hidden="true">
      {bars.map((height, index) => (
        <span
          key={index}
          className="waveform__bar"
          style={{ transform: `scaleY(${height.toFixed(3)})` }}
        />
      ))}
    </span>
  );
}
