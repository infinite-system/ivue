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
<script lang="ts" setup>
import { ref } from 'vue';

import CounterBasic from '../components/examples/CounterBasic.vue'
import CounterWithProps from '../components/examples/CounterWithProps.vue'
import CounterWithPropsAndEmits from '../components/examples/CounterWithPropsAndEmits.vue'
import CounterDefineExpose from '../components/examples/CounterDefineExpose.vue'
import CounterDefineExposeClass from '../components/examples/CounterDefineExposeClass'
import CounterExternalRefs from '../components/examples/CounterExternalRefs.vue'
import CounterInternalRefs from '../components/examples/CounterInternalRefs.vue'

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
<template>
<CounterBasic />
</template>
:::

### Result:

<CounterBasic />
::: warning NOTICE: JavaScript Class Caveat
 See `() => counter.increment()`. You cannot simply use `counter.increment` to refer to the method when it was defined as a object of a class, because that method would not know that it has to be bound to `counter`. You have to either use `() => counter.increment()` or `counter.increment.bind(counter)`, but the latter example is too verbose, so the preferred more readable way is to use an arrow function.
:::

## Using Props

See the highlighted sections related to props.
::: code-group
<<< @/components/examples/CounterWithProps.vue{5-8,15-16,24 vue:line-numbers}
:::
:::details For this example we initialize the component like this:
<template>
<CounterWithProps :initial-count="5" />
</template>
:::

### Result:

<CounterWithProps :initial-count="5" />

## Using Emits

See the highlighted sections related to `defineExpose`

::: code-group
<<< @/components/examples/CounterWithPropsAndEmits.vue{9-11,14,20,22,31 vue:line-numbers}
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

### Refs Defined Outside of ivue

::: code-group
<<< @/components/examples/CounterExternalRefs.vue{vue:line-numbers}
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

### Refs Defined Inside of ivue class

::: code-group
<<< @/components/examples/CounterInternalRefs.vue{vue:line-numbers}
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
<<< @/components/examples/CounterDefineExpose.vue{17 vue:line-numbers}
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

## Using Composables

Counter example built with `ivue` with passed in props and emits, see the highlighted sections related to emits.
::: code-group
<<< @/components/examples/CounterComposables.vue{17 vue:line-numbers}
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
