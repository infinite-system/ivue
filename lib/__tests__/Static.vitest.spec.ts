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
