import { computed, ref, shallowRef, watch, WritableComputedRef } from 'vue';
import { Reactive } from '../../lib/Reactive';
import { useMouse } from '@vueuse/core'

import { defaultEntityFields } from './bigObject';

const test = ref({
  value: {
    value: 12,
  },
});
test.value.value.value = 34;
const test2 = {
  value: ref({
    value: {
      value: 12,
    },
  }),
};
test2.value.value.value.value = 34;

export class $GrandParent {
  get grandValue() {
    return ref(7);
  }

  get awesomeValue() {
    return ref('awesome');
  }
  get area() {
    return computed(() => {
      return this.grandValue.value * 3 + ' grand';
    });
  }
  update() {
    this.awesomeValue.value = 'GRAND AWESOME ' + Math.random();
  }
}
export const GrandParent = Reactive($GrandParent);

class $Parent extends $GrandParent {
  get value() {
    return ref(42);
  }

  get area() {
    return computed(
      () =>
        this.value.value * 2 +
        ' xxx ' +
        '[' +
        (super.area.value + super.area.value) +
        ']'
    );
  }

  get parentValue() {
    return ref('parent value');
  }

  update() {
    super.update();
    this.parentValue.value = 'PARENT VALUE: ' + Math.random();
  }

  createNewAlert(v: number) {
    alert('Parent Alert Height Changed: ' + v);
  }
}
export const Parent = Reactive($Parent);

export class $UseItem extends $Parent {
  constructor(props: { id: number }) {
    super();
    this.id = props.id;
    // watch(this.height, this.createNewAlert);
  }

  id: number;

  get x() {
    const { x } = useMouse();
    return x;
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

  get area2() {
    return computed(() => this.width2.value * this.height2.value);
  }

  get area3() {
    return computed(() => this.width3.value * this.height3.value);
  }

  get test() {
    return Math.random() * 100;
  }

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

  get yo() {
    return 'yo';
  }

  // set yo(v:any) {
  //   console.log('setting yo', v);
  // }
}

export namespace UseItem {
  export const $Class = $UseItem;
  export const Class = Reactive($UseItem);
  export type Instance = typeof Class.Instance;
}
