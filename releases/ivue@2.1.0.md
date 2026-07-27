# ivue@2.1.0 — Static() and the ivue/extras entry

ivue 2.1 adds a second package entry, **`ivue/extras`** — the toolkit
beyond the reactive core. The primary `ivue` entry stays the bare 1.1 kB
engine; extras are paid for only by the code that imports them.

### Added

- **`Static()`** — the static-side sibling of `Reactive()`, for
  **stateless capability classes** (function bags behind a namespace's
  replaceable `Class` slot). It returns a subclass whose visible static
  methods bind lazily with stable identity, so a retained callback — a
  router handler, a watcher, a command — keeps working while the
  namespace slot stays swappable. The raw class is never touched, so it
  remains a clean inheritance foundation.

  ```ts
  import { Static } from 'ivue/extras';

  class $Mailer {
    static send(message: Message) {
      /* ... */
    }
  }

  export namespace Mailer {
    export const $Class = $Mailer; // raw — children `extends` this
    export let Class = Static($Class); // bound — you call this
  }

  const send = Mailer.Class.send; // detachable — `this` stays correct
  ```

  Stateful, reactive instance classes stay with `Reactive()` —
  `Static()` has no instance dimension.

### Changed

- The `require('ivue')` path now resolves to plain CommonJS
  (`dist/index.cjs`); the UMD build is no longer published. Node and
  bundler consumers are unaffected — only direct script-tag usage of
  `dist/index.umd.js` would notice, and the ES module remains available
  on every CDN.

### Measured

Core entry: **1,112 B gzipped** — unchanged; `ivue/extras` adds
**368 B**, imported separately. Tests: 175, at **100% coverage** on
every metric. Subpath resolution verified in both ESM and CJS from a
packed tarball in a fresh consumer repo.
