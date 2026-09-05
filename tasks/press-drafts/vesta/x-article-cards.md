---
venue: X (format B — article-as-images, 4-image slot), reusable on Bluesky and Mastodon
purpose: card-text
lang: en
source: ban-private, twenty-million-cells, win-by-reduction
status: draft-for-review
---

# Article cards — typographic card text for three essays

The press plan's format B renders a post's strongest section as 1–4
typographic cards in X's four-image slot, so the whole argument is read
in-feed and the link rides the reply. This file is the **text** for those
cards — the render script supplies the house design.

Rules applied: one idea per card; the card is readable at feed size, so
no card exceeds ~45 words; the alt text is the card's plain text
verbatim, which is both the accessibility requirement and the searchable
copy.

---

## Set 1 — ban-private (4 cards)

**Card 1**
> Every `private` member is a fork waiting to happen.

**Card 2**
> You need one line changed inside a 40-line private method. Your
> subclass cannot call it, cannot override it, cannot reach it.
>
> One option remains: copy the file. Now every future fix must visit
> two files.

**Card 3**
> TypeScript's `private` is a sign on a door, not a lock.
>
> It protects nothing at runtime. The only person who obeys it is the
> subclass author trying to extend your work the right way.

**Card 4**
> Two rules replace it:
>
> `protected` makes every seam reachable.
> `noImplicitOverride` makes changing one loud.
>
> Rename a base member and every subclass breaks at compile time, at
> the exact member, by name.

**Post text accompanying the cards:**
> Banned outright in the ivue standard, and proven on a 108,000-line
> codebase where the classes get extended daily. The reasoning, the
> objection, and the compiler flag that answers it:

---

## Set 2 — twenty-million-cells (3 cards)

**Card 1**
> Google Sheets caps a spreadsheet at ten million cells.
>
> This document holds twenty million. Every cell formula-capable,
> editable, reactive. About 89 MB.

**Card 2**
> 4.7 bytes per cell.
>
> That is 8.5× BELOW a plain { row, col, raw } object with no
> reactivity at all. The reactive document sits under the floor of the
> non-reactive one.

**Card 3**
> One invariant, taken all the way down:
>
> Everything costs proportional to what is observed. Nothing costs
> proportional to what exists.
>
> A write to a cell nobody watches allocates nothing.

**Post text accompanying the cards:**
> Built in your own browser, on the engine that ships to npm — ivue, a
> 1.1 kB class layer over Vue's reactivity. Click the button, watch the
> counter:

---

## Set 3 — win-by-reduction (3 cards)

**Card 1**
> Do not solve a removable problem more efficiently.
>
> Remove the condition that creates it.

**Card 2**
> Plain instances remove the proxy layer.
> Plain getters remove cache allocation.
> Lazy members remove unused allocation.
> Late references remove initialization-order puzzles.
>
> Fewer problems remain.

**Card 3**
> A convention is strongest when following it makes a category of
> failure unavailable.
>
> An unread member cannot allocate.
> A plain getter cannot secretly own a memo node.
>
> Impossibilities, not warnings.

**Post text accompanying the cards:**
> The generator is compact; what it generates can be enormous. That is
> the whole reason a 1.1 kB library can carry a 108,000-line
> application:

---

## Rotation guidance

- Cards suit the philosophy- and architecture-tagged posts, where the
  argument is the product. Threads stay the format for receipts posts
  where numbers accumulate segment by segment.
- Every card set reuses an UNUSED xHook as its accompanying post text on
  a later firing, so one article yields a thread, a card set, and a
  re-promotion without repeating a sentence.
