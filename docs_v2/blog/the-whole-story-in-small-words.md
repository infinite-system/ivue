---
title: "The whole story, in small words"
description: The whole story in small words — a one-kilobyte brick, an editor that AI agents built out of it, and the referee that makes AI-built software safe to trust.
date: 2026-07
tags: [story, agents, invar]
---

# The whole story, in small words

<BlogPostDate />

![The whole story, in small words](/blog/the-whole-story-in-small-words.png)

Most posts on this blog argue. This one just tells the story, in the
smallest words we can find — because when we stepped back and looked
at what had actually happened, the simple version turned out to be
the honest one.

## 1. The brick

Most software is built out of tangled stuff — knots of state,
frameworks, and glue. [ivue](/guide/introduction) is a brick: about
[a kilobyte](/blog/one-kilobyte-feature) of engine that lets you build
out of **plain classes** that snap together and update themselves when
anything changes. And the blocks never tangle —
[no matter how deep you stack them](/blog/the-object-graph-they-took),
no matter which file references which, the connections cannot knot.

That "never tangles" property looks like a convenience. It is the
superpower everything below stands on.

## 2. The editor

To prove the brick, we built something big out of it:
[Invar](/examples/invar), a real code
editor that runs in a terminal — file tree, tabs, git panel with
side-by-side diffs, language intelligence, an integrated terminal.
It is fast, it is small, and it is used daily.

Here is the strange part:
[AI agents wrote almost all of it](/blog/agents-built-an-editor). The
human's job was to state the **rules that must never break** — each
module carries a written contract of them — and a **referee** checks
every change against those rules by actually driving the editor and
reading its screen, before anything is allowed in. Agents built
features overnight. The referee rejected what broke the rules. The
codebase stayed clean — measurably: zero tangles, one cache, after
hundreds of commits.

Rules, plus a referee, plus untangleable bricks. That combination is
the discovery.

## 3. The toy box that builds toys

Then something unplanned happened. An AI coding assistant was run
*inside* the editor's new terminal — and it became obvious that the
editor already had every part an AI assistant's **home** needs: a
place to talk, panes to show work in, overlay dialogs for questions,
and eyes into the code itself.

So the next blueprint wrote itself, and it rests on one idea: an AI
assistant should not be a wall of text you *trust*. It should be a
colleague that **shows you** — the change as a real diff, the file
opened at the real line, the test that proves it, the work happening
live as it happens, replayable tomorrow. Reading its work and
verifying its work become the same act.

Slop — AI output that merely *looks* right — survives only where
checking is expensive. Make showing cheap and slop loses its habitat.

## 4. Doors that open both ways

The same blueprint gives the human a door policy. Every action the AI
wants to take arrives as a **question in data**: let reads through
automatically, make writes ask, forbid the dangerous things entirely —
or require that the referee is happy before a change may even be
committed. A second AI can answer the first one's routine questions,
so only real judgment reaches a person. Every answer is recorded.

And the doors open the other way too: the AI can use the editor's own
eyes and hands — ask the language server what a type really is, look
at the actual rendered screen, run the actual tests — to **prove its
work instead of describing it**. The human governs the machine; the
machine shows its homework; the referee checks them both.

## 5. The toy that makes new toys

The last unlock follows from the others. Because the rules and the
referee ship *inside* the box, anyone who has the editor can simply
ask it for a new feature — and their AI builds it under the same
contracts, checked by the same referee, in the same untangleable
bricks. Good pieces can flow back to everyone, carrying their
evidence with them: a contribution is reviewable because it *arrives*
with its contract, its test, and its green referee run.

Software that grows by conversation — and cannot drift while growing.
The editor is named [Invar](/examples/invar)
after the alloy engineered not to expand under heat. The name is the
whole thesis.

## In one breath

Write down the rules that must never break. Give the rules a referee.
Build out of bricks that cannot tangle. Then AI can build almost
everything else — fast, in parallel, overnight — and you can *watch
and check* instead of trust. The kilobyte made the editor possible;
the editor makes the AI's house possible; and a house with rules,
evidence, and a referee is the first one worth letting the machines
build in.

The brick is [on npm](https://www.npmjs.com/package/ivue). The editor
is [on GitHub](https://github.com/infinite-system/invar). The
referee runs on every commit.
