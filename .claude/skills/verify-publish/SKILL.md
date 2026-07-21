---
name: verify-publish
description: Use right after the user publishes ivue to npm — installs the just-published version into a throwaway consumer repo and smoke-tests the runtime, the skill installer, and the tarball contents against the registry artifact, not the local build.
---

# verify-publish — post-publish smoke test from the registry

The point: verify the **artifact npm actually serves**, not the local
build. Local gates prove the source; this proves the tarball — files
included, prepack ran, dist is current, the CLI works from a consumer's
seat.

## Protocol

1. **Fresh consumer repo in the scratchpad** (never inside the ivue
   repo — its node_modules is shared with the macOS host):

   ```bash
   mkdir -p <scratchpad>/ivue-consumer && cd <scratchpad>/ivue-consumer
   npm init -y
   npm install ivue vue
   ```

2. **Version check** — the installed version must equal the version just
   published:
   `node -e "console.log(require('./node_modules/ivue/package.json').version)"`

3. **Tarball contents** — `ls node_modules/ivue` must show `dist`,
   `bin`, `skills`; `dist/` must contain both entries in both formats —
   `index.es.js` + `index.cjs`, `extras.es.js` + `extras.cjs` — and the
   `.d.ts` files for each. Gzip `dist/index.es.js` (the 1.1 kB core) and
   `dist/extras.es.js`, and confirm both match the release's measured
   numbers.

4. **Runtime smoke test** — a `smoke.mjs` run with plain `node`,
   importing from `'ivue'` (the registry copy). Assert at minimum:
   - `Reactive(X) === X` (identity preservation)
   - ref-getter returns a Ref and the cell is cached (`a.x === a.x`)
   - computed and plain-getter derivations both track
   - method identity is stable
   - `$watch` fires (use `{ flush: 'sync' }`)
   - `$stopEffects()` kills watchers AND resets cached cells
   - **no hooks**: define a `stopEffects()` method, tear down, assert it
     was never called
   - `propsWithDefaults` wraps object/array defaults in factories;
     `isClass` discriminates

   And for the `ivue/extras` entry:
   - `import { Static } from 'ivue/extras'` resolves (ESM) and
     `require('ivue/extras')` resolves (CJS) — same for the core entry;
   - `Static(X)` returns a subclass of `X` and leaves `X` untouched;
   - a bound static has stable identity and survives detachment
     (`const method = Class.method; method()` keeps `this`);
   - the static inheritance walk applies and child overrides win.

5. **Skill installer** — in the consumer repo:

   ```bash
   mkdir -p .claude   # the installer detects footprints, never scaffolds
   npx ivue skill
   ```

   Then verify BOTH:
   - `.claude/skills/ivue/SKILL.md` exists and is byte-identical to
     `node_modules/ivue/skills/ivue/SKILL.md` (diff is empty);
   - the packaged skill is the CURRENT one — grep for a phrase that only
     exists in the latest SKILL.md revision. A stale grep means
     `prepack` did not run or the publish went out from a dirty tree.

6. **Report** the pass/fail table to the user with the measured size.
   Leave the consumer repo in the scratchpad — it evaporates with the
   session and must never be committed.

## Boundaries

- This skill never publishes, unpublishes, or deprecates anything.
- If a check fails, report exactly what the registry artifact contains
  versus what was expected — the fix (patch release) is the user's call.
