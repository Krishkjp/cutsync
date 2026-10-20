#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

interface BatchTestItem {
  name: string;
  request: any;
}

const DEFAULT_TEST_SUITE: BatchTestItem[] = [
  {
    name: '01_romantic_rainy_evening',
    request: {
      prompt: 'Deeply romantic instrumental for two people falling in love during a rainy evening, warm concert piano and lyrical cello',
      duration_s: 25.0,
      primary_emotion: 'romantic_love',
      sub_emotion: 'intimate_love',
      reference_film: 'Classic Indian Romantic Cinema & Ennio Morricone lyricism',
      seed: 42,
    },
  },
  {
    name: '02_first_love_innocent',
    request: {
      prompt: 'First love in springtime, innocent, delicate, hopeful acoustic guitar and subtle woodwinds',
      duration_s: 15.0,
      primary_emotion: 'romantic_love',
      sub_emotion: 'first_love',
      seed: 103,
    },
  },
  {
    name: '03_passionate_romance_swell',
    request: {
      prompt: 'Passionate romance with sweeping strings and emotional cinematic lift',
      duration_s: 30.0,
      primary_emotion: 'romantic_love',
      sub_emotion: 'passionate_romance',
      seed: 204,
    },
  },
  {
    name: '04_heartbreak_fragile_piano',
    request: {
      prompt: 'Heartbreak and emotional loss, fragile solo piano with distant warm pads',
      duration_s: 20.0,
      primary_emotion: 'romantic_love',
      sub_emotion: 'heartbreak',
      seed: 305,
    },
  },
  {
    name: '05_tech_product_launch',
    request: {
      prompt: 'Warm, optimistic acoustic pop for a product launch, builds to an uplifting peak',
      duration_s: 45.0,
      sections: [
        { start_s: 0.0, mood: 'calm intro' },
        { start_s: 12.5, mood: 'build-up' },
        { start_s: 30.0, mood: 'uplifting peak' },
      ],
      narration_url: 'auto_demo',
      seed: 406,
    },
  },
  {
    name: '06_short_5sec_stinger',
    request: {
      prompt: 'Short 5-second cinematic brand bumper with warm harmonic resolve',
      duration_s: 5.0,
      seed: 507,
    },
  },
];

async function runBatch() {
  const host = process.env.API_HOST || 'http://localhost:3000';
  const outputDir = path.resolve(process.cwd(), 'batch_test_results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`[CutSync Batch Runner] Starting test suite against ${host}`);
  console.log(`Output folder: ${outputDir}`);

  const summary = [];

  for (const item of DEFAULT_TEST_SUITE) {
    console.log(`\n▶ Running test: ${item.name}...`);
    try {
      const res = await fetch(`${host}/api/v1/music/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `batch_${item.name}_${Date.now()}`,
        },
        body: JSON.stringify(item.request),
      });

      if (!res.ok) {
        throw new Error(`Job submission failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json();
      const jobId = data.job_id;
      console.log(`  Job accepted: ${jobId}. Polling status...`);

      // Poll until finished
      let jobResult: any = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 600));
        const checkRes = await fetch(`${host}/api/v1/jobs/${jobId}`);
        jobResult = await checkRes.json();
        if (jobResult.status === 'succeeded' || jobResult.status === 'failed') {
          break;
        }
      }

      if (jobResult.status !== 'succeeded') {
        throw new Error(`Job ended with status: ${jobResult.status}`);
      }

      // Save manifest into results folder
      const testFolder = path.join(outputDir, item.name);
      if (!fs.existsSync(testFolder)) {
        fs.mkdirSync(testFolder, { recursive: true });
      }

      fs.writeFileSync(
        path.join(testFolder, 'music_manifest.json'),
        JSON.stringify(jobResult.manifest, null, 2)
      );

      console.log(`  ✓ Succeeded! Length: ${jobResult.manifest.delivered_duration_s}s, LUFS: ${jobResult.manifest.loudness.integrated_lufs}`);
      summary.push({
        test: item.name,
        job_id: jobId,
        status: 'PASS',
        duration_s: jobResult.manifest.delivered_duration_s,
        lufs: jobResult.manifest.loudness.integrated_lufs,
        stems_count: Object.keys(jobResult.manifest.stems).length,
      });
    } catch (e: any) {
      console.error(`  ✗ Test failed: ${e.message}`);
      summary.push({ test: item.name, status: 'FAIL', error: e.message });
    }
  }

  const summaryPath = path.join(outputDir, 'batch_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n========================================`);
  console.log(`[Batch Runner Finished] All results saved to ${outputDir}`);
  console.table(summary);
}

runBatch().catch(console.error);
