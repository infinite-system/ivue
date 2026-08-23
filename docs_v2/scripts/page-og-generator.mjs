// Renders a templated OG banner for every NON-BLOG page (blog posts
// have bespoke banners via the blog-banner skill): section eyebrow +
// frontmatter title + description on the house backdrop, 1200x630.
//
//   npm run render:page-og            (all pages)
//   npm run render:page-og -- guide/standard.md   (narrow re-run)
//
// Outputs docs_v2/public/og/<path-with-dashes>.png — COMMITTED
// artifacts (the Cloudflare build has no browser), wired to og:image
// per page in config.ts transformHead. Re-run locally when a page's
// title/description changes.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(scriptDirectory, '..');
const outputDirectory = resolve(docsRoot, 'public/og');
mkdirSync(outputDirectory, { recursive: true });

const fontsDirectory = resolve(
  docsRoot,
  '../.claude/skills/blog-banner/banners/fonts',
);
const lockupPath = resolve(docsRoot, 'public/brand-lockup-dark.png');

const EYEBROWS = {
  guide: 'GUIDE',
  examples: 'EXAMPLES',
  api: 'API REFERENCE',
  releases: 'RELEASES',
  'community.md': 'COMMUNITY',
  'engine.md': 'THE ENGINE',
};

function* markdownFiles(directory, prefix = '') {
  for (const entry of readdirSync(directory)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const path = join(directory, entry);
    const relative = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(path).isDirectory()) {
      if (['blog', 'public', 'scripts'].includes(relative)) continue;
      yield* markdownFiles(path, relative);
    } else if (entry.endsWith('.md')) {
      // the home page keeps the hand-made site og-image
      if (relative === 'index.md' || relative === '404.md') continue;
      yield relative;
    }
  }
}

function frontmatterField(source, field) {
  const frontmatter = source.match(/^---\n[\s\S]*?\n---/)?.[0] ?? '';
  const match = frontmatter.match(
    new RegExp(`^${field}:\\s*(?:'([^']*)'|"([^"]*)"|(.+))$`, 'm'),
  );
  return match ? (match[1] ?? match[2] ?? match[3] ?? '').trim() : '';
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function bannerHtml(eyebrow, title, description) {
  const titleSize =
    title.length <= 26 ? 62 : title.length <= 44 ? 52 : title.length <= 66 ? 44 : 38;
  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @font-face { font-family: 'Geist'; font-style: normal; font-weight: 300 800;
    src: url(${pathToFileURL(join(fontsDirectory, 'geist-latin.woff2'))}) format('woff2'); }
  @font-face { font-family: 'Geist Mono'; font-style: normal; font-weight: 400 600;
    src: url(${pathToFileURL(join(fontsDirectory, 'geist-mono-latin.woff2'))}) format('woff2'); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    background:
      radial-gradient(1000px 560px at 50% -20%, rgba(99, 102, 241, 0.25), transparent 60%),
      radial-gradient(900px 560px at 50% 130%, rgba(34, 211, 238, 0.14), transparent 55%),
      #050a18;
    font-family: 'Geist', 'DejaVu Sans', 'Inter', sans-serif;
    position: relative;
  }
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59, 130, 246, 0.06) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(760px 480px at 50% 50%, black 25%, transparent 75%);
    -webkit-mask-image: radial-gradient(760px 480px at 50% 50%, black 25%, transparent 75%);
  }
  .stage {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 24px; padding: 64px 90px 44px;
    text-align: center;
  }
  .eyebrow {
    font-family: 'Geist Mono', 'DejaVu Sans Mono', monospace;
    font-size: 17px; letter-spacing: 0.22em;
    padding: 8px 20px; border-radius: 999px;
    border: 1px solid rgba(96, 165, 250, 0.4); color: #7e9cd0;
  }
  .title {
    font-size: ${titleSize}px; font-weight: 750; color: #eaf2ff;
    text-shadow: 0 0 44px rgba(59, 130, 246, 0.5); letter-spacing: -0.015em;
    line-height: 1.14;
    max-width: 1020px;
  }
  .description {
    font-size: 24px; color: #7e9cd0; line-height: 1.55; max-width: 940px;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .beam {
    width: 240px; height: 3px; border-radius: 999px; margin-top: 4px;
    background: linear-gradient(90deg, #6366f1, #2dd4bf 60%, #34d399);
    box-shadow: 0 0 22px rgba(45, 212, 191, 0.6);
  }
  .lockup { position: absolute; top: 34px; left: 44px; }
  .lockup img { display: block; width: 178px; }
  .site {
    position: absolute; bottom: 30px; right: 44px;
    font-family: 'Geist Mono', 'DejaVu Sans Mono', monospace;
    font-size: 15px; color: #52688f;
  }
</style></head>
<body>
  <div class="grid"></div>
  <div class="lockup"><img src="${pathToFileURL(lockupPath)}" alt="" /></div>
  <div class="stage">
    <div class="eyebrow">${escapeHtml(eyebrow)}</div>
    <div class="title">${escapeHtml(title)}</div>
    ${description ? `<div class="beam"></div><div class="description">${escapeHtml(description)}</div>` : '<div class="beam"></div>'}
  </div>
  <div class="site">ivue.dev</div>
</body></html>`;
}

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const pages = [...markdownFiles(docsRoot)].filter(
  (page) => !requested.length || requested.includes(page),
);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
let rendered = 0;
for (const relative of pages) {
  const source = readFileSync(resolve(docsRoot, relative), 'utf8');
  const title =
    frontmatterField(source, 'title') ||
    source.match(/^# (.+)$/m)?.[1]?.replace(/[`*]/g, '') ||
    relative;
  const description = frontmatterField(source, 'description');
  const section = relative.includes('/') ? relative.split('/')[0] : relative;
  const eyebrow = EYEBROWS[section] ?? 'IVUE';
  const outputName =
    relative.replace(/\.md$/, '').replaceAll('/', '-') + '.png';

  // a real file:// document, not setContent — about:blank documents
  // cannot load file:// fonts
  const scratchPath = resolve(outputDirectory, '.render.html');
  writeFileSync(scratchPath, bannerHtml(eyebrow, title, description));
  await page.goto(pathToFileURL(scratchPath).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(outputDirectory, outputName) });
  rendered += 1;
}
await browser.close();
rmSync(resolve(outputDirectory, '.render.html'), { force: true });
console.log(`page og: ${rendered} banners → docs_v2/public/og/`);
