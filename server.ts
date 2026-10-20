import express, { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { jobQueue } from './src/engine/jobQueue.js';
import { MusicJobRequest } from './src/engine/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Correlation ID & Structured Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  res.setHeader('X-Correlation-Id', correlationId);

  // Enable permissive CORS for downloads and API consumers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Correlation-Id');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'WARN' : 'INFO',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      correlation_id: correlationId,
    }));
  });

  next();
});

// Serve generated outputs
const OUTPUTS_DIR = path.resolve(__dirname, 'outputs');
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}
app.use('/outputs', express.static(OUTPUTS_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Direct Download endpoint for CutSync Repository ZIP (58 KB)
app.get(['/download', '/api/download-zip', '/outputs/cutsync-submission.zip', '/outputs/cutsync-ai-music-studio.zip'], (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'cutsync-ai-music-studio.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="cutsync-ai-music-studio.zip"');
    res.setHeader('Content-Length', fs.statSync(zipPath).size);
    return res.sendFile(zipPath);
  }
  return res.status(404).send('ZIP file not found');
});

// Integration Standard 8: Health & Ready Endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CutSync AI Music Generation Studio',
    version: '2.4.0',
    capabilities: ['text-to-cinematic-music', 'real-stems', 'voiceover-ducking', 'lufs-mastering', 'stem-regeneration'],
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    ffmpeg: true,
    engine: 'active',
  });
});

// API v1: POST /api/v1/music/jobs
app.post('/api/v1/music/jobs', (req: Request, res: Response) => {
  const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
  const body: MusicJobRequest = req.body;

  // Validate prompt
  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PROMPT',
        message: 'The "prompt" field is required and must be a non-empty string.',
        retryable: false,
        details: 'Received: ' + JSON.stringify(body.prompt),
      },
    });
  }

  // Validate duration
  const duration = Number(body.duration_s);
  if (isNaN(duration) || duration < 5 || duration > 300) {
    return res.status(400).json({
      error: {
        code: 'DURATION_OUT_OF_RANGE',
        message: 'The "duration_s" field must be a number between 5 and 300 seconds.',
        retryable: false,
        details: `Requested duration: ${body.duration_s}`,
      },
    });
  }

  // Check section start times
  if (body.sections && Array.isArray(body.sections)) {
    for (let i = 0; i < body.sections.length; i++) {
      const s = body.sections[i];
      if (s.start_s < 0 || s.start_s > duration) {
        return res.status(400).json({
          error: {
            code: 'INVALID_SECTION_TIMING',
            message: `Section at index ${i} has start_s=${s.start_s} which is outside track duration [0, ${duration}].`,
            retryable: false,
          },
        });
      }
    }
  }

  const { job_id, isDuplicate } = jobQueue.createJob(body, idempotencyKey);

  // Return HTTP 202 Accepted as required by Integration Standard
  const statusCode = isDuplicate ? 200 : 202;
  return res.status(statusCode).json({
    job_id,
    status: isDuplicate ? jobQueue.getJob(job_id)?.status || 'queued' : 'queued',
    progress: isDuplicate ? jobQueue.getJob(job_id)?.progress || 0 : 0,
    check_status_url: `/api/v1/jobs/${job_id}`,
    is_idempotent_replay: isDuplicate,
  });
});

// API v1: GET /api/v1/jobs/:jobId
app.get('/api/v1/jobs/:jobId', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const job = jobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: {
        code: 'JOB_NOT_FOUND',
        message: `No job found with id: ${jobId}`,
        retryable: false,
      },
    });
  }

  return res.json(job);
});

// API v1: GET /api/v1/jobs (list recent jobs)
app.get('/api/v1/jobs', (_req: Request, res: Response) => {
  return res.json({
    jobs: jobQueue.getAllJobs(),
  });
});

// API v1: POST /api/v1/music/jobs/:jobId/regenerate-stem
app.post('/api/v1/music/jobs/:jobId/regenerate-stem', async (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const { stem, seed } = req.body;

  const validStems = ['drums', 'melody', 'harmony', 'bass', 'atmosphere'];
  if (!stem || !validStems.includes(stem)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STEM_NAME',
        message: `Stem must be one of: ${validStems.join(', ')}`,
        retryable: false,
      },
    });
  }

  try {
    const updatedJob = await jobQueue.regenerateStem(jobId, stem, seed);
    return res.json(updatedJob);
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'STEM_REGENERATION_FAILED',
        message: err.message || 'Failed to regenerate stem',
        retryable: true,
      },
    });
  }
});

// Seed an initial demo job on startup if none exists so the user has immediate audio to test
setTimeout(async () => {
  if (jobQueue.getAllJobs().length === 0) {
    console.log('Seeding initial reference romantic cinematic job...');
    jobQueue.createJob({
      prompt: 'Deeply romantic instrumental for two people falling in love during a rainy evening, warm concert piano, lyrical cello, subtle rain atmosphere and emotional swell',
      duration_s: 30.0,
      primary_emotion: 'romantic_love',
      sub_emotion: 'intimate_love',
      reference_film: 'Classic Indian Romantic Cinema & Ennio Morricone lyricism',
      narration_url: 'auto_demo',
      seed: 101,
      output: { sample_rate: 48000, target_lufs: -16, formats: ['wav', 'mp3'] },
    });
  }
}, 300);

// Setup Vite in Dev or Static in Production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CutSync Engine] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
