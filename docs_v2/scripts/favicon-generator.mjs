// Renders the favicon set from public/logo.svg via Playwright, and packs
// favicon.ico (PNG-in-ICO). Run: node docs_v2/scripts/favicon-generator.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const publicDirectory = resolve(scriptDirectory, '../public');
const logoSvg = readFileSync(resolve(publicDirectory, 'logo.svg'), 'utf8');

// Tile favicons keep logo.svg's own rounded corners (transparent outside).
const tilePage = (svg) => `<!doctype html><html><head><style>
  * { margin: 0; padding: 0; }
  html, body { width: 100vw; height: 100vh; background: transparent; }
  svg { display: block; width: 100vw; height: 100vh; }
</style></head><body>${svg}</body></html>`;

// The apple-touch-icon is full-bleed: iOS applies its own corner mask, so
// the tile's rounded rect becomes the square page background instead.
const fullBleedSvg = logoSvg
  .replace(/<rect[^>]*rx="12"[^>]*\/>/, '')
  .replace(/<rect[^>]*rx="11\.5"[^>]*\/>/, '');
const applePage = `<!doctype html><html><head><style>
  * { margin: 0; padding: 0; }
  html, body { width: 100vw; height: 100vh; background: #0D1226; }
  svg { display: block; width: 100vw; height: 100vh; }
</style></head><body>${fullBleedSvg}</body></html>`;

const targets = [
  { file: 'favicon-16.png', size: 16, page: tilePage(logoSvg), transparent: true },
  { file: 'favicon-32.png', size: 32, page: tilePage(logoSvg), transparent: true },
  { file: 'icon-192.png', size: 192, page: tilePage(logoSvg), transparent: true },
  { file: 'icon-512.png', size: 512, page: tilePage(logoSvg), transparent: true },
  { file: 'apple-touch-icon.png', size: 180, page: applePage, transparent: false },
  // Android adaptive icons mask to circle/squircle; a full-bleed variant with
  // the mark inside the 80% safe zone survives every launcher shape.
  { file: 'icon-512-maskable.png', size: 512, page: applePage, transparent: false },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const target of targets) {
  await page.setViewportSize({ width: target.size, height: target.size });
  await page.setContent(target.page);
  await page.screenshot({
    path: resolve(publicDirectory, target.file),
    omitBackground: target.transparent,
  });
  console.log('Rendered', target.file);
}
await browser.close();

// favicon.ico: an ICO directory whose entries embed the PNGs directly
// (PNG-in-ICO — supported by every browser that requests /favicon.ico).
const entries = ['favicon-16.png', 'favicon-32.png'].map((file, index) => {
  const png = readFileSync(resolve(publicDirectory, file));
  const size = index === 0 ? 16 : 32;
  return { png, size };
});
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(entries.length, 4);
let offset = 6 + 16 * entries.length;
const directory = [];
for (const entry of entries) {
  const record = Buffer.alloc(16);
  record.writeUInt8(entry.size === 256 ? 0 : entry.size, 0); // width
  record.writeUInt8(entry.size === 256 ? 0 : entry.size, 1); // height
  record.writeUInt8(0, 2); // palette
  record.writeUInt8(0, 3); // reserved
  record.writeUInt16LE(1, 4); // planes
  record.writeUInt16LE(32, 6); // bits per pixel
  record.writeUInt32LE(entry.png.length, 8);
  record.writeUInt32LE(offset, 12);
  offset += entry.png.length;
  directory.push(record);
}
writeFileSync(
  resolve(publicDirectory, 'favicon.ico'),
  Buffer.concat([header, ...directory, ...entries.map((entry) => entry.png)]),
);
console.log('Packed favicon.ico');
