// Renames a blog post's slug EVERYWHERE the slug is identity — the
// mechanical form of the runbook in newsletter/README.md ("Renaming a
// post slug"). Usage:
//
//   npm run rename:blog-slug -- <old-slug> <new-slug> [--dry]
//
// Steps (in the runbook's order):
//   1. git mv the post, banner source, banner PNG, embed/code shots
//   2. rewrite every cross-reference in docs_v2 markdown
//   3. append permanent 301s to docs_v2/public/_redirects
//   4. commit (git --follow needs the rename in committed history)
//   5. sync:blog-dates, verify the new slug kept its date, commit
//   6. migrate D1 (remote AND local): sends, tweets, pending job payloads
//
// It does NOT build or deploy — run `npm run build:docs` and the root
// `npx wrangler@4.120.1 deploy` after, and verify the old URL 301s.
// --dry prints every action without executing anything.
import { execSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [oldSlug, newSlug, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry');
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,80}$/;

if (!oldSlug || !newSlug || !SLUG_PATTERN.test(oldSlug) || !SLUG_PATTERN.test(newSlug)) {
  console.error('usage: npm run rename:blog-slug -- <old-slug> <new-slug> [--dry]');
  process.exit(1);
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const blogDirectory = resolve(repositoryRoot, 'docs_v2/blog');
const publicBlog = resolve(repositoryRoot, 'docs_v2/public/blog');
const bannersDirectory = resolve(
  repositoryRoot,
  '.claude/skills/blog-banner/banners',
);
const redirectsPath = resolve(repositoryRoot, 'docs_v2/public/_redirects');

function run(command, options = {}) {
  console.log(dryRun ? `[dry] ${command}` : `$ ${command}`);
  if (dryRun) return '';
  return execSync(command, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
}

// ---- preflight -------------------------------------------------------

if (!existsSync(resolve(blogDirectory, `${oldSlug}.md`))) {
  console.error(`no such post: docs_v2/blog/${oldSlug}.md`);
  process.exit(1);
}
if (existsSync(resolve(blogDirectory, `${newSlug}.md`))) {
  console.error(`target already exists: docs_v2/blog/${newSlug}.md`);
  process.exit(1);
}
const dirty = execSync('git status --porcelain', {
  cwd: repositoryRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter((line) => line.trim() && !line.includes('avatars'));
if (dirty.length && !dryRun) {
  console.error(
    'working tree not clean — the script commits; stash or commit first:\n' +
      dirty.join('\n'),
  );
  process.exit(1);
}

// ---- 1. moves --------------------------------------------------------

const moves = [[`docs_v2/blog/${oldSlug}.md`, `docs_v2/blog/${newSlug}.md`]];
if (existsSync(resolve(bannersDirectory, `${oldSlug}.html`)))
  moves.push([
    `.claude/skills/blog-banner/banners/${oldSlug}.html`,
    `.claude/skills/blog-banner/banners/${newSlug}.html`,
  ]);
const hadBannerPng = existsSync(resolve(publicBlog, `${oldSlug}.png`));
if (hadBannerPng)
  moves.push([
    `docs_v2/public/blog/${oldSlug}.png`,
    `docs_v2/public/blog/${newSlug}.png`,
  ]);
const shots = [];
for (const [subdir, marker] of [
  ['embeds', 'embed'],
  ['code', 'code'],
]) {
  const directory = resolve(publicBlog, subdir);
  if (!existsSync(directory)) continue;
  for (const entry of readdirSync(directory)) {
    const match = entry.match(
      new RegExp(`^${oldSlug}-${marker}-(\\d+)\\.png$`),
    );
    if (!match) continue;
    const renamed = `${newSlug}-${marker}-${match[1]}.png`;
    moves.push([
      `docs_v2/public/blog/${subdir}/${entry}`,
      `docs_v2/public/blog/${subdir}/${renamed}`,
    ]);
    shots.push([`/blog/${subdir}/${entry}`, `/blog/${subdir}/${renamed}`]);
  }
}
for (const [from, to] of moves) run(`git mv "${from}" "${to}"`);

// ---- 2. cross-references ---------------------------------------------

// docs_v2 (posts, relatedPosts frontmatter, cross-links) AND the
// skills tree (the related-blogs curation ledger, skill examples)
const markdownFiles = execSync(
  `grep -rl --include=*.md "${oldSlug}" docs_v2 .claude/skills || true`,
  { cwd: repositoryRoot, encoding: 'utf8' },
)
  .split('\n')
  .filter((file) => file && !file.includes('.vitepress/dist'));
for (const file of markdownFiles) {
  console.log(`${dryRun ? '[dry] ' : ''}rewrite refs: ${file}`);
  if (dryRun) continue;
  const source = readFileSync(resolve(repositoryRoot, file), 'utf8');
  writeFileSync(
    resolve(repositoryRoot, file),
    source.replaceAll(oldSlug, newSlug),
  );
}

// ---- 3. permanent redirects ------------------------------------------

const redirectLines = [`/blog/${oldSlug} /blog/${newSlug} 301`];
if (hadBannerPng)
  redirectLines.push(`/blog/${oldSlug}.png /blog/${newSlug}.png 301`);
for (const [from, to] of shots) redirectLines.push(`${from} ${to} 301`);
console.log(
  `${dryRun ? '[dry] ' : ''}append to _redirects:\n  ` +
    redirectLines.join('\n  '),
);
if (!dryRun) appendFileSync(redirectsPath, redirectLines.join('\n') + '\n');

// ---- 4 + 5. commit, re-sync dates, verify, commit ----------------------

run(
  `git add -A ':!docs_v2/public/avatars' && git commit -m "blog: rename slug ${oldSlug} → ${newSlug}" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`,
);
run('npm run sync:blog-dates');
if (!dryRun) {
  const dates = JSON.parse(
    readFileSync(resolve(blogDirectory, 'blog-dates.json'), 'utf8'),
  );
  if (!dates[newSlug]?.date) {
    console.error(
      `DATE LOST for ${newSlug} — git --follow did not track the rename; fix before continuing`,
    );
    process.exit(1);
  }
  console.log(`date preserved: ${newSlug} = ${dates[newSlug].date}`);
}
run(
  `git add docs_v2/blog/blog-dates.json docs_v2/releases-dates.json && git commit -m "blog: re-sync dates after ${newSlug} rename" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`,
);

// ---- 6. D1 migration (remote AND local) -------------------------------

const statements = [
  `UPDATE sends SET slug='${newSlug}' WHERE slug='${oldSlug}'`,
  `UPDATE tweets SET slug='${newSlug}' WHERE slug='${oldSlug}'`,
  `UPDATE scheduled_jobs SET payload=json_set(payload,'$.slug','${newSlug}') WHERE executed_at IS NULL AND json_extract(payload,'$.slug')='${oldSlug}'`,
];
for (const location of ['--remote', '--local']) {
  for (const statement of statements) {
    run(
      `npx wrangler@4.120.1 d1 execute ivue-newsletter ${location} --command "${statement}"`,
      { cwd: resolve(repositoryRoot, 'newsletter') },
    );
  }
}

console.log(`
rename complete: ${oldSlug} → ${newSlug}
next (manual): npm run build:docs && npx wrangler@4.120.1 deploy
verify: curl -sI https://ivue.dev/blog/${oldSlug} | grep -i location`);
