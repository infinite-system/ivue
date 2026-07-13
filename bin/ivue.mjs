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

  npx ivue skill [targets] [--force]

  Installs the ivue operating manual for coding agents. Targets:
    (none) / --claude   .claude/skills/ivue/SKILL.md
    --cursor            .cursor/rules/ivue.mdc
    --copilot           .github/instructions/ivue.instructions.md
    --agents            a managed section in AGENTS.md
    --all               Claude + every vendor whose footprint exists
                        (.cursor/, .github/, AGENTS.md) — creates nothing new
  --force overwrites locally modified copies.`);
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
// the manual's body, without the Claude skill frontmatter
const skillBody = skillText.replace(/^---\n[\s\S]*?\n---\n+/, '');
const skillDescription =
  /description:\s*([^\n]+)/.exec(skillText)?.[1] ??
  'The ivue operating manual.';

/** Write one target idempotently; refuse to clobber local edits sans --force. */
function install(relativePath, content, label) {
  const targetPath = join(process.cwd(), relativePath);
  if (existsSync(targetPath)) {
    const existing = readFileSync(targetPath, 'utf8');
    if (existing === content) {
      console.log(`ivue: ${label} already up to date (ivue v${version}).`);
      return;
    }
    if (!force) {
      fail(
        `${relativePath} exists and differs from ivue v${version}'s copy.\n` +
          '      Re-run with --force to overwrite it.',
      );
    }
  }
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content);
  console.log(`ivue: ${label} installed at ${relativePath} (ivue v${version}).`);
}

// Explicit flags always install (creating the folder is the point).
// --all is detect-and-equip: vendor targets only where their footprint
// already exists — it never scaffolds a tool you don't use. Claude is the
// native format and installs in every mode.
const wantAll = flags.includes('--all');
const detected = (marker) => existsSync(join(process.cwd(), marker));
const skipped = (label, marker, flag) =>
  console.log(`ivue: ${label} skipped — no ${marker} here (pass ${flag} to create it).`);

const wantCursor = flags.includes('--cursor') || (wantAll && detected('.cursor'));
const wantCopilot = flags.includes('--copilot') || (wantAll && detected('.github'));
const wantAgents = flags.includes('--agents') || (wantAll && detected('AGENTS.md'));
const wantClaude =
  wantAll ||
  flags.includes('--claude') ||
  (!flags.includes('--cursor') && !flags.includes('--copilot') && !flags.includes('--agents'));

if (wantClaude) {
  install('.claude/skills/ivue/SKILL.md', skillText, 'Claude skill');
}
if (wantAll && !wantCursor) skipped('Cursor rule', '.cursor/', '--cursor');
if (wantAll && !wantCopilot) skipped('Copilot instructions', '.github/', '--copilot');
if (wantAll && !wantAgents) skipped('AGENTS.md section', 'AGENTS.md', '--agents');
if (wantCursor) {
  install(
    '.cursor/rules/ivue.mdc',
    `---\ndescription: ${skillDescription}\nglobs:\nalwaysApply: false\n---\n\n${skillBody}`,
    'Cursor rule',
  );
}
if (wantCopilot) {
  install(
    '.github/instructions/ivue.instructions.md',
    `---\napplyTo: '**/*.{ts,tsx,vue}'\n---\n\n${skillBody}`,
    'Copilot instructions',
  );
}
if (wantAgents) {
  // AGENTS.md is shared and user-owned — manage only a marked section.
  const startMarker = '<!-- ivue:skill:start -->';
  const endMarker = '<!-- ivue:skill:end -->';
  const section = `${startMarker}\n<!-- managed by \`npx ivue skill --agents\` — edits inside are overwritten -->\n\n${skillBody}\n${endMarker}`;
  const agentsPath = join(process.cwd(), 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const existing = readFileSync(agentsPath, 'utf8');
    const start = existing.indexOf(startMarker);
    const end = existing.indexOf(endMarker);
    if (start !== -1 && end !== -1) {
      const updated =
        existing.slice(0, start) + section + existing.slice(end + endMarker.length);
      if (updated === existing) {
        console.log(`ivue: AGENTS.md section already up to date (ivue v${version}).`);
      } else {
        writeFileSync(agentsPath, updated);
        console.log(`ivue: AGENTS.md section updated (ivue v${version}).`);
      }
    } else {
      writeFileSync(agentsPath, existing.trimEnd() + '\n\n' + section + '\n');
      console.log(`ivue: AGENTS.md section appended (ivue v${version}).`);
    }
  } else {
    writeFileSync(agentsPath, section + '\n');
    console.log(`ivue: AGENTS.md created (ivue v${version}).`);
  }
}
