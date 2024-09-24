<script setup lang="ts">
import CounterBasic from '../components/usage/CounterBasic.vue'
</script>

# How it works?

```ts
export function ivue<T extends AnyClass>(
  className: T,
  ...args: InferredArgs<T>
): IVue<T>;
```

The main `ivue()` initializer function uses TypeScript to be able to infer and validate the constrcutor argument types of `AnyClass` and passes those arguments to the constructor of `AnyClass`.

`ivue` allows you to pass any number of arguments into the class `constructor(arg1, arg2, arg3, ...etc)`

`ivue()` initializer function returns an extended Vue 3 `reactive()` object in which getters and setters are internally converted to computeds and adds `.toRefs()` method to the created object. Computeds auto-unwrap themselves when they are accessed as a reactive object property, so the `.value` properties and computeds get flattened in the resulting object and do not require `.value` to be accessed.

`ivue` replicates native JavaScript / TypeScript class implementation by extending descriptors (getters and setters) up the whole prototype ancestors chain thus supporting classical inheritance.

`ivue` aims to be opaque and minimal, just doing the minimum to convert a class to a reactive object, leaving the rest to be implemented using Vue 3 Composition API inside an initializer function called `.init()`
