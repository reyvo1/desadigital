const BASE_URL = process.env.LOADTEST_URL || 'http://127.0.0.1:3000';
const CONCURRENCY = Number(process.env.LOADTEST_CONCURRENCY || 20);
const TOTAL = Number(process.env.LOADTEST_TOTAL || 200);
const PATH = process.env.LOADTEST_PATH || '/api/health';

async function worker(count) {
  const latencies = [];
  for (let i = 0; i < count; i++) {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}${PATH}`);
    latencies.push(Date.now() - start);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }
  return latencies;
}

async function main() {
  const perWorker = Math.floor(TOTAL / CONCURRENCY);
  const start = Date.now();
  const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(perWorker)));
  const all = results.flat();
  const elapsed = Date.now() - start;
  const sorted = all.slice().sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const rps = (all.length / (elapsed / 1000)).toFixed(2);
  console.log(`Load test: ${all.length} requests, concurrency=${CONCURRENCY}, path=${PATH}`);
  console.log(`Elapsed: ${elapsed}ms, RPS: ${rps}`);
  console.log(`Latency ms: min=${Math.min(...all)}, p50=${p50}, p95=${p95}, p99=${p99}, max=${Math.max(...all)}`);
}

main().catch((e) => {
  console.error('Load test gagal:', e.message);
  process.exit(1);
});
