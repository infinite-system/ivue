#!/usr/bin/env node
/**
 * ivue CLI.
 *
 *   npx ivue skill [--force]
 *
 * Installs the operating manual — the same document that renders as the
 * docs' Standard page — into ./.claude/skills/ivue/SKILL.md, where Claude
 * Code (and compatible agents) pick it up as a skill. The copy comes from
 * the installed package, so the manual always matches the engine version
 * the project actually runs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command, ...flags] = process.argv.slice(2);

function fail(message) {
  console.error(`ivue: ${message}`);
  process.exit(1);
}

if (command !== 'skill') {
  console.log(`ivue — commands:

  npx ivue skill [--force]   install the ivue operating manual as an agent
                             skill at .claude/skills/ivue/SKILL.md
                             (--force overwrites local modifications)`);
  process.exit(command === undefined || command === 'help' ? 0 : 1);
}

const force = flags.includes('--force');
const version = JSON.parse(
  readFileSync(join(packageRoot, 'package.json'), 'utf8'),
).version;

// published packages carry skills/; the repo itself carries .claude/skills/
const sourcePath = [
  join(packageRoot, 'skills', 'ivue', 'SKILL.md'),
  join(packageRoot, '.claude', 'skills', 'ivue', 'SKILL.md'),
].find(existsSync);
if (!sourcePath) fail('SKILL.md not found in the installed package.');

const skillText = readFileSync(sourcePath, 'utf8');
const targetDir = join(process.cwd(), '.claude', 'skills', 'ivue');
const targetPath = join(targetDir, 'SKILL.md');

if (existsSync(targetPath)) {
  const existing = readFileSync(targetPath, 'utf8');
  if (existing === skillText) {
    console.log(`ivue: skill already up to date (ivue v${version}).`);
    process.exit(0);
  }
  if (!force) {
    fail(
      `.claude/skills/ivue/SKILL.md exists and differs from ivue v${version}'s copy.\n` +
        '      Re-run with --force to overwrite it.',
    );
  }
}

mkdirSync(targetDir, { recursive: true });
writeFileSync(targetPath, skillText);
console.log(
  `ivue: skill installed at .claude/skills/ivue/SKILL.md (matches ivue v${version}).`,
);
