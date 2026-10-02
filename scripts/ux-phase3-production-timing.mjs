import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'https://nashmi.haitham.website';
const rows = [];
for (const path of ['/updates', '/parties', '/chat']) for (let run = 1; run <= 3; run++) {
  const start = performance.now();
  const response = await fetch(`${base}${path}`, { method: 'GET', signal: AbortSignal.timeout(45000) });
  const headersMs = performance.now() - start;
  const bytes = (await response.arrayBuffer()).byteLength;
  rows.push({ path, run, status: response.status, headersMs: Math.round(headersMs), totalMs: Math.round(performance.now() - start), bytes });
  console.log(JSON.stringify(rows.at(-1)));
}
mkdirSync('test-results/phase3/performance', { recursive: true });
writeFileSync('test-results/phase3/performance/production-network.json', JSON.stringify({ base, client: 'Local Windows Node; no physical phone throttling', method: 'GET only; production remains Phase 1/2', rows }, null, 2));
