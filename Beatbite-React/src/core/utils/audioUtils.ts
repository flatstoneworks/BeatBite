/**
 * Shared audio utility functions.
 */

/**
 * Convert a frequency (Hz) to a note name like "A4", "C#3".
 */
export function frequencyToNoteName(frequency: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const a4 = 440;
  const semitones = 12 * Math.log2(frequency / a4);
  const noteIndex = Math.round(semitones) + 9; // A is at index 9
  const octave = Math.floor((noteIndex + 3) / 12) + 4;
  const noteName = noteNames[((noteIndex % 12) + 12) % 12];
  return `${noteName}${octave}`;
}

/**
 * Create a buffer filled with white noise.
 */
export function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

/**
 * Create a distortion curve for waveshaping.
 */
export function createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 44100;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  const deg = Math.PI / 180;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }

  return curve;
}
