#!/usr/bin/env node
// Render an image-card expression's cards to PNGs at 1200×675 — the same
// canvas language as the blog banners (dark ground, indigo and cyan
// glows, Geist), one file per live card. Reads the expression from the
// press API, writes newsletter/press-cards/<expressionId>-<n>.png
// (gitignored). Chromium via playwright, like the banner renderer.
//
//   PRESS_ORIGIN=… ADMIN_SECRET=… node newsletter/scripts/press-cards.mjs <expressionId> [outDir]
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const path = resolve(here, '..', '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const fileEnv = loadEnvFile();
const ORIGIN = (process.env.PRESS_ORIGIN || fileEnv.DEV_WORKER_ORIGIN || 'https://ivue-newsletter.ekalashnikov.workers.dev').replace(/\/$/, '');
const SECRET = process.env.ADMIN_SECRET || fileEnv.ADMIN_SECRET || '';
const [, , idText, outText] = process.argv;
if (!idText) {
  console.error('usage: press-cards.mjs <expressionId> [outDir]');
  process.exit(2);
}
const outDir = resolve(outText ?? resolve(here, '..', 'press-cards'));
mkdirSync(outDir, { recursive: true });

const response = await fetch(`${ORIGIN}/admin/press/expression/${idText}`, {
  headers: { authorization: `Bearer ${SECRET}` },
});
if (!response.ok) {
  console.error(`HTTP ${response.status} reading expression ${idText}`);
  process.exit(1);
}
const expression = await response.json();
const cards = (expression.children ?? []).filter((child) => !child.skipped);
if (!cards.length) {
  console.error('no live cards on this expression');
  process.exit(1);
}

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cardHtml(text, index, count) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 675px; }
  body {
    position: relative; overflow: hidden; color: #eaf2ff;
    font: 600 44px/1.25 'Geist', 'DejaVu Sans', 'Inter', sans-serif;
    background:
      radial-gradient(52rem 26rem at 12% -8%, rgba(99, 102, 241, 0.32), transparent 60%),
      radial-gradient(44rem 22rem at 95% 0%, rgba(52, 211, 153, 0.18), transparent 60%),
      #050a18;
  }
  .grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(99,102,241,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.08) 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(60% 60% at 50% 50%, #000 40%, transparent 100%); }
  .index { position: absolute; top: 44px; left: 60px; font: 500 20px/1 'Geist Mono', 'DejaVu Sans Mono', monospace; letter-spacing: .14em; color: #7e9cd0; }
  .text { position: absolute; left: 60px; right: 60px; top: 50%; transform: translateY(-50%); white-space: pre-wrap; text-wrap: balance; text-shadow: 0 0 24px rgba(99,102,241,.35); }
  .brand { position: absolute; bottom: 44px; left: 60px; font: 500 22px/1 'Geist Mono', 'DejaVu Sans Mono', monospace; color: #67e8f9; }
  .beam { position: absolute; bottom: 92px; left: 60px; width: 160px; height: 2px; background: #67e8f9; box-shadow: 0 0 18px #67e8f9; }
  </style></head><body>
  <div class="grid"></div>
  <div class="index">${index} / ${count}</div>
  <div class="text">${escape(text)}</div>
  <div class="beam"></div>
  <div class="brand">∞ ivue</div>
  </body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
const written = [];
for (const [index, card] of cards.entries()) {
  await page.setContent(cardHtml(card.body, index + 1, cards.length), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const path = resolve(outDir, `${expression.id}-${index + 1}.png`);
  await page.screenshot({ path, type: 'png' });
  written.push(path);
}
await browser.close();
for (const path of written) console.log(path);
