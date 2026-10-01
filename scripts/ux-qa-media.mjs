import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Licensed public files only. Never contacts project storage or reads credentials.
const manifest = JSON.parse(await readFile('tests/ux/fixtures/media-sources.json', 'utf8'));
const directory = resolve('public/uploads/qa-social');
await mkdir(directory, { recursive: true });
const results = [];
for (const asset of manifest.assets) {
  const url = new URL(asset.download);
  if (!['images.pexels.com', 'videos.pexels.com'].includes(url.hostname) || url.protocol !== 'https:') throw Error('Unapproved media origin');
  if (basename(asset.file) !== asset.file) throw Error('Invalid local file');
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw Error(`Download failed ${response.status}: ${asset.file}`);
  const mimeType = response.headers.get('content-type')?.split(';')[0];
  if (!(asset.type === 'image' ? mimeType?.startsWith('image/') : mimeType === 'video/mp4')) throw Error('Unexpected content type');
  const chunks = []; let sizeBytes = 0;
  for await (const chunk of response.body) {
    sizeBytes += chunk.length;
    if (sizeBytes > 10 * 1024 * 1024) throw Error('QA asset exceeds existing 10MB limit');
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const metadata = asset.type === 'image' ? await sharp(buffer).metadata() : { width: 640, height: 360 };
  await writeFile(resolve(directory, asset.file), buffer);
  results.push({ ...asset, mimeType, sizeBytes, width: metadata.width, height: metadata.height, sha256: createHash('sha256').update(buffer).digest('hex') });
  console.log(`${asset.file}: ${mimeType}, ${sizeBytes} bytes`);
}
await mkdir('test-results/phase2', { recursive: true });
await writeFile('test-results/phase2/media-verified.json', JSON.stringify({ ...manifest, assets: results }, null, 2));
