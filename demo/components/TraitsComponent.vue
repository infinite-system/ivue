<script setup>
import { Traits } from '@/index';

class Trait1 {
  get prop () { return 1 }
}

class Trait2 {
  get prop () { return 2 }
}

class Trait3 {
  get prop () { return 3 }
}

class TestTraits {
  prop = 0
}
Traits(TestTraits, [Trait3, Trait2, Trait1])
const t = new TestTraits()
console.log('traits t.prop is 0', t.prop === 0)


class TestTraits2 {}
Traits(TestTraits2, [Trait3, Trait2, Trait1])
const t2 = new TestTraits2()
console.log('traits t2.prop is 3', t2.prop, t2.prop === 3)


class TestTraits3 {
  get prop () { return 0 }
}
Traits(TestTraits3, [Trait3, Trait2, Trait1])
const t3 = new TestTraits3()
console.log('traits t3.prop is 0', t3.prop, t3.prop === 0)


class TestTraits4 {
  set prop (v) { return v }
}
Traits(TestTraits4, [Trait3, Trait2, Trait1])
const t4 = new TestTraits4()
console.log('traits t4.prop is 3', t4.prop, t4.prop === 3)

{
  
  class Trait1 {
    _prop = 1
    get prop () { return 1 }
    set prop (v) { this._prop = v }
  }

  class Trait2 {
    _prop = 2
    get prop () { return this._prop }
  }

  class Trait3 {
    _prop = 3
    get prop () { return this._prop }
  }
  class TestTraits5 {}
  Traits(TestTraits5, [Trait3, Trait2, Trait1])
  const t5 = new TestTraits5()
  t5.prop = 5
  console.log('traits t5.prop is 5', t5.prop, t5.prop === 5)
}

{
  class Trait1 {
    _prop = 1
    get prop () { return 1 }
    set prop (v) { this._prop = v }
  }

  class Trait2 {
    _prop = 2
    get prop () { return this._prop }
  }

  class Trait3 {
    _prop = 3
    get prop () { return this._prop }
  }
  class TestTraits6 {
    set prop (v) { this._prop = 6 }
  }
  Traits(TestTraits6, [Trait3, Trait2, Trait1])
  const t6 = new TestTraits6()
  t6.prop = 5 // should not set to 5 but 6
  console.log('traits t6.prop is 6', t6.prop, t6.prop === 6)
}

{
  class Trait1 {
    _prop = 1
    get prop () { return 1 }
    set prop (v) { this._prop = v }
  }

  class Trait2 {
    _prop = 2
    get prop () { return this._prop }
  }

  class Trait3 {
    _prop = 3
    get prop () { return this._prop }
    set prop (v) { this._prop = 7 }
  }
  class TestTraits {}
  Traits(TestTraits, [Trait3, Trait2, Trait1])
  const t = new TestTraits()
  t.prop = 5 // should not set to 5 but 7
  console.log('traits t7.prop is 6', t.prop, t.prop === 7)
}
</script>
<template>

</template>