import { computed, ref, Ref, ComputedRef, reactive, watch } from 'vue';
import { defaultEntityFields } from './bigObject';

type Child = ReturnType<typeof useItem>;

export const useItem = (
  props: { id: number },
): any => {
  // A computed property

   // 1. Create the 'self' object with ONLY the 'raw state'.
  //    (These are the class fields).

  const id = props.id;
  const width = ref(Math.random() * 100);
  const height = ref(Math.random() * 100);
  const width2 = ref(Math.random() * 100);
  const height2 = ref(Math.random() * 100);
  const width3 = ref(Math.random() * 100);
  const height3 = ref(Math.random() * 100);
  const bigObject = ref(defaultEntityFields);


  // 2. Create the computeds and methods that *refer* to 'self'.
  //    (This is what the compiler would do with 'get area()' and 'update()').
  //    Our compiler rewrites 'this.width' to 'self.width'.

    const area = computed(() => width.value * height.value);
    const area2 = computed(() => width2.value * height2.value);
    const area3 = computed(() => width3.value * height3.value);
    const update = () => {
      width.value = Math.random() * 100;
    };
    const update2 = () => {
      width2.value = Math.random() * 100;
    }
    const update3 = () => {
      width3.value = Math.random() * 100;
    }
    const update4 = () => {
      height.value = Math.random() * 100;
    }
    const update5 = () => {
      height2.value = Math.random() * 100;
    }
    const update6 = () => {
      height3.value = Math.random() * 100;
    }
    const update7 = () => {
      width.value = Math.random() * 100;
    }
    const update8 = () => {
      width2.value = Math.random() * 100;
    }
    const update9 = () => {
      width3.value = Math.random() * 100;
    }

    const createAlert = (v: number) => {
      alert('New Width:' + v);
    }

    const funcTest = () => {
      return Math.random() * 100;
    }

    // watch(width, createAlert);

  return {
    id,
    width,
    height,
    width2,
    height2,
    width3,
    height3,
    bigObject,
    createAlert,
    area,
    area2,
    area3,
    update,
    update2,
    update3,
    update4,
    update5,
    update6,
    update7,
    update8,
    update9,
    funcTest,
  };
};
