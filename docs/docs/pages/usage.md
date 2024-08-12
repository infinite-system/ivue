<style>
  .button { 
    padding: 5px 10px; 
    border-color: var(--vp-custom-block-details-border);
    color: var(--vp-custom-block-details-text);
    background-color: var(--vp-custom-block-details-bg);
    border-radius: 5px;  
    margin-bottom: 2px;
    transition: 0.5s;
  }
  .button:hover { 
    opacity: 0.8;
  }
  .button:active { 
    opacity:0.9;
  }
</style>
<script setup lang="ts">
import { ref } from 'vue';

import CounterBasic from '../components/examples/CounterBasic.vue'
import CounterWithProps from '../components/examples/CounterWithProps.vue'
import CounterWithPropsAndEmits from '../components/examples/CounterWithPropsAndEmits.vue'
import CounterDefineExpose from '../components/examples/CounterDefineExpose.vue'
import CounterDefineExposeClass from '../components/examples/CounterDefineExposeClass'
import CounterExternalRefs from '../components/examples/CounterExternalRefs.vue'
import CounterInternalRefs from '../components/examples/CounterInternalRefs.vue'
import CounterComposables from '../components/examples/CounterComposables.vue'
import CounterComposablesDestructuring from '../components/examples/CounterComposablesDestructuring.vue'
import CounterInsideComposables from '../components/examples/CounterInsideComposables.vue'
import CounterComputeds from '../components/examples/CounterComputeds.vue'
import CounterComputedsDisabled from '../components/examples/CounterComputedsDisabled.vue'
import CounterWatch from '../components/examples/CounterWatch.vue'
import CounterLifecycleHooks from '../components/examples/CounterLifecycleHooks.vue'

// <For CounterWithPropsAndEmits example start>
function onIncrement(value: number) {
  alert('Count is now: ' + value);
}
// </For CounterWithPropsAndEmits example end>

// <For CounterDefineExpose example start>
const defineExposeRef = ref<CounterDefineExposeClass | null>(null);

function increment() {
  defineExposeRef.value.increment();
}

function decrement() {
  defineExposeRef.value.decrement();
}
// </For CounterDefineExpose example end>

</script>

# Example Usage

Using ivue is very simple, but you need to understand a few principles. See the examples below expanding on each principle.

## Basic Usage

Classic Counter example built with `ivue`
::: code-group
<<< @/components/examples/CounterBasic.vue{15 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterBasic />
</template>
```

:::

### Result:

<CounterBasic />
::: warning NOTICE: JavaScript Class Caveat
 See `() => counter.increment()`. You cannot simply use `counter.increment` to refer to the method when it was defined as an object of a class, because that method would not know that it has to be bound to `counter`. You have to either use `() => counter.increment()` or `counter.increment.bind(counter)`, but the latter example is too verbose, so the preferred more readable way is to use an arrow function.
:::

## Using Props

See the highlighted sections related to props.
::: code-group
<<< @/components/examples/CounterWithProps.vue{5-8,11-12,24 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterWithProps :initial-count="5" />
</template>
```

:::

### Result:

<CounterWithProps :initial-count="5" />

## Using Emits

See the highlighted sections related to using emits.

::: code-group
<<< @/components/examples/CounterWithPropsAndEmits.vue{9-11,14,17,23,31 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<script setup lang="ts">
function onIncrement(value: number) {
  alert('Count is now: ' + value);
}
</script>
<template>
  <CounterWithPropsAndEmits :initial-count="5" @increment="onIncrement" />
</template>
```

:::

### Result:

<CounterWithPropsAndEmits :initial-count="5" @increment="onIncrement" />

## Using Refs

### Refs defined externally in the component outside of the class.

::: code-group
<<< @/components/examples/CounterExternalRefs.vue{5,8,12,16,24 vue:line-numbers}
:::
:::details For this example we initialize the component like this:

```vue
<template>
  <CounterExternalRefs />
</template>
```

:::

### Result:

<CounterExternalRefs />

### Refs defined internally inside of the class.

::: code-group
<<< @/components/examples/CounterInternalRefs.vue{7,15,25 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterInternalRefs />
</template>
```

:::

### Result:

<CounterInternalRefs />

## Using Define Expose

See the highlighted sections related to `defineExpose`.

::: code-group
<<< @/components/examples/CounterDefineExpose.vue{8 vue:line-numbers}
<<< @/components/examples/CounterDefineExposeClass.ts{ts:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<script setup lang="ts">
const defineExposeRef = ref<CounterDefineExposeClass | null>(null);

function increment() {
  defineExposeRef.value.increment();
}

function decrement() {
  defineExposeRef.value.decrement();
}
</script>
<template>
  <button @click="increment">
    Increment via Component Ref from Parent Component</button
  ><br />
  <button @click="decrement">
    Decrement via Component Ref from Parent Component
  </button>
  <CounterDefineExpose />
</template>
```

:::

### Result:

<button class="button" @click="increment">Increment via Component Ref from Parent Component</button><br />
<button class="button" @click="decrement">Decrement via Component Ref from Parent Component</button>
<CounterDefineExpose ref="defineExposeRef" />

### Selecting the properties to allow for `defineExpose()`

::: code-group
<<< @/components/examples/CounterDefineExposeAdvanced.vue{9,23 vue:line-numbers}
:::

## Using Composables

See the highlighted sections related to composable usage.
::: code-group
<<< @/components/examples/CounterComposables.vue{4,11,19 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterComposables />
</template>
```

:::

### Result:

<CounterComposables />

### Destructuring composable into the class

See the highlighted sections related to destructuring composable usage.

::: code-group
<<< @/components/examples/CounterComposablesDestructuring.vue{4,10,20-21,23-24,27-32 vue:line-numbers}
<<< @/components/examples/functions/useMouse.ts{ts:line-numbers} [functions/useMouse.ts]
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterComposablesDestructuring />
</template>
```

:::

### Result:

<CounterComposablesDestructuring />

## Using Inside Composables

See the highlighted sections related to using `ivue` inside a composable.

::: code-group
<<< @/components/examples/CounterInsideComposables.vue{14 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterInsideComposables />
</template>
```

:::

### Result:

<CounterInsideComposables />


## Using Computeds

Getters are converted to computeds in `ivue`.<br />
See the highlighted sections related to getters.

::: code-group
<<< @/components/examples/CounterComputeds.vue{10,13,23,24 vue:line-numbers}
:::

:::details For this example we initialize the component like this:
```vue
<template>
  <CounterComputeds />
</template>
```
:::

### Result:
<CounterComputeds />

### Disable computed behavior for certain getters in `ivue`.<br />
You can disable computed getters via `static ivue = { getter: false }`, see below:

::: code-group
<<< @/components/examples/CounterComputedsDisabled.vue{10-12 vue:line-numbers}
:::

The result of this example is identical to the above.



## Using Watch

To use `watch`, `watchEffect`, `onMounted` and other reactive functions, declare `.init()` method in the class.
See the highlighted sections related to using `init()` below:

::: code-group
<<< @/components/examples/CounterWatch.vue{6-12 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterWatch />
</template>
```

:::

### Result:

<CounterWatch />



## Using Lifecycle Hooks

To use `onMounted`, `onBeforeMount` and other lifecycle, declare `.init()` method in the class.
See the highlighted sections related to using `init()` below:

::: tip NOTICE:
`init()` method can be declared as `async` if needed.
:::

::: code-group
<<< @/components/examples/CounterLifecycleHooks.vue{7-9 vue:line-numbers}
:::

:::details For this example we initialize the component like this:

```vue
<template>
  <CounterLifecycleHooks />
</template>
```
:::

### Result:
<CounterLifecycleHooks />