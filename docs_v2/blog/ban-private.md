---
title: 'Ban private'
description: 'Every private member is a fork waiting to happen. The ivue standard bans the keyword: internals are protected, overrides carry override, and the compiler makes seam drift loud. Proven on a 108,000-line IDE that AI agents extend daily.'
date: 2026-08
tags: [patterns, architecture, agents, invar]
relatedPosts: [ship-the-variant-keep-the-tuning, inheritance-exile, agents-built-an-editor]
---

# Ban `private`

![Ban private](/blog/ban-private.png)

<BlogPostDate />

You need one line changed inside someone's class:

```ts
class $ChooseField {
  private fetchOptions() {
    // 40 lines of tuned fetching — you need line 12 different
  }
}
```

The member is `private`. Your subclass cannot call it, cannot override
it, cannot reach it at all. You have exactly one option left: copy the
file. Now there are two files. Every future fix must remember to visit
both.

> Every `private` member is a fork waiting to happen.

So the ivue standard bans the keyword. Not "avoid it". Banned. Every
internal member is `protected`, every override says `override`, and the
compiler turns both rules into guarantees. This post is the reasoning,
the objection we had to answer, and the codebase that proved it.

## What `private` actually protects

Nothing, at runtime. TypeScript's `private` is a compile-time
annotation. The emitted JavaScript has an ordinary property that anyone
can read, write, or monkey-patch. (Native `#private` fields do hide at
runtime. They also hide from subclasses even harder, so they make the
problem worse, not better.)

The plain version: `private` is a sign on a door, not a lock. The only
people who obey signs are the polite ones. The polite visitor here
is the subclass author trying to extend your work the right way. The
keyword forbids exactly the person the architecture exists to serve,
and stops nobody else.

That trade might still be worth it in a codebase where inheritance is
rare. In ivue it is incoherent. ivue, a 1.1 kB class layer that turns plain TypeScript classes into
fine-grained Vue 3 state, exists so that behavior ships once and every
variant subclasses it. We wrote a
whole post on a production virtual scroller becoming a horizontal card
strip and a book-length marquee in
[eight overridden seams](/blog/ship-the-variant-keep-the-tuning). A
`private` member in that world is a seam somebody welded shut on the
way out.

## Visibility is a three-tier statement of audience

Once `private` is gone, the two keywords that remain stop being habit
and start carrying meaning. Every member now declares who it is for:

| tier | audience | meaning |
| --- | --- | --- |
| `public` | templates and consumers | the component's surface |
| `protected` | subclasses | a seam of the hierarchy |
| `private` | nobody | banned |

The middle tier does real work. A `protected` member is reachable from
every subclass and invisible to everything else. TypeScript refuses
access from templates, from other modules, from consumers. So the
keyword now answers a design question at a glance: `public` is what the
component promises the outside world, `protected` is what the family
line can tune. There is no third audience, so there is no third
keyword.

And if a member feels like it must be hidden even from subclasses,
that feeling is the finding. It usually means the member has a
misleading name, an undocumented invariant, or a shape that would
break if touched. The fix is to name it properly and state the
invariant — not to lock the door and hope no one needs the room.

## The objection: "now every rename is a breaking change"

This is the real argument for `private`, and it deserves a real
answer. If everything is `protected`, then every internal member is
part of the extension surface. Rename one, and some subclass somewhere
silently loses its override. The method still compiles. It just never
runs again. That fear is legitimate. Silent orphaning is worse than
forking.

The answer is one compiler flag:

```json
{ "noImplicitOverride": true }
```

With it on, every member that overrides a base member must say so:

```ts
class $ContactField extends ChooseField.$Class {
  protected override get fetchPath() {
    return super.fetchPath || '/contact';
  }
}
```

Now rename `fetchPath` in the base, and every subclass breaks at
compile time, at the exact member, with an error that names it. Seam
drift is loud. Nothing orphans silently.

The plain version: `protected` opens every door, and `override` puts an
alarm on each one. Open doors without alarms are fragile. Alarms
without open doors are forks. You need both, and both are one line of
config plus one keyword the compiler forces you to write anyway.

That is the whole doctrine. Two rules, each covering the other's
weakness:

> `protected` makes every seam reachable. `noImplicitOverride` makes
> changing one loud.

## Where it was proven

[Invar](/examples/invar) is a 108,000-line terminal IDE built almost
entirely by AI agents on ivue classes. Its house standard was stricter
than ivue's: Invar banned `private` first. The ban migrated upstream
into [the ivue standard](/guide/standard) after we watched it hold.

Agents made the case sharper than humans ever did. A human who hits a
`private` wall might file an issue, or grumble and work around it. An
agent extends or it copies. There is no negotiation step. Across tens
of thousands of agent-written lines, every member being a reachable,
`override`-guarded seam is a large part of why the codebase grew by
subclassing instead of by duplication. The
[gate-driven build](/blog/agents-built-an-editor) caught seam drift
the same hour it happened, because seam drift is a compile error.

The docs site you are reading eats the same cooking. Its behavioral
components are ivue classes under the same rule: the newsletter card,
the delivery strip on the home page. When the rule landed, migrating
them was a mechanical sweep: `private` became `protected`, the build
stayed green, and every one of those components became extensible in
the same commit.

## The invariant

Encapsulation was never the goal. It was a proxy for a goal, "do not
couple to my internals by accident", enforced with a tool that also
forbids coupling to them on purpose. Split the two apart and the
proxy dissolves: templates and consumers are kept out by `protected`
itself, and deliberate extension is guarded by `override`.

A class is a promise that behavior can be built upon. `private` is the
one keyword that breaks the promise selectively, for the politest
visitor, at zero runtime benefit. Ban it, alarm the seams, and the
next person who needs line 12 different writes three lines instead of
copying forty.
