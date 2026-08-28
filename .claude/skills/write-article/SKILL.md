---
name: write-article
description: >-
  How ivue blog articles are written — above all the TITLE DOCTRINE: titles are generative
  (they name what the reader can DO or what becomes TRUE for them), never descriptive of the
  mechanism or poetic about the theme. Use whenever writing or retitling a blog post; the
  title decision comes FIRST, before the prose.
---

# write-article — the title is the key

## The title doctrine: generative, not descriptive

A reader scanning HN, a feed, or the blog index decides in one line.
The title must answer *their* question — "what will I be able to do,
or know is possible, after reading?" — not our question of "what is
this post about."

**Generative** titles name the capability, the win, the changed fact:

| generative ✅ | what it promises the reader |
| --- | --- |
| Total memory control | you will control memory |
| Pause the watchers, keep the state | you will suspend/resume objects |
| The stack got faster. We changed nothing. | free speed is available to you |
| Circular imports, dissolved | that problem ends for you |
| The Options API everyone actually wanted | the thing you missed exists |

**Descriptive** titles name the mechanism, the artifact, or the mood —
and every one of these was a real first draft that got renamed:

| descriptive ❌ (first draft) | why it failed | became |
| --- | --- | --- |
| The ref behind the getter | names the trick, not the win | Total memory control |
| Silence without forgetting | poetic; payoff invisible | Pause the watchers, keep the state |
| Where ugliness comes from | names the theme, not the gain | Inexpressible failure, expressible intent |
| Faster underneath | timid; hides the claim | The stack got faster. We changed nothing. |

The pattern in every rename: **mechanism and poetry move INTO the
article** — the two-line code contrast becomes the opening image, the
poetic phrase becomes a blockquote or section line — and the title
takes the reader's payoff. Nothing is lost; it is re-seated.

Tests to run on a candidate title, in order:

1. **The stranger test** — someone who has never heard of ivue reads
   only the title: do they know what they'd gain? If they'd have to
   click to find out, it's descriptive.
2. **The verb test** — can the promise be said as something the
   reader does or gets ("control memory", "pause watchers", "ship
   faster")? Titles that survive are usually a noun-phrase of the win
   or a bold factual claim.
3. **The receipt test** — the article must actually deliver the
   title's promise with measured evidence. A generative title the
   body can't back is clickbait; scale the title down before
   publishing, never the other way.

Bold factual claims are allowed and encouraged when literally true
("We changed nothing" was true: zero lines changed). Timidity is a
title failure equal to vagueness.

## Clarity is the second doctrine (after the title)

The full rules live in the **ste-expression skill** (ASD-STE100,
ported from Invar) — load it when drafting. What matters most for
articles:

- **Short, direct sentences.** One point per sentence, aim under 20
  words. No semicolons — write two sentences. The maker's voice IS
  short sentences; length is where confidence goes to die.
- **Em-dash budget.** The house style permits them but they are our
  top slop marker. One per paragraph at most; prefer a period.
- **The short common word.** use (not utilize/leverage), start (not
  initiate), help (not facilitate), about (not regarding). No
  marketing adjectives — seamless, robust, elegant, world-class are
  banned; the receipts do the boasting.
- **The ten-year-old layer — required for every mechanism.** Every
  benchmark table, every engine behavior, every memory claim gets a
  version a ten-year-old could say back, next to the exact one ("the
  cache reads fast, but it charges rent every time the value
  changes"). This is a proof of comprehension, not dumbing down: if
  you can't say it simply, you hold a description, not the generator
  — reduce further before writing. The plain version is ADDED, never
  substituted: exact numbers, paths, and names stay.
- **One name for one thing**, across the whole article and its
  related posts. A second name reads as a second thing.
- **Lint the draft** before the banner step:
  `python3 .claude/skills/ste-expression/scripts/ste-lint.py <draft.md>`
  — delta signal, not a gate; under 2.0 is good.

## Write for the first-time reader

Every article is someone's FIRST contact with ivue — they arrived
from HN, a search, or a shared link, and they will read this one
article only. Write accordingly:

- **Name ivue explicitly at first reference to our solution**, with
  a one-line identity: "ivue, a 1.1 kB class layer over Vue's
  reactivity" (vary the phrasing, keep the shape: name + what it is
  + size). Never introduce our work as "the userland fix", "our
  layer", "the engine", or "we solved this" before the name has
  appeared — a stranger cannot resolve those references.
- After the introduction, short references ("ivue", "the engine")
  are free.
- **Assume zero prior posts read.** A claim proven elsewhere gets
  one plain sentence of restatement PLUS the link — the link is for
  depth, never a prerequisite. If a sentence only makes sense to
  someone who read another post, rewrite it.
- The stranger test from the title doctrine applies to the BODY too:
  scan the draft for any "we/our/the fix" whose antecedent lives in
  another article or in our heads.

## Everything after the title

- **Voice**: maker's confidence, measured-not-promised. Every
  behavior claim executed before written; numbers carry method and
  environment. No over-hedging, scope claims once.
- **Opening**: earn the first paragraph — a two-line code contrast, a
  stark trade, a concrete failure. The preamble is short; the meat
  starts by the first heading (readers reported "too many words about
  nothing" exactly once — it was fixed by cutting to twelve lines).
- **Structure**: one thesis, blockquoted where it deserves it;
  receipts linked to prior posts/guides rather than re-argued;
  a closing that lands the invariant, not a summary.
- **Reverse links — analyze which DOCS pages should link back.** The
  article's own `relatedPosts` and body links point at guides and
  examples; that covers only one direction. Before finishing, sweep the
  docs for every guide/example page the article proves, extends, or
  demonstrates (grep the topics the article touches), and add the
  article to THOSE pages' `relatedPosts` (strongest first). A guide
  section that states the pattern the article demonstrates may also
  earn one inline link. An article linked from nowhere in the reference
  path is undiscoverable to the reader who arrives via the docs.
- **Pipeline** (the mechanical steps live in CLAUDE.md): frontmatter
  with `tags` + `relatedPosts` (destination-oriented, strongest
  first) → banner via the blog-banner skill (VIEW the PNG; content
  balanced 64px top / 44px bottom) → `npm run build:docs` → commit →
  `npm run sync:blog-dates` → commit dates → deploy. Illustrations
  via the article-art skill when the post earns one.
- **Renaming later is cheap but not free** — the rename-blog-slug
  script handles slugs/redirects/D1, but the title decision made
  FIRST costs nothing. Spend the five minutes at the start.
