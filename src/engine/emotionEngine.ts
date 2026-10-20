import { BeatGridItem, MusicJobRequest, MusicSection } from './types.js';

export interface EmotionalProfile {
  primaryEmotion: string;
  subEmotion: string;
  narrativePurpose: string;
  sceneArchetype: string;
  referenceInfluence: string;
  tonalCharacter: string;
  suggestedTempo: number;
  suggestedKey: string;
  timeSignature: '4/4' | '3/4' | '6/8';
  chordProgression: string[];
  scaleNotes: number[]; // MIDI root offsets
  melodyContour: 'lyrical_step' | 'sweeping_arpeggio' | 'fragile_sparse' | 'uplifting_leap' | 'tense_ostinato';
  instrumentation: {
    melody: 'grand_piano' | 'felt_piano' | 'lyrical_cello' | 'solo_violin' | 'nylon_guitar' | 'woodwind_flute';
    harmony: 'warm_strings' | 'felt_piano' | 'analog_pad' | 'orchestral_brass';
    bass: 'contrabass' | 'warm_sub' | 'acoustic_upright';
    drums: 'subtle_cinematic' | 'taiko_timpani' | 'brush_snare' | 'acoustic_percussion' | 'none';
    atmosphere: 'rain_ambience' | 'tape_flutter' | 'lush_reverb' | 'shimmer_crystals';
  };
}

// Standard MIDI base pitches: C3=48, C4=60, C5=72
export const KEY_BASE_NOTES: Record<string, number> = {
  'C Major': 60,
  'D Major': 62,
  'Eb Major': 63,
  'E Major': 64,
  'F Major': 65,
  'G Major': 67,
  'Ab Major': 68,
  'A Major': 69,
  'Bb Major': 70,
  'A Minor': 57,
  'B Minor': 59,
  'C Minor': 60,
  'C# Minor': 61,
  'D Minor': 62,
  'E Minor': 64,
  'F Minor': 65,
  'G Minor': 67,
  'D Dorian': 62,
  'E Lydian': 64,
};

export function analyzeEmotionAndScene(request: MusicJobRequest): EmotionalProfile {
  const text = `${request.prompt || ''} ${request.reference_film || ''} ${request.primary_emotion || ''} ${request.sub_emotion || ''}`.toLowerCase();

  // Romantic variations
  const isRomantic = text.includes('romantic') || text.includes('love') || text.includes('intimate') || text.includes('tender') || text.includes('heartbreak') || text.includes('longing');
  const isTriumph = text.includes('triumph') || text.includes('victory') || text.includes('epic') || text.includes('launch') || text.includes('heroic') || text.includes('uplifting');
  const isSuspense = text.includes('suspense') || text.includes('dread') || text.includes('tense') || text.includes('thriller') || text.includes('dark') || text.includes('mystery');
  const isWonder = text.includes('wonder') || text.includes('discovery') || text.includes('universe') || text.includes('space') || text.includes('peaceful') || text.includes('meditation');
  const isLofiAcoustic = text.includes('acoustic pop') || text.includes('corporate') || text.includes('product') || text.includes('upbeat');

  // Specific romantic sub-types
  let subEmotion = request.sub_emotion || 'intimate_love';
  let primaryEmotion = request.primary_emotion || 'romantic_love';

  if (isRomantic) {
    primaryEmotion = 'romantic_love';
    if (text.includes('first love') || text.includes('innocent') || text.includes('delicate') || text.includes('crush')) {
      subEmotion = 'first_love';
    } else if (text.includes('passionate') || text.includes('sweep') || text.includes('embrace') || text.includes('intense')) {
      subEmotion = 'passionate_romance';
    } else if (text.includes('unrequited') || text.includes('distance') || text.includes('yearning') || text.includes('longing')) {
      subEmotion = 'unrequited_love';
    } else if (text.includes('heartbreak') || text.includes('sad') || text.includes('cry') || text.includes('grief') || text.includes('lost')) {
      subEmotion = 'heartbreak';
    } else if (text.includes('reunion') || text.includes('reunited') || text.includes('together again') || text.includes('welcome home')) {
      subEmotion = 'reunion';
    } else if (text.includes('nostalgic') || text.includes('memory') || text.includes('past') || text.includes('vintage')) {
      subEmotion = 'nostalgic_love';
    } else {
      subEmotion = 'intimate_love';
    }
  } else if (isTriumph || isLofiAcoustic) {
    primaryEmotion = isTriumph ? 'triumph' : 'hopeful_optimism';
    subEmotion = isTriumph ? 'heroic_victory' : 'corporate_launch';
  } else if (isSuspense) {
    primaryEmotion = 'suspense';
    subEmotion = text.includes('dread') ? 'dread' : 'psychological_tension';
  } else if (isWonder) {
    primaryEmotion = 'wonder';
    subEmotion = 'awe_discovery';
  }

  // Reference influence
  let referenceInfluence = 'Original CutSync Studio Engine';
  if (text.includes('zimmer') || text.includes('inception') || text.includes('interstellar')) {
    referenceInfluence = 'Atmospheric slow-burn swelling strings and deep ostinato (Inspired by contemporary cinematic style)';
  } else if (text.includes('williams') || text.includes('classic hollywood') || text.includes('star wars')) {
    referenceInfluence = 'Orchestral melodic counterpoint and rich harmonic modulation';
  } else if (text.includes('morricone') || text.includes('cinema paradiso')) {
    referenceInfluence = 'Expressive lyrical solo melody, nostalgic strings and emotional warmth';
  } else if (text.includes('indian') || text.includes('bollywood') || text.includes('rahman')) {
    referenceInfluence = 'Warm emotional phrasing, soaring violin lines, gentle rhythmic pulse and tender piano';
  } else if (text.includes('hisaishi') || text.includes('ghibli')) {
    referenceInfluence = 'Wistful pentatonic-infused piano motif with delicate woodwinds and lyrical strings';
  } else if (text.includes('einaudi') || text.includes('minimalist')) {
    referenceInfluence = 'Meditative repetitive piano arpeggios with gradual harmonic bloom';
  }

  // Tonal character, tempo, chords based on emotion
  let tempo = request.tempo_bpm || 72;
  let key = request.key || 'F Major';
  let timeSig: '4/4' | '3/4' | '6/8' = '4/4';
  let chords = ['F', 'Bb', 'Dm', 'C'];
  let melodyContour: EmotionalProfile['melodyContour'] = 'lyrical_step';
  let instMelody: EmotionalProfile['instrumentation']['melody'] = 'grand_piano';
  let instHarmony: EmotionalProfile['instrumentation']['harmony'] = 'warm_strings';
  let instBass: EmotionalProfile['instrumentation']['bass'] = 'contrabass';
  let instDrums: EmotionalProfile['instrumentation']['drums'] = 'subtle_cinematic';
  let instAtmo: EmotionalProfile['instrumentation']['atmosphere'] = 'rain_ambience';

  if (primaryEmotion === 'romantic_love') {
    switch (subEmotion) {
      case 'first_love':
        tempo = request.tempo_bpm || 80;
        key = request.key || 'D Major';
        chords = ['D', 'G', 'Bm', 'A'];
        melodyContour = 'uplifting_leap';
        instMelody = 'nylon_guitar';
        instHarmony = 'felt_piano';
        instBass = 'acoustic_upright';
        instDrums = 'brush_snare';
        instAtmo = 'tape_flutter';
        break;
      case 'passionate_romance':
        tempo = request.tempo_bpm || 76;
        key = request.key || 'Eb Major';
        chords = ['Eb', 'Ab', 'Cm', 'Bb'];
        melodyContour = 'sweeping_arpeggio';
        instMelody = 'solo_violin';
        instHarmony = 'warm_strings';
        instBass = 'contrabass';
        instDrums = 'taiko_timpani';
        instAtmo = 'lush_reverb';
        break;
      case 'unrequited_love':
        tempo = request.tempo_bpm || 66;
        key = request.key || 'D Dorian';
        chords = ['Dm', 'G', 'Bb', 'A7'];
        melodyContour = 'fragile_sparse';
        instMelody = 'lyrical_cello';
        instHarmony = 'felt_piano';
        instBass = 'contrabass';
        instDrums = 'none';
        instAtmo = 'rain_ambience';
        break;
      case 'heartbreak':
        tempo = request.tempo_bpm || 62;
        key = request.key || 'D Minor';
        chords = ['Dm', 'Bb', 'Gm', 'A'];
        melodyContour = 'fragile_sparse';
        instMelody = 'grand_piano';
        instHarmony = 'warm_strings';
        instBass = 'contrabass';
        instDrums = 'none';
        instAtmo = 'rain_ambience';
        break;
      case 'reunion':
        tempo = request.tempo_bpm || 78;
        key = request.key || 'C Major';
        chords = ['C', 'F', 'Am', 'G'];
        melodyContour = 'sweeping_arpeggio';
        instMelody = 'grand_piano';
        instHarmony = 'warm_strings';
        instBass = 'contrabass';
        instDrums = 'subtle_cinematic';
        instAtmo = 'lush_reverb';
        break;
      case 'nostalgic_love':
        tempo = request.tempo_bpm || 70;
        key = request.key || 'G Major';
        chords = ['G', 'C', 'Em', 'D'];
        melodyContour = 'lyrical_step';
        instMelody = 'felt_piano';
        instHarmony = 'warm_strings';
        instBass = 'acoustic_upright';
        instDrums = 'brush_snare';
        instAtmo = 'tape_flutter';
        break;
      default: // intimate_love
        tempo = request.tempo_bpm || 68;
        key = request.key || 'F Major';
        chords = ['F', 'Bb', 'Dm', 'C'];
        melodyContour = 'lyrical_step';
        instMelody = 'grand_piano';
        instHarmony = 'warm_strings';
        instBass = 'contrabass';
        instDrums = 'subtle_cinematic';
        instAtmo = text.includes('rain') ? 'rain_ambience' : 'lush_reverb';
        break;
    }
  } else if (primaryEmotion === 'triumph' || primaryEmotion === 'hopeful_optimism') {
    tempo = request.tempo_bpm || 116;
    key = request.key || 'D Major';
    chords = ['D', 'A', 'Bm', 'G'];
    melodyContour = 'uplifting_leap';
    instMelody = 'grand_piano';
    instHarmony = 'orchestral_brass';
    instBass = 'warm_sub';
    instDrums = 'taiko_timpani';
    instAtmo = 'lush_reverb';
  } else if (primaryEmotion === 'suspense') {
    tempo = request.tempo_bpm || 60;
    key = request.key || 'C# Minor';
    chords = ['C#m', 'A', 'F#m', 'G#'];
    melodyContour = 'tense_ostinato';
    instMelody = 'lyrical_cello';
    instHarmony = 'analog_pad';
    instBass = 'warm_sub';
    instDrums = 'subtle_cinematic';
    instAtmo = 'lush_reverb';
  } else if (primaryEmotion === 'wonder') {
    tempo = request.tempo_bpm || 84;
    key = request.key || 'E Lydian';
    chords = ['E', 'F#', 'G#m', 'B'];
    melodyContour = 'sweeping_arpeggio';
    instMelody = 'grand_piano';
    instHarmony = 'warm_strings';
    instBass = 'contrabass';
    instDrums = 'subtle_cinematic';
    instAtmo = 'shimmer_crystals';
  }

  return {
    primaryEmotion,
    subEmotion,
    narrativePurpose: `Original cinematic score evoking ${primaryEmotion.replace('_', ' ')} with ${subEmotion.replace('_', ' ')} dynamics`,
    sceneArchetype: isRomantic ? 'Rainy Evening Romantic Scene' : isTriumph ? 'Uplifting Climax / Launch' : isSuspense ? 'Cinematic Noir Tension' : 'Documentary / Discovery',
    referenceInfluence,
    tonalCharacter: `Warm acoustic resonance in ${key}, ${tempo} BPM, expressive dynamic progression`,
    suggestedTempo: tempo,
    suggestedKey: key,
    timeSignature: timeSig,
    chordProgression: chords,
    scaleNotes: [0, 2, 4, 5, 7, 9, 11], // Diatonic Major or modal offsets
    melodyContour,
    instrumentation: {
      melody: instMelody,
      harmony: instHarmony,
      bass: instBass,
      drums: instDrums,
      atmosphere: instAtmo,
    },
  };
}

export function buildBeatGridAndSections(
  duration_s: number,
  tempo_bpm: number,
  userSections?: MusicSection[]
): { beatGrid: BeatGridItem[]; sections: MusicSection[] } {
  const secondsPerBeat = 60 / tempo_bpm;
  const beatsPerBar = 4;
  const totalBeats = Math.ceil(duration_s / secondsPerBeat);

  const beatGrid: BeatGridItem[] = [];
  for (let b = 0; b < totalBeats; b++) {
    const time_s = parseFloat((b * secondsPerBeat).toFixed(3));
    if (time_s > duration_s) break;
    beatGrid.push({
      beat: (b % beatsPerBar) + 1,
      time_s,
      bar: Math.floor(b / beatsPerBar) + 1,
    });
  }

  // If user provided sections, snap to nearest bar line or keep specified
  let sections: MusicSection[] = [];
  if (userSections && userSections.length > 0) {
    sections = userSections.map((sec, idx) => {
      // Find nearest beat/bar
      const nearestBeat = beatGrid.reduce((prev, curr) =>
        Math.abs(curr.time_s - sec.start_s) < Math.abs(prev.time_s - sec.start_s) ? curr : prev
      );
      return {
        start_s: sec.start_s,
        mood: sec.mood,
        bar_number: nearestBeat.bar,
        energy_level: Math.min(1.0, 0.3 + (idx / Math.max(1, userSections.length - 1)) * 0.7),
        instrumentation: idx === 0 ? ['piano', 'atmosphere'] : idx === userSections.length - 1 ? ['all_stems', 'climax_swells'] : ['piano', 'strings', 'bass', 'percussion'],
      };
    });
  } else {
    // Automatic 4-part cinematic arc: Intro -> Developing warmth -> Emotional Climax -> Sweet resolution
    const numBars = Math.floor(duration_s / (secondsPerBeat * beatsPerBar));
    const introBar = 1;
    const devBar = Math.max(2, Math.floor(numBars * 0.25));
    const climaxBar = Math.max(devBar + 1, Math.floor(numBars * 0.65));
    const resolveBar = Math.max(climaxBar + 1, Math.floor(numBars * 0.88));

    const getBarTime = (bar: number) => parseFloat(((bar - 1) * beatsPerBar * secondsPerBeat).toFixed(2));

    sections = [
      {
        start_s: 0.0,
        mood: 'calm tender intro',
        bar_number: introBar,
        energy_level: 0.35,
        instrumentation: ['piano', 'atmosphere'],
      },
      {
        start_s: getBarTime(devBar),
        mood: 'developing warmth and lyrical strings',
        bar_number: devBar,
        energy_level: 0.65,
        instrumentation: ['piano', 'strings', 'acoustic_bass'],
      },
      {
        start_s: getBarTime(climaxBar),
        mood: 'sweeping cinematic emotional peak',
        bar_number: climaxBar,
        energy_level: 0.95,
        instrumentation: ['all_stems', 'full_harmony', 'cinematic_percussion'],
      },
      {
        start_s: getBarTime(resolveBar),
        mood: 'delicate emotional resolution & gentle decay',
        bar_number: resolveBar,
        energy_level: 0.45,
        instrumentation: ['solo_piano', 'reverb_tail', 'rain_ambience'],
      },
    ];
  }

  return { beatGrid, sections };
}
