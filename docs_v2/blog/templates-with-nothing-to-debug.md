---
title: 'Templates with nothing to debug'
description: 'Give every template expression a name on the class and the template stops computing anything. What is left reads as stage directions, the class reads as the script, and a gate keeps it that way. Eighty-six expressions across twenty-two files, moved.'
date: 2026-09
tags: [patterns, architecture, agents]
relatedPosts: [runtime-props-all-along, single-file-models, the-options-api-everyone-wanted, agents-built-an-editor]
---

# Templates with nothing to debug

![Templates with nothing to debug](/blog/templates-with-nothing-to-debug.png)

<BlogPostDate />

This was a button in a store example:

```vue
<button @click="project.filter = project.filter === 'done' ? 'all' : 'done'">
```

This is the same button now:

```vue
<button @click="project.toggleDoneFilter()">
```

The first one works. It also holds a comparison, a ternary and an
assignment that exist nowhere else: not on the store, not in a test, not
under a name anyone could search for. The second one holds nothing. What
it does lives on the class as a method whose name says what it means, and
the template only says when to call it.

> Structure stays in the template. Meaning moves to the class.

## See it in the docs

- [Components & Templates](/guide/components#stage-directions-and-the-script) — the rule, and the stage-directions reading of it.
- [The standard](/guide/standard) — the operating manual the gate checks against.
- [Class store](/examples/class-store) — the button this post opened on.
- [Select field](/examples/choose-field) — the slot forwarding, twenty-one expressions to two names.
- [Media uploader](/examples/media-field) — drag, rename and busy states as names.
- [Workspace platform](/examples/workspace-platform) — views, progress bars and priorities as names.
- [Inheritance chain](/examples/inheritance) — the discount and tax buttons.

This post is about what happens when that is not a preference but a rule,
applied to every template in a codebase and checked by a gate. The short
version: the template and the class become two different kinds of text,
and the template becomes the kind you never have to debug.

## The rule, and what it costs elsewhere

The rule is one sentence. No logic in a template expression. A condition,
a comparison, a ternary, a built string, an assignment: each one becomes a
plain getter or a method on the component's class, and the template binds
the name.

Every Vue developer has heard a version of this and nobody keeps it,
because in ordinary Vue the cost is real. A named condition is a
`computed()`, and a `computed()` is an allocation per instance. Forty
conditions on a component in a list of a thousand rows is forty thousand
cached closures, so the ternary stays in the template where it is free.

ivue, a 1.1 kB class layer over Vue's reactivity, changes the price. A
derivation on a class is a plain getter, reactive through the leaves it
reads, and it costs zero bytes per instance. A name is free. Once a name
is free there is no reason left to leave logic in a template, and the rule
can be absolute.

## What moved

Applied to the docs site and its playground, the rule found 86
expressions across 22 templates. A sample, with what each became:

| in the template | on the class |
| --- | --- |
| `discount = Math.min(discount + 0.05, 0.9)` | `bumpDiscount()` |
| `resetting ? 'Resetting…' : 'Reset sandbox data'` | `resetLabel` |
| `{ width: \`${task.checklistProgress}%\` }` | `task.checklistBarStyle` |
| `renameId === row.id ? renameDraft : row.name` | `displayName(row)` |
| `media.dragIndex.value === index` | `isDragging(index)` |
| `slot === 'prepend'` and `scope \|\| {}`, the latter twenty-one times | `isPrependSlot(slot)` and `slotScope(scope)` | [select field](/examples/choose-field) |
| `view = 'board'` | `showBoard()` |
| `Math.round(taxRate * 100)` | `taxRatePercent` |

Said plainly: every place the page used to do a little arithmetic, it now
asks the class a question, and the class has a word for the answer.

Two things fell out that were not the point. Duplicates disappeared,
because the docs formula grid and the playground formula grid had the
same three style expressions each, and now both bind the same three
getters. And two leaves that thought they were markup turned out to own a
derivation, so they got their class. Naming a thing forces the question of
who owns it, and the answer was never the wrapper.

## Two kinds of text

Here is what the split does to how the files read.

The template becomes **stage directions**. Who is on stage, where they
stand, what happens when someone acts. `v-if="media.isDragging(index)"`.
`:disabled="model.sendDisabled"`. `@click="board.openTask(task)"`. Every
line names an actor or an action. The only structure left is `v-if` and
`v-else` on a named condition and `v-for` over a collection, and structure
is the part that was always meant to be dumb. When a template is wrong, it
is wrong the way a seating chart is wrong. You can see it.

The class becomes **the script**. Every derivation is a sentence about
what something means, and reading the class top to bottom is reading the
component's whole intent in order. A condition that used to be
`items.length && !loading && mode === 'edit'`, spread across three
bindings, is one line called `canEditItems`, and the three bindings say
the same word.

```ts
get canEditItems() {
  return this.items.value.length > 0 && !this.loading.value && this.mode.value === 'edit';
}
```

That is a prototype member. It is greppable by name, callable in a test
with a plain object and no mount, typed, and overridable in a subclass.
None of that was possible while it was a string inside a `v-if`.

## Why it holds without effort

The reason this reads as prose is not style. It is that every piece of
logic was forced to have a name, and a name is a claim about meaning.
Claims live on the prototype where claims can be checked. What is left
for the template is the arrangement of claims, and arrangements do not
need debugging.

It also explains something that surprised me during the sweep. The
conversion was done by four agents in parallel, on disjoint files, and
none of them drifted. Prose has one way to be said correctly. The rule
made the correct way the only way, and the gate refused the rest.

The gate is the part that makes it permanent. The standard's checker
parses every SFC template, and a ternary, a comparison, a built string or
an assignment inside an expression fails the docs build. Fifty-five
components were then driven in a real browser with one interaction each,
and every one of them still did what it did before. The behavior did not
move. Only its address did.

## The cost

The class grows. Every condition that used to be free text is now a
member with a name, and a component with forty conditions has forty more
members. That is the whole price, and it is paid in the one currency that
was already cheap here. Against it: a template you can read without
thinking, and a class that says everything the component means.

Structure stays in the template. Meaning moves to the class.

## See it in the docs

- [Components & Templates](/guide/components#stage-directions-and-the-script) — the rule, and the stage-directions reading of it.
- [The standard](/guide/standard) — the operating manual the gate checks against.
- [Class store](/examples/class-store) — the button this post opened on.
- [Select field](/examples/choose-field) — the slot forwarding, twenty-one expressions to two names.
- [Media uploader](/examples/media-field) — drag, rename and busy states as names.
- [Workspace platform](/examples/workspace-platform) — views, progress bars and priorities as names.
- [Inheritance chain](/examples/inheritance) — the discount and tax buttons.
