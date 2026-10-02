import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Browser icons use their own small assets; retain the original logo unchanged.
const source = 'public/images/nashmi logo_transparent.png';
const png = await sharp(source).resize(32, 32, { fit: 'contain', background: '#ffffff00' }).png().toBuffer();
await writeFile('public/favicon.png', png);
await sharp(source).resize(180, 180, { fit: 'contain', background: '#ffffff00' }).png().toFile('public/apple-touch-icon.png');
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([header, png]));
console.log('Generated 32px favicon and 180px Apple icon from the existing Nashmi logo.');
