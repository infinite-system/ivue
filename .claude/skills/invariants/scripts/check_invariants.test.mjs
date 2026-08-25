// Tests for check_invariants.mjs — run with:  node --test scripts/check_invariants.test.mjs
//
// Black-box: each test spawns the real CLI against fixtures built in a temp dir and
// asserts stdout/stderr/exit code. The suite is the executable spec of the contract
// schema; if you change the schema, change these tests in the same commit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const CLI = join(
  dirname(fileURLToPath(import.meta.url)),
  'check_invariants.mjs',
);

function run(args, cwd) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'invcheck-'));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const record = (name, fields = {}) => {
  const f = {
    Invariant: 'If conditions hold, then behavior follows.',
    Scope: 'The test scope.',
    Mechanism: 'The bridge.',
    Evidence: 'A test.',
    'Impossible if true': 'The negative boundary.',
    Verification: 'Run the suite.',
    Status: 'provisional',
    'Last refined': '2026-07-19',
    ...fields,
  };
  const body = Object.entries(f)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `**${k}:** ${v}`)
    .join('\n\n');
  return `### ${name}\n\n${body}\n`;
};

const contract = (
  realityRecords,
  chosenRecords,
  { chosenHeading = '## Chosen invariants' } = {},
) =>
  `# Test contract\n\n## Reality-based invariants\n\n${realityRecords.join('\n')}\n${chosenHeading}\n\n${chosenRecords.join('\n')}`;

const contractWithGenerator = (realityRecords, chosenRecords, componentLinks) =>
  contract(realityRecords, chosenRecords).replace(
    '## Reality-based invariants',
    [
      '## Generator',
      '',
      'This record states how the test gears combine.',
      '',
      record('The test gears form one mechanism', {
        Scope: 'The fixture contract. The goal is one checked mechanism.',
        Components: componentLinks,
        Mechanism: 'The linked records combine under one goal.',
        'Impossible if true':
          'A linked gear can disappear without changing the mechanism.',
      }),
      '## Reality-based invariants',
    ].join('\n'),
  );

const testGeneratorHeader = ({
  domainClaims,
  impossibleClaims,
  contractPointers = [],
  described = 'The fixture keeps each claim beside the test that proves it.',
}) =>
  [
    '/*',
    '=== GENERATOR ===',
    'Goal: prove the local mechanism from this file.',
    ...contractPointers,
    ...domainClaims.map(
      ({ symbol, claim }) => `// domain-invariant: ${symbol} — ${claim}`,
    ),
    ...impossibleClaims.map((claim) => `Impossible if true: ${claim}`),
    '',
    '=== GENERATOR-DESCRIBED ===',
    described,
    '*/',
  ].join('\n');

// ---------- schema validation ----------

test('canonical contract passes', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract([record('The Constraint')], [record('The Discipline')]),
  );
  const r = run([p]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /PASS .*1 reality, 1 chosen invariants/);
  cleanup();
});

test("legacy '## Designed invariants' heading accepted", () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract([record('A')], [record('B')], {
      chosenHeading: '## Designed invariants',
    }),
  );
  assert.equal(run([p]).code, 0);
  cleanup();
});

test('optional fields accepted; Components and Generates tolerated', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract(
      [
        record('A', {
          'Renegotiable at': 'consumer contract',
          Components: 'x — part. y — part.',
          Generates: 'guards',
          'Rejected alternatives':
            'ports for isolation — cookie jars key on hostname.',
          'Open question': 'does this hold under ipv6?',
        }),
      ],
      [record('B', { Generates: 'discipline' })],
    ),
  );
  const r = run([p]);
  assert.equal(r.code, 0);
  cleanup();
});

test('missing required fields, bad status, bad date each named', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract(
      [
        record('Broken', {
          Scope: null,
          Mechanism: null,
          Status: 'speculative',
          'Last refined': 'July 19',
        }),
      ],
      [record('Fine')],
    ),
  );
  const r = run([p]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /'Broken': missing or empty Scope/);
  assert.match(r.stderr, /'Broken': missing or empty Mechanism/);
  assert.match(r.stderr, /'Broken': invalid Status/);
  assert.match(r.stderr, /'Broken': Last refined must match YYYY-MM-DD/);
  cleanup();
});

test("'Renegotiable at' on a chosen record is an error", () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract([record('A')], [record('B', { 'Renegotiable at': 'elsewhere' })]),
  );
  const r = run([p]);
  assert.equal(r.code, 1);
  assert.match(
    r.stderr,
    /'B': 'Renegotiable at' is only valid on reality records/,
  );
  cleanup();
});

test('unknown field is flagged', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract([record('A', { Vibe: 'immaculate' })], [record('B')]),
  );
  const r = run([p]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /'A': unknown field 'Vibe'/);
  cleanup();
});

test('duplicate names fail', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(p, contract([record('Same Name')], [record('Same Name')]));
  const r = run([p]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /'Same Name': duplicate invariant name/);
  cleanup();
});

test('legacy numbered heading passes with a migration note', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(p, contract([record('ZZ-R001 — Old Style')], [record('B')]));
  const r = run([p]);
  assert.equal(r.code, 0);
  assert.match(
    r.stdout,
    /numbered heading — canonical style is an unnumbered name/,
  );
  cleanup();
});

test('legacy ID letter in the wrong section is an error', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(p, contract([record('ZZ-C001 — Misfiled')], [record('B')]));
  const r = run([p]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /chosen-lettered ID in the reality section/);
  cleanup();
});

test('empty category notes but passes; empty contract fails', () => {
  const { dir, cleanup } = tmp();
  const p1 = join(dir, 'young.invariants.md');
  writeFileSync(p1, contract([record('A')], []));
  const r1 = run([p1]);
  assert.equal(r1.code, 0);
  assert.match(r1.stdout, /one category is empty — fine while bootstrapping/);
  const p2 = join(dir, 'empty.invariants.md');
  writeFileSync(p2, contract([], []));
  assert.equal(run([p2]).code, 1);
  cleanup();
});

// ---------- discovery / --all ----------

test('--all discovers nested contracts, skips local formats and node_modules', () => {
  const { dir, cleanup } = tmp();
  mkdirSync(join(dir, 'sub/deep'), { recursive: true });
  mkdirSync(join(dir, 'node_modules/pkg'), { recursive: true });
  writeFileSync(
    join(dir, 'sub/deep/a.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'local.invariants.md'),
    '# Narrative style\n\n## My Named Invariant\n\nProse.\n',
  );
  writeFileSync(join(dir, 'node_modules/pkg/x.invariants.md'), 'junk');
  const r = run(['--all', dir]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /PASS .*a\.invariants\.md/);
  assert.match(r.stdout, /SKIP .*local\.invariants\.md.*local format/);
  assert.doesNotMatch(r.stdout + r.stderr, /node_modules/);
  const strict = run(['--all', dir, '--strict']);
  assert.equal(strict.code, 1);
  assert.match(strict.stderr, /FAIL .*local\.invariants\.md: non-canonical/);
  cleanup();
});

test('--all and --refs ignore directories named by --exclude', () => {
  const { dir, cleanup } = tmp();
  const retiredSmokeDirectory = join(dir, 'scripts/retired-smokes');
  mkdirSync(retiredSmokeDirectory, { recursive: true });
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  writeFileSync(
    join(retiredSmokeDirectory, 'stale.invariants.md'),
    'not a valid contract',
  );
  writeFileSync(
    join(retiredSmokeDirectory, 'stale.js'),
    '// invariant: Ghost (missing.invariants.md)\n',
  );
  // red first: without the flag the directory is walked and its junk is found
  const unexcluded = run(['--all', '--refs', dir]);
  assert.equal(unexcluded.code, 1);
  assert.match(unexcluded.stdout + unexcluded.stderr, /stale|Ghost/);
  // green: the flag keeps the walk out of it (trailing slash tolerated)
  const result = run(['--all', '--refs', '--exclude=scripts/retired-smokes/', dir]);
  assert.equal(result.code, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, /stale|Ghost/);
  cleanup();
});

// ---------- --refs annotation drift ----------

test('--refs resolves valid annotations, fails orphans, harvests local headings', () => {
  const { dir, cleanup } = tmp();
  mkdirSync(join(dir, 'sub'), { recursive: true });
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(
    join(dir, 'sub/demo.invariants.md'),
    contract([record('Real Rule')], [record('Held Discipline')]),
  );
  writeFileSync(
    join(dir, 'scripts/tool.invariants.md'),
    '# Tool — Invariants\n\n## Identity Must Reflect Reality _(the master invariant)_\n\nProse.\n',
  );
  writeFileSync(
    join(dir, 'sub/guard.js'),
    [
      '// invariant: Real Rule (sub/demo.invariants.md)',
      '// invariant: Identity Must Reflect Reality (scripts/tool.invariants.md)',
      '// invariant: Ghost Rule (sub/demo.invariants.md)',
      '// invariant: Held Discipline (missing/gone.invariants.md)',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /2 annotation\(s\) resolved, .*2 problem\(s\)/);
  assert.match(
    r.stderr,
    /invariant 'Ghost Rule' not found in sub\/demo\.invariants\.md/,
  );
  assert.match(r.stderr, /contract not found: missing\/gone\.invariants\.md/);
  cleanup();
});

test('--refs rejects paths relative to the annotated file directory', () => {
  const { dir, cleanup } = tmp();
  mkdirSync(join(dir, 'sub'), { recursive: true });
  writeFileSync(
    join(dir, 'sub/demo.invariants.md'),
    contract([record('Real Rule')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'sub/guard.js'),
    '// invariant: Real Rule (demo.invariants.md)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /0 annotation\(s\) resolved, .*1 problem\(s\)/);
  assert.match(
    r.stderr,
    /contract path must be root-relative: demo\.invariants\.md \(use sub\/demo\.invariants\.md\)/,
  );
  cleanup();
});

test('--refs reports canonical records with zero annotations as coverage info', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Annotated Rule')], [record('Never Referenced')]),
  );
  writeFileSync(
    join(dir, 'code.js'),
    '// invariant: Annotated Rule (demo.invariants.md)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0); // coverage is informational, not a failure
  assert.match(
    r.stdout,
    /coverage demo\.invariants\.md: no annotations reference: Never Referenced/,
  );
  assert.doesNotMatch(r.stdout, /no annotations reference:.*Annotated Rule/);
  cleanup();
});

test("--refs skips the checker's own test file", () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'check_invariants.test.mjs'),
    '// invariant: Ghost (sub/none.invariants.md)\n',
  );
  writeFileSync(
    join(dir, 'SKILL.md'),
    '// invariant: Ghost Example (sub/none.invariants.md)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0);
  assert.doesNotMatch(r.stderr, /Ghost/);
  cleanup();
});

test('--refs on a clean tree exits 0', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  writeFileSync(join(dir, 'code.js'), '// no annotations here\n');
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0);
  cleanup();
});

// ---------- generator references ----------

test('slug collision fails; punctuated name draws charset note', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract(
      [record('Routes cannot resend'), record('Routes, cannot resend!')],
      [record('B')],
    ),
  );
  const r = run([p]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /slug collision with 'Routes cannot resend'/);
  assert.match(r.stdout, /name contains punctuation/);
  cleanup();
});

test('generator: valid links resolve (inline, alias, reference-style), coverage reported', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract(
      [record('A non-ready route cannot transmit')],
      [record('Unknown usage remains unknown')],
    ),
  );
  writeFileSync(
    join(dir, 'demo.generator.md'),
    [
      '# How demo holds together',
      '',
      'Because [A non-ready route cannot transmit](demo.invariants.md#a-non-ready-route-cannot-transmit)',
      'and [the unknown-usage rule][uu] compose, telemetry is trustworthy.',
      '',
      '[uu]: demo.invariants.md#unknown-usage-remains-unknown',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /2 generator link\(s\) resolved/);
  assert.doesNotMatch(r.stdout, /coverage demo\.generator\.md/); // all records woven
  cleanup();
});

test('generator: missing anchor, dead anchor, undefined ref key all fail', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'demo.generator.md'),
    [
      '[Rule one holds](demo.invariants.md)',
      '[Rule one holds](demo.invariants.md#rule-one-gone)',
      '[Rule one holds][nokey]',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /needs an anchor/);
  assert.match(
    r.stderr,
    /anchor '#rule-one-gone' does not resolve.*did you mean '#rule-one-holds'/,
  );
  assert.match(r.stderr, /undefined link reference \[nokey\]/);
  cleanup();
});

test('generator: a GitHub blob URL to a contract resolves from the checkout root — anchors still validated', () => {
  const { dir, cleanup } = tmp();
  mkdirSync(join(dir, 'docs/reference'), { recursive: true });
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('B')]),
  );
  const hosted = 'https://github.com/acme/demo/blob/main/demo.invariants.md';
  // red: the hosted path resolves, so a dead anchor is reported as such
  // (not as "contract not found"), and a missing anchor is still a finding
  writeFileSync(
    join(dir, 'docs/reference/page.md'),
    [`[Rule one holds](${hosted}#rule-one-gone)`, `[Rule one holds](${hosted})`].join('\n'),
  );
  let r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /anchor '#rule-one-gone' does not resolve/);
  assert.match(r.stderr, /needs an anchor/);
  assert.doesNotMatch(r.stderr, /contract not found/);
  // green: the anchored hosted link counts as a resolved generator link
  writeFileSync(
    join(dir, 'docs/reference/page.md'),
    `[Rule one holds](${hosted}#rule-one-holds)`,
  );
  r = run(['--refs', dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /1 generator link\(s\) resolved/);
  cleanup();
});

test('generator: verbatim-name text pointing at a different record fails; free alias passes', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract(
      [record('A non-ready route cannot transmit')],
      [record('Unknown usage remains unknown')],
    ),
  );
  writeFileSync(
    join(dir, 'demo.generator.md'),
    [
      '[A non-ready route cannot transmit](demo.invariants.md#unknown-usage-remains-unknown)',
      '[the transmit rule](demo.invariants.md#a-non-ready-route-cannot-transmit)',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(
    r.stderr,
    /link text names 'A non-ready route cannot transmit'.*misleading reference/,
  );
  assert.doesNotMatch(r.stderr, /the transmit rule/);
  cleanup();
});

// domain-invariant: checker-link-resolution — If a test header points to a contract record, then it uses the same anchor and misleading-label checks as every generator link.
test('test header contract links reject misleading record labels', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('Rule two holds')]),
  );
  writeFileSync(join(dir, 'Demo.ts'), 'class Demo {}\n');
  const domainClaim = 'If Demo runs, then its value stays bounded.';
  const impossible = 'Demo accepts a value outside the bound.';
  const testFile = (contractPointer) =>
    [
      testGeneratorHeader({
        domainClaims: [{ symbol: 'Demo', claim: domainClaim }],
        impossibleClaims: [impossible],
        contractPointers: [contractPointer],
      }),
      `// domain-invariant: Demo — ${domainClaim}`,
      `// impossible-if-true: Demo — ${impossible}`,
      '// invariant: Rule two holds (demo.invariants.md)',
      'test("the record governs the bound", () => {});',
    ].join('\n');

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    testFile('[Rule one holds](demo.invariants.md#rule-two-holds)'),
  );
  const red = run(['--refs', dir]);
  assert.equal(red.code, 1);
  assert.match(red.stderr, /misleading reference/);

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    testFile('[Rule two holds](demo.invariants.md#rule-two-holds)'),
  );
  const green = run(['--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  cleanup();
});

test('generator prose links resolve but only generator-record Components claim coverage', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('Rule two holds')]),
  );
  writeFileSync(
    join(dir, 'demo.generator.md'),
    '[rule one holds](demo.invariants.md#rule-one-holds)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0); // lowercase text of the SAME record is not misleading
  assert.match(
    r.stdout,
    /generator-coverage demo\.invariants\.md: no mechanism claims: Rule one holds · Rule two holds/,
  );
  cleanup();
});

test('legacy lattice companion stays accepted with a provenance note', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('Rule two holds')]),
  );
  writeFileSync(
    join(dir, 'demo.lattice.md'),
    '[Rule one holds](demo.invariants.md#rule-one-holds)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0);
  assert.match(
    r.stdout,
    /legacy reflective companion accepted: demo\.lattice\.md/,
  );
  assert.match(r.stdout, /1 generator link\(s\) resolved/);
  assert.match(
    r.stdout,
    /generator-coverage demo\.invariants\.md: no mechanism claims: Rule one holds · Rule two holds/,
  );
  cleanup();
});

test('Generator section carries one full record and its Components claim linked gears', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contractWithGenerator(
      [record('Rule one holds')],
      [record('Rule two holds')],
      '- [Rule one holds](demo.invariants.md#rule-one-holds) — first gear.\n' +
        '- [Rule two holds](demo.invariants.md#rule-two-holds) — second gear.',
    ),
  );
  const schema = run([p]);
  assert.equal(schema.code, 0);
  assert.match(schema.stdout, /1 generator, 1 reality, 1 chosen/);
  assert.match(schema.stdout, /1 reality, 1 chosen invariants/);
  const refs = run(['--refs', dir]);
  assert.equal(refs.code, 0);
  assert.doesNotMatch(refs.stdout, /generator-coverage/);
  cleanup();
});

test('two-record contract without Generator section draws a note, not a failure', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract([record('Rule one holds')], [record('Rule two holds')]),
  );
  const r = run([p]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /two or more records need a top ## Generator section/);
  cleanup();
});

test('links to generator and legacy companions resolve; dangling old names fail', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('Rule two holds')]),
  );
  writeFileSync(join(dir, 'demo.generator.md'), '# Demo generator\n');
  writeFileSync(
    join(dir, 'reflective.lattice.md'),
    '# Reflective legacy form\n',
  );
  writeFileSync(
    join(dir, 'README.md'),
    [
      '[generator](demo.generator.md)',
      '[legacy](reflective.lattice.md)',
      '[dangling old name](demo.lattice.md)',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(
    r.stderr,
    /README\.md:3: companion not found: demo\.lattice\.md/,
  );
  assert.doesNotMatch(r.stderr, /demo\.generator\.md/);
  assert.doesNotMatch(r.stderr, /reflective\.lattice\.md/);
  cleanup();
});

// domain-invariant: checker-rule-a — If a test has a generator header, then the header is its first content and every local symbol resolves in the sibling source.
test('rule a: test headers are first and local symbols resolve in the sibling source', () => {
  const { dir, cleanup } = tmp();
  const claim = 'If Demo runs, then one local mechanism owns its value.';
  const impossible = 'A second local mechanism owns the same value.';
  const header = testGeneratorHeader({
    domainClaims: [{ symbol: 'Demo', claim }],
    impossibleClaims: [impossible],
  });
  writeFileSync(
    join(dir, 'Demo.ts'),
    'class Demo {}\n// class Missing exists only in a comment.\n',
  );
  const proofs = [
    `// domain-invariant: Demo — ${claim}`,
    'test("one local mechanism owns the value", () => {});',
    `// impossible-if-true: Demo — ${impossible}`,
    'test("a second local mechanism is refused", () => {});',
  ].join('\n');
  writeFileSync(
    join(dir, 'Demo.test.ts'),
    `import { test } from 'bun:test';\n${header}\n${proofs}\n`,
  );
  const firstContentRed = run(['--refs', dir]);
  assert.equal(firstContentRed.code, 1);
  assert.match(
    firstContentRed.stderr,
    /generator header must be the first content/,
  );

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    `${header.replaceAll('Demo', 'Missing')}\nimport { test } from 'bun:test';\n${proofs.replaceAll('Demo', 'Missing')}\n`,
  );
  const symbolRed = run(['--refs', dir]);
  assert.equal(symbolRed.code, 1);
  assert.match(
    symbolRed.stderr,
    /domain-invariant symbol 'Missing' is not declared in sibling Demo\.ts/,
  );

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    `${header}\nimport { test } from 'bun:test';\n${proofs}\n`,
  );
  const green = run(['--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  cleanup();
});

// domain-invariant: checker-rule-b — If a header states a domain claim, contract component, or impossibility, then an annotated test proves it and no test invents another claim.
test('rule b: header claims and annotated tests cover each other in both directions', () => {
  const { dir, cleanup } = tmp();
  const domainClaim = 'If Demo runs, then its value stays bounded.';
  const impossible = 'Demo accepts a value outside the bound.';
  writeFileSync(join(dir, 'Demo.ts'), 'class Demo {}\n');
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('The bound holds')], []),
  );
  const header = testGeneratorHeader({
    domainClaims: [{ symbol: 'Demo', claim: domainClaim }],
    impossibleClaims: [impossible],
    contractPointers: ['[The bound holds](demo.invariants.md#the-bound-holds)'],
  });
  writeFileSync(
    join(dir, 'Demo.test.ts'),
    [
      header,
      "import { test } from 'bun:test';",
      `// domain-invariant: Demo — ${domainClaim}`,
      'test("the value stays bounded", () => {});',
    ].join('\n'),
  );
  const missingProofsRed = run(['--refs', dir]);
  assert.equal(missingProofsRed.code, 1);
  assert.match(
    missingProofsRed.stderr,
    /Impossible if true has no annotated negative test/,
  );
  assert.match(
    missingProofsRed.stderr,
    /header contract-record pointer has no annotated test/,
  );

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    [
      header,
      "import { test } from 'bun:test';",
      `// domain-invariant: Demo — ${domainClaim}`,
      `// impossible-if-true: Demo — ${impossible}`,
      '// invariant: The bound holds (demo.invariants.md)',
      '/** This test plants the rejected out-of-bound value. */',
      'test("the bound refuses its impossible state", () => {});',
      '// domain-invariant: Demo — A claim missing from the header.',
      'test("an unexplained assertion", () => {});',
    ].join('\n'),
  );
  const orphanClaimRed = run(['--refs', dir]);
  assert.equal(orphanClaimRed.code, 1);
  assert.match(orphanClaimRed.stderr, /annotated test claim is absent/);

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    [
      header,
      "import { test } from 'bun:test';",
      `// domain-invariant: Demo — ${domainClaim}`,
      `// impossible-if-true: Demo — ${impossible}`,
      '// invariant: The bound holds (demo.invariants.md)',
      '/** This test plants the rejected out-of-bound value. */',
      'test("the bound refuses its impossible state", () => {});',
    ].join('\n'),
  );
  const green = run(['--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  cleanup();
});

// domain-invariant: checker-impossibility-binding — If a header states an impossibility, then one impossible-if-true annotation repeats its symbol and text exactly.
test('impossible-if-true annotations bind exact header impossibilities', () => {
  const { dir, cleanup } = tmp();
  const domainClaim = 'If Demo runs, then its value stays bounded.';
  const impossible = 'Demo accepts a value outside the bound.';
  const header = testGeneratorHeader({
    domainClaims: [{ symbol: 'Demo', claim: domainClaim }],
    impossibleClaims: [impossible],
  });
  writeFileSync(join(dir, 'Demo.ts'), 'class Demo {}\n');
  const domainProof = [
    `// domain-invariant: Demo — ${domainClaim}`,
    'test("the value stays bounded", () => {});',
  ].join('\n');

  writeFileSync(join(dir, 'Demo.test.ts'), `${header}\n${domainProof}\n`);
  const missingRed = run(['--refs', dir]);
  assert.equal(missingRed.code, 1);
  assert.match(
    missingRed.stderr,
    /Impossible if true has no annotated negative test/,
  );

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    [
      header,
      domainProof,
      `// impossible-if-true: Demo — ${impossible} Changed.`,
      'test("the impossible state is refused", () => {});',
    ].join('\n'),
  );
  const exactTextRed = run(['--refs', dir]);
  assert.equal(exactTextRed.code, 1);
  assert.match(
    exactTextRed.stderr,
    /annotated impossibility is absent from the generator header/,
  );

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    [
      header,
      domainProof,
      `// impossible-if-true: Demo — ${impossible}`,
      'test("the impossible state is refused", () => {});',
    ].join('\n'),
  );
  const green = run(['--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  cleanup();
});

// domain-invariant: checker-cross-label-refusal — If an impossibility uses a domain-invariant annotation, then the checker refuses the inverted label.
test('domain-invariant annotations cannot prove impossibilities', () => {
  const { dir, cleanup } = tmp();
  const domainClaim = 'If Demo runs, then its value stays bounded.';
  const impossible = 'Demo accepts a value outside the bound.';
  const header = testGeneratorHeader({
    domainClaims: [{ symbol: 'Demo', claim: domainClaim }],
    impossibleClaims: [impossible],
  });
  writeFileSync(join(dir, 'Demo.ts'), 'class Demo {}\n');
  const fixture = (impossibleAnnotation) =>
    [
      header,
      `// domain-invariant: Demo — ${domainClaim}`,
      impossibleAnnotation,
      'test("the bound refuses its impossible state", () => {});',
    ].join('\n');

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    fixture(`// domain-invariant: Demo — ${impossible}`),
  );
  const red = run(['--refs', dir]);
  assert.equal(red.code, 1);
  assert.match(red.stderr, /impossibility labeled as an invariant/);

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    [
      header,
      `// domain-invariant: Demo — ${domainClaim}`,
      `// impossible-if-true: Demo — ${domainClaim}`,
      `// impossible-if-true: Demo — ${impossible}`,
      'test("the bound refuses its impossible state", () => {});',
    ].join('\n'),
  );
  const inverseRed = run(['--refs', dir]);
  assert.equal(inverseRed.code, 1);
  assert.match(inverseRed.stderr, /invariant labeled as an impossibility/);

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    fixture(`// impossible-if-true: Demo — ${impossible}`),
  );
  const green = run(['--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  cleanup();
});

// domain-invariant: checker-rule-c — If source carries a domain tripwire, then its sibling test header declares that symbol.
test('rule c: source tripwires resolve to sibling test-header claims', () => {
  const { dir, cleanup } = tmp();
  const otherClaim = 'If Other runs, then it stays local.';
  const demoClaim = 'If Demo runs, then it stays local.';
  const impossible = 'The local mechanism is bypassed.';
  writeFileSync(
    join(dir, 'Demo.ts'),
    ['class Demo {}', 'class Other {}', '// domain-invariant: Demo'].join('\n'),
  );
  const headerFor = (symbol, claim) =>
    testGeneratorHeader({
      domainClaims: [{ symbol, claim }],
      impossibleClaims: [impossible],
    });
  const proofsFor = (symbol, claim) =>
    [
      `// domain-invariant: ${symbol} — ${claim}`,
      `// impossible-if-true: ${symbol} — ${impossible}`,
      'test("the local mechanism cannot be bypassed", () => {});',
    ].join('\n');
  writeFileSync(
    join(dir, 'Demo.test.ts'),
    `${headerFor('Other', otherClaim)}\n${proofsFor('Other', otherClaim)}\n`,
  );
  const red = run(['--refs', dir]);
  assert.equal(red.code, 1);
  assert.match(
    red.stderr,
    /source domain-invariant 'Demo' has no header claim in Demo\.test\.ts/,
  );

  writeFileSync(
    join(dir, 'Demo.test.ts'),
    `${headerFor('Demo', demoClaim)}\n${proofsFor('Demo', demoClaim)}\n`,
  );
  const green = run(['--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  cleanup();
});

// domain-invariant: checker-rule-d — If retired source-coda or spec grammar appears, then the checker reports migration findings.
test('rule d: source generator codas and retired spec grammar are findings', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'Demo.ts'),
    'class Demo {}\n/* === GENERATOR ===\n=== SPEC ===\n// spec: old row\n*/\n',
  );
  const red = run(['--refs', dir]);
  assert.equal(red.code, 1);
  assert.match(
    red.stderr,
    /=== GENERATOR === belongs at the top of the sibling test file/,
  );
  assert.match(red.stderr, /=== SPEC === is retired/);
  assert.match(red.stderr, /\/\/ spec: rows are retired/);

  writeFileSync(join(dir, 'Demo.ts'), 'class Demo {}\n');
  const green = run(['--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  cleanup();
});

// domain-invariant: checker-rule-e — If a contract has a Generator section, then one full record composes resolving invariant records while the companion stays prose-only.
test('rule e: generator records resolve Components and companions stay prose-only', () => {
  const { dir, cleanup } = tmp();
  const contractPath = join(dir, 'demo.invariants.md');
  writeFileSync(
    contractPath,
    contract([record('Rule one holds')], [record('Rule two holds')]).replace(
      '## Reality-based invariants',
      '## Generator\n\nGoal: old short form.\n\n## Reality-based invariants',
    ),
  );
  const shortFormRed = run([contractPath]);
  assert.equal(shortFormRed.code, 1);
  assert.match(
    shortFormRed.stderr,
    /must carry exactly one full invariant record/,
  );

  writeFileSync(
    contractPath,
    contractWithGenerator(
      [record('Rule one holds')],
      [record('Rule two holds')],
      '- [Missing gear](demo.invariants.md#missing-gear) — absent.',
    ),
  );
  const componentRed = run([contractPath]);
  assert.equal(componentRed.code, 1);
  assert.match(
    componentRed.stderr,
    /component anchor '#missing-gear' does not resolve/,
  );

  writeFileSync(
    contractPath,
    contractWithGenerator(
      [record('Rule one holds')],
      [record('Rule two holds')],
      '- [Rule one holds](#rule-one-holds) — load-bearing gear.',
    ),
  );
  writeFileSync(
    join(dir, 'demo.generator.md'),
    '### Hidden record\n\n**Invariant:** If hidden, then it gates.\n',
  );
  const proseRed = run(['--refs', dir]);
  assert.equal(proseRed.code, 1);
  assert.match(proseRed.stderr, /generator companions are prose-only/);

  writeFileSync(
    join(dir, 'demo.generator.md'),
    '# Demo generator\n\nProse only.\n',
  );
  const green = run(['--all', '--refs', dir]);
  assert.equal(green.code, 0, green.stderr);
  assert.doesNotMatch(
    green.stdout,
    /generator-coverage demo\.invariants\.md: no mechanism claims: Rule one holds/,
  );
  assert.match(
    green.stdout,
    /generator-coverage demo\.invariants\.md: no mechanism claims: Rule two holds/,
  );
  cleanup();
});

// ---------- red-team regression fixes ----------

test('impossible calendar dates fail', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    contract([record('A', { 'Last refined': '2026-99-99' })], [record('B')]),
  );
  const r = run([p]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /'A': Last refined must match YYYY-MM-DD/);
  cleanup();
});

test('section headings are not valid annotation targets in canonical contracts', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Real rule')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'pad.js'),
    '// invariant: Chosen invariants (demo.invariants.md)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /'Chosen invariants' not found/);
  cleanup();
});

test('coverage is file-qualified: same-named records in another contract are not masked', () => {
  const { dir, cleanup } = tmp();
  mkdirSync(join(dir, 'a'));
  mkdirSync(join(dir, 'b'));
  writeFileSync(
    join(dir, 'a/one.invariants.md'),
    contract([record('Shared rule name')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'b/two.invariants.md'),
    contract([record('Shared rule name')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'guard.js'),
    '// invariant: Shared rule name (a/one.invariants.md)\n',
  );
  const r = run(['--refs', dir]);
  assert.match(
    r.stdout,
    /^coverage b\/two\.invariants\.md:.*Shared rule name/m,
  );
  assert.doesNotMatch(
    r.stdout,
    /^coverage a\/one\.invariants\.md:.*Shared rule name/m,
  );
  cleanup();
});

test('Enforcement: review-time exempts a record from coverage', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract(
      [record('Code rule')],
      [
        record('Discipline rule', {
          Enforcement: 'review-time — no code locus',
        }),
      ],
    ),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /coverage demo\.invariants\.md:.*Code rule/);
  assert.doesNotMatch(r.stdout, /no annotations reference:.*Discipline rule/);
  assert.match(
    r.stdout,
    /coverage-exempt demo\.invariants\.md \(Enforcement\): Discipline rule/,
  );
  cleanup();
});

test('near-miss filenames are flagged; paper-style titles are not', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  writeFileSync(join(dir, 'pb._invariants_.md'), '# looks like a contract');
  writeFileSync(join(dir, 'Invariant Theory - Paper.md'), '# a paper');
  const r = run(['--all', dir]);
  assert.match(r.stdout, /near-miss filename.*pb\._invariants_\.md/);
  assert.doesNotMatch(r.stdout, /Invariant Theory/);
  cleanup();
});

test('nested checkouts are skipped and noted', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  mkdirSync(join(dir, 'vendor/other/.git'), { recursive: true });
  writeFileSync(
    join(dir, 'vendor/other/x.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  const r = run(['--all', dir]);
  assert.match(r.stdout, /note: skipped nested checkout vendor\/other/);
  assert.doesNotMatch(r.stdout, /x\.invariants\.md/);
  cleanup();
});

// ---------- round-2 hardening: hostile inputs ----------

test('CRLF contracts parse identically; BOM tolerated', () => {
  const { dir, cleanup } = tmp();
  const p = join(dir, 'demo.invariants.md');
  writeFileSync(
    p,
    '\ufeff' +
      contract([record('Real rule')], [record('B')]).replace(/\n/g, '\r\n'),
  );
  const r = run([p]);
  assert.equal(r.code, 0);
  writeFileSync(
    join(dir, 'g.js'),
    '// invariant: Real rule (demo.invariants.md)\n',
  );
  assert.equal(run(['--refs', dir]).code, 0);
  cleanup();
});

test('fenced code blocks are inert: annotations, headings, section dupes', () => {
  const { dir, cleanup } = tmp();
  const fenced =
    contract([record('Real rule')], [record('B')]) +
    [
      '',
      '```markdown',
      '### Fake record inside fence',
      '## Reality-based invariants',
      '```',
      '',
    ].join('\n');
  writeFileSync(join(dir, 'demo.invariants.md'), fenced);
  assert.equal(run([join(dir, 'demo.invariants.md')]).code, 0);
  writeFileSync(
    join(dir, 'README.md'),
    [
      '```js',
      '// invariant: Ghost (missing.invariants.md)',
      '```',
      '<!-- invariant: Old gone (missing.invariants.md) -->',
      'prose with \`invariant: Inline (missing.invariants.md)\` code span',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0, r.stderr);
  cleanup();
});

test('broken canonical contract does NOT fall back to loose harvest', () => {
  const { dir, cleanup } = tmp();
  // duplicate section heading (unfenced) -> bounds fail -> canonical-shaped but broken
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Real rule')], [record('B')]) +
      '\n## Reality-based invariants\n',
  );
  writeFileSync(
    join(dir, 'pad.js'),
    '// invariant: Chosen invariants (demo.invariants.md)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /'Chosen invariants' not found/);
  cleanup();
});

test('wrapped, nested-bracket, collapsed, titled-def, and angle-bracket links validate', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('Rule two holds')]),
  );
  writeFileSync(
    join(dir, 'demo.generator.md'),
    [
      '[Rule one',
      'holds](demo.invariants.md#rule-one-BROKEN)', // wrapped + broken anchor -> caught
      '[see [note] here](demo.invariants.md#also-broken)', // nested brackets -> caught
      '[Rule one holds][]', // collapsed ref
      '[Rule two holds](<demo.invariants.md#rule-two-holds>)', // angle-bracket target -> valid
      '',
      '[rule one holds]: demo.invariants.md#rule-one-broken-def "title here"',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /#rule-one-BROKEN' does not resolve/);
  assert.match(r.stderr, /#also-broken' does not resolve/);
  assert.match(r.stderr, /#rule-one-broken-def' does not resolve/); // collapsed ref resolved via titled def
  assert.doesNotMatch(r.stderr, /rule-two-holds/);
  cleanup();
});

test('percent-encoded and angle-bracket spaced contract paths resolve', () => {
  const { dir, cleanup } = tmp();
  mkdirSync(join(dir, 'Domain Exploration'), { recursive: true });
  writeFileSync(
    join(dir, 'Domain Exploration/demo.invariants.md'),
    contract([record('Rule one holds')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'map.generator.md'),
    [
      '[Rule one holds](Domain%20Exploration/demo.invariants.md#rule-one-holds)',
      '[the rule](<Domain Exploration/demo.invariants.md#rule-one-holds>)',
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /2 generator link\(s\) resolved/);
  cleanup();
});

test('non-Latin names slug GitHub-style, stay distinct, and anchors resolve', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract(
      [record('Кэш не выживает'), record('Логи не теряются')],
      [record('B')],
    ),
  );
  assert.equal(run([join(dir, 'demo.invariants.md')]).code, 0);
  writeFileSync(
    join(dir, 'demo.generator.md'),
    '[Кэш не выживает](demo.invariants.md#кэш-не-выживает)\n',
  );
  assert.equal(run(['--refs', dir]).code, 0);
  cleanup();
});

test('name with no sluggable characters is an error', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('→ ← ↑')], [record('B')]),
  );
  const r = run([join(dir, 'demo.invariants.md')]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /no sluggable characters/);
  cleanup();
});

test('multi-line field values are read: wrapped content and label-then-newline both work', () => {
  const { dir, cleanup } = tmp();
  const rec = [
    '### Real rule',
    '',
    '**Invariant:**',
    'If conditions hold, then behavior follows.',
    '',
    '**Scope:** The test',
    'scope continues on a second line.',
    '',
    '**Mechanism:** m',
    '',
    '**Evidence:** e',
    '',
    '**Impossible if true:** i',
    '',
    '**Verification:** v',
    '',
    '**Status:** provisional',
    '',
    '**Last refined:** 2026-07-19',
    '',
  ].join('\n');
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    `# T\n\n## Reality-based invariants\n\n${rec}\n## Chosen invariants\n\n${record('B')}`,
  );
  const r = run([join(dir, 'demo.invariants.md')]);
  assert.equal(r.code, 0, r.stderr);
  cleanup();
});

test('wrapped Enforcement field still exempts from coverage', () => {
  const { dir, cleanup } = tmp();
  const rec = record('Discipline rule').replace(
    '**Status:**',
    '**Enforcement:** review-time —\nno code locus, distributed discipline.\n\n**Status:**',
  );
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Code rule')], [rec]),
  );
  const r = run(['--refs', dir]);
  assert.doesNotMatch(r.stdout, /no annotations reference:.*Discipline rule/);
  cleanup();
});

test('malformed annotation-shaped comments are flagged, not silent', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Real rule')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'g.js'),
    [
      '// invariant: Real rule (demo.invariant.md)', // typo'd suffix
      '// invariant: Real rule [demo.invariants.md]', // wrong brackets
    ].join('\n'),
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.equal(
    (r.stderr.match(/annotation-shaped comment does not parse/g) || []).length,
    2,
  );
  cleanup();
});

test('skip notes print once in --refs; exclusions are exact-basename', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Real rule')], [record('B')]),
  );
  mkdirSync(join(dir, 'vendor/other/.git'), { recursive: true });
  writeFileSync(
    join(dir, 'UPSKILL.md'),
    '// invariant: Ghost (missing.invariants.md)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal((r.stdout.match(/skipped nested checkout/g) || []).length, 1);
  assert.match(r.stderr, /UPSKILL\.md:1: contract not found/); // UPSKILL.md is scanned now
  cleanup();
});

test('unknown flags exit 2; --version prints a version', () => {
  assert.equal(run(['--all', '--strick']).code, 2);
  const v = run(['--version']);
  assert.equal(v.code, 0);
  assert.equal(v.stdout.trim(), '3.1.0');
});

test('directory as PATH gives a directory-specific message', () => {
  const { dir, cleanup } = tmp();
  const r = run([dir]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /is a directory/);
  cleanup();
});

// ---------- round-3 rotation regressions ----------

test('--all --refs in one invocation runs BOTH passes', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('A', { Scope: null })], [record('B')]),
  );
  const r = run(['--all', '--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /missing or empty Scope/); // schema pass ran
  assert.match(r.stdout, /annotation\(s\) resolved/); // refs pass ran
  cleanup();
});

test('contract-targeting links in ANY md file are validated (not just .generator.md)', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Rule one holds')], [record('B')]),
  );
  writeFileSync(
    join(dir, 'README.md'),
    '[Rule one holds](demo.invariants.md#rule-one-GONE)\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(
    r.stderr,
    /README\.md:1: anchor '#rule-one-GONE' does not resolve/,
  );
  cleanup();
});

test('pathless annotations in code files are flagged', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Real rule')], [record('B')]),
  );
  writeFileSync(join(dir, 'g.js'), '// invariant: Real rule\n');
  writeFileSync(
    join(dir, 'prose.md'),
    'the invariant: provisionality itself\n',
  ); // md prose exempt
  const r = run(['--refs', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /g\.js:1: pathless annotation/);
  assert.doesNotMatch(r.stderr, /prose\.md/);
  cleanup();
});

test('a rendered .svg showing invariant text draws a note, never a finding', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('Real rule')], [record('B')]),
  );
  // A screenshot of a code editor: its <text> cells legitimately show annotation-shaped text
  // (pathless AND named forms) that must not be read as annotations.
  writeFileSync(
    join(dir, 'screenshot.svg'),
    '<svg><text>// invariant: Grap</text>' +
      '<text>// invariant: Real rule (demo.invariants.md)</text></svg>\n',
  );
  const r = run(['--refs', dir]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /note: rendered image contains 'invariant:' text/);
  assert.doesNotMatch(r.stderr, /screenshot\.svg/);
  cleanup();
});

test('Enforcement exemptions are visible and Mechanism-conflict is noted', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract(
      [record('Code rule')],
      [
        record('Discipline rule', {
          Enforcement: 'review-time — no locus',
          Mechanism: 'guard in src/guard.js enforces this',
        }),
      ],
    ),
  );
  const r = run(['--refs', dir]);
  assert.match(
    r.stdout,
    /coverage-exempt demo\.invariants\.md \(Enforcement\): Discipline rule/,
  );
  assert.match(
    r.stdout,
    /claims review-time Enforcement but its Mechanism names code/,
  );
  cleanup();
});

test('local-format contracts draw a loose-harvest note in --refs', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'old.invariants.md'),
    '# Old\n\n## Some Named Rule\n\nProse.\n',
  );
  const r = run(['--refs', dir]);
  assert.match(r.stdout, /note: local-format contract \(loose heading harvest/);
  cleanup();
});

test('--score emits JSON components as the last line; empty repo is scored:false', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract(
      [record('Real rule')],
      [record('B', { Enforcement: 'review-time — no locus' })],
    ),
  );
  writeFileSync(
    join(dir, 'g.js'),
    '// invariant: Real rule (demo.invariants.md)\n',
  );
  const r = run(['--score', dir]);
  assert.equal(r.code, 0);
  const j = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(j.contracts, 1);
  assert.equal(j.schema.records, 2);
  assert.equal(j.annotations, 1);
  assert.equal(j.exempt, 1);
  assert.equal(j.scored, true);
  const empty = run(['--score', mkdtempSync(join(tmpdir(), 'invempty-'))]);
  const je = JSON.parse(empty.stdout.trim().split('\n').pop());
  assert.equal(je.scored, false);
  cleanup();
});

// ---------- usage ----------

test('--help exits 0 and prints usage', () => {
  const r = run(['--help']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /usage:/);
  assert.match(r.stdout, /test headers, source tripwires, links/);
  assert.match(r.stdout, /record-membership coverage/);
});

test('--all and --refs print the resolved root', () => {
  const { dir, cleanup } = tmp();
  writeFileSync(
    join(dir, 'demo.invariants.md'),
    contract([record('A')], [record('B')]),
  );
  assert.match(run(['--all', dir]).stdout, /^root /);
  assert.match(run(['--refs', dir]).stdout, /^root /);
  cleanup();
});

test('usage errors exit 2', () => {
  assert.equal(run([]).code, 2);
  assert.equal(run(['/nonexistent/file.invariants.md']).code, 2);
});
