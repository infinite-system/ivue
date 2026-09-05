---
title: Backend ivue
description: ivue on servers — reactive domain models, structurally correct caches, live queries over SSE/WebSocket, and config that propagates instead of restarting. No DOM, no renderer, same classes.
relatedPosts: [reactivity-is-an-allocator, what-becomes-buildable, module-level-state]
---

# Backend ivue — the same invariant on a server

Nothing in ivue mentions a screen. The engine sits on `@vue/reactivity` —
a standalone dependency-graph library — and `Reactive()` transforms class
prototypes, not components. The "Vue" everyone associates with browsers is
the renderer, which ivue never touches. Importing `vue` in a DOM-less
Node/Bun process is fine: `runtime-dom` touches `document` only when you
`createApp().mount()`, which a backend never calls.

That makes ivue a **server domain-model layer**: reactive state with class
ergonomics, running headless.

> The proof is not hypothetical. [Invar](/examples/invar) — a
> full terminal IDE — is hundreds of ivue classes running in a Bun process
> with no DOM: file watchers, search engines, undo coordinators, PTY
> servers. Its headless services (a warm app server for agent driving, an
> SSH channel server) are backend ivue in production shape.

## Why a reactivity graph belongs on a server

The chronic backend failure modes — stale caches, forgotten invalidation,
leaked subscriptions, config drift after reload — are all one defect:
**someone stored a derived value and then had to _remember_ to update
it.** A reactivity graph deletes the remembering. Derived state is never
stored; it is computed from tracked sources, and effects fire exactly when
their inputs change.

An Express app is, in large part, a pile of "when X changes, remember to
update Y" written by hand. ivue makes forgetting impossible, because Y was
never stored.

And the cost model transfers with it: computeds are lazy and
observation-priced, so the unpolled health endpoint and the unqueried
cache cost **nothing** at rest. The engine core (alien-signals push-pull
propagation) stops cascades the moment a computed re-evaluates equal —
the right shape for servers, where high-frequency writes (request
counters, queue depths) feed mostly-stable deriveds.

## Pattern 1 — config that propagates instead of restarting

```ts
import { Reactive } from 'ivue';
import { ref, watchEffect } from 'vue';

class $ServerConfig {
  get raw() {
    return ref<RawConfig>(loadConfigFile());
  }

  // Derived config is PLAIN getters — always current, zero storage.
  get databaseUrl() {
    return this.raw.value.database.url;
  }
  get rateLimit() {
    return this.raw.value.limits.requestsPerMinute;
  }

  reload() {
    this.raw.value = loadConfigFile(); // one write; the graph does the rest
  }
}

export namespace ServerConfig {
  export const $Class = $ServerConfig;
  export let Class = Reactive($Class);
}

const config = new ServerConfig.Class();
fs.watch(CONFIG_PATH, () => config.reload());

// Reprovision the pool when — and only when — the URL actually changes.
watchEffect(() => reconnectPool(config.databaseUrl));
```

Every consumer reads `config.rateLimit` as a plain getter and is always
current. The "hot reload subsystem" collapses into the dependency graph
you already have.

## Pattern 2 — caches whose invalidation is structural

A `computed()` over source state is a cache that invalidates exactly when
its inputs change — never stale, never over-flushed, lazy until read.

For **keyed** data (users by id, tenants by name), use the
[Keyed Version Signals](/guide/keyed-version-signals) shape: plain Maps
of refs, get-or-create on read, peek-only bump on write.

```ts
class $PermissionsCache {
  protected readonly userVersions = new Map<UserId, Ref<number>>();

  /** WRITE path: peek-only — unobserved users allocate nothing. */
  invalidateUser(userId: UserId) {
    const versionRef = this.userVersions.get(userId);
    if (versionRef) versionRef.value++;
  }

  /** READ path: get-or-create, then subscribe. */
  protected trackUser(userId: UserId) {
    let versionRef = this.userVersions.get(userId);
    if (!versionRef) {
      versionRef = ref(0);
      this.userVersions.set(userId, versionRef);
    }
    void versionRef.value;
  }

  get matrixFor() {
    return (userId: UserId) => {
      this.trackUser(userId);
      return buildPermissionMatrix(userId); // re-derives only after a bump
    };
  }
}
```

Write to user #42 and only computations that read user #42 recompute — on
their next read, not eagerly. This is the hand-rolled `dirty` flag that
someone always forgets to set, made unforgettable.

## Pattern 3 — live queries over SSE/WebSocket

The highest-leverage pattern: a subscription is an effect, and the effect
_tracked whatever the query read_.

```ts
import { effectScope, watchEffect } from 'vue';

function subscribe(socket: WebSocket, query: () => unknown) {
  const scope = effectScope();
  scope.run(() => {
    watchEffect(() => {
      socket.send(JSON.stringify(query())); // tracks every leaf it reads
    });
  });
  socket.on('close', () => scope.stop()); // ALL watchers die in one call
}
```

Any mutation touching the leaves that query read re-runs the effect and
pushes the update — a live-query engine (the thing realtime platforms
sell) in a dozen lines. And the part that is usually a leak farm —
per-connection teardown — is one `scope.stop()`.

Coalesce at the effect boundary (batch the push, debounce the
reprovision): dispatch is nanoseconds, but effects are your code, and
backend triggers arrive at network rate, not keystroke rate.

## Pattern 4 — operational state that reports itself

Health endpoints read plain getters over live counters. A circuit breaker
is a watcher flipping a ref, and every request path that reads
`isAvailable` sees it instantly — no event bus, no polling loop.

```ts
class $UpstreamHealth {
  get failureRate() {
    return ref(0);
  }
  get tripped() {
    return ref(false);
  }

  get isAvailable() {
    return !this.tripped.value;
  }

  constructor() {
    this.$watch(
      () => this.failureRate.value,
      (rate) => this.onRateChanged(rate),
    );
  }

  onRateChanged(rate: number) {
    if (rate > 0.5) this.tripped.value = true;
  }
}
```

## The discipline that changes: every instance is an outliving instance

On a server there is **no component scope to reap anything**. The rules
from [Lifecycle & Teardown](/guide/lifecycle-teardown) apply everywhere,
not just to singletons:

- Watchers go through `this.$watch` / `this.$watchEffect` (the instance's
  own scope) or an explicit `effectScope` you own — never bare `watch`
  hoping something cleans up.
- Every instance has a **disposal owner** that calls `$stopEffects()`
  (or `scope.stop()`), usually tied to the resource lifetime it serves:
  a connection, a job, a tenant session.
- Async results need **generation tokens**: a query result can arrive
  after the state it described has changed. Stamp requests, reject stale
  callbacks.

These rules were not invented for the backend — they were forced early by
running an entire IDE outside the browser. They transfer verbatim.

## The boundary: one process

The graph is per-process, in-memory. It does not replace Redis or your
queue — it sits **behind** one server's slice of them: a pub/sub
subscriber bumps refs on incoming messages, and reactivity fans out
locally to every derived value, cache, and live subscription on that
node. Cross-process propagation is the substrate's job; in-process
propagation is where the hand-written "remember to update" code lived,
and that is what the graph deletes.

## Where this sits in the ecosystem

In-process reactive server state has one aging precedent (MobX domain
models on Node), one adjacent-but-different paradigm (RxJS — event-stream
composition, not derived state), and industrial-strength proofs in other
languages (Jane Street's Incremental, rust-analyzer's salsa). The
database-layer cousins (incremental view maintenance, realtime sync
platforms) sell the same invariant as infrastructure, at infrastructure
cost. ivue occupies the unclaimed middle: **class-grammar signals for
server domain models, with the lifecycle discipline already worked out,
on the fastest signal core in the JavaScript ecosystem** — Vue 3.6's
reactivity, rewritten on [alien
signals](https://github.com/stackblitz/alien-signals), which ivue rides
unchanged ([196/196 tests on the 3.6 release candidate, first tracked
reads ~1.6× faster](/blog/the-stack-got-faster)).

## See it running

- [Invar — Terminal IDE](/examples/invar) — 108,000 lines of it in production.
