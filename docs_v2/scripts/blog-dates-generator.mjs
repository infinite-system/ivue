// Recovers each blog post's true publication date from git (the commit that
// ADDED the file) and writes docs_v2/blog/blog-dates.json. The JSON is
// COMMITTED: deploy environments build from shallow clones where this
// history is not available, so the file — not live git — is what the blog
// data loader reads. Re-run after adding posts:  npm run sync:blog-dates
import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const blogDirectory = resolve(scriptDirectory, '../blog');
const repositoryRoot = resolve(scriptDirectory, '../..');

const dates = {};
for (const entry of readdirSync(blogDirectory).sort()) {
  if (!entry.endsWith('.md') || entry === 'index.md') continue;
  const slug = entry.replace(/\.md$/, '');
  const log = execSync(
    `git log --follow --diff-filter=A --format='%at %as' -- docs_v2/blog/${entry}`,
    { cwd: repositoryRoot, encoding: 'utf8' },
  ).trim();
  const addCommit = log.split('\n').filter(Boolean).pop();
  if (!addCommit) {
    console.warn(`no add-commit found for ${slug} — is it committed?`);
    continue;
  }
  const [timestamp, date] = addCommit.split(' ');
  dates[slug] = { date, timestamp: Number(timestamp) };
}

// Posts added in ONE commit share one git timestamp, which would leave
// their relative order undefined (every consumer would fall back to
// filename order). Spread each tied group across one-minute steps so
// chronology matches the blog page's displayed order: the index sorts
// newest-first with a stable sort over alphabetical input, so within a
// tied group the alphabetically FIRST slug displays on top — it gets
// the LATEST timestamp, the bottom-most keeps the commit's own. The
// calendar date is untouched (minutes never cross a day boundary).
const slugsByTimestamp = new Map();
for (const [slug, record] of Object.entries(dates)) {
  const group = slugsByTimestamp.get(record.timestamp) ?? [];
  group.push(slug);
  slugsByTimestamp.set(record.timestamp, group);
}
for (const [timestamp, group] of slugsByTimestamp) {
  if (group.length < 2) continue;
  group.sort();
  for (const [position, slug] of group.entries())
    dates[slug].timestamp = timestamp + (group.length - 1 - position) * 60;
}

const outputPath = resolve(blogDirectory, 'blog-dates.json');
writeFileSync(outputPath, JSON.stringify(dates, null, 2) + '\n');
console.log(`Wrote ${Object.keys(dates).length} post dates to ${outputPath}`);

// Release dates ride the same mechanism: a release's date is the commit
// that added its note file. Committed for the same shallow-clone reason.
const notesDirectory = resolve(scriptDirectory, '../../releases');
const releaseDates = {};
for (const entry of readdirSync(notesDirectory).sort()) {
  const match = entry.match(/^ivue@(\d+\.\d+\.\d+)\.md$/);
  if (!match) continue;
  const log = execSync(
    `git log --follow --diff-filter=A --format='%at %as' -- releases/${entry}`,
    { cwd: repositoryRoot, encoding: 'utf8' },
  ).trim();
  const addCommit = log.split('\n').filter(Boolean).pop();
  if (!addCommit) continue;
  const [timestamp, date] = addCommit.split(' ');
  releaseDates[match[1]] = { date, timestamp: Number(timestamp) };
}
const releaseOutput = resolve(scriptDirectory, '../releases-dates.json');
writeFileSync(releaseOutput, JSON.stringify(releaseDates, null, 2) + '\n');
console.log(
  `Wrote ${Object.keys(releaseDates).length} release dates to ${releaseOutput}`,
);
