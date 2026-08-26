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
  // OG cards render at a third of this size in feeds — the type has to
  // be BIG. Tiers keep the longest titles on ≤3 lines inside 1000px.
  const titleSize =
    title.length <= 22 ? 92 : title.length <= 36 ? 80 : title.length <= 54 ? 66 : 54;
  // short blurbs get two large lines; long ones three slightly smaller
  const descriptionSize = description.length <= 110 ? 32 : 28;
  const descriptionLines = description.length <= 110 ? 2 : 3;
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
      radial-gradient(900px 520px at 18% -10%, rgba(99, 102, 241, 0.32), transparent 62%),
      radial-gradient(820px 520px at 90% 115%, rgba(34, 211, 238, 0.18), transparent 58%),
      #050a18;
    font-family: 'Geist', 'DejaVu Sans', 'Inter', sans-serif;
    position: relative;
  }
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(59, 130, 246, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59, 130, 246, 0.07) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(900px 520px at 40% 55%, black 20%, transparent 78%);
    -webkit-mask-image: radial-gradient(900px 520px at 40% 55%, black 20%, transparent 78%);
  }
  /* a soft glowing infinity, the brand's own mark, anchoring the right */
  .mark {
    position: absolute; right: -48px; top: 40%; transform: translateY(-50%);
    width: 600px; height: 600px;
    background: radial-gradient(closest-side, rgba(45, 212, 191, 0.19), transparent);
  }
  .mark svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.17; }
  /* left-aligned editorial block: eyebrow / title / beam / description */
  .stage {
    position: absolute; left: 90px; right: 90px; top: 128px; bottom: 72px;
    display: flex; flex-direction: column; justify-content: center;
    align-items: flex-start; gap: 22px;
  }
  .eyebrow {
    font-family: 'Geist Mono', 'DejaVu Sans Mono', monospace;
    font-size: 19px; letter-spacing: 0.24em; font-weight: 500;
    padding: 9px 22px; border-radius: 999px;
    border: 1px solid rgba(96, 165, 250, 0.45); color: #9db6e6;
    background: rgba(59, 130, 246, 0.08);
  }
  .title {
    font-size: ${titleSize}px; font-weight: 760; color: #eef4ff;
    text-shadow: 0 0 60px rgba(59, 130, 246, 0.55); letter-spacing: -0.025em;
    line-height: 1.04;
    max-width: 1000px;
    text-wrap: balance;
  }
  .beam {
    width: 160px; height: 4px; border-radius: 999px; margin: 6px 0 2px;
    background: linear-gradient(90deg, #6366f1, #2dd4bf 60%, #34d399);
    box-shadow: 0 0 26px rgba(45, 212, 191, 0.7);
  }
  .description {
    font-size: ${descriptionSize}px; color: #a9bde3; line-height: 1.4; max-width: 920px;
    letter-spacing: -0.005em;
    display: -webkit-box; -webkit-line-clamp: ${descriptionLines}; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .lockup { position: absolute; top: 34px; left: 44px; }
  .lockup img { display: block; width: 178px; }
  .site {
    position: absolute; bottom: 30px; right: 44px;
    font-family: 'Geist Mono', 'DejaVu Sans Mono', monospace;
    font-size: 17px; color: #6a82ab; letter-spacing: 0.04em;
  }
</style></head>
<body>
  <div class="grid"></div>
  <div class="mark"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M10.6 24 C 10.6 17.6, 19 17, 24 24 C 29 31, 37.4 30.4, 37.4 24 C 37.4 17.6, 29 17, 24 24 C 19 31, 10.6 30.4, 10.6 24 Z"
      stroke="url(#g)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    <defs><linearGradient id="g" x1="8" y1="14" x2="40" y2="34" gradientUnits="userSpaceOnUse">
      <stop stop-color="#818CF8" /><stop offset="1" stop-color="#34D399" /></linearGradient></defs>
  </svg></div>
  <div class="lockup"><img src="${pathToFileURL(lockupPath)}" alt="" /></div>
  <div class="stage">
    <div class="eyebrow">${escapeHtml(eyebrow)}</div>
    <div class="title">${escapeHtml(title)}</div>
    <div class="beam"></div>
    ${description ? `<div class="description">${escapeHtml(description)}</div>` : ''}
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
