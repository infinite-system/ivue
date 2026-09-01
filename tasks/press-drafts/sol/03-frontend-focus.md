---
venue: Frontend Focus
purpose: pitch-email
lang: en
source: a-million-rows-twelve-divs
status: draft-for-review
---

To: editor@cooperpress.com

Subject: One million rows stay at twelve DOM nodes

Chris — Frontend Focus tracks how browser work gets done; this one keeps the DOM count near twelve.

ivue is a 1.1 kB class layer over Vue's reactivity. One 1,199-line ivue class drives a production scroller with 1,000,000 variable-height rows.

Scroll position is application state instead of a byproduct of a fifty-million-pixel layout. The DOM holds the visible window between two spacers. Every operation is O(window), and deep jumps refine their estimate in two frames.

The article includes the running scroller, the row counter, the source, and an Open-in-StackBlitz path.

https://ivue.dev/blog/a-million-rows-twelve-divs

If the live receipt fits a future issue, it is ready. If not, no reply is needed.
