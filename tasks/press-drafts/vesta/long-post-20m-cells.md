---
venue: X long post (Premium, 25,000-char format); mirrors to Mastodon as a link post
purpose: post
lang: en
source: twenty-million-cells, a-million-rows-twelve-divs, measured-not-promised
status: draft-for-review
---

# Long post — the 20,000,000-cell document

**Format note.** First 280 characters are the timeline preview; the rest
sits behind "Show more". The opening paragraph stands alone.

**Body — paste from the line below.**

---

Google Sheets caps a spreadsheet at ten million cells. This document
holds twenty million — every cell formula-capable, editable and
reactive — in about 89 MB. That is 4.7 bytes per cell, and you can build
it yourself, in your browser, on the engine that ships to npm.

4.7 bytes per cell is the part worth sitting with. A plain
`{ row, col, raw }` object with no reactivity at all costs 8.5× more.
The reactive document is under the floor of the non-reactive one.

There is no trick, only one invariant taken all the way down:

**Everything costs proportional to what is observed. Nothing costs
proportional to what exists.**

How that cashes out in three moves.

Ground truth lives in columnar typed arrays — one byte of kind tag,
eight bytes of number, shared across the column. Cell *objects* are
disposable three-field facades, created per render and thrown away.
Reactivity is a sparse overlay that materializes only when something
observes a cell, and evicts when the viewport moves away.

The consequence that sounds wrong and is not: a write to a cell nobody
is watching allocates nothing and notifies no one. Twenty million cells
exist; only the few hundred you can see cost anything.

The plain version, for a ten-year-old: the spreadsheet is a dark
warehouse. Only the shelf you are standing in front of has a light on.
Turning on a light costs something. Having twenty million shelves does
not.

The same invariant, one floor up, is why a 1,000,000-row list holds
about twelve divs in the DOM. Measuring a million row heights up front
would be O(total) — the exact cost the design exists to refuse. So
heights are captured one-shot as rows enter the window, a row never
reached is never measured, and a row's position comes from a prefix sum
that is never materialized as an array. Every operation is O(window):
scrolling, jumping, resizing. Jump deep into the list and you can watch
the estimate correct itself in two frames — not a glitch being hidden,
the contract being kept. Precision is paid for exactly where you are
looking.

All of it runs on ivue, a 1.1 kB class layer over Vue's reactivity where
state is a getter returning a ref and derivations are plain prototype
getters that weigh nothing per instance. The pattern is documented, not a
stunt: keyed reactivity is the third state shape, and it teaches in ten
lines.

One habit underneath all of this. Every performance claim here names
what was measured, at what scale, on which engine — and the load-bearing
ones execute live in your browser rather than in a table we typed.
Numbers age, machines differ, engines improve. The method is the part
that stays true.

Press the button and get your own hardware's answer.

https://ivue.dev/blog/twenty-million-cells
