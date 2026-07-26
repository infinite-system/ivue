import { describe, expect, it } from 'vitest';
import { Static } from '../Static';

describe('Static', () => {
  it('returns a subclass and leaves the raw class untouched', () => {
    class $Mailer {
      static send(message: string) {
        return `sent:${message}`;
      }
    }

    const Mailer = Static($Mailer);

    expect(Mailer).not.toBe($Mailer);
    expect(Object.getPrototypeOf(Mailer)).toBe($Mailer);
    // the raw class keeps its plain data-property descriptor
    const rawDescriptor = Object.getOwnPropertyDescriptor($Mailer, 'send')!;
    expect(typeof rawDescriptor.value).toBe('function');
    expect(rawDescriptor.get).toBeUndefined();
  });

  it('binds methods lazily with stable identity, safe to detach', () => {
    class $Counter {
      static total = 0;
      static bump() {
        this.total++;
        return this.total;
      }
    }

    const Counter = Static($Counter);
    const firstRead = Counter.bump;

    expect(Counter.bump).toBe(firstRead); // cached after first access
    const detached = Counter.bump;
    expect(detached()).toBe(1); // `this` survives detachment
    expect(Counter.total).toBe(1);
  });

  it('walks the static inheritance chain; child overrides win', () => {
    class $Base {
      static describe() {
        return 'base';
      }
      static inheritedOnly() {
        return 'inherited';
      }
    }
    class $Child extends $Base {
      static describe() {
        return 'child';
      }
    }

    const Child = Static($Child);
    const describe = Child.describe;
    const inheritedOnly = Child.inheritedOnly;

    expect(describe()).toBe('child');
    expect(inheritedOnly()).toBe('inherited');
  });

  it('skips non-function statics and preserves enumerability', () => {
    class $Config {
      static baseUrl = 'https://example.test';
      static resolve(path: string) {
        return this.baseUrl + path;
      }
    }

    const Config = Static($Config);

    expect(Config.baseUrl).toBe('https://example.test');
    // class static methods are non-enumerable by construction — the lazy
    // accessor and the materialized bound method must both preserve that
    const before = Object.getOwnPropertyDescriptor(Config, 'resolve')!;
    expect(before.enumerable).toBe(false);
    Config.resolve; // materialize the bound method
    const after = Object.getOwnPropertyDescriptor(Config, 'resolve')!;
    expect(after.enumerable).toBe(false);
    expect(Config.resolve('/path')).toBe('https://example.test/path');
  });

  it('binds `this` to the wrapped class, so statics compose', () => {
    class $Report {
      static header() {
        return 'HEADER';
      }
      static render() {
        return `${this.header()}|body`;
      }
    }

    const Report = Static($Report);
    const render = Report.render;

    expect(render()).toBe('HEADER|body');
  });
});

describe('Static $-cached getters', () => {
  it('computes a $-getter exactly once per receiver', () => {
    let computeRuns = 0;

    class $Palette {
      static get $tokens() {
        computeRuns++;
        return { accent: 'cyan' };
      }
    }

    const Palette = Static($Palette);
    const firstRead = Palette.$tokens;

    expect(Palette.$tokens).toBe(firstRead); // same object, cached
    expect(Palette.$tokens.accent).toBe('cyan');
    expect(computeRuns).toBe(1);
  });

  it('is order-correct: parent read first, child override still wins', () => {
    class $Momentum {
      static get friction() {
        return 2; // a live knob — subclasses pinch it
      }
      static get $atRest() {
        return { velocity: 0, threshold: this.friction * 10 };
      }
    }

    const Momentum = Static($Momentum);
    class TunedMomentum extends Momentum {
      static override get friction() {
        return 7;
      }
    }

    // PARENT reads first — the hand-rolled self-replacement idiom
    // caches on the parent here and silently shadows the child forever
    expect(Momentum.$atRest.threshold).toBe(20);
    expect(TunedMomentum.$atRest.threshold).toBe(70); // child derives itself
    expect(TunedMomentum.$atRest).not.toBe(Momentum.$atRest);
  });

  it('is order-correct: child read first, parent unaffected', () => {
    let computeRuns = 0;

    class $Momentum {
      static get friction() {
        return 2;
      }
      static get $atRest() {
        computeRuns++;
        return { threshold: this.friction * 10 };
      }
    }

    const Momentum = Static($Momentum);
    class TunedMomentum extends Momentum {
      static override get friction() {
        return 7;
      }
    }

    expect(TunedMomentum.$atRest.threshold).toBe(70); // CHILD reads first
    expect(Momentum.$atRest.threshold).toBe(20);
    expect(computeRuns).toBe(2); // once per receiver, never shared
  });

  it('freezes cached values — mutation throws instead of corrupting', () => {
    class $Config {
      static get $defaults() {
        return { width: 80 };
      }
    }

    const Config = Static($Config);
    const defaults = Config.$defaults;

    expect(Object.isFrozen(defaults)).toBe(true);
    expect(() => {
      (defaults as any).width = 120;
    }).toThrow(TypeError);
    expect(Config.$defaults.width).toBe(80);
  });

  it('caches primitive results too', () => {
    let computeRuns = 0;

    class $Layout {
      static get $gutterWidth() {
        computeRuns++;
        return 4;
      }
    }

    const Layout = Static($Layout);

    expect(Layout.$gutterWidth).toBe(4);
    expect(Layout.$gutterWidth).toBe(4);
    expect(computeRuns).toBe(1);
  });

  it('leaves non-$ getters live — knobs re-read every time', () => {
    let reads = 0;

    class $Driver {
      static get retainedLimit() {
        reads++;
        return 96;
      }
    }

    const Driver = Static($Driver);
    Driver.retainedLimit;
    Driver.retainedLimit;

    expect(reads).toBe(2); // no caching without the $ prefix
  });

  it('leaves accessor pairs with a setter untouched', () => {
    class $Tunable {
      static backing = 1;
      static get $level() {
        return this.backing;
      }
      static set $level(value: number) {
        this.backing = value;
      }
    }

    const Tunable = Static($Tunable);
    Tunable.$level = 5;

    expect(Tunable.$level).toBe(5); // still the live pair, not a cache
    Tunable.$level = 9;
    expect(Tunable.$level).toBe(9);
  });

  it('a subclass overriding the $-getter itself wins', () => {
    class $Theme {
      static get $accent() {
        return 'blue';
      }
    }

    const Theme = Static($Theme);
    expect(Theme.$accent).toBe('blue');

    class DarkTheme extends Theme {
      static override get $accent() {
        return 'violet';
      }
    }

    // the subclass's own getter descriptor shadows the caching wrapper
    expect(DarkTheme.$accent).toBe('violet');
    expect(Theme.$accent).toBe('blue');
  });

  it('walks the raw inheritance chain — ancestor $-getters cache per receiver', () => {
    class $Base {
      static get scale() {
        return 1;
      }
      static get $metrics() {
        return { unit: this.scale * 8 };
      }
    }
    class $Wide extends $Base {
      static override get scale() {
        return 3;
      }
    }

    const Wide = Static($Wide);

    expect(Wide.$metrics.unit).toBe(24); // derived through the override
    expect(Wide.$metrics).toBe(Wide.$metrics); // and cached
  });
});
