# CutSync — AI Music Generation Studio

> **Transform natural-language descriptions of emotions, scenes, moods, and musical styles into studio-grade instrumental music with real instrument stems and broadcast loudness.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v22-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Audio](https://img.shields.io/badge/Audio-48kHz%20Stereo%20%2F%20EBU%20R128-success.svg)](https://tech.ebu.ch/loudness)

---

## 1. Project Title & Description

**CutSync** is an AI-powered music generation web application and audio engine designed to generate original, commercially safe instrumental music tailored to video scenes, content creation, and creative workflows. It delivers finished stereo master tracks alongside 5 genuinely isolated instrument stems (`drums`, `bass`, `harmony`, `melody`, `atmosphere`), voiceover speech ducking, and bar-line synchronized transitions.

---

## 2. Project Overview

Modern video editors, filmmakers, and digital creators often struggle with generic stock music libraries. Stock tracks frequently repeat across the internet, rarely fit specific video cut points, and require manual editing to lower volume under speech. CutSync solves this by generating music conditioned on natural-language scene descriptions, emotions, and cut points—synthesizing separate instrument stems that add up bitwise to the master mix.

---

## 3. Problem Statement & Motivation

- **Stock Music Mismatch**: Creators find tracks that are the wrong length, requiring abrupt cuts and awkward fades.
- **Stem Inaccessibility**: Most generative audio tools only produce a single flattened stereo file. When a voiceover enters, editors must duck the entire track, sacrificing rhythm and impact.
- **Separation Bleed**: Post-hoc audio source separation models (e.g. Demucs) suffer from phase artifacts and audible bleed (drums leaking into pads), violating mathematical stem isolation.
- **Copyright Claims**: Stock tracks can trigger false copyright strikes on YouTube and social platforms.

CutSync addresses these challenges with an architecture that guarantees **exact duration matching ($\pm 0.000\text{s}$)**, **pure mathematical stem isolation ($-\infty\text{ dB}$ difference)**, and **100% original synthesis**.

---

## 4. Project Objectives

1. **Emotional Fidelity**: Interpret nuanced prompts (e.g., romantic love, longing, heartbreak, triumph, wonder, suspense) into musical theory parameters (scales, tempos, chord progressions).
2. **True Stem Isolation**: Provide at least 3 (and up to 5) distinct instrument stems where $\text{Mix}(t) = \sum g_k \cdot \text{Stem}_k(t)$.
3. **Broadcast-Ready Audio**: Deliver 48 kHz 16-bit stereo WAV files mastered to EBU R128 target loudness ($-16\text{ LUFS} \pm 1\text{ LU}$) and True Peak $\le -1.0\text{ dBTP}$.
4. **Automated Dynamic Voiceover Ducking**: Attenuate music smoothly under narration ($-12\text{ dB}$) with musical attack/release curves.
5. **Zero-Budget Local Workflow**: Run entirely on standard developer hardware without mandatory paid API subscriptions.

---

## 5. Key Features

- **Natural-Language Scene Parsing**: Converts descriptive text into chords, instrument assignments, and dynamic arcs.
- **Multi-Track 5-Stem Generation**:
  - `drums.wav`: Cinematic percussion, taiko swells, brush snares, pizzicato pulse.
  - `bass.wav`: Warm acoustic contrabass and sub-harmonic foundation.
  - `harmony.wav`: Warm felt piano and lyrical string ensemble chords.
  - `melody.wav`: Expressive concert piano and singing solo cello leads.
  - `atmosphere.wav`: Rain textures, analog warmth, and room acoustic beds.
- **Stem Swapping & Regeneration**: Swap a single instrument track (e.g., regenerate new drums or new melody) on the fly without affecting other stems.
- **Dynamic Voiceover Ducking**: Automatic sidechain speech ducking with volume curves documented in the manifest.
- **Interactive Multi-Track Studio**: Browser-based mixer featuring individual stem faders, Solo (S), Mute (M), waveform scrubber, and A/B comparison.
- **Complete Manifest**: Generates `music_manifest.json` containing tempo, key, section cut points, beat grid, stem gains, loudness measurements, and copyright verification.

---

## 6. How the System Works

1. **Input Submission**: The user submits a prompt, duration (5s–300s), optional cut points, genre, and emotion settings.
2. **Background Job Queuing**: An asynchronous job worker accepts the request, returns HTTP `202 Accepted` with a `job_id`, and tracks progress (`0%–100%`).
3. **Emotional Semantic Decomposition**: The engine extracts musical keys, modal chords, tempo (BPM), and section dynamics.
4. **Physical DSP Multi-Track Synthesis**: Synthesizes 5 independent audio buffers at 48,000 Hz.
5. **Sum-of-Stems Master Mix**: Multiplies buffers by their respective manifest gains to produce the raw master mix.
6. **EBU R128 Loudness Mastering**: Runs FFmpeg `loudnorm` filter to achieve exact $-16\text{ LUFS}$ integrated loudness and True Peak $\le -1.0\text{ dBTP}$.
7. **Delivery**: Writes `mix.wav`, `mix.mp3`, `mix_ducked.wav`, individual stem files, and `music_manifest.json` to disk for immediate playback and download.

---

## 7. Architecture & Data Flow

```text
User / Browser UI
      │
      ▼  (POST /api/v1/music/jobs with Idempotency-Key)
Express Full-Stack Server (:3000)
      │
      ▼
Job Queue (Async Worker & State Machine)
      │
      ├── 1. Emotion & Scene Engine (Harmonic theory, keys, tempos, cut points)
      ├── 2. Audio DSP Synthesizer (48 kHz 5-track physical modeling)
      ├── 3. Stems & Mix Mathematical Blender (mix = sum of stems)
      ├── 4. FFmpeg Mastering Pipeline (EBU R128 -16 LUFS & Voiceover Ducking)
      └── 5. Manifest Generator (JSON metadata, beat grid, stem gains)
      │
      ▼
Output Store (/outputs/{job_id}/)
      │
      ▼  (GET /api/v1/jobs/{job_id} & /outputs/*)
Studio Audio Player & Multi-Track Mixer
```

---

## 8. Technology Stack

- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Node.js v22, Express v4, TypeScript, tsx.
- **Audio Processing & DSP**:
  - Native 48 kHz PCM stereo wave generation.
  - Karplus-Strong string synthesis, resonant filter networks, FM sub-oscillators.
  - FFmpeg 4.4+ (`libmp3lame`, `loudnorm`, `ebur128`).
- **Containerization**: Docker, Docker Compose.

---

## 9. AI Model & Provider Details

- **Built-in Studio Engine (Default, Zero-Cost)**:
  - Generates deterministic, 100% original physical audio DSP compositions.
  - Requires $0.00 compute fees and no external API tokens.
  - Safe for commercial use with no copyright claims.
- **Cloud Model Adapter (Replicate MusicGen Support)**:
  - Supports Meta MusicGen via Replicate (`meta/musicgen`) when `REPLICATE_API_TOKEN` is configured.
  - Automatically handles inference polling, audio retrieval, and FFmpeg loudness alignment.

---

## 10. Repository Structure

```text
cutsync-ai-music-studio/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore configuration
├── LICENSE                   # MIT License
├── README.md                 # Complete project documentation
├── REPORT.md                 # Technical architecture & benchmark evaluation
├── SOURCES.md                # Synthesis DSP & commercial licensing disclosure
├── AI_USE.md                 # AI tooling & ethical development disclosure
├── Dockerfile                # Production container specification
├── docker-compose.yml        # Multi-container orchestration
├── package.json              # Dependencies and build scripts
├── tsconfig.json             # TypeScript configuration
├── openapi.yaml              # OpenAPI 3.1 REST API specification
├── server.ts                 # Full-stack Express server
├── batch_runner.py           # Automated CLI test suite
├── verify_all_must_haves.ts  # Verification test script
├── index.html                # Entry HTML document
├── src/
│   ├── App.tsx               # Studio UI and multi-track mixer
│   ├── main.tsx              # React entry point
│   ├── index.css             # Tailwind CSS styles
│   └── engine/
│       ├── types.ts          # Schemas and interfaces
│       ├── emotionEngine.ts  # Emotional decomposition & music theory
│       ├── audioSynthesizer.ts# 48 kHz multi-track sound synthesis
│       ├── mastering.ts      # EBU R128 loudness & ducking pipeline
│       └── jobQueue.ts       # Background worker & stem regeneration
└── outputs/                  # Generated audio deliverables & manifests
```

---

## 11. Installation & Local Setup

### Prerequisites
- **Node.js**: v18.x or v20.x or v22.x
- **FFmpeg**: Installed and available in your system `PATH`
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install -y ffmpeg`
  - Windows: `winget install Gyan.FFmpeg`

### Setup Steps
```bash
# 1. Clone the repository
git clone https://github.com/your-username/cutsync-ai-music-studio.git
cd cutsync-ai-music-studio

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
```

---

## 12. Environment Variables & Secret Configuration

Configure `.env` as needed:

| Variable | Description | Default | Required |
|---|---|---|---|
| `PORT` | Local web server port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `REPLICATE_API_TOKEN` | Replicate token for cloud MusicGen | `""` | No (Built-in engine works without it) |
| `GEMINI_API_KEY` | Gemini API token for prompt expansion | `""` | No |
| `CUTSYNC_WEBHOOK_SECRET` | HMAC-SHA256 signature secret for webhooks | `cutsync-studio-secret` | No |

---

## 13. How to Run the Application

### Development Mode
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Docker Container Mode
```bash
docker compose up --build
```

---

## 14. How to Generate, Play, and Download Music

1. **Select an Inspiration Preset** (e.g. *Rainy Evening Romance*, *Lo-Fi Midnight*, *Epic Hans Zimmer Swell*), or type your own prompt.
2. **Customize Parameters**: Adjust genre, mood, duration slider (5s to 120s), key, and tempo.
3. **Click "Generate Music & 5 Separate Stems"**: Watch the live stage progress tracker.
4. **Audition the Master Track**: Use the waveform scrubber and play/pause controls. Toggle **"Ducked under Speech (-12dB)"** to hear how voiceover ducking sounds.
5. **Mix Individual Stems**: Adjust faders for Drums, Bass, Harmony, Melody, and Atmosphere. Solo (S) or Mute (M) any instrument.
6. **Swap Stems**: Click **"Swap"** on any stem to regenerate just that instrument with a new variation.
7. **Export Audio**: Download the 48 kHz Mix WAV, streaming MP3, ducked WAV, individual stems, or `music_manifest.json`.

---

## 15. Deployment Instructions

### Option 1: Free Render.com / Hugging Face Spaces Deployment
1. Push your repository to GitHub.
2. Link your repo on **Render.com** (New Web Service) or **Hugging Face Spaces** (Docker).
3. Set the environment to Docker.
4. Deploy for $0.00.

### Option 2: Instant Free Public Tunnel
```bash
npx localtunnel --port 3000
```

---

## 16. Testing & Troubleshooting

Run automated test suites with one command:

```bash
# Verify all audio engineering standards:
npx tsx verify_all_must_haves.ts

# Run the multi-prompt batch suite:
python3 batch_runner.py
```

### Common Troubleshooting
- **FFmpeg not found**: Ensure `ffmpeg` is installed and in your `PATH` by running `ffmpeg -version`.
- **Port 3000 in use**: Change `PORT=3001` in `.env`.

---

## 17. API Costs & Licensing

- **Built-in CutSync DSP Engine**: Free ($0.00/minute). Zero API usage fees.
- **Output Licensing**: 100% original synthesis, released under MIT License, safe for commercial video monetization.

---

## 18. Current Limitations & Future Improvements

- **Current Capabilities**: Pure instrumental synthesis, 5 separate stems, precise duration matching, EBU R128 loudness mastering.
- **Roadmap**:
  - MIDI file export alongside WAV stems.
  - Real-time video preview upload with automatic cut detection.
  - Multi-track stem audio pan and reverb controls in the browser.

---

## 19. Screenshots

| Section | Preview |
|---|---|
| **Studio & Multi-Track Mixer** | *Dark studio aesthetic with violet waveform scrubber, 5-stem faders, solo/mute toggles, and preset cards.* |
| **Manifest Inspector** | *Full JSON schema view with beat grids, bar boundaries, loudness measurements, and stem gains.* |
| **Batch Test Runner** | *Live verification table displaying durations, LUFS measurements, and pass/fail status.* |

---

## 20. Conclusion

CutSync provides a robust, production-grade foundation for AI-assisted music composition. By combining emotional prompt decomposition, physical multi-track synthesis, exact bar-line alignment, and broadcast mastering, CutSync bridges the gap between text-to-music generation and practical video production workflows.
