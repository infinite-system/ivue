---
venue: X (alternative launch thread), mirrored to Bluesky and Mastodon
purpose: thread
lang: en
source: one-kilobyte-feature, introducing-ivue, twenty-million-cells, measured-not-promised
status: draft-for-review
---

# Alternative launch thread — the subtraction angle

The written launch thread (`x-launch-thread`) opens on "introducing".
This one opens on the **number**, and the argument is subtraction: 1.1 kB
is not compression, it is what is left when a design stops needing
machinery.

**Withhold check, per the press plan:** the AI-agents story is a
deliberately separate second wave and does not appear in this thread.
The only permitted reference is the 108,000-line codebase cited as a
receipt for the standard — one mention, framed as evidence, never as an
announcement. Segment 6 is that mention.

**Format:** 8 segments. Banner on segment 1. Link in the last segment on
X; moved to segment 1 for the Bluesky and Mastodon ports (see
`bluesky-mastodon-notes.md`). Every segment is ≤280 characters, so the
thread posts from a free account.

---

**1/8** (banner attached)

> The whole engine is 1,120 bytes gzipped. Lazy state, method binding,
> reactive inheritance with super, teardown, watchers. Zero
> dependencies. 100% test coverage on every metric.
>
> That number is not a compression trophy. It is a diagnosis.

**2/8**

> ivue is a 1.1 kB class layer over Vue's reactivity. Write a plain
> TypeScript class; it becomes fine-grained reactive state.
>
> Size is what a design weighs after you stop paying for machinery it
> never needed. Four things it does not have:

**3/8**

> No proxy per instance — instances are plain objects, so there is no
> proxy code.
> No eager anything — state materializes on first read.
> No compiler — the transform is a one-time prototype rewrite.
> No second dev engine — local runs the production path.

**4/8**

> What subtraction buys, measured. 100,000 instances of a three-level
> reactive hierarchy versus 100,000 plain { id } object literals. Heap
> after GC: 3.08 MB against 3.04 MB.
>
> The whole hierarchy costs 1.01× a bare object literal.

**5/8**

> Which is why creation is measured in milliseconds rather than
> optimized into them. 1,000,000 instances in 22 ms; 55–253× faster than
> eager shapes.
>
> The work is not fast. The work is absent.

**6/8**

> Taken all the way down: a 20,000,000-cell spreadsheet, every cell
> formula-capable and reactive, in about 89 MB. 4.7 bytes per cell — 8.5×
> below a plain { row, col, raw } object with no reactivity at all.
>
> The same 1.1 kB runs a 108,000-line IDE.

**7/8**

> A kilobyte also buys auditability. You can read the entire engine
> before lunch and know — not trust — what happens on every property
> access of every instance you create.
>
> Zero dependencies means no transitive tree under that claim.

**8/8**

> Every number here re-runs live in your browser, on the same build that
> ships to npm. Come skeptical; the receipts are the point.
>
> https://ivue.dev
> npm i ivue vue

---

## Posting notes

- Segment 5's "55–253×" and segment 4's heap table are the two numbers
  most likely to be challenged. Both answers are one link: the live
  benchmark page. Keep it pasted and ready before posting.
- If a reply argues "1 kB is easy when the library does little", the
  answer is segment 6, not an adjective: the same engine runs a
  20M-cell document and a 108,000-line application.
- Do not answer a downvote wave. Numbers or silence.
