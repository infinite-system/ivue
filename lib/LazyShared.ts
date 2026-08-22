/**
 * `LazyShared<T>` — the safe shared-store cell for static classes.
 *
 * The static-class split (see `Static()`): `$`-prefixed static getters
 * are compute-once-PER-RECEIVER caches — perfect for memos and per-class
 * tuning, where a subclass forking its own copy is the feature. A SHARED
 * store (a registry, a ledger) must never live there: per-receiver
 * caching means a subclass reading `this.$store` silently forks the
 * registry. The fix is a `static readonly` FIELD — one reference on the
 * declaring class, inherited, never receiver-cached — but an eager field
 * initializer runs at MODULE LOAD, so it may only hold dependency-free
 * values; the moment it constructs another namespace's class it races
 * import cycles.
 *
 * `LazyShared` closes the triangle. The field eagerly stores the CELL
 * (load-safe — a thunk evaluates nothing), the thunk runs on first
 * `.value` read (cycle-safe — every module in any import cycle has
 * finished loading), and memoization mutates cell-internal state
 * (fork-safe — no receiver, subclass included, can fork it):
 *
 *   class $SearchRegistry {
 *     protected static readonly sharedBackend = new LazyShared(
 *       () => new SearchBackend.Class(),
 *     );
 *     protected static get $backend() {
 *       return this.sharedBackend.value; // the field IS the pin
 *     }
 *   }
 *
 * A thunk that reads its own cell (directly or through another cell)
 * throws a NAMED cycle error instead of a bare stack overflow, and a
 * failed construction leaves the cell retryable, never poisoned.
 *
 * Ships from `ivue/extras` (not the reactive core) so the primary `ivue`
 * entry stays minimal.
 */
export class LazyShared<T> {
  constructor(private readonly make: () => T) {}

  private constructed = false;
  private constructing = false;
  private stored: T | null = null;

  get value(): T {
    if (!this.constructed) {
      if (this.constructing) {
        throw new Error(
          'LazyShared thunk cycle: this cell is read inside its own ' +
            'construction. Break the dependency between the two thunks.',
        );
      }
      this.constructing = true;
      try {
        this.stored = this.make();
        this.constructed = true;
      } finally {
        this.constructing = false;
      }
    }
    return this.stored as T;
  }

  /**
   * Drop the constructed value; the next read constructs again. For
   * tests and process recomposition — production code never resets.
   */
  reset(): void {
    this.constructed = false;
    this.stored = null;
  }
}
