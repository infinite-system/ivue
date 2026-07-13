# ivue — agent instructions

- **Read `LESSONS.md` before working** — it is the append-only knowledge base
  of hard-won lessons (benchmark protocol, VitePress traps, shell/VM traps,
  packaging gates, docs rules). When a session learns something the hard way,
  append it there — never store repo knowledge only in private agent memory.
- Docs are written per `.claude/skills/write-docs/SKILL.md`; ivue code per
  `.claude/skills/ivue/SKILL.md` (its mirror is `docs_v2/guide/standard.md` —
  never edit the mirror).
- After docs changes: `npm run build:docs` must pass. After engine changes:
  re-verify the ~1.1 KB gzipped production size and 100% test coverage.
