---
title: Grow by subtraction
description: X long post — AI removed the cost of writing code, not the cost of having it; reduce on purpose and robustness arrives with the smaller codebase.
date: 2026-09-26
private: true
channel: x
tags: [ai, architecture, standard]
---

AI removed the cost of writing code. It did not remove the cost of HAVING it.

That's the trap. Every session now ends with more than it started with, and nobody chose that. It's just what happens when typing is free.

So invert the session. Open it with one question: what can go?

One question deleted 537 lines from our virtual scroller. "Don't you already know the heights?" All the machinery built to hide a rounding error came out in one commit, and the bug came out with it.

A creep animation that played in chained chunks became one continuous run. Less code, and a whole class of Android stutter became impossible rather than fixed.

A refactor last week: 546 lines in, 625 out, and the hot reads went from 4 nanoseconds to 1.

The core of ivue is still 1.1 kB after three years of this.

Deleting is not the cleanup you do when there's time. It's where robustness comes from. Code that isn't there has no bugs, no tests, no drift, and no second way to do the same thing.

Left alone, a plant grows everywhere. A pruned one grows where you meant it to. The cut isn't the opposite of growth — it's how you aim it.

Ask your agent for less. It's better at that than anyone expects.

Grow by subtraction.
