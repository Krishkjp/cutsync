# SOURCES.md — CutSync AI Music Generation Studio

All software libraries, algorithms, synthesis methods, and mastering tools utilized in the CutSync AI Music Generation Engine are disclosed below, with licenses verified for unrestricted commercial use.

## 1. Core Synthesis & DSP Engine
- **Engine**: CutSync Multi-Track Physical Modeling & Harmonic Synthesis Engine (TypeScript/Node.js)
- **License**: MIT License
- **Zero Copyrighted Sample Data**:
  - All audio wave tables, harmonics, bow oscillations, and percussion impulses are mathematically synthesized in real-time from fundamental physics equations (Karplus-Strong string synthesis, resonant low-pass filters, additive harmonic series, FM sub-rumble, and stochastic noise generators).
  - No copyrighted recordings, loops, or soundfonts are bundled or scraped.
  - Safe for commercial use and content creation.

## 2. Audio Processing & Mastering
- **Tool**: FFmpeg 4.4.2 (LGPL v2.1+ / GPL v2+)
  - **Loudnorm Filter**: Implementation of ITU-R BS.1770-4 / EBU R128 integrated loudness normalization (-16 LUFS, -1.0 dBTP true peak limiter).
  - **Ebur128 Filter**: Real-time momentary, short-term, integrated LUFS and true peak measurement.
  - **Libmp3lame**: 192 kbps MP3 encoding for high-speed streaming.
  - **Sidechain Compression / Dynamic Envelope**: Voiceover speech ducking (-12 dB attenuation under narration with 120ms attack and 350ms release).

## 3. Web & API Framework
- **Runtime**: Node.js v22.x
- **Server**: Express v4.21.2 (MIT License)
- **Frontend**: React 19, Tailwind CSS v4, Lucide React (MIT License), Motion (MIT License)

## 4. Commercial Monetization Compliance
- Every piece of generated music is an original synthetic composition generated deterministically from seed and emotion parameters.
- Prompts citing real songs or artists are analyzed solely for high-level musical characteristics (tempo, mode, orchestration, dynamic development) and produce 100% original musical works without reproducing protected melodies or recordings.
