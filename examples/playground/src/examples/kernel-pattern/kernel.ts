// kernel.ts — the entire plugin system, in one Map.
//
// The idea: construction binds to a NAME, not a class. Code that needs a Tab
// asks the kernel for whatever is registered under 'Tab' and constructs that.
// A plugin re-registers the name with an EXTENDED class — and every future
// construction produces the extension, with `super` chains, reactive state
// and methods all intact, because ivue inheritance is native inheritance.
//
// No DI container, no decorators, no tokens, no reflection metadata. A
// registry is a Map; late binding is a lookup at construction time. This is
// the whole thing.

type AnyClass = abstract new (...args: any[]) => any;

class Kernel {
  #classes = new Map<string, AnyClass>();

  /** Register (or replace) the class a name resolves to. */
  set<T extends AnyClass>(name: string, cls: T) {
    this.#classes.set(name, cls);
  }

  /** The class currently registered under `name`, or the fallback base. */
  get<T extends AnyClass>(name: string, base: T): T {
    return (this.#classes.get(name) as T) ?? base;
  }

  /** Forget every registration — back to the base classes. */
  clear() {
    this.#classes.clear();
  }
}

export const kernel = new Kernel();
