// Push the built docs_v2 site (docs_v2/.vitepress/dist) to the gh-pages
// branch as an orphan commit. Run from the REPO ROOT, after `npm run
// build:docs`. Node built-ins only — no dependencies.
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

const DIST = 'docs_v2/.vitepress/dist';
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

if (!existsSync(`${DIST}/index.html`)) {
  console.error(`No build found at ${DIST} — run \`npm run build:docs\` first.`);
  process.exit(1);
}

// GitHub Pages runs Jekyll by default, which drops _-prefixed paths.
writeFileSync(`${DIST}/.nojekyll`, '');

run('git checkout --orphan gh-pages');
run(`git --work-tree ${DIST} add --all`);
run(`git --work-tree ${DIST} commit -m gh-pages`);
run('git push origin HEAD:gh-pages --force');

// Restore the working branch (matters for local runs; harmless in CI).
run(`rm -r ${DIST}`);
run('git checkout -f main');
run('git branch -D gh-pages');

console.log('Deployed docs_v2 to gh-pages.');
