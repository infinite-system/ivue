import { computed, ref, shallowRef, watch, WritableComputedRef } from 'vue';
import { Reactive } from '../../lib/Reactive';
import { useMouse } from '@vueuse/core';

import { defaultEntityFields } from './bigObject';
import { Parent, parentSomething } from './ParentClass';

export const test = ref({
  value: {
    value: 12,
  },
});
test.value.value.value = 34;
export const test2 = {
  value: ref({
    value: {
      value: 12,
    },
  }),
};
test2.value.value.value.value = 34;

class $UseItem extends Parent.$Class {
  constructor(props: { id: number }) {
    super();
    this.id = props.id;
    // watch(this.height, this.createNewAlert);
  }

  id: number;

  parentSomething2 = parentSomething;

  private get $mouse() {
    return useMouse();
  }

  get x() {
    return this.$mouse.x;
  }

  get y() {
    return this.$mouse.y;
  }

  get parentSomething() {
    return parentSomething;
  }

  get width() {
    return shallowRef(Math.random() * 100);
  }

  get height() {
    return ref(Math.random() * 100);
  }

  get width2() {
    return ref(Math.random() * 100);
  }

  get height2() {
    return ref(Math.random() * 100);
  }

  get width3() {
    return ref(Math.random() * 100);
  }

  get height3() {
    return ref(Math.random() * 100);
  }

  get bigObject() {
    return ref(defaultEntityFields);
  }

  get area() {
    return computed({
      get: () => {
        return (
          this.width.value * this.height.value +
          ' super:' +
          '[' +
          (super.area.value + super.area.value) +
          '] '
        );
      },
      set: (val: number) => {
        this.height.value = val * 100000;
      },
    });
  }

  funcTest() {
    return Math.random() * 100;
  }

  get area2() {
    return computed(() => this.width2.value * this.height2.value);
  }

  get area3() {
    return computed(() => this.width3.value * this.height3.value);
  }

  // get test() {
  //   return Math.random() * 100;
  // }

  // A method
  update() {
    super.update();
    this.width.value = Math.random() * 100;
    this.value.value += 1;
    this.grandValue.value += 5;
    return true;
  }

  update2() {
    this.width2.value = Math.random() * 100;
  }

  update3() {
    this.width3.value = Math.random() * 100;
  }
  update4() {
    this.width.value = Math.random() * 100;
  }

  update5() {
    this.width2.value = Math.random() * 100;
  }

  update6() {
    this.width3.value = Math.random() * 100;
  }
  update7() {
    this.width.value = Math.random() * 100;
  }

  update8() {
    this.width2.value = Math.random() * 100;
  }

  update9() {
    this.width3.value = Math.random() * 100;
  }

  createAlert(v: number) {
    alert(v);
  }

  get inheritTest() {
    return super.inheritTest + ' + extended in UseItem ' + this.width.value;
  }

  get yo() {
    return computed(() => {
      return 'yo value is ' + Math.random();
    });
  }

  set yo(v:any) {
    console.log('setting yo', v);
  }
}

export namespace UseItem {
  // Raw class
  export const $Class = $UseItem;
  export type $Instance = InstanceType<typeof $Class>;

  // Reactive class
  export const Class = Reactive($UseItem);
  export type Instance = typeof Class.Instance;
}
