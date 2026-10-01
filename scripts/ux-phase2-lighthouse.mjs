import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const phase = process.argv[2] || 'rich-before';
if (!/^[a-z-]+$/.test(phase)) throw Error('Invalid report name');
const directory = `test-results/phase2/performance/${phase}`;
mkdirSync(directory, { recursive: true });
const rows = [];
for (const device of ['mobile', 'desktop']) for (let run = 1; run <= 3; run++) {
  const output = `${directory}/${device}-${run}`;
  const args = ['node_modules/lighthouse/cli/index.js', 'http://127.0.0.1:3020/updates', '--chrome-flags=--headless', '--only-categories=performance,accessibility,best-practices', '--output=json', '--output=html', `--output-path=${output}`, '--quiet'];
  if (device === 'desktop') args.push('--preset=desktop');
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromium.executablePath() } });
  const code = await new Promise(resolve => child.once('exit', resolve));
  if (code !== 0) throw Error(`Lighthouse ${device}/${run} failed ${code}`);
  const report = JSON.parse(readFileSync(`${output}.report.json`, 'utf8'));
  rows.push({ device, run, performance: report.categories.performance.score * 100, accessibility: report.categories.accessibility.score * 100, lcpMs: report.audits['largest-contentful-paint'].numericValue, fcpMs: report.audits['first-contentful-paint'].numericValue, tbtMs: report.audits['total-blocking-time'].numericValue, cls: report.audits['cumulative-layout-shift'].numericValue, ttfbMs: report.audits['server-response-time']?.numericValue, breakdown: report.audits['lcp-breakdown-insight']?.details || report.audits['largest-contentful-paint-element']?.details });
  writeFileSync(`${directory}/measurements.json`, JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({ device, run, performance: rows.at(-1).performance, lcpMs: Math.round(rows.at(-1).lcpMs) }));
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = ['mobile', 'desktop'].map(device => ({ device, runs: 3, medianLcpMs: median(rows.filter(row => row.device === device).map(row => row.lcpMs)), medianPerformance: median(rows.filter(row => row.device === device).map(row => row.performance)), medianTbtMs: median(rows.filter(row => row.device === device).map(row => row.tbtMs)) }));
writeFileSync(`${directory}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
