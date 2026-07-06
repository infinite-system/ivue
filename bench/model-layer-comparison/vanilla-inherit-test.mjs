// Does a hand-rolled, getter/setter-based dirty-flag class compose across
// `extends`/`super` the way Angular's field-declared computed() does not?
// Structurally yes — getters live on the prototype, so super.total resolves.
// SAFELY, though, is a different question: run this file to see a stale-
// value bug appear on the first honest attempt at writing the composition —
// not a contrived example, the actual first draft of this script.

console.log(
  '--- naive attempt: composes structurally, but silently goes stale ---',
);
{
  class Base {
    #a = 1;
    #total = 0;
    #totalDirty = true;
    get a() {
      return this.#a;
    }
    set a(v) {
      this.#a = v;
      this.#totalDirty = true;
    }
    get total() {
      if (this.#totalDirty) {
        this.#total = this.#a + 10;
        this.#totalDirty = false;
      }
      return this.#total;
    }
  }
  class Sub extends Base {
    #b = 2;
    #total2 = 0;
    #totalDirty2 = true;
    get b() {
      return this.#b;
    }
    set b(v) {
      this.#b = v;
      this.#totalDirty2 = true;
    }
    // Composes structurally — super.total works, unlike a field.
    // But Sub's cache only knows about ITS OWN dependency (#b); it has no
    // idea `total` transitively depends on Base's `a` too.
    get total() {
      if (this.#totalDirty2) {
        this.#total2 = super.total + this.#b + 100;
        this.#totalDirty2 = false;
      }
      return this.#total2;
    }
  }

  const s = new Sub();
  console.log('s.total =', s.total, '(expect 113 = 1 + 10 + 2 + 100)');
  s.a = 5;
  console.log(
    'after s.a = 5, s.total =',
    s.total,
    '(expect 117 — got the STALE cached value: Sub never learned that a Base-level write should invalidate ITS cache too)',
  );
}

console.log(
  '\n--- corrected: every setter that feeds an inherited derivation must be re-overridden to propagate invalidation ---',
);
{
  class Base {
    #a = 1;
    #total = 0;
    #totalDirty = true;
    get a() {
      return this.#a;
    }
    set a(v) {
      this.#a = v;
      this.#totalDirty = true;
    }
    get total() {
      if (this.#totalDirty) {
        this.#total = this.#a + 10;
        this.#totalDirty = false;
      }
      return this.#total;
    }
  }
  class Sub extends Base {
    #b = 2;
    #total2 = 0;
    #totalDirty2 = true;
    get b() {
      return this.#b;
    }
    set b(v) {
      this.#b = v;
      this.#totalDirty2 = true;
    }
    // Extra ceremony required for correctness: re-declare the setter for
    // EVERY inherited field this derivation transitively depends on, purely
    // to propagate invalidation down to this level's cache.
    set a(v) {
      super.a = v;
      this.#totalDirty2 = true;
    }
    get total() {
      if (this.#totalDirty2) {
        this.#total2 = super.total + this.#b + 100;
        this.#totalDirty2 = false;
      }
      return this.#total2;
    }
  }

  const s = new Sub();
  console.log('s.total =', s.total, '(expect 113)');
  s.a = 5;
  console.log(
    'after s.a = 5, s.total =',
    s.total,
    '(expect 117 — now correct, at the cost of re-wiring every inherited dependency by hand)',
  );
}
