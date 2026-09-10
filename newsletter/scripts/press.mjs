#!/usr/bin/env node
// The press CLI — the agent's (and curl-averse operator's) way into the
// press: list, show, edit, approve, skip, sent, import. Same admin API
// the dashboard uses; every write carries `X-Press-Author: agent` so
// revisions record who wrote. Reads the Worker origin and secret from
// the environment (PRESS_ORIGIN, ADMIN_SECRET), falling back to
// newsletter/.env. Run from anywhere:
//
//   node newsletter/scripts/press.mjs list [--q text] [--status approved] [--kind x-thread]
//   node newsletter/scripts/press.mjs show <pieceId>
//   node newsletter/scripts/press.mjs expression <expressionId>
//   node newsletter/scripts/press.mjs edit <expressionId> --body-file path | --body "text" | --label "…" | --venue "…"
//   node newsletter/scripts/press.mjs base <pieceId> --body-file path
//   node newsletter/scripts/press.mjs approve|unapprove|detach|archive <expressionId>
//   node newsletter/scripts/press.mjs skip <segmentId> [--restore]
//   node newsletter/scripts/press.mjs sent <expressionId> --url … [--platform bluesky] [--venue …] [--calendar-id …]
//   node newsletter/scripts/press.mjs postings [<pieceId>]
//   node newsletter/scripts/press.mjs import <batch.json> [--dry-run]
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const path = resolve(here, '..', '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const fileEnv = loadEnvFile();
const ORIGIN = (
  process.env.PRESS_ORIGIN ||
  fileEnv.DEV_WORKER_ORIGIN ||
  'https://ivue-newsletter.ekalashnikov.workers.dev'
).replace(/\/$/, '');
const SECRET = process.env.ADMIN_SECRET || fileEnv.ADMIN_SECRET || '';

const [, , command, ...rest] = process.argv;
const positional = [];
const flags = {};
for (let index = 0; index < rest.length; index++) {
  const token = rest[index];
  if (token.startsWith('--')) {
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else {
      flags[key] = next;
      index++;
    }
  } else positional.push(token);
}

async function api(path, method = 'GET', body) {
  if (!SECRET) throw new Error('ADMIN_SECRET is not set (environment or newsletter/.env).');
  const response = await fetch(`${ORIGIN}/admin/press/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${SECRET}`,
      'x-press-author': 'agent',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `HTTP ${response.status} on ${method} ${path}`);
  return json;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function bodyFrom(flagSet) {
  if (flagSet['body-file']) return readFileSync(resolve(flagSet['body-file']), 'utf8').replace(/\n$/, '');
  if (typeof flagSet.body === 'string') return flagSet.body;
  return undefined;
}

function summarize(piece) {
  const states = (piece.expressions ?? [])
    .map((state) => `${state.kind}${state.venue ? `@${state.venue}` : ''}:${state.status}${state.mode === 'derived' ? '*' : ''}`)
    .join('  ');
  return `#${piece.id}  ${piece.title}${piece.slug ? `  (${piece.slug})` : ''}  wave ${piece.wave}\n      ${states || '— no expressions yet'}`;
}

const commands = {
  async list() {
    const query = new URLSearchParams();
    for (const key of ['q', 'status', 'kind', 'wave']) if (flags[key]) query.set(key, String(flags[key]));
    const pieces = await api(`piece${query.size ? `?${query}` : ''}`);
    for (const piece of pieces) console.log(summarize(piece));
    if (!pieces.length) console.log('no pieces');
  },
  async show() {
    const piece = await api(`piece/${positional[0]}`);
    console.log(`#${piece.id}  ${piece.title}\nclaim: ${piece.claim}\nlinks: ${piece.links.map((link) => link.url).join(', ')}\n\n--- base ---\n${piece.base}\n`);
    for (const expression of piece.expressions) {
      console.log(`\n=== expression #${expression.id}  ${expression.kind}${expression.venue ? ` @ ${expression.venue}` : ''}  ${expression.mode}  ${expression.status}${expression.label ? `  "${expression.label}"` : ''}`);
      if (expression.children) {
        expression.children.forEach((child, index) => {
          console.log(`  [${index + 1}]${child.skipped ? ' (skipped)' : ''} #${child.id}\n  ${child.body.replace(/\n/g, '\n  ')}`);
        });
      } else console.log(expression.body);
    }
  },
  async expression() {
    print(await api(`expression/${positional[0]}`));
  },
  async edit() {
    const changes = {};
    const body = bodyFrom(flags);
    if (body !== undefined) changes.body = body;
    for (const key of ['label', 'venue']) if (typeof flags[key] === 'string') changes[key] = flags[key];
    if (typeof flags['calendar-id'] === 'string') changes.calendarId = flags['calendar-id'];
    if (typeof flags.meta === 'string') changes.meta = JSON.parse(flags.meta);
    print(await api(`expression/${positional[0]}`, 'PATCH', changes));
  },
  async base() {
    const body = bodyFrom(flags);
    if (body === undefined) throw new Error('base needs --body-file or --body');
    const piece = await api(`piece/${positional[0]}`, 'PATCH', { base: body });
    console.log(`base saved; ${piece.expressions.filter((expression) => expression.mode === 'derived').length} derived expression(s) regenerated`);
  },
  async approve() {
    print(await api(`expression/${positional[0]}/approve`, 'POST', {}));
  },
  async unapprove() {
    print(await api(`expression/${positional[0]}/unapprove`, 'POST', {}));
  },
  async detach() {
    print(await api(`expression/${positional[0]}/detach`, 'POST', {}));
  },
  async archive() {
    print(await api(`expression/${positional[0]}/archive`, 'POST', {}));
  },
  async skip() {
    print(await api(`expression/${positional[0]}`, 'PATCH', { skipped: !flags.restore }));
  },
  async lint() {
    print(await api(`expression/${positional[0]}/lint`));
  },
  async sent() {
    const sent = {};
    if (typeof flags.url === 'string') sent.url = flags.url;
    if (typeof flags.platform === 'string') sent.platform = flags.platform;
    if (typeof flags.venue === 'string') sent.venue = flags.venue;
    if (typeof flags['calendar-id'] === 'string') sent.calendarId = flags['calendar-id'];
    print(await api(`expression/${positional[0]}/sent`, 'POST', sent));
  },
  async postings() {
    print(await api(positional[0] ? `piece/${positional[0]}/posting` : 'posting'));
  },
  async queue() {
    print(await api('queue'));
  },
  async import() {
    const batch = JSON.parse(readFileSync(resolve(positional[0]), 'utf8'));
    const counts = {
      pieces: batch.pieces.length,
      expressions: batch.pieces.reduce((sum, piece) => sum + (piece.expressions?.length ?? 0), 0),
      segments: batch.pieces.reduce(
        (sum, piece) => sum + (piece.expressions ?? []).reduce((inner, expression) => inner + (expression.segments?.length ?? 0), 0),
        0,
      ),
      approved: batch.pieces.reduce((sum, piece) => sum + (piece.expressions ?? []).filter((expression) => expression.approved).length, 0),
    };
    console.log(`batch: ${counts.pieces} pieces, ${counts.expressions} expressions, ${counts.segments} segments, ${counts.approved} pre-approved`);
    if (flags['dry-run']) return;
    print(await api('import', 'POST', batch));
  },
};

if (!command || !commands[command]) {
  console.error(`usage: press.mjs <${Object.keys(commands).join('|')}> …`);
  process.exit(2);
}
commands[command]().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
