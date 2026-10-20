import * as fs from 'fs';
import * as path from 'path';
import { EmotionalProfile, KEY_BASE_NOTES } from './emotionEngine.js';
import { MusicJobRequest, StemGains } from './types.js';

export const DEFAULT_STEM_GAINS: StemGains = {
  drums: 0.85,
  bass: 0.90,
  harmony: 0.75,
  melody: 0.95,
  atmosphere: 0.40,
};

// Helper: Seedable Pseudo-Random Generator (Xorshift)
export class PRNG {
  private state: number;
  constructor(seed: number = 42) {
    this.state = (seed ^ 0x6d2b79f5) >>> 0;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 4294967296;
  }
}

// Convert MIDI pitch to Frequency in Hz
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Write standard 48 kHz 16-bit Stereo PCM WAV file
export function writeWavFile(
  filePath: string,
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number = 48000
): void {
  const numSamples = leftChannel.length;
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const totalFileSize = 44 + dataSize;

  const buffer = Buffer.alloc(totalFileSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalFileSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // Audio format 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp to [-1.0, 1.0]
    let l = Math.max(-1.0, Math.min(1.0, leftChannel[i]));
    let r = Math.max(-1.0, Math.min(1.0, rightChannel[i]));

    // 16-bit signed integer
    const sampleL = Math.round(l < 0 ? l * 32768 : l * 32767);
    const sampleR = Math.round(r < 0 ? r * 32768 : r * 32767);

    buffer.writeInt16LE(sampleL, offset);
    buffer.writeInt16LE(sampleR, offset + 2);
    offset += 4;
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);
}

// Chords dictionary (intervals relative to root)
const CHORD_INTERVALS: Record<string, number[]> = {
  Major: [0, 4, 7, 11], // Maj7
  Minor: [0, 3, 7, 10], // m7
  Dorian: [0, 3, 7, 9], // m6
  Dominant: [0, 4, 7, 10], // 7
  Sus2: [0, 2, 7, 12],
  Sus4: [0, 5, 7, 12],
  Lydian: [0, 4, 6, 7, 11],
};

// Audio Stem Generators
export interface AudioStemBuffers {
  drumsL: Float32Array;
  drumsR: Float32Array;
  bassL: Float32Array;
  bassR: Float32Array;
  harmonyL: Float32Array;
  harmonyR: Float32Array;
  melodyL: Float32Array;
  melodyR: Float32Array;
  atmosphereL: Float32Array;
  atmosphereR: Float32Array;
}

export function generateCinematicStems(
  request: MusicJobRequest,
  profile: EmotionalProfile,
  sampleRate: number = 48000
): { buffers: AudioStemBuffers; stemGains: StemGains; totalSamples: number } {
  const duration_s = Math.max(5, Math.min(300, request.duration_s || 30));
  const totalSamples = Math.round(duration_s * sampleRate);
  const prng = new PRNG(request.seed || 42);

  const bpm = profile.suggestedTempo;
  const beatDuration = 60 / bpm;
  const beatsPerBar = profile.timeSignature === '3/4' ? 3 : 4;
  const barDuration = beatDuration * beatsPerBar;
  const totalBars = Math.ceil(duration_s / barDuration);

  // Allocate channel buffers
  const drumsL = new Float32Array(totalSamples);
  const drumsR = new Float32Array(totalSamples);
  const bassL = new Float32Array(totalSamples);
  const bassR = new Float32Array(totalSamples);
  const harmonyL = new Float32Array(totalSamples);
  const harmonyR = new Float32Array(totalSamples);
  const melodyL = new Float32Array(totalSamples);
  const melodyR = new Float32Array(totalSamples);
  const atmosphereL = new Float32Array(totalSamples);
  const atmosphereR = new Float32Array(totalSamples);

  const baseRoot = KEY_BASE_NOTES[profile.suggestedKey] || 60; // Middle C default

  // 1. GENERATE HARMONY & PADS (Warm Piano chords + Lyrical Strings)
  // Dynamic arc: gentle intro (0-20%), blooming warmth (20-60%), emotional climax (60-85%), peaceful resolution (85-100%)
  for (let bar = 0; bar < totalBars; bar++) {
    const barStart_s = bar * barDuration;
    const barStartSample = Math.round(barStart_s * sampleRate);
    if (barStartSample >= totalSamples) break;

    const barProgress = bar / totalBars;
    let sectionEnergy = 0.5;
    if (barProgress < 0.2) sectionEnergy = 0.35;
    else if (barProgress < 0.6) sectionEnergy = 0.65;
    else if (barProgress < 0.85) sectionEnergy = 0.95;
    else sectionEnergy = 0.45; // final resolution

    const chordIndex = bar % profile.chordProgression.length;
    // Cadence to root chord on final bar for emotional resolution
    const isFinalBar = bar === totalBars - 1 || barStart_s + barDuration >= duration_s - 1.5;
    const chordName = isFinalBar ? profile.chordProgression[0] : profile.chordProgression[chordIndex];

    const isMinor = chordName.includes('m') && !chordName.includes('Maj');
    const intervals = isMinor ? CHORD_INTERVALS.Minor : CHORD_INTERVALS.Major;

    // Chord root note
    let chordRoot = baseRoot;
    if (chordName.startsWith('F')) chordRoot = 53;
    else if (chordName.startsWith('G')) chordRoot = 55;
    else if (chordName.startsWith('A')) chordRoot = 57;
    else if (chordName.startsWith('Bb')) chordRoot = 58;
    else if (chordName.startsWith('B')) chordRoot = 59;
    else if (chordName.startsWith('C#')) chordRoot = 61;
    else if (chordName.startsWith('C')) chordRoot = 60;
    else if (chordName.startsWith('D')) chordRoot = 62;
    else if (chordName.startsWith('Eb')) chordRoot = 63;
    else if (chordName.startsWith('E')) chordRoot = 64;

    // Voicings: warm close voicing (root, 5th, 7th, 9th/3rd)
    const voicePitches = [
      chordRoot,
      chordRoot + intervals[1],
      chordRoot + intervals[2],
      chordRoot + 12 + (intervals[3] || 14),
    ];

    // Synthesize warm sustained strings & felt piano chord
    const chordDurationSamples = Math.min(totalSamples - barStartSample, Math.round((barDuration + 0.8) * sampleRate));
    for (const pitch of voicePitches) {
      const freq = midiToFreq(pitch);
      const detune = (prng.next() - 0.5) * 0.8;
      const freq2 = freq * (1 + detune * 0.003);

      for (let s = 0; s < chordDurationSamples; s++) {
        const idx = barStartSample + s;
        if (idx >= totalSamples) break;

        const t = s / sampleRate;
        // Natural piano/strings ADSR envelope
        let env = 1.0;
        const attackTime = 0.35;
        if (t < attackTime) {
          env = t / attackTime;
        } else {
          // Slow decay
          env = Math.exp(-(t - attackTime) / (barDuration * 1.8));
        }

        // Lyrical ensemble warmth (saw + sine + 5.5Hz vibrato)
        const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * 0.015 * Math.min(1.0, t);
        const osc1 = Math.sin(2 * Math.PI * (freq + vibrato) * t);
        const osc2 = Math.sin(2 * Math.PI * freq2 * t + 0.5) * 0.5;
        const overtone = Math.sin(4 * Math.PI * freq * t) * 0.25;

        const sample = (osc1 + osc2 + overtone) * env * 0.12 * sectionEnergy;
        harmonyL[idx] += sample * 0.85;
        harmonyR[idx] += sample * 0.95;
      }
    }

    // 2. GENERATE BASS (Deep warm contrabass / acoustic upright)
    // Follows chord root with subtle pedal notes and warm octave
    const bassPitch = chordRoot - 12; // 1 octave below
    const bassFreq = midiToFreq(bassPitch);
    const bassSamples = Math.min(totalSamples - barStartSample, Math.round(barDuration * sampleRate));

    for (let s = 0; s < bassSamples; s++) {
      const idx = barStartSample + s;
      if (idx >= totalSamples) break;

      const t = s / sampleRate;
      const attack = 0.06;
      let env = t < attack ? t / attack : Math.exp(-(t - attack) / (barDuration * 1.2));

      // Rich sub-bass with warm 2nd harmonic
      const fundamental = Math.sin(2 * Math.PI * bassFreq * t);
      const secondHarm = Math.sin(4 * Math.PI * bassFreq * t) * 0.35;
      const subRumble = Math.sin(Math.PI * bassFreq * t) * 0.2;

      const sample = (fundamental + secondHarm + subRumble) * env * 0.22 * sectionEnergy;
      bassL[idx] += sample * 0.9;
      bassR[idx] += sample * 0.9;
    }
  }

  // 3. GENERATE MELODY (Expressive Concert Piano / Lyrical Cello / Violin Lead)
  // Phrased in 2-bar and 4-bar lyrical contours, breathing between lines
  const phraseBars = 2;
  const numPhrases = Math.ceil(totalBars / phraseBars);

  for (let p = 0; p < numPhrases; p++) {
    const phraseStartBar = p * phraseBars;
    const phraseStart_s = phraseStartBar * barDuration;
    if (phraseStart_s >= duration_s - 0.5) break;

    const phraseProgress = phraseStartBar / totalBars;
    // Don't play melody immediately in first 2 seconds for tender intro; leave space
    if (phraseProgress < 0.1 && duration_s > 15) {
      // Intentionally sparse intro
      continue;
    }

    let phraseIntensity = 0.6;
    if (phraseProgress < 0.3) phraseIntensity = 0.45;
    else if (phraseProgress < 0.7) phraseIntensity = 0.75;
    else if (phraseProgress < 0.88) phraseIntensity = 1.0; // Climax
    else phraseIntensity = 0.5; // Final lingering note

    // Melodic Motifs based on emotion & contour
    // Intervals in semitones above base note
    let motif = [0, 4, 7, 9, 11, 12, 14, 16]; // Default lyrical Major
    if (profile.subEmotion === 'heartbreak' || profile.primaryEmotion === 'suspense') {
      motif = [0, 3, 5, 7, 8, 10, 12]; // Minor/Expressive
    } else if (profile.subEmotion === 'unrequited_love') {
      motif = [0, 2, 3, 7, 9, 12, 14]; // Dorian
    }

    // Number of notes in this phrase: romantic has delicate space (4 to 7 notes over 2 bars)
    const notesCount = profile.melodyContour === 'fragile_sparse' ? 4 : 6;
    const noteStep = (barDuration * phraseBars) / (notesCount + 1);

    for (let n = 0; n < notesCount; n++) {
      const noteTime_s = phraseStart_s + n * noteStep + (prng.next() * 0.08);
      const noteStartSample = Math.round(noteTime_s * sampleRate);
      if (noteStartSample >= totalSamples - sampleRate * 0.8) break;

      // Select pitch with gentle contour
      const motifOffset = motif[Math.floor(prng.next() * motif.length)];
      // If final bar, land on tonic (0 or 12)
      const isVeryEnd = noteTime_s >= duration_s - barDuration - 1.0;
      const pitch = isVeryEnd ? baseRoot + 12 : baseRoot + motifOffset;
      const freq = midiToFreq(pitch);

      // Note duration: longer for lyrical, short for staccato
      const noteLength_s = isVeryEnd ? 3.5 : Math.min(2.5, noteStep * 1.6);
      const noteSamples = Math.min(totalSamples - noteStartSample, Math.round(noteLength_s * sampleRate));

      for (let s = 0; s < noteSamples; s++) {
        const idx = noteStartSample + s;
        if (idx >= totalSamples) break;

        const t = s / sampleRate;
        // Piano/Cello hammer & string resonance model
        let env = 1.0;
        if (t < 0.02) {
          env = t / 0.02; // soft attack
        } else {
          env = Math.exp(-(t - 0.02) / 1.3);
        }

        // Lyrical expressiveness (gentle vibrato begins after 0.25s)
        const vibDepth = t > 0.25 ? Math.min(0.012, (t - 0.25) * 0.015) : 0;
        const vibrato = Math.sin(2 * Math.PI * 5.2 * t) * vibDepth;

        // Warm concert piano / cello harmonics
        const f1 = Math.sin(2 * Math.PI * (freq + vibrato) * t);
        const f2 = Math.sin(4 * Math.PI * freq * t) * 0.45;
        const f3 = Math.sin(6 * Math.PI * freq * t) * 0.18;
        const f4 = Math.sin(8 * Math.PI * freq * t) * 0.08;

        const sample = (f1 + f2 + f3 + f4) * env * 0.18 * phraseIntensity;
        // Subtle stereo panning between left and right hand
        melodyL[idx] += sample * 0.95;
        melodyR[idx] += sample * 0.85;
      }
    }
  }

  // 4. GENERATE DRUMS & CINEMATIC PERCUSSION (Subtle, never overpowering)
  // If emotion is unrequited love / heartbreak, drums are omitted or gentle heartbeat pulse
  const useDrums = profile.instrumentation.drums !== 'none';
  if (useDrums) {
    for (let bar = 0; bar < totalBars; bar++) {
      const barProgress = bar / totalBars;
      // In romantic & emotional cues, percussion only enters during build and climax
      if (barProgress < 0.25 && duration_s > 15) continue; // sparse intro
      if (barProgress > 0.92) continue; // let ending ring out without percussion

      const barStart_s = bar * barDuration;

      // Kick / Taiko pulse on beat 1 and beat 3
      const beats = [0, 2]; // 0 and 2 = beat 1 and 3 in 4/4
      for (const b of beats) {
        const hitTime_s = barStart_s + b * beatDuration;
        const hitStart = Math.round(hitTime_s * sampleRate);
        if (hitStart >= totalSamples) break;

        // Cinematic deep taiko/kick
        const hitLength = Math.min(totalSamples - hitStart, Math.round(0.8 * sampleRate));
        for (let s = 0; s < hitLength; s++) {
          const idx = hitStart + s;
          if (idx >= totalSamples) break;
          const t = s / sampleRate;
          // Pitch drop: 120Hz -> 42Hz
          const pitch = 42 + 78 * Math.exp(-t / 0.045);
          const env = Math.exp(-t / 0.22);
          const wave = Math.sin(2 * Math.PI * pitch * t);

          const sample = wave * env * 0.35 * (barProgress > 0.6 ? 1.0 : 0.6);
          drumsL[idx] += sample;
          drumsR[idx] += sample;
        }
      }

      // Soft brush snare / pizzicato click on beat 2 and 4
      if (barProgress > 0.35) {
        const snareBeats = [1, 3];
        for (const sb of snareBeats) {
          const snareTime_s = barStart_s + sb * beatDuration;
          const snareStart = Math.round(snareTime_s * sampleRate);
          if (snareStart >= totalSamples) break;

          const snareLen = Math.min(totalSamples - snareStart, Math.round(0.25 * sampleRate));
          for (let s = 0; s < snareLen; s++) {
            const idx = snareStart + s;
            if (idx >= totalSamples) break;
            const t = s / sampleRate;
            const env = Math.exp(-t / 0.06);
            // White noise filtered
            const noise = (prng.next() * 2 - 1) * 0.15;
            const body = Math.sin(2 * Math.PI * 180 * t) * 0.15;

            const sample = (noise + body) * env * 0.22;
            drumsL[idx] += sample * 0.9;
            drumsR[idx] += sample * 1.1;
          }
        }
      }
    }
  }

  // 5. GENERATE ATMOSPHERE & TEXTURE (Rain Ambience, Vinyl Warmth, Lush Reverb Tail)
  // Continuous evocative sonic bed that gives film-score depth and realism
  let rainFilterStateL = 0;
  let rainFilterStateR = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Gentle pink/brown noise for rain ambience & warm tape bed
    const whiteL = prng.next() * 2 - 1;
    const whiteR = prng.next() * 2 - 1;

    // 1-pole lowpass filter for soft rain/room tone
    rainFilterStateL += (whiteL - rainFilterStateL) * 0.035;
    rainFilterStateR += (whiteR - rainFilterStateR) * 0.035;

    // Slow organic swell in atmosphere
    const swell = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.08 * t);

    // Warm sub-ambience drone (fundamental 5th)
    const atmoDrone = Math.sin(2 * Math.PI * (midiToFreq(baseRoot - 12) * 0.5) * t) * 0.04;

    atmosphereL[i] = (rainFilterStateL * 0.08 + atmoDrone) * swell;
    atmosphereR[i] = (rainFilterStateR * 0.08 + atmoDrone) * swell;
  }

  // 6. ENFORCE MUST-HAVE 1: EXACT LENGTH & NATURAL MUSICAL RESOLUTION (NEVER A HARD CUT)
  // In the final 1.5 seconds, apply a musical exponential release curve down to zero
  const fadeOutDuration_s = Math.min(1.5, duration_s * 0.15);
  const fadeOutSamples = Math.round(fadeOutDuration_s * sampleRate);
  const fadeStartSample = totalSamples - fadeOutSamples;

  for (let i = fadeStartSample; i < totalSamples; i++) {
    const fadePos = (i - fadeStartSample) / fadeOutSamples; // 0.0 to 1.0
    // Cosine taper for organic musical fade out
    const gain = Math.cos((fadePos * Math.PI) / 2);

    drumsL[i] *= gain;
    drumsR[i] *= gain;
    bassL[i] *= gain;
    bassR[i] *= gain;
    harmonyL[i] *= gain;
    harmonyR[i] *= gain;
    melodyL[i] *= gain;
    melodyR[i] *= gain;
    atmosphereL[i] *= gain;
    atmosphereR[i] *= gain;
  }

  // Ensure last 5 samples are cleanly zeroed out (no pop or click)
  for (let i = totalSamples - 5; i < totalSamples; i++) {
    const g = (totalSamples - 1 - i) / 5;
    drumsL[i] *= g;
    drumsR[i] *= g;
    bassL[i] *= g;
    bassR[i] *= g;
    harmonyL[i] *= g;
    harmonyR[i] *= g;
    melodyL[i] *= g;
    melodyR[i] *= g;
    atmosphereL[i] *= g;
    atmosphereR[i] *= g;
  }

  return {
    buffers: {
      drumsL,
      drumsR,
      bassL,
      bassR,
      harmonyL,
      harmonyR,
      melodyL,
      melodyR,
      atmosphereL,
      atmosphereR,
    },
    stemGains: DEFAULT_STEM_GAINS,
    totalSamples,
  };
}

// Compute Master Mix as exact sum of stems using gains:
// mix = gain_drums * drums + gain_bass * bass + gain_harmony * harmony + gain_melody * melody + gain_atmosphere * atmosphere
export function computeMasterMix(
  buffers: AudioStemBuffers,
  gains: StemGains,
  totalSamples: number
): { mixL: Float32Array; mixR: Float32Array } {
  const mixL = new Float32Array(totalSamples);
  const mixR = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    mixL[i] =
      gains.drums * buffers.drumsL[i] +
      gains.bass * buffers.bassL[i] +
      gains.harmony * buffers.harmonyL[i] +
      gains.melody * buffers.melodyL[i] +
      gains.atmosphere * buffers.atmosphereL[i];

    mixR[i] =
      gains.drums * buffers.drumsR[i] +
      gains.bass * buffers.bassR[i] +
      gains.harmony * buffers.harmonyR[i] +
      gains.melody * buffers.melodyR[i] +
      gains.atmosphere * buffers.atmosphereR[i];
  }

  return { mixL, mixR };
}
