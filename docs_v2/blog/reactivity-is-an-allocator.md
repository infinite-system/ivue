---
title: 'Reactivity is an allocator'
description: The industry uses reactivity to update pixels. Invar points it at the operating system — SQLite connections, git subprocesses, LSP servers, sampling timers all exist only while observed. One file system watcher, twenty-one watch sites, ninety-two version signals, and a pull floor under every notify channel. Rendering was just reactivity's first job.
date: 2026-08
tags: [invar, architecture, performance]
relatedPosts: [introducing-invar, patterns-the-author-never-wrote, what-becomes-buildable, the-zeros-didnt-move, computed-is-a-cache]
---

# Reactivity is an allocator

<BlogPostDate />

![Reactivity is an allocator](/blog/reactivity-is-an-allocator.png)

Ask the industry what reactivity is for and the answer is unanimous:
keeping the screen in sync with the data. Signals, stores, virtual
DOMs — the entire apparatus points at pixels.

Here is a different use. In [Invar](/blog/introducing-invar), whether
a SQLite database connection **exists** is decided by two refs — the
dock panel's visibility and its active tab:

```ts
isPainted: () => activeHost.visible.value
             && activeHost.activeContent?.id === contribution.content.id,
```

Open the database pane and a connection materializes. Switch tabs and
it is disposed — not hidden, not pooled: *closed*. The same regime
governs git subprocesses, language-server processes, sampling timers,
and animation heartbeats across the codebase. Reactivity is not
painting this application. It is *allocating* it.

## The inversion: the OS layer is not reactive

The naive version of "reactive backend" wraps the file system in
refs — every path a signal, every directory listing observable. Invar
does the opposite, and the opposite is the finding:

The `Files` capability class — the single home of every file system
call — holds **zero refs and zero state**. The git file watcher owns
`FSWatcher` handles and timers and **never touches a ref**. The PTY
layer `dlopen`s `libc` for raw file-descriptor work — reads, writes,
`ioctl` — with no reactivity anywhere in sight. The operating-system
boundary is imperative, synchronous, and plain.

> Reactivity is not the plumbing here. It is the government. Ground
> truth stays imperative at the bottom; the reactive graph decides,
> from above, what exists, what is fresh, and what is believed.

![Two tiers: the reactive graph above decides what exists; the OS floor below stays plain and synchronous — threads drop down to allocate, dispose, command](/blog/art/reactivity-is-an-allocator-diagram-1.png)

Those three decisions — exists, fresh, believed — are three idioms,
and every backend module composes the same three.

## Idiom one: the revision bridge — what is fresh

The project contract states it flatly: *ground truth is compact and
non-reactive at rest* — plain `Map`s, `Set`s, typed arrays. Refs are
**sparse version signals, not value holders**. The bridge from
OS-land into the graph is one move, used everywhere:

```ts
// The imperative owner mutates plain ground truth, then bumps ONE
// counter. Reactive getters subscribe with a read they discard:
get diagnosticCount(): number {
  void this.diagnosticsRevision.value; // subscribe — value unused
  let count = 0;
  for (const batch of this.diagnosticBatches.values()) {
    count += batch.items.length;
  }
  return count;
}
```

Counted across Invar's source (2026-08-11): **92 revision-bump
sites** and **19** of those `void …Revision.value` subscribe
prologues. No diagnostic is a ref. No terminal cell is a ref. No
blame line is a ref. The graph tracks *that something changed*;
the values stay in structures sized for the data.

The worked example is the blame cache. Showing "who last touched
this line" in the status bar has a brutal constraint: a cursor move
must be instant, but `git blame` is a subprocess. The resolution is
that the *disk already publishes a version signal* — the file's
modification time — and the cache subscribes to it by `stat`:

```ts
lineBlame(documentPath: string, lineNumber: number): BlameLine | null {
  void this.revision.value;                          // reactive subscribe
  const mtimeMs = this.statMemoizedMtime(documentPath); // ≤ 1 stat / 30 ms
  const cached = this.cache.get(documentPath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.lines.get(lineNumber + 1) ?? null; // pure cache hit
  }
  void this.loadBlame(documentPath, mtimeMs);        // fire-and-forget spawn
  return null;
}
```

A save bumps the mtime, so the cache invalidates *exactly* when the
file changes on disk; a cursor move is a pure hit. Sixteen files at
most, least-recently-used out; an unblamable file caches an **empty**
map at that mtime, so the negative answer never re-spawns per frame.
One subprocess per file per change — reactivity decides when the
answer is stale, the OS's own metadata says so, and nothing polls.

## Idiom two: observation owns the resource — what exists

The database pane from the opening, in full:

```ts
constructor(
  protected readonly workspace: Workspace.Model,
  protected readonly isObserved: () => boolean, // bottoms out in two refs
) {
  this.$watch(
    () => this.isObserved(),
    (isObserved) => this.observationChanged(isObserved),
    { immediate: true },
  );
}

observationChanged(isObserved: boolean): void {
  if (isObserved) {
    void this.refresh();          // connect, describe, publish
  } else {
    this.invalidateRequests();    // stamp every in-flight answer stale
    this.releaseConnection();     // the OS resource is CLOSED
  }
}
```

The same shape runs the monitoring pane (its sampling `setInterval`
exists only while the pane is painted — the contract is titled *"the
monitor names its own cost and pays it only when observed"*, and the
cheap reading is measured at 0.17–0.24 ms against a gated 5 ms
budget) and the tasks dashboard, which sharpens it further: its
60 fps animation heartbeat requires not just a visible pane but a
**spinner inside the painted window**. Five hundred tasks with one
visible spinner cost one timer. Zero visible spinners cost none.

> A hidden pane owns no timer. A closed dock owns no connection. An
> unopened terminal owns no file descriptor. Cost tracks the
> observed set — not the feature set.

Lifecycle hooks could approximate this, and every framework has
them. The difference is that a lifecycle hook fires on *component*
events; the predicate here is *composed state* — visibility AND
active tab AND painted window AND content that moves — and it reacts
when any input changes, because it is just a tracked read. You
cannot forget to handle a transition; there is no list of
transitions to handle.

## Idiom three: the late answer — what is believed

Every backend result is asynchronous, and the project contract
names the danger precisely: *an async result can outlive the state
it described*. The pane that requested a connection may be hidden by
the time the connection opens. The discipline: stamp every request
with a generation, and guard the *write*, not the call:

```ts
const connection = await provider.connect({ identifier, filePath });
const descriptions = await connection.describe(null);
if (
  generation !== this.refreshGeneration ||   // a newer request superseded us
  !this.isObserved() ||                      // the pane hid mid-flight
  this.providers.resolve('database') !== provider // the plugin hot-swapped
) {
  connection.dispose(); // the connection that JUST OPENED is closed, unpublished
  return;
}
this.connection = connection;
```

Three independent staleness axes — request generation, observation,
provider identity — and the failure mode each prevents is real: a
connection published to a hidden pane leaks; a slow old answer
overwriting a fast new one lies. The git status refresher re-checks
its request id **four times** (after the subprocess, after parsing,
in the catch, in the finally); every LSP semantic request captures
the document revision before its `await` and discards the reply on
mismatch. Stale answers are not errors — they are simply never
believed.

## The floor: a notify channel cannot report its own silence

Now the part that looks backwards until it clicks. This entire
IDE — file tree, editors, git panel, watchers — contains **exactly
one file system watcher**, and it belongs to git. No chokidar, no
recursive watch, no watcher per open file.

The reason is an invariant with teeth: *a notify channel cannot
report its own silence*. A watcher that goes quiet is
indistinguishable from a file system where nothing changed — silence
carries no signature. So no notify channel is ever trusted alone:

> Notify is a latency accelerator over a pull floor — never a
> replacement for it. Correctness comes from periodically re-reading
> ground truth; events only make the common case fast.

The git watcher embodies the whole doctrine. Its events collapse
into one debounced refresh (80 ms) whose *payloads are ignored* — no
correctness rides on which file an event names. Under it, a
reconcile floor re-runs `git status` every five seconds regardless.
Every error path — a failed walk, a dead handle, an unstatable
directory — fails *toward* a refresh. And the invariant is validated
across an unrelated domain: Invar's own build fleet once had a
worker hang for ninety minutes, silently, under notify-only
orchestration — the pull heartbeat that caught it is the same rule
wearing different clothes.

One prerequisite makes a five-second poll livable in an app whose
[renderer sleeps between changes](/blog/the-object-graph-they-took):
the poll compares before it writes. An unchanged `git status` writes
**zero refs** — field-compared, deliberately — so the floor never
wakes a quiescent render loop. Polling for correctness, silence for
the graph. That one compare is why "pull floor" and "demand-driven
rendering" can coexist at all.

## The tally

Add it up and the numbers inverted from what "reactive backend"
suggests (counted 2026-08-11, non-test source):

```
fs watchers in the application:      1   (git — with a 5 s pull floor)
$watch / $watchEffect sites:        21   (in 94,054 lines)
revision-bump sites:                92
void-revision subscribe prologues:  19
isObserved sites:                   29
```

Twenty-one watch sites in ninety-four thousand lines — because push
is reserved for the places a state change must drive an *action*: a
resource opening, a document syncing to a language server, a timer
dying. Everything else is pull — tracked getters, read by
[one coarse frame effect](/blog/the-zeros-didnt-move), asleep until
a signal moves. And all of it runs on the same
[1.1 kB engine](/blog/one-kilobyte-feature) the browser examples
use, under Bun, with [no Vue component in
sight](/guide/backend) — the classes, the refs, and the watch
semantics are the whole runtime.

## Not "wrap the backend in refs"

The inversion deserves its warning label: naive reactivity at the
OS boundary — a ref per path, a watcher per file — buys memory
churn, event storms, and untrustworthy silence. The discipline is
precisely the three idioms *plus* the floor, and the coarse signals
are load-bearing: this works because the graph is sparse.

What survives is the reframe. Reactivity was never really about
pixels — it is a machine for keeping derived state consistent with
ground truth. "This pane's pixels" were merely the first derived
state anyone pointed it at. *Whether this connection should exist*
is derived state. *Whether this cache is fresh* is derived state.
*Whether this answer is still true* is derived state. Point the
machine at the operating system, and it allocates, schedules, and
disbelieves — with the same refs and the same watch it uses to move
a cursor.

Rendering was just reactivity's first job.
