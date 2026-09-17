/**
 * Microphone capture for shell-side speech-to-text (Electron / Tauri).
 *
 * The browser can use the Web Speech API directly, but the desktop shells have
 * no cloud recognizer, so push-to-talk there records locally and hands 16 kHz
 * mono WAV bytes to a native whisper.cpp process. This module owns only the
 * capture → WAV step; the transcription itself lives in the shell.
 */

const TARGET_RATE = 16_000;

export class ShellRecorder {
  private chunks: Blob[] = [];
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private active = false;

  async start(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    this.active = true;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.active = false;
      return false;
    }
    // Released (stop) while we were still acquiring the mic: bail and free it.
    if (!this.active) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    this.stream = stream;
    this.chunks = [];
    this.recorder = new MediaRecorder(stream);
    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    this.recorder.start();
    return true;
  }

  /** Stop and resolve the recorded audio as a WAV (16 kHz mono) ArrayBuffer. */
  stop(): Promise<ArrayBuffer | null> {
    this.active = false;
    const recorder = this.recorder;
    if (!recorder) {
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = null;
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      recorder.addEventListener(
        'stop',
        () => {
          this.stream?.getTracks().forEach((track) => track.stop());
          const type = recorder.mimeType || 'audio/webm';
          void encodeWav(new Blob(this.chunks, { type })).then(resolve);
        },
        { once: true },
      );
      recorder.stop();
    });
  }
}

/** Decode a recorded blob and re-encode it as 16 kHz mono 16-bit PCM WAV. */
export async function encodeWav(blob: Blob): Promise<ArrayBuffer | null> {
  try {
    const bytes = await blob.arrayBuffer();
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes);
    await context.close();
    const channel = decoded.getChannelData(0);
    const samples = resample(channel, decoded.sampleRate, TARGET_RATE);
    return pcmToWav(samples, TARGET_RATE);
  } catch {
    return null;
  }
}

function resample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, input.length - 1);
    const fraction = position - lower;
    output[i] = input[lower] * (1 - fraction) + input[upper] * fraction;
  }
  return output;
}

function pcmToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}
