import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const phase = process.argv.includes('--baseline') ? 'baseline' : 'final';
mkdirSync(`test-results/${phase}/lighthouse`, { recursive: true });
for (const device of ['mobile', 'desktop']) {
  const args = ['node_modules/lighthouse/cli/index.js', 'http://127.0.0.1:3020/updates', '--chrome-flags=--headless', '--only-categories=performance,accessibility,best-practices', '--output=json', '--output=html', `--output-path=test-results/${phase}/lighthouse/updates-${device}`, '--quiet'];
  if (device === 'desktop') args.push('--preset=desktop');
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromium.executablePath() } });
  const code = await new Promise(resolve => child.once('exit', resolve));
  if (code !== 0) throw Error(`Local Lighthouse ${device} failed (${code})`);
  console.log(`${phase} Lighthouse ${device} report saved`);
}
