#!/usr/bin/env python3
"""
CutSync Studio — Batch Test Runner
Runs test inputs against the CutSync API and stores results into batch_test_results/
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

API_HOST = os.environ.get("API_HOST", "http://localhost:3000")
OUTPUT_DIR = os.path.join(os.getcwd(), "batch_test_results")

TEST_CASES = [
    {
        "name": "romantic_rainy_evening",
        "payload": {
            "prompt": "Deeply romantic instrumental for two people falling in love during a rainy evening, warm concert piano and lyrical cello",
            "duration_s": 25.0,
            "primary_emotion": "romantic_love",
            "sub_emotion": "intimate_love",
            "seed": 42
        }
    },
    {
        "name": "product_launch_ducked",
        "payload": {
            "prompt": "warm, optimistic acoustic pop for a product launch, builds to an uplifting peak",
            "duration_s": 45.0,
            "sections": [
                {"start_s": 0.0, "mood": "calm intro"},
                {"start_s": 12.5, "mood": "build-up"},
                {"start_s": 30.0, "mood": "uplifting peak"}
            ],
            "narration_url": "auto_demo",
            "seed": 100
        }
    },
    {
        "name": "heartbreak_minor_slow",
        "payload": {
            "prompt": "Heartbreak and unrequited love, delicate piano, lingering silence",
            "duration_s": 20.0,
            "primary_emotion": "romantic_love",
            "sub_emotion": "heartbreak",
            "seed": 202
        }
    }
]

def make_request(url, data=None, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, headers=headers)
    if data is not None:
        req.data = json.dumps(data).encode("utf-8")
        req.headers["Content-Type"] = "application/json"
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"=== CutSync AI Studio Batch Runner ===")
    print(f"Target API: {API_HOST}")
    print(f"Output Directory: {OUTPUT_DIR}\n")

    results = []
    for tc in TEST_CASES:
        name = tc["name"]
        print(f"▶ Running case: {name}...")
        headers = {"Idempotency-Key": f"batch_py_{name}_{int(time.time())}"}
        status, body = make_request(f"{API_HOST}/api/v1/music/jobs", data=tc["payload"], headers=headers)

        if status not in (200, 202):
            print(f"  ✗ Failed to queue job: HTTP {status} - {body}")
            results.append({"name": name, "status": "FAIL", "error": body})
            continue

        job_id = body.get("job_id")
        print(f"  Queued job: {job_id}. Polling progress...")

        # Poll
        job_result = None
        for _ in range(30):
            time.sleep(0.5)
            s, job_body = make_request(f"{API_HOST}/api/v1/jobs/{job_id}")
            if job_body.get("status") in ("succeeded", "failed"):
                job_result = job_body
                break

        if not job_result or job_result.get("status") != "succeeded":
            print(f"  ✗ Job failed: {job_result}")
            results.append({"name": name, "status": "FAIL", "job_id": job_id})
            continue

        manifest = job_result.get("manifest", {})
        case_dir = os.path.join(OUTPUT_DIR, name)
        os.makedirs(case_dir, exist_ok=True)
        with open(os.path.join(case_dir, "music_manifest.json"), "w") as f:
            json.dump(manifest, f, indent=2)

        print(f"  ✓ Succeeded! Duration: {manifest.get('delivered_duration_s')}s, LUFS: {manifest.get('loudness', {}).get('integrated_lufs')}")
        results.append({
            "name": name,
            "status": "PASS",
            "job_id": job_id,
            "duration_s": manifest.get("delivered_duration_s"),
            "lufs": manifest.get("loudness", {}).get("integrated_lufs")
        })

    with open(os.path.join(OUTPUT_DIR, "python_batch_summary.json"), "w") as f:
        json.dump(results, f, indent=2)

    print("\nBatch testing complete.")

if __name__ == "__main__":
    main()
