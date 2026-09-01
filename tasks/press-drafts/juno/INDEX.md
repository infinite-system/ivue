# Press drafts — juno (wave 2: W13 objection bank + launch runbook)

| file | venue(s) | purpose | lang | length |
| --- | --- | --- | --- | --- |
| `objection-bank.md` | HN launch thread, r/vuejs, r/javascript, r/typescript, r/webdev, r/programming, lobste.rs, the r/vuejs AMA, podcast pre-read | post (answer bank — paste one entry at a time) | en | 2,183 words · 22 objections + 2 volunteered weaknesses + 3 closers |
| `launch-runbook.md` | internal — launch day across HN, r/vuejs, X, Bluesky, Mastodon, LinkedIn, newsletter | post (one-page day-of script) | en | 1,271 words · 5 pre-launch gates, 8-row clock, 9 do-not-argue rules, 9-item mirror checklist |

## How these two are used together

The runbook says *when* and *whether to reply*; the bank says *what the
reply is*. Gate 4 of the runbook is "objection bank open in a tab" — so
the bank is a launch-day dependency, not a nice-to-have.

Numbers used across both, all traceable: engine **1,146 B gzipped**
(`gzip -c dist/index.es.js | wc -c`, release 2.5.0), **209 tests at
100% coverage on every metric** across 7 files, **55–253× faster
creation at 100k instances**, **32.2 B/instance at construction vs
31.9 B for a bare `{ id }` literal (1.01×)**, **3.7 KB vs 8.0 / 10.4 /
19.7 KB per live observed instance**, reads **23.4 / 9.6 / 3.8 ns**
raw vs **68.2 / 47.0 / 42.3 ns** shallow-unwrap vs **125.1 / 72.4 /
68.5 ns** `reactive()`, **20,000,000 cells at 4.7 bytes each (~89 MB)**,
**196/196 tests on the Vue 3.6 release candidate, first tracked reads
~1.6× faster**, **94,000-line agent-built IDE**, MIT, zero runtime
dependencies, peer dep `vue ^3.2.0`.

Two live-web checks fed the bank so no competitive claim is asserted
from memory: **Pinia advertises ~1.5 kB** in its own docs (so the bank
never claims a size win over it — it argues population cost instead),
and the **TC39 signals proposal is at Stage 1** (so objection 12 says
Stage 1, not "coming soon").

## Checkpoint report

| # | checkpoint | status | observed evidence |
| --- | --- | --- | --- |
| 1 | CP1 count | DONE | Angle brief names EXACTLY 2 artifacts plus INDEX. Produced 3 files, `ls tmp/press-drafts/juno/` → `INDEX.md`, `launch-runbook.md`, `objection-bank.md`. Word counts read back from `wc -w`: objection-bank 2,183; launch-runbook 1,271. |
| 2 | CP2 headers | DONE | `grep -c 'status: draft-for-review'` over the two artifacts → 2 matches in 2 artifact files (INDEX.md carries no header block by spec). Each header block carries all five keys: `venue`, `purpose`, `lang`, `source`, `status`. |
| 3 | CP3 titles | DONE | **"Every hostile question, answered with a number"** — stranger test: a stranger knows the win (they get answers to the hard questions); verb test: the reader *answers* a hostile question; receipt test: the body delivers 22 answers, each carrying a number or a docs/repo link, and volunteers two weaknesses. **"Launch day, decided in advance"** — stranger test: the win is that no decision is made under adrenaline; verb test: the reader *decides in advance*; receipt test: the body is the decisions themselves — a 5-row gate, an 8-row clock with times, 9 do-not-argue rules, and a pre-committed win threshold (HN front page / subreddit top 10 / 500+ referrers in 48h). Neither title names a mechanism. |
| 4 | CP4 voice | DONE | Command run: `grep -riE '\b(seamless\|robust\|elegant\|elegance\|powerful\|blazing\|world-class)\b' tmp/press-drafts/juno/` → no matching lines (the shell printed the `NO_BANNED_ADJECTIVES` fallback, i.e. grep exited 1 with empty output). |
| 5 | CP5 self-containment | DONE | `objection-bank.md`: identity line is the **first body line** — "ivue is a 1.1 kB class layer over Vue 3's reactivity: plain TypeScript classes become fully reactive, and instances stay plain objects." Every one of the 22 answers restates its own premise and links its own source; none says "as covered in the previous post". `launch-runbook.md`: identity line is the **first body sentence** — "ivue is a 1.1 kB class layer over Vue 3's reactivity." Its one back-reference (the rotation math, in "If it goes quiet") is restated in full — ~12 rooms, one post per room every 2–3 weeks, 48 articles — so it reads without the press plan open. |

DONE
