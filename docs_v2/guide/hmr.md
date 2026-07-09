---
title: HMR — Hot Reload for Classes
description: Edit a method or getter and watch live instances run the new code with all their state intact — beyond what Vue's own HMR can do for script edits. Constructor edits surgically remount only the owning components. Production pays zero bytes.
---

# HMR — Hot Reload for Classes

Edit a Reactive class while your app runs, and **live instances keep their
state and run the new code** — no remount, no page reload, no lost scroll
position or half-filled form. This is a capability Vue's own HMR structurally
cannot offer for script edits, and ivue gets it almost for free from its core
design.

_(Terminology: the industry acronym HMR stands for Hot Module **Replacement**
— replacing a module in a running page. What ivue adds on top is hot
replacement of a **class under its live instances**.)_

## What you get

| You edit…                                         | What happens                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| a **method** body                                 | live instances run the new code on the next call — state intact                                    |
| a **derived getter**                              | recomputes with the new logic on the next read — state intact                                      |
| an **added member**                      | appears on live instances immediately                                   |
| a **removed member**                     | tombstoned in dev (keeps its last implementation) so stale closures never crash; gone after remount/reload |
| an **inlined `computed(...)` body** or a **`$`-singleton** | owning components remount automatically — a graft cannot reach closures already cached on instances |
| a **ref-getter initializer** (`ref(5)`→`ref(10)`) | live instances _keep their current state_ (that's the point); new instances start at the new value |
| a **class field** or **constructor**              | only the _owning components_ remount; replacements are built by the new constructor                |
| a **template** (`.vue`)                           | Vue's own re-render — state intact (unchanged)                                                     |

Compare with vanilla Vue: any script edit — a handler tweak, one changed
line in `setup()` — reloads **every mounted instance** of that component,
state reset. Edit a shared composable and every component importing it
remounts at once. Vue has no choice: `setup()` is one opaque closure, so it
cannot know your edit was "just behavior".

ivue can know, because the class syntax _is_ the information:

- **State** lives in ref-getters → materialized as per-instance cached refs
  (own properties).
- **Behavior** lives in methods and plain getters → on the prototype, shared.

A behavior edit is therefore, structurally, a prototype-level change — and a
prototype can be swapped under living instances without touching their state.
The distinction Vue must guess at, ivue reads off the syntax.

## Setup

**With the Vite plugin** (recommended — zero per-file boilerplate):

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import ivueHmr from 'ivue/lib/hmr-plugin';

export default defineConfig({
  plugins: [vue(), ivueHmr()],
  // vendored engine copy? point the injected import at it:
  // plugins: [vue(), ivueHmr({ runtime: 'src/utils/ivue2' })],
});
```

The plugin appends a self-accept to every module that calls `Reactive(...)`
(dev server only; add a `@ivue-no-hmr` comment to opt a file out).

**Manually** — three lines at the bottom of a class module:

```ts
import { ivueHotUpdate, Reactive } from 'ivue';

export namespace Player {
  export const $Class = $Player;
  export const Class = Reactive($Player);
  export type Instance = typeof Class.Instance;
}

if (import.meta.hot) {
  import.meta.hot.accept((mod) => ivueHotUpdate?.(import.meta.hot, mod));
}
```

A bare `import.meta.hot.accept()` also works — behavior edits still hot-swap;
you only lose the automatic remount for constructor edits.

## How it works

The runtime contract mirrors Vue's own component HMR — stable identity,
self-accepting modules, an upgrade procedure for live instances — applied at
class granularity:

1. **One identity, forever.** The first `Reactive(Class)` registration is
   canonical. When your edited module re-executes, its fresh class is treated
   as a _donor_: its members are re-processed onto the canonical prototype
   (`hmrGraft`), and `Reactive()` returns the same identity it always has.
   Two class objects for one declaration cannot exist — not even across hot
   updates — so stale-class ghosts are impossible by construction.
2. **State survives because cache keys survive.** Per-instance refs are
   cached under per-`(prototype, key)` symbols, and grafts _reuse_ them: your
   live refs, computeds and effect scopes carry straight through.
3. **Even old bound references run new code.** Method calls route through
   per-key slots (dev only), so a handler you registered with
   `addEventListener` — or handed to a scroller, a timer, a debounce — stays
   referentially valid _and_ executes the grafted implementation immediately.
4. **New instances always get the newest constructor.** `Reactive()` returns
   a construct-trap proxy (dev only) that builds instances with the latest
   donor's constructor while keeping the canonical prototype.
5. **Constructor edits escalate honestly.** A graft can't rewire a living
   instance's constructor work (watchers, listeners, field values), so the
   graft diffs a constructor-level signature; on change, `ivueHotUpdate`
   invalidates the module and your framework remounts _just the owning
   components_ — which rebuild through the trap with the new constructor.
   The page itself never reloads.

Unsafe grafts refuse loudly and degrade to reload-needed, never corruption:
inheritance chains aren't grafted, and two unrelated same-named classes are
detected (pass an explicit id — `Reactive(Class, 'my/stable-id')` — if you
genuinely have name collisions).

## Production pays nothing

Every HMR call site is gated on the statically-replaceable
`import.meta.env.DEV`, so production bundles contain **zero** HMR machinery —
no registry, no proxy, no slots, no graft. This is verified by building and
grepping `dist/`, not assumed. In tests and SSR, `Reactive()` keeps its
classic contract untouched: same class in, same class out.

## Honest boundaries

- **Ref-getter initializer edits apply forward-only.** Live state is
  deliberately preserved; remount (navigate away/back) when you want the new
  initial value on the current screen.
- **Computeds with inlined logic can't be grafted** — the computed object
  (and its closure) is cached per instance. The engine *detects* such edits
  and automatically remounts the owners instead of leaving live instances
  silently stale. Thin computeds that delegate to methods — already the
  ivue convention — graft live with state preserved, because the closure is
  just a pointer: `computed(() => this.recalc())` picks up a new `recalc`
  instantly. The rule underneath: **closures freeze at creation; prototype
  lookups stay live.** Keep logic where lookups can reach it.
- **"Unthinning" is safe.** Moving logic from a method back into a computed
  (deleting the method) is the nastiest edit shape: the old closure cached
  on live instances still calls the deleted method. Removed members are
  therefore tombstoned — the last implementation stays reachable until the
  automatic remount converges — so this never throws.
- **Changing a member's kind** (method ↔ getter) re-keys its per-instance
  cache and remounts the owners — a cached bound method is not a ref, and
  vice versa.
- **Native `#private` fields** are brand-checked per class declaration and
  don't mix with grafting — use TypeScript `private` (the ivue convention).
- **Inheritance chains** currently escalate instead of grafting.

## Field notes

This system was built and verified live inside a production reader
application: an instance parked **4.1 million pixels deep** into a
99,925-paragraph document survived four consecutive hot updates — same
object, scroll position and measured-layout state intact, event listeners
running new code each time — and a constructor edit remounted exactly one
component while its parent (and the page) never blinked. The unit suite
covers graft semantics, bound-reference continuity, escalation
discrimination, and the refusal paths.

One practical note from that battlefield: HMR is a _pipeline_ — editor →
file watcher → dev-server websocket → module accept → ivue graft. If edits
don't arrive at all, check the front of the pipe first: bind-mounted Docker
setups usually need `server.watch.usePolling`, and Vite's DNS-rebinding
protection (`server.allowedHosts`) must include any custom dev hostnames or
the HMR websocket is silently rejected while pages load fine.
