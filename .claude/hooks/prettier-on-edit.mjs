#!/usr/bin/env node
// PostToolUse hook: after an Edit or a Write, run prettier on that file when
// the project's format scripts cover it. Reads the tool call from stdin,
// never blocks (a formatter failure is reported, not fatal), and touches
// nothing outside the edited file.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const COVERED = [/^examples\/playground\/src\/.*\.(ts|vue)$/, /^docs_v2\/\.vitepress\/theme\/components\/.*\.(ts|vue)$/];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  let call;
  try {
    call = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  const root = call.cwd ?? process.cwd();
  const file = call.tool_input?.file_path;
  if (!file) process.exit(0);
  const absolute = resolve(root, file);
  const relative = absolute.startsWith(root + '/') ? absolute.slice(root.length + 1) : absolute;
  if (!COVERED.some((pattern) => pattern.test(relative)) || !existsSync(absolute)) process.exit(0);
  try {
    execFileSync(resolve(root, 'node_modules/.bin/prettier'), ['--write', '--log-level', 'warn', absolute], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
  } catch (error) {
    console.error(`prettier-on-edit: ${error.message}`);
  }
  process.exit(0);
});
