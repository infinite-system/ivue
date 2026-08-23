// Screenshots every code block in blog posts, for the X composer:
// tweets can't render Shiki, so each block becomes a committed PNG the
// composer can attach (content mode's picker, thread mode's per-segment
// auto-attachment via the plain-text [code] markers, which share this
// same document order).
//
//   npm run render:code-shots     (after npm run build:docs; commit PNGs)
//
// Run locally whenever a post's code changes — the Cloudflare build has
// no browser, so these are committed artifacts like banners and embeds.
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { isPrivatePost } from './channel-posts.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const blogDirectory = resolve(scriptDirectory, '../blog');
const distDirectory = resolve(scriptDirectory, '../.vitepress/dist');
const outputDirectory = resolve(scriptDirectory, '../public/blog/code');
mkdirSync(outputDirectory, { recursive: true });

// X allows 4 images/tweet and a thread holds 10 — more shots than this
// per post could never all be used
const MAXIMUM_SHOTS_PER_POST = 10;

// optional slug arguments narrow the run: npm run render:code-shots -- <slug…>
const requestedSlugs = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const slugs = readdirSync(blogDirectory)
  .filter((entry) => entry.endsWith('.md') && entry !== 'index.md')
  // private posts have no production page to screenshot
  .filter((entry) => !isPrivatePost(readFileSync(resolve(blogDirectory, entry), 'utf8')))
  .map((entry) => entry.slice(0, -'.md'.length))
  .filter((slug) => !requestedSlugs.length || requestedSlugs.includes(slug));

const PORT = 5189;
const server = spawn('npx', ['serve', distDirectory, '-l', String(PORT)], {
  stdio: 'ignore',
});
for (let attempt = 0; ; attempt++) {
  try {
    const probe = await fetch(`http://localhost:${PORT}/`);
    if (probe.ok) break;
  } catch {}
  if (attempt > 60) throw new Error('serve did not come up');
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
}

try {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1400 },
    deviceScaleFactor: 2,
  });
  for (const slug of slugs) {
    // regenerate the whole post's set — stale shots must not linger
    for (const stale of readdirSync(outputDirectory)) {
      if (stale.startsWith(`${slug}-code-`))
        rmSync(resolve(outputDirectory, stale));
    }
    await page.goto(`http://localhost:${PORT}/blog/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await page.waitForSelector('.vp-doc', { timeout: 20_000 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.addStyleTag({
      // EVERY code-group tab panel is forced visible so ALL tabs get a
      // shot in document order (tab order) — not just the active one
      content:
        '.newsletter, .newsletter-pill { display: none !important; }\n' +
        ".vp-code-group .blocks div[class*='language-'] { display: block !important; }",
    });
    await page.waitForTimeout(500);
    const codeBlocks = page.locator(".vp-doc div[class*='language-']:visible");
    const count = Math.min(await codeBlocks.count(), MAXIMUM_SHOTS_PER_POST);
    let taken = 0;
    for (let index = 0; index < count; index++) {
      try {
        await codeBlocks.nth(index).scrollIntoViewIfNeeded({ timeout: 5_000 });
        await page.waitForTimeout(120);
        await codeBlocks.nth(index).screenshot({
          path: resolve(outputDirectory, `${slug}-code-${taken + 1}.png`),
          timeout: 10_000,
        });
        taken += 1; // numbering advances only on a written file
      } catch {
        console.warn(`code shots: skipped a block on ${slug}`);
      }
    }
    if (taken) console.log(`code shots: ${slug} × ${taken}`);
  }
  await browser.close();
} finally {
  server.kill();
}
console.log('code shots complete');
