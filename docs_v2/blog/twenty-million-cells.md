---
title: "The 20,000,000-cell document"
description: A spreadsheet Google Sheets cannot represent, fully reactive at 4.7 bytes per cell — and you can create it in your browser right now.
date: 2026-07
---

# The 20,000,000-cell document

![The 20,000,000-cell document](/blog/twenty-million-cells.png)

Google Sheets caps a spreadsheet at ten million cells. The document below
holds twenty million — every cell formula-capable, editable, and
reactive — in about 89 MB of browser memory. That is **4.7 bytes per
cell**, which is 8.5× *below* the cost of a plain `{ row, col, raw }`
object with no reactivity at all.

Under the floor. Fully reactive. Click the button and build it yourself:

<FlyweightGrid20M />

The trick is that there is no trick — only one invariant taken all the
way down:

> Everything costs proportional to what's observed; nothing costs
> proportional to what exists.

Ground truth lives in columnar typed arrays: one byte of kind tag, eight
bytes of number, shared across the column. Cell *objects* are disposable
three-field facades created per render and thrown away. Reactivity is a
sparse overlay that materializes only when something observes a cell —
and evicts when the viewport moves away. A write to a cell nobody is
watching allocates nothing and notifies no one. Twenty million cells
exist; only the few hundred you can see cost anything.

And because behavior lives on prototypes, the formula engine was
**hot-swapped underneath this exact 20M-cell model** — edited on disk,
grafted onto the live instances, totals recomputed through the new code,
zero state lost. A compiled reactivity system cannot do that at any
price: its code and its memory die together.

The pattern is reusable, not a stunt: [The Flyweight
Pattern](/guide/flyweight) walks the architecture, and [Reactive
State](/guide/state) teaches its foundation — keyed reactivity, the third
state shape — in ten lines.
