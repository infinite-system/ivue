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

const outputPath = resolve(blogDirectory, 'blog-dates.json');
writeFileSync(outputPath, JSON.stringify(dates, null, 2) + '\n');
console.log(`Wrote ${Object.keys(dates).length} post dates to ${outputPath}`);
