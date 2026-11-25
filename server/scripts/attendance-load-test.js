/**
 * Attendance Load Test Script (100 concurrent-window student scans)
 *
 * Usage (local/staging only):
 *   TARGET_URL=http://localhost:5000 \
 *   QR_TOKEN="v1.<sessionId>.<issuerId>.<slot>.<sig>" \
 *   STUDENT_TOKENS="jwt1,jwt2,..." \
 *   node server/scripts/attendance-load-test.js
 *
 * Refuses to run against production URLs or NODE_ENV=production.
 */
import assert from 'node:assert/strict';

const TARGET_URL = (process.env.TARGET_URL || 'http://localhost:5000').replace(/\/+$/, '');
const QR_TOKEN = process.env.QR_TOKEN || '';
const STUDENT_TOKENS = (process.env.STUDENT_TOKENS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const TOTAL_SCANS = Number(process.env.TOTAL_SCANS) || 100;
const WINDOW_MS = Number(process.env.WINDOW_MS) || 10_000;

// Safety guard: refuse production
if (
  process.env.NODE_ENV === 'production' ||
  TARGET_URL.includes('up.railway.app') ||
  TARGET_URL.includes('vercel.app')
) {
  console.error('REFUSED: attendance-load-test.js cannot run against production environments.');
  process.exit(1);
}

if (!QR_TOKEN || STUDENT_TOKENS.length === 0) {
  console.error('Missing QR_TOKEN or STUDENT_TOKENS env vars.');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log(`Starting load test: ${TOTAL_SCANS} scans over ~${WINDOW_MS}ms against ${TARGET_URL}`);
  const latencies = [];
  let count5xx = 0;
  let count2xx = 0;
  let countOther = 0;

  const tasks = Array.from({ length: TOTAL_SCANS }, async (_, i) => {
    const jitter = Math.floor((i / TOTAL_SCANS) * WINDOW_MS);
    await sleep(jitter);

    const token = STUDENT_TOKENS[i % STUDENT_TOKENS.length];
    const start = performance.now();
    const res = await fetch(`${TARGET_URL}/api/attendance/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token: QR_TOKEN }),
    });
    const elapsed = performance.now() - start;
    latencies.push(elapsed);

    if (res.status >= 500) count5xx++;
    else if (res.status >= 200 && res.status < 300) count2xx++;
    else countOther++;
  });

  await Promise.all(tasks);

  latencies.sort((a, b) => a - b);
  const p95Idx = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
  const p95 = Math.round(latencies[p95Idx] || 0);

  console.log({
    total: TOTAL_SCANS,
    success2xx: count2xx,
    other4xx: countOther,
    errors5xx: count5xx,
    p95Ms: p95,
  });

  assert.equal(count5xx, 0, `Expected 0 5xx errors, got ${count5xx}`);
  assert.ok(p95 < 1500, `Expected p95 < 1500ms, got ${p95}ms`);
  console.log('Load test PASSED.');
}

run().catch((err) => {
  console.error('Load test FAILED:', err);
  process.exit(1);
});
