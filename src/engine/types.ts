export interface MusicSection {
  start_s: number;
  mood: string;
  bar_number?: number;
  energy_level?: number;
  instrumentation?: string[];
}

export interface MusicJobOutputConfig {
  sample_rate?: number; // default 48000
  target_lufs?: number; // default -16
  formats?: string[]; // ["wav", "mp3"]
}

export interface MusicJobRequest {
  prompt: string;
  duration_s: number; // 5 to 300 seconds
  sections?: MusicSection[];
  tempo_bpm?: number | null;
  key?: string | null;
  loopable?: boolean;
  narration_url?: string | null;
  seed?: number;
  output?: MusicJobOutputConfig;
  callback_url?: string;
  reference_film?: string;
  primary_emotion?: string;
  sub_emotion?: string;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface StemGains {
  drums: number;
  bass: number;
  harmony: number;
  melody: number;
  atmosphere: number;
}

export interface BeatGridItem {
  beat: number;
  time_s: number;
  bar: number;
}

export interface StemManifestInfo {
  file: string;
  instrument: string;
  role: string;
  gain_linear: number;
  gain_db: number;
  sample_rate: number;
  duration_s: number;
  channels: number;
  method: string;
}

export interface MusicManifest {
  job_id: string;
  prompt: string;
  duration_s: number;
  delivered_duration_s: number;
  duration_delta_s: number;
  tempo_bpm: number;
  key: string;
  time_signature: string;
  loopable: boolean;
  seed: number;
  created_at: string;
  completed_at: string;
  emotion_analysis: {
    primary_emotion: string;
    sub_emotion: string;
    emotional_progression: string;
    narrative_purpose: string;
    scene_archetype: string;
    reference_influence: string;
    tonal_character: string;
  };
  sections: MusicSection[];
  beat_grid: BeatGridItem[];
  stems: Record<string, StemManifestInfo>;
  sum_of_stems_verified: boolean;
  sum_difference_db: string;
  loudness: {
    integrated_lufs: number;
    true_peak_dbtp: number;
    loudness_range_lu: number;
    target_lufs: number;
  };
  voiceover_ducking?: {
    applied: boolean;
    ducking_db: number;
    attack_ms: number;
    release_ms: number;
    volume_curve_points: Array<{ time_s: number; volume_db: number }>;
  };
  models_and_providers: {
    generation_engine: string;
    orchestrator_version: string;
    dsp_synthesizer: string;
    mastering: string;
    commercial_usable: boolean;
    is_ai_generated: boolean;
    copyright_safe: boolean;
    vocal_content: string;
  };
  costs: {
    compute_cost_usd: number;
    api_fees_usd: number;
    total_cost_usd: number;
    tier: string;
  };
  timings: {
    analysis_ms: number;
    synthesis_ms: number;
    mastering_ms: number;
    total_ms: number;
  };
  license: {
    terms: string;
    sources_ref: string;
    commercial_monetization_approved: boolean;
  };
}

export interface MusicJobResult {
  job_id: string;
  status: JobStatus;
  progress: number;
  stage: string;
  created_at: string;
  completed_at?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: string;
  };
  mix_url?: string;
  mix_mp3_url?: string;
  mix_ducked_url?: string;
  stems_urls?: Record<string, string>;
  manifest_url?: string;
  manifest?: MusicManifest;
}
