// Screenshots every interactive embed (DemoBox instances) in blog posts,
// for the newsletter: emails can't run Vue, so each embed becomes a
// committed PNG the email renders with a "view the live example" caption
// linking back to the post.
//
//   npm run render:embeds     (after npm run build:docs; commit the PNGs)
//
// Run locally whenever a post gains/changes an embed — the Cloudflare
// build has no browser, so these are committed artifacts like banners.
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const blogDirectory = resolve(scriptDirectory, '../blog');
const distDirectory = resolve(scriptDirectory, '../.vitepress/dist');
const outputDirectory = resolve(scriptDirectory, '../public/blog/embeds');
mkdirSync(outputDirectory, { recursive: true });

// posts whose bodies embed components (BlogPostDate excluded — metadata)
const postsWithEmbeds = readdirSync(blogDirectory)
  .filter((entry) => entry.endsWith('.md') && entry !== 'index.md')
  .map((entry) => ({
    slug: entry.slice(0, -'.md'.length),
    source: readFileSync(resolve(blogDirectory, entry), 'utf8'),
  }))
  .filter(({ source }) =>
    /^<(?!BlogPostDate)[A-Z]|^<ClientOnly>/m.test(source),
  );

const PORT = 5189;
const server = spawn('npx', ['serve', distDirectory, '-l', String(PORT)], {
  stdio: 'ignore',
});
// wait until the server actually answers
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
  for (const { slug } of postsWithEmbeds) {
    await page.goto(`http://localhost:${PORT}/blog/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await page.waitForSelector('.vp-doc', { timeout: 20_000 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(900); // demos mount client-side
    const embeds = page.locator('.vp-doc .dbx');
    const count = await embeds.count();
    for (let index = 0; index < count; index++) {
      const path = resolve(outputDirectory, `${slug}-embed-${index + 1}.png`);
      await embeds.nth(index).scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await embeds.nth(index).screenshot({ path });
      console.log(`embed: ${slug}-embed-${index + 1}.png`);
    }
    if (count === 0) console.warn(`embed: WARNING — no .dbx found on ${slug}`);
  }
  await browser.close();
} finally {
  server.kill();
}
console.log('embed shots complete');
