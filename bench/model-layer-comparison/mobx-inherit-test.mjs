// Does MobX support inheritance? makeAutoObservable — the API MobX's own
// docs recommend by default — refuses outright on any class with a
// superclass. The escape hatch, makeObservable() with explicit per-member
// annotations, does work, but every subclass must re-declare every
// inherited annotation it touches, using `override` for anything the
// parent already annotated. Run with: node mobx-inherit-test.mjs

import {
  makeAutoObservable,
  makeObservable,
  observable,
  computed,
  override,
} from 'mobx';

console.log('--- makeAutoObservable: hard refusal on any superclass ---');
{
  class Base {
    a = 1;
    constructor() {
      makeAutoObservable(this);
    }
    get total() {
      return this.a + 10;
    }
  }
  class Sub extends Base {
    b = 2;
    constructor() {
      super();
      makeAutoObservable(this);
    }
    get total() {
      return super.total + this.b + 100;
    }
  }
  try {
    new Sub();
    console.log('(did not throw — unexpected)');
  } catch (e) {
    console.log('THREW:', e.message.split('\n')[0]);
  }
}

console.log(
  '\n--- makeObservable + explicit override: works, at the cost of re-annotating every level ---',
);
{
  class Base {
    a = 1;
    constructor() {
      makeObservable(this, { a: observable, total: computed });
    }
    get total() {
      return this.a + 10;
    }
  }
  class Sub extends Base {
    b = 2;
    constructor() {
      super();
      makeObservable(this, { b: observable, total: override });
    }
    get total() {
      return super.total + this.b + 100;
    }
  }
  const s = new Sub();
  console.log('s.total =', s.total, '(expect 113 = 1 + 10 + 2 + 100)');
  s.a = 5;
  console.log('after s.a = 5, s.total =', s.total, '(expect 117)');
}
