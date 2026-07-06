// Demonstrates that Angular signal/computed declared as class FIELDS are
// own-properties assigned in the constructor, not prototype members — so
// a subclass redeclaring the same field name clobbers the base's value
// instead of composing with it. Run with: node inherit-test.mjs

import { signal, computed } from '@angular/core';

class Base {
  a = signal(1);
  total = computed(() => this.a() + 10); // "base contribution"
}

class Sub extends Base {
  b = signal(2);
  // Looks like an override; is actually a full replacement — there is no
  // super.total to build on, because fields never touch the prototype.
  total = computed(() => this.b() + 100);
}

const s = new Sub();
console.log('s.total() =', s.total());
console.log(
  'Sub.prototype has own "total"?  ',
  Object.prototype.hasOwnProperty.call(Sub.prototype, 'total'),
);
console.log(
  'instance has own "total"?       ',
  Object.prototype.hasOwnProperty.call(s, 'total'),
);
console.log(
  'Base.prototype has own "total"? ',
  Object.prototype.hasOwnProperty.call(Base.prototype, 'total'),
);
