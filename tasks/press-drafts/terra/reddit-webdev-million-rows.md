---
venue: r/webdev
purpose: post
lang: en
source: a-million-rows-twelve-divs
status: draft-for-review
---

# Render a million rows without making a million-row DOM

A one-million-row list at about 50 px per row wants a 50-million-pixel layout. That reaches browser layout limits before the data becomes interesting.

ivue, a **1.1 kB class layer over Vue's reactivity**, runs our virtual scroller, but the useful part is the contract: scrolling is application state, and every operation costs O(window), not O(total rows).

The DOM holds about **twelve rows** between two spacer `div`s. A customized Lenis instance owns wheel, touch, momentum, and a single virtual scroll position. That position drives `translateY`; the scroll range is computed data, not the height of a giant element.

Rows have different heights, so the scroller does not measure all million at startup. It stores measurements when rows enter the window and estimates everywhere else. Jump to row 612,400: the new window is measured, the estimate corrects, and the landing settles. Work follows what is on screen.

The production implementation is one **1,199-line** ivue class:

- ref-getters hold template refs and mutable state;
- plain getters derive visible rows and spacer geometry from leaf reads;
- keyed version signals invalidate only observed geometry;
- the constructor wires the component-scoped lifecycle.

There is no claim that twelve nodes solve every list. Variable-height estimates converge, so a deep jump can visibly settle. That is the trade: pay precision where the reader is looking, not across rows nobody has seen.

The demo, source tabs, row-in-DOM counter, and StackBlitz repro are here: [ivue.dev/examples/virtual-scroller](https://ivue.dev/examples/virtual-scroller).
