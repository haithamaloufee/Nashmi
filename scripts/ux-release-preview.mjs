import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

// Public GET/HEAD checks only. No Vercel protection bypass or user credentials.
const expectedSha = process.env.EXPECTED_PREVIEW_SHA;
const repository = process.env.GITHUB_REPOSITORY;
assert.match(expectedSha || '', /^[a-f0-9]{40}$/);
assert.equal(repository, 'haithamaloufee/Nashmi');
const output = 'test-results/release-preview';
mkdirSync(output, { recursive: true });
const results = { expectedSha, preview: null, http: [], pages: [], feeds: [], media: [], consoleErrors: [] };
const save = () => writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, 200, 'GitHub deployment metadata unavailable');
  return response.json();
}
async function getJson(base, path) {
  const response = await fetch(`${base}${path}`, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const location = response.headers.get('location');
  const redirect = location ? new URL(location, base) : null;
  // Omit query strings: SSO state and authenticated URLs must not enter logs.
  results.http.push({ path, status: response.status, redirect: redirect ? redirect.origin + redirect.pathname : null });
  save();
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}; authorized Preview access required if protected`);
  return response.json();
}
async function deployedPreview() {
  for (let attempt = 0; attempt < 36; attempt++) {
    const deployments = await github(`deployments?sha=${expectedSha}&per_page=20`);
    for (const deployment of deployments.filter(item => item.environment === 'Preview')) {
      const statuses = await github(`deployments/${deployment.id}/statuses`);
      const status = statuses[0];
      if (status?.state !== 'success') continue;
      const url = new URL(status.environment_url);
      assert.equal(url.protocol, 'https:');
      assert.match(url.hostname, /^nashmi-[a-z0-9-]+-haithamaloufees-projects\.vercel\.app$/);
      assert.equal(url.username + url.password, '');
      return url.origin;
    }
    await delay(10000);
  }
  throw Error('Matching successful Vercel Preview did not become available');
}

let browser;
try {
  const base = await deployedPreview();
  results.preview = base;
  const version = await getJson(base, '/api/version');
  assert.equal(version.sha, expectedSha);
  assert.equal(version.environment, 'preview');
  const health = await getJson(base, '/api/health');
  assert.equal(health.data?.status, 'ok');
  results.version = version;
  results.health = health.data.status;
  for (const filter of ['all', 'posts', 'polls', 'surveys']) {
    const first = await getJson(base, `/api/updates?limit=5&filter=${filter}`);
    assert.equal(first.ok, true);
    const rows = first.data.updates;
    assert.ok(Array.isArray(rows));
    assert.ok(rows.every(row => /^[a-f0-9]{24}$/i.test(row.item?._id) && Number.isFinite(Date.parse(row.publishedAt))));
    const ids = rows.map(row => `${row.type}-${row.item._id}`);
    assert.equal(new Set(ids).size, ids.length);
    if (first.nextCursor) {
      assert.match(first.nextCursor, /^\d{4}-.+~[a-f0-9]{24}$/i);
      const next = await getJson(base, `/api/updates?limit=5&filter=${filter}&cursor=${encodeURIComponent(first.nextCursor)}`);
      assert.equal(next.ok, true);
      assert.ok(next.data.updates.every(row => !ids.includes(`${row.type}-${row.item._id}`)));
    }
    // Compatibility only: old clients still send timestamp-only cursors.
    if (rows.length) assert.equal((await getJson(base, `/api/updates?limit=5&filter=${filter}&cursor=${encodeURIComponent(rows.at(-1).publishedAt)}`)).ok, true);
    for (const asset of rows.flatMap(row => row.item?.mediaIds || []).filter(item => typeof item === 'object').slice(0, 3)) {
      const url = new URL(asset.url, base);
      if (url.origin !== base || !url.pathname.startsWith('/api/media/')) continue;
      let response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      if ([302, 307, 308].includes(response.status)) {
        const signed = new URL(response.headers.get('location'));
        assert.equal(signed.protocol, 'https:');
        assert.ok(signed.hostname.endsWith('.r2.cloudflarestorage.com') || signed.hostname === 'media.nashmi.haitham.website');
        response = await fetch(signed, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(20000) });
      }
      assert.ok([200, 206].includes(response.status), 'Public media request failed');
      assert.ok(response.headers.get('content-type')?.startsWith(asset.type === 'video' ? 'video/' : asset.type === 'document' ? 'application/' : 'image/'));
      await response.body?.cancel();
      results.media.push({ type: asset.type, status: response.status });
    }
    results.feeds.push({ filter, rows: rows.length, cursor: Boolean(first.nextCursor), legacyAccepted: Boolean(rows.length) });
  }
  browser = await chromium.launch({ headless: true, chromiumSandbox: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort('blockedbyclient'));
  const page = await context.newPage();
  page.on('pageerror', error => results.consoleErrors.push(error.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/welcome', '/updates', '/parties', '/iec', '/laws', '/login', '/chat']) {
      const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      assert.equal(response.status(), 200, path);
      await page.locator('button[aria-controls="mobile-navigation"]:enabled').waitFor({ state: 'attached' });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('a[aria-label="Nashmi home"]').getAttribute('href'), '/welcome');
      assert.equal(await page.locator('nav[aria-label] a[href="/updates"]').first().count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, path);
      const content = await page.locator('main').first().innerText();
      assert.ok(!content.includes('حساب نشمي التجريبي') && !content.includes('محتوى QA اصطناعي'), 'QA fixture content leaked into Preview');
      await page.screenshot({ path: `${output}/${path.replaceAll('/', '_') || '_home'}-${width}.png` });
      results.pages.push({ path, width, status: response.status() });
    }
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('nav[aria-label] a[href="/updates"]').first().click();
    await page.waitForURL('**/updates');
    assert.equal(new URL(page.url()).pathname, '/updates');
    await page.locator('a[aria-label="Nashmi home"]').click();
    await page.waitForURL('**/welcome');
    assert.equal(new URL(page.url()).pathname, '/welcome');
  }
  assert.equal(results.consoleErrors.length, 0, 'Unhandled browser exceptions');
  save();
  console.log(JSON.stringify({ sha: version.sha, environment: version.environment, pages: results.pages.length, feeds: results.feeds, unhandledErrors: results.consoleErrors.length }));
} finally {
  save();
  await browser?.close();
}
