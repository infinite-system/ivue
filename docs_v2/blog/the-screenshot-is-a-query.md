---
title: 'The screenshot is a query'
description: Invar's README screenshot is not a picture - it is an SVG rendered from the live terminal grid, cell by cell. When the UI is data, a screenshot is a lossless query, and everything downstream of that - testing, evidence, docs - gets strange and wonderful.
date: 2026-08
---

# The screenshot is a query

![The screenshot is a query](/blog/the-screenshot-is-a-query.png)

The screenshot in [Invar](https://github.com/infinite-system/invar)'s
README was never captured. No screen recorder, no window grab, no
pixels. A script boots the real editor in a headless PTY, waits for
the frame to complete, and asks the terminal grid what it contains —
then emits an SVG reproducing it exactly: per-cell colors, bold and
italic, background runs merged. You can zoom it forever. You can
**select the text inside it.**

That is only possible because of a fact this blog keeps circling:
**a terminal UI is data.** The screen is a grid of cells the program
can read back. So a "screenshot" stops being a lossy picture of the
truth and becomes a lossless *query of it* — same information as the
display, byte for byte, at any resolution, greppable.

## What falls out of that

**Verification gets cheap.** Invar's merge gate drives the real
program and asserts on painted cells — "the selection is visibly
dimmed" is a mechanical check, not a pixel-diff heuristic. Sixty-odd
smokes run on every landing because reading the screen costs nothing.
An Electron app answers the same question with a browser-automation
stack and a flake budget.

**Evidence gets exact.** When an agent claims the hover card renders,
the claim is checked against the actual frame — and when a human wants
proof, the frame itself is the artifact. The docs site's
[Invar showcase](https://ivue.dev/) uses these SVG frames: what you
see is not a representation of the editor's output, it *is* the
editor's output, re-encoded without loss.

**Docs stop rotting.** Regenerate the screenshot in CI and it can
never drift from the product — it is the product, queried. A
traditional screenshot is stale the day after it is taken; a query
re-runs.

## The general rule

None of this is really about terminals. It is the same invariant that
runs through [everything else here](/blog/uniformity-is-an-instrument):
**when state is data all the way to the surface, observation is free —
and everything built on observation (testing, evidence, documentation)
inherits the discount.** GUIs pay a tax at the last layer: the truth
becomes pixels, and every downstream consumer must reconstruct it.
The terminal never converts, so nothing needs reconstructing.

A picture is worth a thousand words. A query is worth exactly its
contents — which is the point.
