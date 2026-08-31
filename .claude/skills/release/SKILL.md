---
name: release
description: Use when bumping the ivue package version, tagging a release, or preparing an npm publish — the repo's versioning/tagging conventions and the gates that must pass before a version is stamped.
---

# release — version bump & tag conventions for ivue

## Tag format (the convention)

Release tags are **`ivue@X.Y.Z`** — package name, `@`, exact semver.
Always annotated:

```bash
git tag -a ivue@2.0.0 -m "ivue 2.0.0 — <one-line highlight>" <commit>
```

The highlight follows the PRECISE-NAMING rule (see Release notes
below): a concrete change-list naming the features/fixes, never a
poetic theme. Tag message, notes H1, and the `gh release` title all
carry the SAME line.

- Pin the commit explicitly (the `chore(release)` bump commit) so the tag
  cannot land on an unrelated HEAD.
- The history also contains `vX.Y.Z` tags and one stray `vue@0.1.2`
  typo — leave them alone; `ivue@X.Y.Z` is the one convention to use.

## Version bump

1. **Pick the semver level from the unreleased commits**: any `feat!` /
   breaking change → major; `feat` → minor; `fix`/`perf`/`refactor`-only →
   patch. When in doubt, ask the user — never guess a major.
2. **Edit `package.json` `"version"` directly.** Do NOT use `npm version`:
   it auto-creates a `vX.Y.Z` tag (wrong convention) and runs its own git
   commit. This repo's lockfile is `yarn.lock` — never generate a root
   `package-lock.json`.
3. Commit the bump as `chore(release): X.Y.Z`.

## Gates — all must pass BEFORE the bump commit is tagged

- `npx vitest run --coverage` → all tests pass, 100% on every metric.
- `npm run build` → `gzip -c dist/index.es.js | wc -c` still rounds to
  the advertised 1.1 kB (≤ ~1,149 B).
- Vendored engine synced: `diff lib/Reactive.ts examples/playground/src/ivue.ts`
  is empty.
- If docs changed since the last release: `npm run build:docs` passes.

## What the agent never does

- **Never `git push`** — the user pushes, including tags. When they ask,
  the command is `git push origin main --follow-tags` (`--follow-tags`
  sends annotated tags on pushed commits; never suggest `--tags`).
- **Never `npm publish` / `npm run release`** — publishing is the user's
  key-turn. `npm run release` = `npm run build && npm publish`; the
  `prepack` hook fires inside publish and syncs
  `.claude/skills/ivue/SKILL.md` → `skills/ivue/SKILL.md` into the
  tarball. Offer `npm pack --dry-run` as a pre-flight instead.

## Release notes — a file in the repo, then hand the user the text

Every release's notes live IN THE REPO: `releases/ivue@X.Y.Z.md`, one
file per release, written BEFORE the bump commit so the tagged tree
carries its own notes. Build them from the real history — `git log
<previous ivue@ tag>..<bump commit-to-be> --oneline` — never from
memory alone. The file starts with an H1 title line
(`# ivue@X.Y.Z — <one-line story>`) followed by the body.

After tagging, the final message hands the user (1) the same notes for
review and (2) the one-command GitHub release:

```bash
gh release create ivue@X.Y.Z -F releases/ivue@X.Y.Z.md \
  -t "ivue@X.Y.Z — <the one-line story>"
```

- **Title** (the H1 line): `ivue@X.Y.Z — <the one-line story of the
  release>`. The story is a CONCRETE change-list, never a poetic theme:
  name the features/fixes so the releases list answers "what changed?"
  without a click (`definePropTypes, the Static re-wrap fix, private
  banned` — not `contracts as data, a standard with teeth`). Same
  doctrine as blog titles: generative, not evocative.
- **Body shape**: a short lead paragraph saying what the release IS;
  then `### Breaking` (omit when none) with each break stating the old
  behavior, the new behavior, and the migration; then `### Changed` /
  `### Fixed` bullets in plain sentences (no bare commit hashes); close
  with the measured numbers when the engine changed — gzipped size and
  coverage, stated as measurements.
- Write for a reader who was not in the sessions: no internal codenames,
  no draft history — the same timeless-present discipline as the docs.

## Order of operations (summary)

1. Gates green → 2. write `releases/ivue@X.Y.Z.md` → 3. bump
`package.json` → 4. `chore(release): X.Y.Z` commit (bump + notes file
together) → 5. `git tag -a ivue@X.Y.Z -m "..." <bump-commit>` →
6. hand off: user pushes with `--follow-tags`, user runs
`npm run release`, user publishes the GitHub release with
`gh release create ivue@X.Y.Z -F releases/ivue@X.Y.Z.md -t "<title>"`.
